/**
 * ColumnSlendernessEngine.ts
 *
 * RC column second-order slenderness effects and moment magnification
 * per ACI 318-19 Section 6.6.4 and Eurocode 2 (EN 1992-1-1 Clause 5.8).
 */

import {
  ConcreteMaterial,
  RebarMaterial,
  ConcreteCalculationStep,
  ConcreteLimitStateResult,
} from '../core/ConcreteTypes';

export interface ColumnSlendernessConfig {
  /** Column width b (mm) */
  b_mm: number;
  /** Column height h (depth in bending plane) (mm) */
  h_mm: number;
  /** Unsupported column length lu (mm) */
  lu_mm: number;
  /** Effective length factor k (default 1.0 for pinned-pinned, 0.7 for fixed-pinned, etc.) */
  k_factor?: number;
  /** Factored axial load demand Pu (kN) */
  Pu_kN: number;
  /** Factored smaller end moment M1 (kNm) - positive if double curvature, negative if single curvature */
  M1_kNm: number;
  /** Factored larger end moment M2 (kNm) - always positive */
  M2_kNm: number;
  /** Factored sustained axial dead load Pu,sustained (kN) */
  Pu_sustained_kN?: number;
  /** Concrete material */
  concrete: ConcreteMaterial;
  /** Rebar material */
  rebar: RebarMaterial;
  /** Total longitudinal steel area Ast (mm²) */
  Ast_mm2?: number;
  /** Sway frame flag (default false = non-sway braced frame) */
  isSwayFrame?: boolean;
}

export interface ColumnSlendernessResult {
  /** Radius of gyration r (mm) */
  r_mm: number;
  /** Slenderness ratio k * lu / r */
  slendernessRatio: number;
  /** Slenderness threshold limit below which slenderness can be neglected */
  slendernessLimit: number;
  /** True if column is slender and second-order moment magnification is required */
  isSlender: boolean;
  /** Sustained load factor beta_dns */
  beta_dns: number;
  /** Effective flexural stiffness (EI)eff (N*mm²) */
  EI_eff_Nmm2: number;
  /** Critical Euler buckling load Pc (kN) */
  Pc_kN: number;
  /** Equivalent moment factor Cm */
  Cm: number;
  /** Moment magnification factor delta_ns */
  delta_ns: number;
  /** Minimum design moment M2,min due to accidental eccentricity (kNm) */
  M2_min_kNm: number;
  /** Magnified design moment Mc = delta_ns * max(M2, M2_min) (kNm) */
  Mc_magnified_kNm: number;
  /** Pass/Fail status */
  status: 'PASS' | 'FAIL';
  /** Limit state table entry */
  limitState: ConcreteLimitStateResult;
  /** Transparent mathematical derivations */
  calculationSteps: ConcreteCalculationStep[];
}

