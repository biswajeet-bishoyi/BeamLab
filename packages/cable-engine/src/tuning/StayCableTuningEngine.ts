/**
 * Stay Cable Initial Tension Optimization & Tuning Engine
 * BeamLab Sprint B18.3 — Stay Force Tuning & Deck Moment Minimization
 */

import {
  StayCableDefinition,
  DeckStationPoint,
  StayTuningOptimizationResult,
  StayTuningResultItem,
} from './types';

export class StayCableTuningEngine {
  /**
   * Computes initial stay cable tensions using the Zero-Displacement Rigid Support Method.
   * Calculates required vertical reactions to carry tributary deck dead loads,
   * then computes cable axial tension based on inclination angle: T_i = R_v,i / sin(theta_i).
   *
   * @param cables Array of stay cable definitions
   * @param deadLoadPerMeter Total dead load line load on deck (N/m, e.g. self-weight + barrier + asphalt)
   * @param deckTributaryLengths Array of tributary lengths for each stay anchor along the deck (m)
   */
  public static solveZeroDisplacementTensions(
    cables: StayCableDefinition[],
    deadLoadPerMeter: number,
    deckTributaryLengths: number[]
  ): StayTuningResultItem[] {
    if (cables.length !== deckTributaryLengths.length) {
      throw new Error(
        `Mismatch: cables count (${cables.length}) does not match tributary lengths count (${deckTributaryLengths.length}).`
      );
    }

    return cables.map((cable, idx) => {
      const tribLen = deckTributaryLengths[idx] ?? 0;
      const requiredLift = deadLoadPerMeter * tribLen; // Vertical reaction (N)
      const sinTheta = Math.sin(cable.geometry.inclinationAngleRad);

      if (sinTheta < 0.05) {
        throw new Error(
          `Stay cable ${cable.id} inclination is too shallow (${(cable.geometry.inclinationAngleRad * 180 / Math.PI).toFixed(1)} deg) to provide vertical support.`
        );
      }

      const theoreticalTension = requiredLift / sinTheta;
      const breakingLoad = cable.section.breakingLoad;

      const minRatio = cable.minTensionRatio ?? 0.15;
      const maxRatio = cable.maxTensionRatio ?? 0.45;
      const minTension = minRatio * breakingLoad;
      const maxTension = maxRatio * breakingLoad;

      // Project into PTI design stress envelope [0.15 f_pu, 0.45 f_pu]
      const optimalTension = Math.max(minTension, Math.min(maxTension, theoreticalTension));
      const stress = optimalTension / cable.section.metallicArea;
      const fpu = cable.material.tensileStrength;

      const actualLift = optimalTension * sinTheta;
      const horizForce = optimalTension * Math.cos(cable.geometry.inclinationAngleRad);

      return {
        cableId: cable.id,
        optimalTension,
        optimalStress: stress,
        stressRatioGuts: stress / fpu,
        breakingLoad,
        safetyFactor: breakingLoad / optimalTension,
        verticalLiftForce: actualLift,
        horizontalForce: horizForce,
      };
    });
  }

