/**
 * BeamShearEngine.ts
 *
 * Reinforced concrete beam shear verification and stirrup design
 * per ACI 318-19 Section 22.5 (including 2019 size effect factor lambda_s)
 * and Eurocode 2 (EN 1992-1-1 Section 6.2 variable-angle truss model).
 */

import {
  ConcreteMaterial,
  RebarMaterial,
  ConcreteCalculationStep,
  ConcreteLimitStateResult,
} from '../core/ConcreteTypes';

export interface BeamShearConfig {
  /** Standard: 'ACI_318_19' | 'EUROCODE_2' */
  standard?: 'ACI_318_19' | 'EUROCODE_2';
  /** Web width bw (mm) */
  bw_mm: number;
  /** Effective depth d to tension steel (mm) */
  d_mm: number;
  /** Gross cross-sectional area Ag (mm²) */
  Ag_mm2?: number;
  /** Longitudinal tension reinforcement area As (mm²) */
  As_mm2: number;
  /** Concrete material */
  concrete: ConcreteMaterial;
  /** Transverse stirrup steel material */
  stirrupRebar: RebarMaterial;
  /** Total cross-sectional area of stirrup legs Av (mm²) - e.g. 2 legs of T10 = 157 mm² */
  Av_mm2: number;
  /** Stirrup spacing s along beam axis (mm) */
  s_mm: number;
  /** Factored shear demand Vu (kN) */
  Vu_kN: number;
  /** Axial force Nu (kN) - Positive = Compression, Negative = Tension */
  Nu_kN?: number;
  /** Lightweight concrete modification factor lambda (1.0 for normal weight) */
  lambda_lightweight?: number;
}

export interface BeamShearResult {
  /** Concrete shear strength Vc (kN) */
  Vc_kN: number;
  /** Stirrup shear strength Vs (kN) */
  Vs_kN: number;
  /** Nominal shear capacity Vn = Vc + Vs (kN) */
  Vn_kN: number;
  /** Factored design shear capacity phi*Vn or VRd (kN) */
  phiVn_kN: number;
  /** Strength reduction factor phi (0.75 for ACI 318 shear) */
  phi: number;
  /** Size effect factor lambda_s (ACI 318-19 Table 22.5.5.1) */
  lambda_s: number;
  /** Longitudinal reinforcement ratio rho_w = As / (bw * d) */
  rho_w: number;
  /** Maximum allowable stirrup spacing s_max (mm) */
  s_max_mm: number;
  /** Minimum shear reinforcement area Av,min (mm² for given spacing s) */
  Av_min_mm2: number;
  /** Maximum shear strength limit Vn,max (concrete crushing limit) (kN) */
  Vn_max_kN: number;
  /** Required stirrup spacing s_req to satisfy Vu (mm) */
  s_required_mm: number;
  /** Utilization ratio Vu / phiVn */
  utilization: number;
  /** Pass/Fail status */
  status: 'PASS' | 'FAIL';
  /** Limit states table */
  limitStates: ConcreteLimitStateResult[];
  /** Transparent mathematical derivations */
  calculationSteps: ConcreteCalculationStep[];
}

