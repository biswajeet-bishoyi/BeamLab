/**
 * Bolt Group Mechanics Analyzer
 * Implements:
 * 1. Geometric Centroid and Polar Moment of Inertia (J)
 * 2. Elastic Vector Analysis for Eccentric Shear and Torsion
 * 3. Instantaneous Center of Rotation (ICR) Non-Linear Mechanics (Crawford & Kulak Method)
 */

import { BoltInstance, Point2D, BoltPattern } from '../core/ConnectionTypes';

export interface BoltForceVector {
  boltId: string;
  x_mm: number;
  y_mm: number;
  directForceX_kN: number;
  directForceY_kN: number;
  torsionalForceX_kN: number;
  torsionalForceY_kN: number;
  resultantForceX_kN: number;
  resultantForceY_kN: number;
  resultantMagnitude_kN: number;
}

export interface BoltGroupElasticAnalysisResult {
  centroid: Point2D;
  polarMomentOfInertia_mm2: number; // J
  totalBolts: number;
  boltForces: BoltForceVector[];
  criticalBolt: BoltForceVector;
  governingDemand_kN: number;
}

export interface ICRAnalysisResult {
  instantaneousCenter: Point2D;
  ultimateCoefficientC: number; // C = P_ult / r_ult (AISC Manual Table 7-6 to 7-13)
  nominalCapacity_kN: number;
  iterations: number;
  converged: boolean;
}

