/**
 * TimberAxialEngine: Column compression stability, slenderness, and tension capacity
 * per NDS 2024 (Column Stability Factor CP) and Eurocode 5 (Buckling Reduction Factor k_c).
 */

import { TimberCrossSectionProperties } from './TimberMemberModels';
import { TimberDesignStrengths } from '../material/TimberMaterialEngine';

export interface TimberAxialResult {
  /** Applied axial stress (MPa) */
  appliedStress: number;
  /** Factored / design axial compressive/tensile strength (MPa) */
  designCapacity: number;
  /** Column stability reduction factor (C_P or k_c) */
  stabilityFactor: number;
  /** Governing slenderness ratio (lambda or l_e / d) */
  slenderness: number;
  /** Critical elastic buckling stress (MPa) */
  criticalEulerStress: number;
  /** Demand / Capacity Ratio (DCR) */
  dcr: number;
  /** Pass / fail compliance */
  isCompliant: boolean;
  /** Action type */
  action: 'COMPRESSION' | 'TENSION';
}

export class TimberAxialEngine {
  /**
   * Eurocode 5 column stability audit (Clause 6.3.2).
   */
  static checkEurocode5Axial(
    props: TimberCrossSectionProperties,
    strengths: TimberDesignStrengths,
    axialForceKN: number
  ): TimberAxialResult {
    const isTension = axialForceKN < 0;
    const absForceN = Math.abs(axialForceKN) * 1000;
    const appliedStress = absForceN / props.area;

    if (isTension) {
      const designCapacity = strengths.ft0_d;
      const dcr = appliedStress / Math.max(1e-3, designCapacity);
      return {
        appliedStress,
        designCapacity,
        stabilityFactor: 1.0,
        slenderness: 0,
        criticalEulerStress: 0,
        dcr,
        isCompliant: dcr <= 1.0,
        action: 'TENSION',
      };
    }

    // Compression: evaluate buckling about strong (y) and weak (z) axes
    const lambda_y = props.ley / props.rx;
    const lambda_z = props.lez / props.ry;
    const lambda_max = Math.max(lambda_y, lambda_z);

    // Relative slenderness: lambda_rel = (lambda / pi) * sqrt(f_c0,k / E_0,05)
    const lambda_rel = (lambda_max / Math.PI) * Math.sqrt(strengths.fc0_d / strengths.E0_05_d);

    // Straightness factor beta_c: 0.2 for solid timber, 0.1 for glulam
    const beta_c = strengths.category === 'GLULAM' ? 0.1 : 0.2;
    const k = 0.5 * (1.0 + beta_c * (lambda_rel - 0.3) + Math.pow(lambda_rel, 2));

    let kc = 1.0;
    if (lambda_rel > 0.3) {
      const denom = k + Math.sqrt(Math.max(0, Math.pow(k, 2) - Math.pow(lambda_rel, 2)));
      kc = 1.0 / denom;
    }
    kc = Math.min(1.0, Math.max(0.05, kc));

    // Euler buckling stress
    const sigma_E = (Math.pow(Math.PI, 2) * strengths.E0_05_d) / Math.pow(Math.max(1, lambda_max), 2);

    const designCapacity = kc * strengths.fc0_d;
    const dcr = appliedStress / Math.max(1e-3, designCapacity);

    return {
      appliedStress,
      designCapacity,
      stabilityFactor: kc,
      slenderness: lambda_max,
      criticalEulerStress: sigma_E,
      dcr,
      isCompliant: dcr <= 1.0,
      action: 'COMPRESSION',
    };
  }

  /**
   * NDS 2024 Column Stability Factor C_P (NDS 3.7.1).
   */
  static checkNdsAxial(
    props: TimberCrossSectionProperties,
    strengths: TimberDesignStrengths,
    axialForceKN: number
  ): TimberAxialResult {
    const isTension = axialForceKN < 0;
    const absForceN = Math.abs(axialForceKN) * 1000;
    const appliedStress = absForceN / props.area;

    if (isTension) {
      const designCapacity = strengths.ft0_d;
      const dcr = appliedStress / Math.max(1e-3, designCapacity);
      return {
        appliedStress,
        designCapacity,
        stabilityFactor: 1.0,
        slenderness: 0,
        criticalEulerStress: 0,
        dcr,
        isCompliant: dcr <= 1.0,
        action: 'TENSION',
      };
    }

    // Compression slenderness ratio l_e / d
    const le_d_weak = props.lez / props.b;
    const le_d_strong = props.ley / props.d;
    const le_d_max = Math.max(le_d_weak, le_d_strong);

    // Critical column buckling design value FcE = 0.822 * E_min' / (l_e / d)^2
    const FcE = (0.822 * strengths.E0_05_d) / Math.pow(Math.max(1, le_d_max), 2);

    // Parameter c: 0.80 for sawn lumber, 0.90 for glulam
    const c = strengths.category === 'GLULAM' ? 0.90 : 0.80;
    const alpha = FcE / Math.max(1e-3, strengths.fc0_d);

    const term1 = (1.0 + alpha) / (2 * c);
    const term2 = Math.sqrt(Math.max(0, Math.pow(term1, 2) - alpha / c));
    let CP = term1 - term2;
    CP = Math.min(1.0, Math.max(0.05, CP));

    const designCapacity = CP * strengths.fc0_d;
    const dcr = appliedStress / Math.max(1e-3, designCapacity);

    return {
      appliedStress,
      designCapacity,
      stabilityFactor: CP,
      slenderness: le_d_max,
      criticalEulerStress: FcE,
      dcr,
      isCompliant: dcr <= 1.0,
      action: 'COMPRESSION',
    };
  }
}