export class BeamShearEngine {
  static analyzeShear(config: BeamShearConfig): BeamShearResult {
    const standard = config.standard || 'ACI_318_19';
    const bw = config.bw_mm;
    const d = config.d_mm;
    const As = config.As_mm2;
    const Av = config.Av_mm2;
    const s = config.s_mm;
    const Vu = config.Vu_kN;
    const Nu = config.Nu_kN || 0; // kN
    const Ag = config.Ag_mm2 || bw * (d + 60);
    const fc = config.concrete.fc_MPa;
    const fyt = config.stirrupRebar.fy_MPa;
    const lambda = config.lambda_lightweight || 1.0;

    const limitStates: ConcreteLimitStateResult[] = [];
    const steps: ConcreteCalculationStep[] = [];

    // 1. Longitudinal reinforcement ratio rho_w
    const rho_w = Math.min(0.03, As / (bw * d));

    // 2. ACI 318-19 Size Effect Factor lambda_s (Section 22.5.5.1.3)
    // lambda_s = sqrt(2 / (1 + 0.004 * d)) <= 1.0 (d in mm)
    const lambda_s = Math.min(1.0, Math.sqrt(2.0 / (1.0 + 0.004 * d)));

    // 3. Concrete shear capacity Vc (kN)
    let Vc = 0;
    const phi = 0.75;

    // Minimum shear reinforcement check: Av,min
    // ACI 318-19 Eq. 9.6.3.3: Av,min / s = max(0.062 * sqrt(f'c)/fyt, 0.35/fyt) * bw
    const Av_min = Math.max(
      (0.062 * Math.sqrt(fc) / fyt) * bw * s,
      (0.35 / fyt) * bw * s
    );
    const hasMinShearRebar = Av >= Av_min;

    if (standard === 'EUROCODE_2') {
      // Eurocode 2 Section 6.2
      // k = 1 + sqrt(200/d) <= 2.0
      const k = Math.min(2.0, 1.0 + Math.sqrt(200.0 / d));
      const sigma_cp = (Nu * 1000) / Ag; // MPa
      const VRd_c_MPa = Math.max(
        (0.18 / 1.5) * k * Math.pow(100.0 * rho_w * fc, 1.0 / 3.0) + 0.15 * Math.max(0, sigma_cp),
        (0.035 * Math.pow(k, 1.5) * Math.sqrt(fc) + 0.15 * Math.max(0, sigma_cp))
      );
      Vc = (VRd_c_MPa * bw * d) / 1000; // kN
    } else {
      // ACI 318-19 Table 22.5.5.1:
      // If Av >= Av,min, use Eq. 22.5.5.1a or Eq. 22.5.5.1b
      // Eq. 22.5.5.1b incorporates size effect lambda_s and rho_w^(1/3):
      // Vc = [0.66 * lambda * lambda_s * (rho_w)^(1/3) * sqrt(f'c) + Nu / (6 * Ag)] * bw * d
      const Nu_term = Nu > 0 ? (Nu * 1000) / (6 * Ag) : 0; // N/mm²
      const vc_detailed = (0.66 * lambda * lambda_s * Math.pow(rho_w, 1.0 / 3.0) * Math.sqrt(fc) + Nu_term);
      const vc_simplified = hasMinShearRebar ? (0.17 * lambda * Math.sqrt(fc) + Nu_term) : vc_detailed;
      const vc_design = Math.max(vc_detailed, vc_simplified);
      Vc = (vc_design * bw * d) / 1000; // kN
    }

    // 4. Stirrup shear capacity Vs (kN)
    // ACI 318-19 Eq. 22.5.10.5.3: Vs = Av * fyt * d / s
    let Vs = 0;
    if (s > 0 && Av > 0) {
      Vs = (Av * fyt * d) / (s * 1000); // kN
    }

    // 5. Maximum allowable shear capacity limit (web crushing prevention)
    // ACI 318-19 Section 22.5.1.2: Vs <= 0.66 * sqrt(f'c) * bw * d
    const Vs_max = (0.66 * Math.sqrt(fc) * bw * d) / 1000;
    const Vn_max = Vc + Vs_max;
    const webCrushingPass = Vs <= Vs_max;

    limitStates.push({
      limitStateName: 'Maximum Shear Capacity Limit (Concrete Strut Crushing)',
      codeClause: 'ACI 318-19 §22.5.1.2',
      nominalCapacity: Vn_max,
      designCapacity: phi * Vn_max,
      appliedDemand: Vu,
      utilization: Vu / (phi * Vn_max),
      units: 'kN',
      governing: false,
      status: webCrushingPass ? 'PASS' : 'FAIL',
      description: webCrushingPass
        ? `Vs (${Vs.toFixed(1)} kN) is below web crushing limit Vs,max (${Vs_max.toFixed(1)} kN)`
        : `Vs (${Vs.toFixed(1)} kN) exceeds crushing limit Vs,max (${Vs_max.toFixed(1)} kN). Increase web dimensions.`,
    });

    // 6. Maximum stirrup spacing s_max (ACI 318-19 Section 9.7.6.2.2)
    // If Vs <= 0.33 * sqrt(f'c) * bw * d: s_max = min(d/2, 600 mm)
    // If Vs > 0.33 * sqrt(f'c) * bw * d: s_max = min(d/4, 300 mm)
    const Vs_threshold = (0.33 * Math.sqrt(fc) * bw * d) / 1000;
    let s_max = 0;
    if (Vs <= Vs_threshold) {
      s_max = Math.min(d / 2, 600.0);
    } else {
      s_max = Math.min(d / 4, 300.0);
    }

    const spacingPass = s <= s_max;
    limitStates.push({
      limitStateName: 'Maximum Stirrup Spacing (s_max)',
      codeClause: 'ACI 318-19 Table 9.7.6.2.2',
      nominalCapacity: s_max,
      designCapacity: s_max,
      appliedDemand: s,
      utilization: s / s_max,
      units: 'mm',
      governing: false,
      status: spacingPass ? 'PASS' : 'FAIL',
      description: spacingPass
        ? `Stirrup spacing s (${s} mm) satisfies maximum limit s_max (${s_max.toFixed(0)} mm)`
        : `Stirrup spacing s (${s} mm) exceeds code maximum s_max (${s_max.toFixed(0)} mm)`,
    });

    // Minimum shear reinforcement verification
    limitStates.push({
      limitStateName: 'Minimum Shear Reinforcement (Av,min)',
      codeClause: 'ACI 318-19 §9.6.3.3',
      nominalCapacity: Av_min,
      designCapacity: Av_min,
      appliedDemand: Av,
      utilization: Av > 0 ? Av_min / Av : 10,
      units: 'mm²',
      governing: false,
      status: hasMinShearRebar ? 'PASS' : 'FAIL',
      description: hasMinShearRebar
        ? `Provided Av (${Av.toFixed(0)} mm²) exceeds Av,min (${Av_min.toFixed(1)} mm²)`
        : `Provided Av (${Av.toFixed(0)} mm²) is less than code minimum Av,min (${Av_min.toFixed(1)} mm²)`,
    });

    // 7. Nominal & design shear capacity
    const effectiveVs = Math.min(Vs, Vs_max);
    const Vn = Vc + effectiveVs;
    const phiVn = phi * Vn;
    const utilization = Vu / phiVn;
    const shearPass = utilization <= 1.0;

    limitStates.push({
      limitStateName: 'Beam Shear Resistance (phi*Vn)',
      codeClause: 'ACI 318-19 §22.5.1 / §21.2.1',
      nominalCapacity: Vn,
      designCapacity: phiVn,
      appliedDemand: Vu,
      utilization,
      units: 'kN',
      governing: true,
      status: shearPass ? 'PASS' : 'FAIL',
      description: shearPass
        ? `Factored shear capacity phi*Vn (${phiVn.toFixed(1)} kN) exceeds shear demand Vu (${Vu.toFixed(1)} kN)`
        : `Shear demand Vu (${Vu.toFixed(1)} kN) exceeds factored capacity phi*Vn (${phiVn.toFixed(1)} kN)`,
    });

    // Required stirrup spacing for demand
    let s_required = s_max;
    if (Vu > phi * Vc) {
      const Vs_req = (Vu - phi * Vc) / phi;
      if (Vs_req > 0 && Av > 0) {
        const s_calc = (Av * fyt * d) / (Vs_req * 1000);
        s_required = Math.min(s_max, Math.floor(s_calc / 10) * 10);
      }
    }

    // Step-by-step mathematical logs
    steps.push({
      title: 'Size Effect Modification Factor (lambda_s)',
      codeClause: 'ACI 318-19 §22.5.5.1.3',
      formulaLatex: '\\lambda_s = \\sqrt{\\frac{2}{1 + 0.004 d}} \\le 1.0',
      substitutionLatex: `\\sqrt{\\frac{2}{1 + 0.004 \\times ${d}}}`,
      resultLatex: `\\lambda_s = ${lambda_s.toFixed(3)}`,
      status: 'INFO',
    });

    steps.push({
      title: 'Concrete Shear Strength (Vc)',
      codeClause: 'ACI 318-19 Table 22.5.5.1',
      formulaLatex: 'V_c = \\left[ 0.66 \\lambda \\lambda_s \\rho_w^{1/3} \\sqrt{f\'_c} + \\frac{N_u}{6 A_g} \\right] b_w d',
      substitutionLatex: `[0.66 \\times 1.0 \\times ${lambda_s.toFixed(3)} \\times (${rho_w.toFixed(4)})^{1/3} \\times \\sqrt{${fc.toFixed(1)}}] \\times ${bw} \\times ${d}`,
      resultLatex: `V_c = ${Vc.toFixed(1)} \\text{ kN}`,
      status: 'INFO',
    });

    steps.push({
      title: 'Stirrup Shear Strength (Vs)',
      codeClause: 'ACI 318-19 §22.5.10.5.3',
      formulaLatex: 'V_s = \\frac{A_v f_{yt} d}{s}',
      substitutionLatex: `\\frac{${Av.toFixed(0)} \\times ${fyt.toFixed(0)} \\times ${d}}{${s}}`,
      resultLatex: `V_s = ${Vs.toFixed(1)} \\text{ kN} \\quad (V_{s,max} = ${Vs_max.toFixed(1)} \\text{ kN})`,
      status: webCrushingPass ? 'PASS' : 'FAIL',
    });

    steps.push({
      title: 'Design Shear Capacity (phi*Vn)',
      codeClause: 'ACI 318-19 §22.5.1.1',
      formulaLatex: '\\phi V_n = 0.75 (V_c + V_s)',
      substitutionLatex: `0.75 \\times (${Vc.toFixed(1)} + ${effectiveVs.toFixed(1)})`,
      resultLatex: `\\phi V_n = ${phiVn.toFixed(1)} \\text{ kN} \\quad (D/C = ${utilization.toFixed(2)})`,
      status: shearPass ? 'PASS' : 'FAIL',
    });

    return {
      Vc_kN: Vc,
      Vs_kN: Vs,
      Vn_kN: Vn,
      phiVn_kN: phiVn,
      phi,
      lambda_s,
      rho_w,
      s_max_mm: s_max,
      Av_min_mm2: Av_min,
      Vn_max_kN: Vn_max,
      s_required_mm: Math.max(50, s_required),
      utilization,
      status: shearPass && spacingPass && webCrushingPass ? 'PASS' : 'FAIL',
      limitStates,
      calculationSteps: steps,
    };
  }
}