export class ColumnSlendernessEngine {
  static analyzeSlenderness(config: ColumnSlendernessConfig): ColumnSlendernessResult {
    const b = config.b_mm;
    const h = config.h_mm;
    const lu = config.lu_mm;
    const k = config.k_factor || 1.0;
    const Pu = Math.max(1.0, config.Pu_kN);
    const M1 = config.M1_kNm;
    const M2 = Math.max(0.1, config.M2_kNm);
    const Pu_sust = config.Pu_sustained_kN || 0.6 * Pu;
    const fc = config.concrete.fc_MPa;
    const Ec = config.concrete.Ec_MPa;

    const steps: ConcreteCalculationStep[] = [];

    // 1. Gross section properties
    const Ag = b * h;
    const Ig = (b * Math.pow(h, 3)) / 12; // mm⁴
    const r = Math.sqrt(Ig / Ag); // Exact radius of gyration (h / sqrt(12) = 0.2887 h)

    // 2. Slenderness ratio & threshold
    const slenderness = (k * lu) / r;
    // ACI 318-19 Section 6.2.5.1:
    // For non-sway columns: k*lu/r <= 34 + 12*(M1/M2) <= 40
    const ratio_M1_M2 = Math.max(-1.0, Math.min(1.0, M1 / M2));
    const slendernessLimit = Math.min(40.0, Math.max(22.0, 34.0 + 12.0 * ratio_M1_M2));
    const isSlender = slenderness > slendernessLimit;

    // 3. Sustained load creep factor beta_dns (ACI 318-19 Section 6.6.4.4.4)
    const beta_dns = Math.min(1.0, Math.max(0, Pu_sust / Pu));

    // 4. Effective flexural stiffness (EI)eff (ACI 318-19 Eq. 6.6.4.4.4a)
    // (EI)eff = 0.40 * Ec * Ig / (1 + beta_dns)
    const EI_eff = (0.40 * Ec * Ig) / (1.0 + beta_dns);

    // 5. Critical Euler buckling load Pc (kN) (ACI 318-19 Eq. 6.6.4.4.2)
    // Pc = pi^2 * (EI)eff / (k * lu)^2
    const Pc_N = (Math.PI * Math.PI * EI_eff) / Math.pow(k * lu, 2);
    const Pc_kN = Pc_N / 1000;

    // 6. Equivalent moment factor Cm (ACI 318-19 Eq. 6.6.4.5.3)
    // Cm = 0.60 + 0.40 * (M1 / M2) >= 0.40
    const Cm = Math.max(0.40, 0.60 + 0.40 * ratio_M1_M2);

    // 7. Moment magnification factor delta_ns (ACI 318-19 Eq. 6.6.4.5.2)
    // delta_ns = Cm / [1 - Pu / (0.75 * Pc)] >= 1.0
    const bucklingRatio = Pu / (0.75 * Pc_kN);
    let delta_ns = 1.0;

    if (isSlender) {
      if (bucklingRatio < 1.0) {
        delta_ns = Math.max(1.0, Cm / (1.0 - bucklingRatio));
      } else {
        // Exceeds Euler buckling capacity
        delta_ns = 99.0;
      }
    }

    // 8. Minimum design eccentricity & moment (ACI 318-19 Section 6.6.4.5.4)
    // M2,min = Pu * (15 + 0.03 * h) * 10^-3 (kNm)
    const emin_mm = 15.0 + 0.03 * h;
    const M2_min = (Pu * emin_mm) / 1000; // kNm

    const M2_governing = Math.max(M2, M2_min);
    const Mc = delta_ns * M2_governing;

    const bucklingPass = bucklingRatio < 0.75;

    // Steps log
    steps.push({
      title: 'Column Slenderness Verification',
      codeClause: 'ACI 318-19 §6.2.5.1',
      formulaLatex: '\\frac{k l_u}{r} \\le 34 + 12 \\left(\\frac{M_1}{M_2}\\right) \\le 40',
      substitutionLatex: `\\frac{${k.toFixed(2)} \\times ${lu}}{${r.toFixed(1)}} = ${slenderness.toFixed(1)} \\quad (\\text{Limit} = ${slendernessLimit.toFixed(1)})`,
      resultLatex: isSlender ? 'Slender column (second-order analysis required)' : 'Short column (slenderness negligible)',
      status: 'INFO',
    });

    steps.push({
      title: 'Critical Buckling Load & Stiffness (EI)eff',
      codeClause: 'ACI 318-19 §6.6.4.4',
      formulaLatex: 'P_c = \\frac{\\pi^2 (EI)_{eff}}{(k l_u)^2}, \\quad (EI)_{eff} = \\frac{0.40 E_c I_g}{1 + \\beta_{dns}}',
      substitutionLatex: `(EI)_{eff} = ${(EI_eff / 1e12).toFixed(2)} \\times 10^{12} \\text{ N}\\cdot\\text{mm}^2`,
      resultLatex: `P_c = ${Pc_kN.toFixed(1)} \\text{ kN} \\quad (P_u / (0.75 P_c) = ${bucklingRatio.toFixed(3)})`,
      status: bucklingPass ? 'PASS' : 'FAIL',
    });

    steps.push({
      title: 'Magnified Factored Design Moment (Mc)',
      codeClause: 'ACI 318-19 §6.6.4.5',
      formulaLatex: 'M_c = \\delta_{ns} \\max(M_2, M_{2,min}), \\quad \\delta_{ns} = \\frac{C_m}{1 - P_u / (0.75 P_c)}',
      substitutionLatex: `\\delta_{ns} = ${delta_ns.toFixed(3)}, \\quad M_{2,min} = ${M2_min.toFixed(1)} \\text{ kNm}`,
      resultLatex: `M_c = ${Mc.toFixed(1)} \\text{ kNm}`,
      status: 'INFO',
    });

    return {
      r_mm: r,
      slendernessRatio: slenderness,
      slendernessLimit,
      isSlender,
      beta_dns,
      EI_eff_Nmm2: EI_eff,
      Pc_kN,
      Cm,
      delta_ns,
      M2_min_kNm: M2_min,
      Mc_magnified_kNm: Mc,
      status: bucklingPass ? 'PASS' : 'FAIL',
      limitState: {
        limitStateName: 'Euler Column Buckling Stability (0.75*Pc)',
        codeClause: 'ACI 318-19 §6.6.4.4.2',
        nominalCapacity: Pc_kN,
        designCapacity: 0.75 * Pc_kN,
        appliedDemand: Pu,
        utilization: bucklingRatio,
        units: 'kN',
        governing: true,
        status: bucklingPass ? 'PASS' : 'FAIL',
        description: bucklingPass
          ? `Column is stable against Euler buckling (Pu = ${Pu.toFixed(0)} kN < 0.75*Pc = ${(0.75 * Pc_kN).toFixed(0)} kN)`
          : `Applied axial load Pu exceeds 0.75*Pc. Column is unstable under second-order buckling!`,
      },
      calculationSteps: steps,
    };
  }
}