export class BoltGroupAnalyzer {
  /**
   * Helper: Generate a regular rectangular bolt pattern grid
   */
  public static createGridPattern(options: {
    rows: number;
    cols: number;
    pitchY_mm: number;
    gageX_mm: number;
    diameter_mm: number;
    edgeDistX_mm: number;
    edgeDistY_mm: number;
  }): BoltPattern {
    const { rows, cols, pitchY_mm, gageX_mm, diameter_mm, edgeDistX_mm, edgeDistY_mm } = options;
    const bolts: BoltInstance[] = [];

    const grossArea_mm2 = (Math.PI * diameter_mm * diameter_mm) / 4;
    const tensileStressArea_mm2 = 0.78 * grossArea_mm2;

    let index = 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        bolts.push({
          id: `B${index++}`,
          x_mm: edgeDistX_mm + c * gageX_mm,
          y_mm: edgeDistY_mm + r * pitchY_mm,
          diameter_mm,
          grossArea_mm2,
          tensileStressArea_mm2,
        });
      }
    }

    return {
      bolts,
      rows,
      cols,
      pitchY_mm,
      gageX_mm,
      edgeDistanceX_mm: edgeDistX_mm,
      edgeDistanceY_mm: edgeDistY_mm,
    };
  }

  /**
   * Calculate Centroid (x_bar, y_bar) of an arbitrary bolt set
   */
  public static calculateCentroid(bolts: BoltInstance[]): Point2D {
    if (bolts.length === 0) {
      return { x: 0, y: 0 };
    }
    const sumX = bolts.reduce((acc, b) => acc + b.x_mm, 0);
    const sumY = bolts.reduce((acc, b) => acc + b.y_mm, 0);
    return {
      x: sumX / bolts.length,
      y: sumY / bolts.length,
    };
  }

  /**
   * Calculate Polar Moment of Inertia J = sum(r_i^2) = sum((x_i - x_bar)^2 + (y_i - y_bar)^2)
   */
  public static calculatePolarMoment(bolts: BoltInstance[], centroid?: Point2D): number {
    const c = centroid || this.calculateCentroid(bolts);
    return bolts.reduce((acc, b) => {
      const dx = b.x_mm - c.x;
      const dy = b.y_mm - c.y;
      return acc + (dx * dx + dy * dy);
    }, 0);
  }

  /**
   * Elastic Vector Method:
   * Analyzes an arbitrary bolt pattern under in-plane shear forces (Vx, Vy)
   * and in-plane torsional / eccentric bending moment (Mz).
   */
  public static analyzeElasticVector(options: {
    bolts: BoltInstance[];
    forceX_kN: number;      // Direct shear X
    forceY_kN: number;      // Direct shear Y
    momentZ_kNm: number;    // In-plane torque about centroid
    eccentricityX_mm?: number; // Optional force offset X
    eccentricityY_mm?: number; // Optional force offset Y
  }): BoltGroupElasticAnalysisResult {
    const { bolts, forceX_kN, forceY_kN } = options;
    const n = bolts.length;
    if (n === 0) {
      throw new Error('Bolt group must contain at least one bolt');
    }

    const centroid = this.calculateCentroid(bolts);
    const J = this.calculatePolarMoment(bolts, centroid);

    // If eccentricities are provided, add P * e to in-plane moment
    let totalMoment_kNm = options.momentZ_kNm;
    if (options.eccentricityX_mm) {
      // Force in Y * offset in X creates moment
      totalMoment_kNm += (forceY_kN * options.eccentricityX_mm) / 1000;
    }
    if (options.eccentricityY_mm) {
      // Force in X * offset in Y creates moment
      totalMoment_kNm -= (forceX_kN * options.eccentricityY_mm) / 1000;
    }

    // Convert moment to N*mm
    const moment_Nmm = totalMoment_kNm * 1e6;

    // Direct shear per bolt (kN)
    const directFx = forceX_kN / n;
    const directFy = forceY_kN / n;

    const boltForces: BoltForceVector[] = [];
    let criticalBolt: BoltForceVector | null = null;
    let maxDemand = -1;

    for (const bolt of bolts) {
      const dx = bolt.x_mm - centroid.x;
      const dy = bolt.y_mm - centroid.y;

      let torsionalFx = 0;
      let torsionalFy = 0;

      if (J > 0) {
        // Torsional shear:
        // V_tx = - (M * dy) / J  [N]
        // V_ty = + (M * dx) / J  [N]
        torsionalFx = (-moment_Nmm * dy) / J / 1000;
        torsionalFy = (moment_Nmm * dx) / J / 1000;
      }

      const resFx = directFx + torsionalFx;
      const resFy = directFy + torsionalFy;
      const resMag = Math.sqrt(resFx * resFx + resFy * resFy);

      const vector: BoltForceVector = {
        boltId: bolt.id,
        x_mm: bolt.x_mm,
        y_mm: bolt.y_mm,
        directForceX_kN: directFx,
        directForceY_kN: directFy,
        torsionalForceX_kN: torsionalFx,
        torsionalForceY_kN: torsionalFy,
        resultantForceX_kN: resFx,
        resultantForceY_kN: resFy,
        resultantMagnitude_kN: resMag,
      };

      boltForces.push(vector);

      if (resMag > maxDemand) {
        maxDemand = resMag;
        criticalBolt = vector;
      }
    }

    return {
      centroid,
      polarMomentOfInertia_mm2: J,
      totalBolts: n,
      boltForces,
      criticalBolt: criticalBolt!,
      governingDemand_kN: maxDemand,
    };
  }

  /**
   * Instantaneous Center of Rotation (ICR) Method:
   * AISC Manual 15th Ed. Table 7-6 method for eccentric shear connections.
   * Uses the Crawford & Kulak (1971) empirical load-deformation equation:
   * R = R_ult * (1 - e^(-0.3937 * Delta_mm))^0.55
   */
  public static analyzeICR(options: {
    bolts: BoltInstance[];
    eccentricity_mm: number; // Distance from group centroid to applied line of action
    singleBoltShearCapacity_kN: number; // R_ult
    tolerance?: number;
    maxIterations?: number;
  }): ICRAnalysisResult {
    const { bolts, eccentricity_mm, singleBoltShearCapacity_kN, tolerance = 1e-4, maxIterations = 100 } = options;
    const n = bolts.length;
    const centroid = this.calculateCentroid(bolts);

    // Initial estimate for Instantaneous Center (x0):
    // In typical shear connections with vertical load, ICR lies on the horizontal axis through the centroid at distance x0 to the left of the centroid.
    let x0 = (0.5 * eccentricity_mm) / n;
    let converged = false;
    let iter = 0;
    let coefficientC = 0;

    const deltaMax_mm = 8.636; // 0.34 in (Crawford & Kulak max bolt deformation)

    for (iter = 0; iter < maxIterations; iter++) {
      const icPoint: Point2D = { x: centroid.x - x0, y: centroid.y };

      // Find max distance from IC to any bolt
      let rMax = 0;
      for (const b of bolts) {
        const dist = Math.hypot(b.x_mm - icPoint.x, b.y_mm - icPoint.y);
        if (dist > rMax) rMax = dist;
      }

      if (rMax < 1e-6) break;

      // Sum moments about ICR and horizontal/vertical force balances
      let sumRy = 0;
      let sumM_ICR = 0;

      for (const b of bolts) {
        const rx = b.x_mm - icPoint.x;
        const ry = b.y_mm - icPoint.y;
        const r = Math.hypot(rx, ry);

        if (r < 1e-6) continue;

        // Bolt deformation
        const delta = deltaMax_mm * (r / rMax);
        // Force fraction: R / R_ult
        const forceFraction = Math.pow(1 - Math.exp(-0.3937 * delta), 0.55);

        // Force acts perpendicular to radius from ICR
        // cos(theta) = rx / r, sin(theta) = ry / r
        // Fy component = forceFraction * (rx / r)
        sumRy += forceFraction * (rx / r);
        sumM_ICR += forceFraction * r;
      }

      // Applied load moment about ICR = P * (eccentricity_mm + x0)
      // Since sumM_ICR = P * (e + x0) and P = sumRy:
      const calculatedP = sumRy;
      const internalMoment = sumM_ICR;
      const externalMomentArm = eccentricity_mm + x0;
      const momentError = internalMoment - calculatedP * externalMomentArm;

      coefficientC = calculatedP;

      if (Math.abs(momentError) < tolerance || Math.abs(momentError / internalMoment) < tolerance) {
        converged = true;
        break;
      }

      // Newton-Raphson correction for x0
      const step = momentError / (calculatedP + 1e-6);
      x0 += step * 0.5;
      if (x0 < 0) x0 = 0.01;
    }

    const nominalCapacity_kN = coefficientC * singleBoltShearCapacity_kN;

    return {
      instantaneousCenter: { x: centroid.x - x0, y: centroid.y },
      ultimateCoefficientC: Math.max(1.0, coefficientC),
      nominalCapacity_kN,
      iterations: iter + 1,
      converged,
    };
  }
}
