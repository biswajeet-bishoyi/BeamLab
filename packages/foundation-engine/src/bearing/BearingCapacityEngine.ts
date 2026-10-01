/**
 * BearingCapacityEngine.ts
 *
 * Geotechnical bearing capacity and settlement calculation engine.
 * Implements Meyerhof, Vesic, and Hansen general bearing capacity formulations
 * with shape, depth, and water table corrections, as well as immediate elastic
 * and 1D consolidation settlement estimates.
 */

import { SoilStratigraphy } from '../soil/SoilStratigraphy';

export type BearingCapacityMethod = 'MEYERHOF' | 'VESIC' | 'HANSEN';

export interface FootingGeometry {
  readonly width_m: number; // B (shorter dimension)
  readonly length_m: number; // L (longer dimension, L >= B)
  readonly embedmentDepth_m: number; // Df
  readonly thickness_m?: number;
}

export interface BearingCapacityFactors {
  readonly Nc: number;
  readonly Nq: number;
  readonly Ngamma: number;
  readonly sc: number;
  readonly sq: number;
  readonly sgamma: number;
  readonly dc: number;
  readonly dq: number;
  readonly dgamma: number;
}

export interface BearingCapacityResult {
  readonly ultimateBearingCapacity_kPa: number; // q_ult
  readonly netUltimateBearingCapacity_kPa: number; // q_ult_net
  readonly allowableBearingPressure_kPa: number; // q_all
  readonly factorOfSafety: number; // FS
  readonly effectiveOverburden_kPa: number; // q' = sigma'_v(Df)
  readonly effectiveGamma_kN_m3: number; // gamma' below footing
  readonly factors: BearingCapacityFactors;
  readonly immediateSettlement_mm: number; // S_i
  readonly consolidationSettlement_mm: number; // S_c
  readonly totalSettlement_mm: number;
}

export class BearingCapacityEngine {
  private degToRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  /**
   * Computes bearing capacity factors Nc, Nq, Ngamma based on friction angle phi.
   */
  computeFactors(
    phi_deg: number,
    method: BearingCapacityMethod = 'VESIC'
  ): { Nc: number; Nq: number; Ngamma: number } {
    if (phi_deg <= 0.01) {
      // Purely cohesive undrained clay (phi = 0)
      return { Nc: 5.14, Nq: 1.0, Ngamma: 0.0 };
    }

    const phiRad = this.degToRad(phi_deg);
    const Nq = Math.exp(Math.PI * Math.tan(phiRad)) * Math.pow(Math.tan(Math.PI / 4 + phiRad / 2), 2);
    const Nc = (Nq - 1) / Math.tan(phiRad);

    let Ngamma = 0;
    if (method === 'MEYERHOF') {
      Ngamma = (Nq - 1) * Math.tan(1.4 * phiRad);
    } else if (method === 'HANSEN') {
      Ngamma = 1.5 * (Nq - 1) * Math.tan(phiRad);
    } else {
      // Vesic (default)
      Ngamma = 2 * (Nq + 1) * Math.tan(phiRad);
    }

    return {
      Nc: Number(Nc.toFixed(2)),
      Nq: Number(Nq.toFixed(2)),
      Ngamma: Number(Ngamma.toFixed(2)),
    };
  }

