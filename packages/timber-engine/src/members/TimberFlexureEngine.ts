/**
 * TimberFlexureEngine: Bending capacity and lateral torsional buckling (LTB) evaluation
 * per NDS 2024 (Beam Stability Factor CL) and Eurocode 5 (Lateral Stability Factor k_crit).
 */

import { TimberCrossSectionProperties } from './TimberMemberModels';
import { TimberDesignStrengths } from '../material/TimberMaterialEngine';

export interface TimberFlexureResult {
  /** Maximum applied bending stress (MPa) */
  appliedStress: number;
  /** Factored / design bending strength (MPa) */
  designCapacity: number;
  /** Lateral torsional buckling stability reduction factor (C_L or k_crit) */
  stabilityFactor: number;
  /** Relative slenderness for bending (lambda_rel,m or R_B) */
  slenderness: number;
  /** Critical elastic buckling moment / stress (MPa) */
  criticalBucklingStress: number;
  /** Demand / Capacity Ratio (DCR) */
  dcr: number;
  /** Pass / fail compliance */
  isCompliant: boolean;
}

export class TimberFlexureEngine {
  /**
   * Eurocode 5 lateral torsional stability audit (Clause 6.3.3).
   *
   * @param props Member section properties
   * @param strengths Material design strengths
   * @param momentY Applied major-axis bending moment M_y,Ed (kNm)
   */
  static checkEurocode5Bending(
    props: TimberCrossSectionProperties,
    strengths: TimberDesignStrengths,
    momentY: number
  ): TimberFlexureResult {
    const My_Nmm = Math.abs(momentY) * 1e6;
    const appliedStress = My_Nmm / props.Sx;

    // Critical bending stress for rectangular section:
    // sigma_m,crit = (pi * sqrt(E_0,05 * I_z * G_0,05 * I_tor)) / (W_y * l_ef)
    // Approximate EN 1995-1-1 formula 6.32: sigma_m,crit = 0.78 * E_0,05 * b^2 / (h * l_ef)
    const lef = props.lu;
    const sigma_m_crit = (0.78 * strengths.E0_05_d * Math.pow(props.b, 2)) / (props.d * lef);

    // Relative slenderness for bending
    const lambda_rel_m = Math.sqrt(Math.max(1e-4, strengths.fm_d / Math.max(1e-4, sigma_m_crit)));

    let k_crit = 1.0;
    if (lambda_rel_m <= 0.75) {
      k_crit = 1.0;
    } else if (lambda_rel_m <= 1.4) {
      k_crit = 1.56 - 0.75 * lambda_rel_m;
    } else {
      k_crit = 1.0 / Math.pow(lambda_rel_m, 2);
    }
    k_crit = Math.min(1.0, Math.max(0.05, k_crit));

    const designCapacity = k_crit * strengths.fm_d;
    const dcr = appliedStress / Math.max(1e-3, designCapacity);

    return {
      appliedStress,
      designCapacity,
      stabilityFactor: k_crit,
      slenderness: lambda_rel_m,
      criticalBucklingStress: sigma_m_crit,
      dcr,
      isCompliant: dcr <= 1.0,
    };
  }

  /**
   * NDS 2024 Beam Stability Factor C_L and bending capacity check (NDS 3.3.3).
   *
   * @param props Member section properties
   * @param strengths Material design strengths
   * @param momentY Applied major-axis bending moment (kNm)
   */
  static checkNdsBending(
    props: TimberCrossSectionProperties,
    strengths: TimberDesignStrengths,
    momentY: number
  ): TimberFlexureResult {
    const My_Nmm = Math.abs(momentY) * 1e6;
    const appliedStress = My_Nmm / props.Sx;

    // Slenderness factor R_B = sqrt(l_e * d / b^2) <= 50
    const Rb = Math.sqrt((props.lu * props.d) / Math.pow(props.b, 2));

    let CL = 1.0;
    let FbE = 0;

    // If d/b <= 2 or fully braced, CL = 1.0
    if (props.d / props.b <= 2.0) {
      CL = 1.0;
      FbE = strengths.fm_d * 5;
    } else {
      // Critical buckling design value FbE = 1.20 * E_min' / R_B^2
      // where E_min' is 5th-percentile modulus
      FbE = (1.20 * strengths.E0_05_d) / Math.pow(Math.max(1, Rb), 2);
      const alpha = FbE / Math.max(1e-3, strengths.fm_d);

      const term1 = (1.0 + alpha) / 1.9;
      const term2 = Math.sqrt(Math.max(0, Math.pow(term1, 2) - alpha / 0.95));
      CL = term1 - term2;
      CL = Math.min(1.0, Math.max(0.05, CL));
    }

    const designCapacity = CL * strengths.fm_d;
    const dcr = appliedStress / Math.max(1e-3, designCapacity);

    return {
      appliedStress,
      designCapacity,
      stabilityFactor: CL,
      slenderness: Rb,
      criticalBucklingStress: FbE,
      dcr,
      isCompliant: dcr <= 1.0,
    };
  }
}