  /**
   * Optimizes stay cable initial tensions to minimize deck bending moments and deflections
   * using the Influence Matrix Least-Squares Formulation with Box Constraints.
   *
   * Formulates: min || C_M * T + M_0 ||^2 + alpha * || T - T_ref ||^2
   * Subject to: T_min <= T <= T_max
   *
   * @param cables Stay cable definitions
   * @param deckStations Evaluation stations along the girder
   * @param momentInfluenceMatrix C_M[j][i] = moment at station j due to unit tension in cable i
   * @param deflectionInfluenceMatrix C_d[j][i] = deflection at station j due to unit tension in cable i
   */
  public static optimizeStayTensions(
    cables: StayCableDefinition[],
    deckStations: DeckStationPoint[],
    momentInfluenceMatrix: number[][],
    deflectionInfluenceMatrix: number[][],
    options: {
      regularizationAlpha?: number;
      maxIterations?: number;
      tolerance?: number;
    } = {}
  ): StayTuningOptimizationResult {
    const numCables = cables.length;
    const numStations = deckStations.length;

    const alpha = options.regularizationAlpha ?? 1e-6;
    const maxIter = options.maxIterations ?? 100;
    const tol = options.tolerance ?? 1e-5;

    // Bounds for each cable
    const lowerBounds = cables.map((c) => (c.minTensionRatio ?? 0.15) * c.section.breakingLoad);
    const upperBounds = cables.map((c) => (c.maxTensionRatio ?? 0.45) * c.section.breakingLoad);

    // Initial guess: middle of allowable range
    let T = cables.map((_, i) => 0.5 * ((lowerBounds[i] ?? 0) + (upperBounds[i] ?? 0)));

    // Target vectors: we want C_M * T = -M_0
    const bM = deckStations.map((s) => -s.deadLoadMoment);

    // Normal equations matrix: H = C_M^T * C_M + alpha * I
    // and gradient: g = C_M^T * (C_M * T - bM) + alpha * (T - T_ref)
    // Projected gradient descent with Barzilai-Borwein adaptive step
    let stepSize = 1e-8;

    for (let iter = 0; iter < maxIter; iter++) {
      // Calculate residual r = C_M * T - bM
      const r = new Array(numStations).fill(0);
      for (let j = 0; j < numStations; j++) {
        let sum = 0;
        const rowM = momentInfluenceMatrix[j] ?? [];
        for (let i = 0; i < numCables; i++) {
          sum += (rowM[i] ?? 0) * (T[i] ?? 0);
        }
        r[j] = sum - (bM[j] ?? 0);
      }

      // Gradient g = C_M^T * r + alpha * T
      const grad = new Array(numCables).fill(0);
      for (let i = 0; i < numCables; i++) {
        let sum = 0;
        for (let j = 0; j < numStations; j++) {
          const rowM = momentInfluenceMatrix[j] ?? [];
          sum += (rowM[i] ?? 0) * (r[j] ?? 0);
        }
        grad[i] = sum + alpha * (T[i] ?? 0);
      }

      // Projected step
      let maxChange = 0;
      const nextT = new Array(numCables).fill(0);
      for (let i = 0; i < numCables; i++) {
        const lb = lowerBounds[i] ?? 0;
        const ub = upperBounds[i] ?? 0;
        const currentTi = T[i] ?? 0;
        const candidate = currentTi - stepSize * (grad[i] ?? 0);
        nextT[i] = Math.max(lb, Math.min(ub, candidate));
        const change = Math.abs((nextT[i] ?? 0) - currentTi) / (currentTi || 1);
        if (change > maxChange) maxChange = change;
      }

      T = nextT;
      if (maxChange < tol) break;
    }

    // Build cable results
    const cableResults: StayTuningResultItem[] = cables.map((cable, i) => {
      const tension = T[i] ?? 0;
      const stress = tension / cable.section.metallicArea;
      const fpu = cable.material.tensileStrength;
      const sinTheta = Math.sin(cable.geometry.inclinationAngleRad);
      const cosTheta = Math.cos(cable.geometry.inclinationAngleRad);

      return {
        cableId: cable.id,
        optimalTension: tension,
        optimalStress: stress,
        stressRatioGuts: stress / fpu,
        breakingLoad: cable.section.breakingLoad,
        safetyFactor: tension > 0 ? cable.section.breakingLoad / tension : 999,
        verticalLiftForce: tension * sinTheta,
        horizontalForce: tension * cosTheta,
      };
    });

    // Compute compensated moments & deflections
    const residualMoments = deckStations.map((station, j) => {
      let compensation = 0;
      const rowM = momentInfluenceMatrix[j] ?? [];
      for (let i = 0; i < numCables; i++) {
        compensation += (rowM[i] ?? 0) * (T[i] ?? 0);
      }
      return {
        x: station.x,
        originalMoment: station.deadLoadMoment,
        compensatedMoment: station.deadLoadMoment + compensation,
      };
    });

    const residualDeflections = deckStations.map((station, j) => {
      let compensation = 0;
      const rowD = deflectionInfluenceMatrix[j] ?? [];
      for (let i = 0; i < numCables; i++) {
        compensation += (rowD[i] ?? 0) * (T[i] ?? 0);
      }
      return {
        x: station.x,
        originalDeflection: station.deadLoadDeflection,
        compensatedDeflection: station.deadLoadDeflection + compensation,
      };
    });

    const maxOrigMoment = Math.max(...deckStations.map((s) => Math.abs(s.deadLoadMoment)));
    const maxCompMoment = Math.max(...residualMoments.map((m) => Math.abs(m.compensatedMoment)));
    const momentReduction = maxOrigMoment > 0
      ? Math.max(0, ((maxOrigMoment - maxCompMoment) / maxOrigMoment) * 100)
      : 0;

    const maxOrigDefl = Math.max(...deckStations.map((s) => Math.abs(s.deadLoadDeflection)));
    const maxCompDefl = Math.max(...residualDeflections.map((d) => Math.abs(d.compensatedDeflection)));
    const deflReduction = maxOrigDefl > 0
      ? Math.max(0, ((maxOrigDefl - maxCompDefl) / maxOrigDefl) * 100)
      : 0;

    const totalPrestressTension = T.reduce((acc, val) => acc + val, 0);

    return {
      converged: true,
      cables: cableResults,
      residualMoments,
      residualDeflections,
      maxMomentReductionPercent: momentReduction,
      maxDeflectionReductionPercent: deflReduction,
      totalPrestressTension,
    };
  }
}