  /**
   * Evaluates ultimate bearing capacity, allowable bearing pressure, and settlement.
   */
  evaluateBearingCapacity(
    stratigraphy: SoilStratigraphy,
    footing: FootingGeometry,
    options: {
      factorOfSafety?: number;
      method?: BearingCapacityMethod;
      appliedLoad_kN?: number; // Service axial column load for settlement
    } = {}
  ): BearingCapacityResult {
    const FS = options.factorOfSafety ?? 3.0;
    const method = options.method ?? 'VESIC';

    const B = Math.min(footing.width_m, footing.length_m);
    const L = Math.max(footing.width_m, footing.length_m);
    const Df = footing.embedmentDepth_m;

    // Overburden effective vertical stress at footing base Df
    const qPrime = stratigraphy.getEffectiveVerticalStress(Df);

    // Weighted average soil parameters in the failure shear wedge below footing (Df to Df + B)
    const soilProps = stratigraphy.getWeightedParameters(Df, Df + B);
    const c = soilProps.cohesion_kPa;
    const phi = soilProps.frictionAngle_deg;
    const gammaPrime = soilProps.effectiveGamma_kN_m3;
    const Es = soilProps.elasticModulus_MPa;
    const nu = soilProps.poissonRatio;

    // 1. Basic Bearing Capacity Factors
    const { Nc, Nq, Ngamma } = this.computeFactors(phi, method);

    // 2. Shape Factors
    let sc = 1.0;
    let sq = 1.0;
    let sgamma = 1.0;

    if (phi <= 0.01) {
      sc = 1 + 0.2 * (B / L);
      sq = 1.0;
      sgamma = 1.0;
    } else {
      sc = 1 + (B / L) * (Nq / Nc);
      sq = 1 + (B / L) * Math.tan(this.degToRad(phi));
      sgamma = Math.max(0.6, 1 - 0.4 * (B / L));
    }

    // 3. Depth Factors
    let dc = 1.0;
    let dq = 1.0;
    const dgamma = 1.0;

    const k = Df / B <= 1 ? Df / B : Math.atan(Df / B);
    if (phi <= 0.01) {
      dc = 1 + 0.4 * k;
      dq = 1.0;
    } else {
      const phiRad = this.degToRad(phi);
      dq = 1 + 2 * Math.tan(phiRad) * Math.pow(1 - Math.sin(phiRad), 2) * k;
      dc = dq - (1 - dq) / (Nc * Math.tan(phiRad));
    }

    // 4. Ultimate Bearing Capacity Equation
    // q_ult = c * Nc * sc * dc + q' * Nq * sq * dq + 0.5 * gamma' * B * Ngamma * sgamma * dgamma
    const termCohesion = c * Nc * sc * dc;
    const termSurcharge = qPrime * Nq * sq * dq;
    const termFriction = 0.5 * gammaPrime * B * Ngamma * sgamma * dgamma;

    const q_ult = Number((termCohesion + termSurcharge + termFriction).toFixed(1));
    const q_ult_net = Math.max(0, q_ult - qPrime);
    const q_all = Number(((q_ult_net / FS) + qPrime).toFixed(1));

    // 5. Settlement Calculations
    // Immediate Elastic Settlement: S_i = q_net * B * ((1 - nu^2) / Es) * Is
    const appliedP = options.appliedLoad_kN ?? (q_all * B * L * 0.7);
    const appliedPressure = appliedP / (B * L);
    const netAppliedPressure = Math.max(0, appliedPressure - qPrime);

    // Shape influence factor Is for rigid footing
    const Is = 0.88;
    const immediateSettlement_m =
      (netAppliedPressure * B * (1 - nu * nu) * Is) / (Es * 1000); // Es in kPa
    const immediateSettlement_mm = Number((immediateSettlement_m * 1000).toFixed(1));

    // 1D Consolidation Settlement (for clay layers with Cc and e0)
    let consolidationSettlement_mm = 0;
    for (const layer of stratigraphy.profile.layers) {
      if (layer.depthBottom_m > Df && layer.compressionIndex && layer.voidRatio) {
        const zMid = Math.max(layer.depthTop_m, Df) + (layer.depthBottom_m - Math.max(layer.depthTop_m, Df)) / 2;
        const hLayer = layer.depthBottom_m - Math.max(layer.depthTop_m, Df);
        const zRel = zMid - Df;

        // 2:1 stress dispersion at mid-layer depth
        const deltaSigma = appliedP / ((B + zRel) * (L + zRel));
        const sigma0 = stratigraphy.getEffectiveVerticalStress(zMid);

        if (sigma0 > 0) {
          const Sc_m = ((layer.compressionIndex * hLayer) / (1 + layer.voidRatio)) *
            Math.log10((sigma0 + deltaSigma) / sigma0);
          consolidationSettlement_mm += Sc_m * 1000;
        }
      }
    }
    consolidationSettlement_mm = Number(consolidationSettlement_mm.toFixed(1));
    const totalSettlement_mm = Number((immediateSettlement_mm + consolidationSettlement_mm).toFixed(1));

    return {
      ultimateBearingCapacity_kPa: q_ult,
      netUltimateBearingCapacity_kPa: q_ult_net,
      allowableBearingPressure_kPa: q_all,
      factorOfSafety: FS,
      effectiveOverburden_kPa: Number(qPrime.toFixed(1)),
      effectiveGamma_kN_m3: gammaPrime,
      factors: {
        Nc,
        Nq,
        Ngamma,
        sc: Number(sc.toFixed(3)),
        sq: Number(sq.toFixed(3)),
        sgamma: Number(sgamma.toFixed(3)),
        dc: Number(dc.toFixed(3)),
        dq: Number(dq.toFixed(3)),
        dgamma: Number(dgamma.toFixed(3)),
      },
      immediateSettlement_mm,
      consolidationSettlement_mm,
      totalSettlement_mm,
    };
  }
}
