/**
 * Johansen European Yield Model (EYM) for timber fasteners.
 * Computes failure modes Mode I through Mode IV per Eurocode 5 (Clause 8.2) and NDS 2024 (Section 11.3).
 */

export type TimberFastenerType = 'DOWEL' | 'BOLT' | 'SCREW' | 'NAIL';

export interface FastenerProperties {
  type: TimberFastenerType;
  /** Nominal diameter d (mm) */
  diameter: number;
  /** Tensile yield / ultimate strength f_u,k (MPa, e.g. 400, 600, 800) */
  fu_k: number;
  /** Fastener length (mm) */
  length: number;
  /** Axial withdrawal capacity F_ax,Rk (N) for rope effect */
  axialWithdrawalN?: number;
}

export interface SingleShearJointInput {
  fastener: FastenerProperties;
  /** Thickness of member 1 (main member) t_1 (mm) */
  t1: number;
  /** Wood density of member 1 (kg/m³) */
  density1: number;
  /** Angle to grain of load in member 1 (degrees, 0 = parallel, 90 = perp) */
  angleDeg1: number;

  /** Thickness of member 2 (side member) t_2 (mm) */
  t2: number;
  /** Wood density of member 2 (kg/m³) */
  density2: number;
  /** Angle to grain of load in member 2 (degrees) */
  angleDeg2: number;
}

export type JohansenFailureMode = 
  | 'MODE_I_m'   // Member 1 (main) wood embedment crushing
  | 'MODE_I_s'   // Member 2 (side) wood embedment crushing
  | 'MODE_II'    // Rigid fastener rotation with wood crushing in both members
  | 'MODE_III_m' // Plastic hinge in main member + side wood crushing
  | 'MODE_III_s' // Plastic hinge in side member + main wood crushing
  | 'MODE_IV';   // Double plastic hinge in fastener (ductile failure)

export interface JohansenYieldResult {
  /** Governing characteristic shear capacity per fastener per shear plane F_v,Rk (N) */
  capacityN: number;
  /** Governing failure mode */
  governingMode: JohansenFailureMode;
  /** Ductile failure indicator (Mode IV is highly ductile) */
  isDuctile: boolean;
  /** Characteristic fastener yield moment M_y,Rk (N*mm) */
  yieldMomentNmm: number;
  /** Embedment strength of member 1 f_h,1 (MPa) */
  fh1: number;
  /** Embedment strength of member 2 f_h,2 (MPa) */
  fh2: number;
  /** Individual capacity for each failure mode (N) */
  modeCapacities: Record<JohansenFailureMode, number>;
  /** Rope effect bonus contribution (N) */
  ropeEffectN: number;
}

export class JohansenYieldEngine {
  /**
   * Calculate characteristic fastener yield moment M_y,Rk in N*mm (EN 1995-1-1 Equation 8.13).
   * M_y,Rk = 0.3 * f_u,k * d^2.6
   */
  static computeYieldMoment(dMm: number, fuKMPa: number): number {
    return 0.3 * fuKMPa * Math.pow(dMm, 2.6);
  }

  /**
   * Calculate characteristic wood embedment strength f_h,alpha in MPa (EN 1995-1-1 Equation 8.15 & 8.16).
   */
  static computeEmbedmentStrength(
    dMm: number,
    densityKgM3: number,
    angleDeg: number,
    fastenerType: TimberFastenerType
  ): number {
    let fh0 = 0;
    if (fastenerType === 'NAIL' || fastenerType === 'SCREW') {
      fh0 = 0.082 * densityKgM3 * Math.pow(dMm, -0.3);
    } else {
      // Dowels & Bolts up to 30 mm
      fh0 = 0.082 * (1.0 - 0.01 * dMm) * densityKgM3;
    }

    if (angleDeg === 0) return fh0;

    // Hankinson formula for angle alpha
    const rad = (angleDeg * Math.PI) / 180;
    const k90 = 1.35 + 0.015 * dMm;
    const denom = k90 * Math.pow(Math.sin(rad), 2) + Math.pow(Math.cos(rad), 2);
    return fh0 / Math.max(0.1, denom);
  }

  /**
   * Evaluate European Yield Model (EYM) for a single-shear timber-to-timber joint.
   */
  static evaluateSingleShearJoint(input: SingleShearJointInput): JohansenYieldResult {
    const { fastener, t1, density1, angleDeg1, t2, density2, angleDeg2 } = input;
    const d = fastener.diameter;
    const My_Rk = this.computeYieldMoment(d, fastener.fu_k);
    const fh1 = this.computeEmbedmentStrength(d, density1, angleDeg1, fastener.type);
    const fh2 = this.computeEmbedmentStrength(d, density2, angleDeg2, fastener.type);

    const beta = fh2 / Math.max(1e-3, fh1);

    // Rope effect: F_ax,Rk / 4, limited by Eurocode 5 percentage caps
    let maxRopePercent = 0.15; // Dowels: 15%
    if (fastener.type === 'BOLT') maxRopePercent = 0.25;
    if (fastener.type === 'SCREW') maxRopePercent = 1.00;
    if (fastener.type === 'NAIL') maxRopePercent = 0.50;

    const rawRope = (fastener.axialWithdrawalN ?? 0) / 4;

    // Mode I_m: Main member embedment failure
    const F_Ia = fh1 * t1 * d;

    // Mode I_s: Side member embedment failure
    const F_Ib = fh2 * t2 * d;

    // Mode II: Fastener tilting with wood crushing in both members
    const termII_A = 1 + t2 / t1 + Math.pow(t2 / t1, 2);
    const termII_B = Math.pow(t2 / t1, 2);
    const sqrtII = Math.sqrt(Math.max(0, beta + 2 * Math.pow(beta, 2) * termII_A + Math.pow(beta, 3) * termII_B));
    const F_II = ((fh1 * t1 * d) / (1 + beta)) * (sqrtII - beta * (1 + t2 / t1));

    // Mode III_m: Plastic hinge in main member + side wood crushing
    const termIIIm = (4 * beta * (2 + beta) * My_Rk) / (fh1 * d * Math.pow(t1, 2));
    const sqrtIIIm = Math.sqrt(Math.max(0, 2 * beta * (1 + beta) + termIIIm));
    const baseIIIm = ((fh1 * t1 * d) / (2 + beta)) * (sqrtIIIm - beta);
    const ropeIIIm = Math.min(rawRope, baseIIIm * maxRopePercent);
    const F_IIIm = baseIIIm + ropeIIIm;

    // Mode III_s: Plastic hinge in side member + main wood crushing
    const termIIIs = (4 * beta * (1 + 2 * beta) * My_Rk) / (fh1 * d * Math.pow(t2, 2));
    const sqrtIIIs = Math.sqrt(Math.max(0, 2 * Math.pow(beta, 2) * (1 + beta) + termIIIs));
    const baseIIIs = ((fh1 * t1 * d) / (1 + 2 * beta)) * (sqrtIIIs - beta);
    const ropeIIIs = Math.min(rawRope, baseIIIs * maxRopePercent);
    const F_IIIs = baseIIIs + ropeIIIs;

    // Mode IV: Double plastic hinge in fastener (high ductility)
    const baseIV = 1.15 * Math.sqrt((2 * beta) / (1 + beta)) * Math.sqrt(2 * My_Rk * fh1 * d);
    const ropeIV = Math.min(rawRope, baseIV * maxRopePercent);
    const F_IV = baseIV + ropeIV;

    const modeCapacities: Record<JohansenFailureMode, number> = {
      MODE_I_m: F_Ia,
      MODE_I_s: F_Ib,
      MODE_II: F_II,
      MODE_III_m: F_IIIm,
      MODE_III_s: F_IIIs,
      MODE_IV: F_IV,
    };

    let governingMode: JohansenFailureMode = 'MODE_I_m';
    let capacityN = F_Ia;

    for (const [mode, cap] of Object.entries(modeCapacities) as [JohansenFailureMode, number][]) {
      if (cap < capacityN) {
        capacityN = cap;
        governingMode = mode;
      }
    }

    const isDuctile = governingMode === 'MODE_IV' || governingMode === 'MODE_III_m' || governingMode === 'MODE_III_s';
    const ropeEffectN = governingMode === 'MODE_IV' ? ropeIV : (governingMode === 'MODE_III_m' ? ropeIIIm : (governingMode === 'MODE_III_s' ? ropeIIIs : 0));

    return {
      capacityN,
      governingMode,
      isDuctile,
      yieldMomentNmm: My_Rk,
      fh1,
      fh2,
      modeCapacities,
      ropeEffectN,
    };
  }
}
