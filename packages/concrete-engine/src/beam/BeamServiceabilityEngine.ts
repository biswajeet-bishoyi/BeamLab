/**
 * BeamServiceabilityEngine.ts
 *
 * RC beam serviceability verification:
 * 1. Cracking moment Mcr & transformed cracked section moment of inertia Icr.
 * 2. Effective moment of inertia Ie per ACI 318-19 Eq. 24.2.3.5a (Bischoff formula).
 * 3. Long-term deflection multiplier lambda_delta for creep and shrinkage.
 * 4. Flexural crack control per ACI 318-19 Section 24.3.2 & Eurocode 2 Clause 7.3.4.
 */

import {
  ConcreteMaterial,
  RebarMaterial,
  ConcreteCalculationStep,
  ConcreteLimitStateResult,
} from '../core/ConcreteTypes';

export interface BeamServiceabilityConfig {
  /** Beam width bw (mm) */
  bw_mm: number;
  /** Beam total depth h (mm) */
  h_mm: number;
  /** Effective depth d to tension steel (mm) */
  d_mm: number;
  /** Depth d' to compression steel (mm) */
  d_prime_mm?: number;
  /** Clear concrete cover cc (mm) */
  clearCover_mm: number;
  /** Tension steel area As (mm²) */
  As_mm2: number;
  /** Compression steel area A's (mm²) */
  As_prime_mm2?: number;
  /** Actual center-to-center spacing of longitudinal tension bars s_bar (mm) */
  barSpacing_mm: number;
  /** Concrete material */
  concrete: ConcreteMaterial;
  /** Rebar material */
  rebar: RebarMaterial;
  /** Service unfactored dead load moment MD (kNm) */
  MD_kNm: number;
  /** Service unfactored live load moment ML (kNm) */
  ML_kNm: number;
  /** Sustained live load fraction (typically 0.25 to 0.50) */
  sustainedLiveFraction?: number;
}

export interface BeamServiceabilityResult {
  /** Modulus of rupture fr (MPa) */
  fr_MPa: number;
  /** Gross moment of inertia Ig (mm⁴) */
  Ig_mm4: number;
  /** Cracking moment Mcr (kNm) */
  Mcr_kNm: number;
  /** Cracked section neutral axis kd (mm) */
  kd_mm: number;
  /** Cracked transformed moment of inertia Icr (mm⁴) */
  Icr_mm4: number;
  /** Effective moment of inertia Ie under total service load (mm⁴) */
  Ie_mm4: number;
  /** Ratio Ie / Ig */
  inertiaRatio: number;
  /** Long-term deflection multiplier lambda_delta (for 5+ years sustained load) */
  lambda_delta: number;
  /** Maximum allowable rebar spacing for crack control s_max (mm) */
  s_max_crack_mm: number;
  /** Service steel stress fs (MPa) */
  fs_MPa: number;
  /** Characteristic crack width wk (mm) per EC2 */
  wk_mm: number;
  /** Pass/Fail status */
  status: 'PASS' | 'FAIL';
  /** Limit states table */
  limitStates: ConcreteLimitStateResult[];
  /** Transparent mathematical derivations */
  calculationSteps: ConcreteCalculationStep[];
}

export class BeamServiceabilityEngine {
  static analyzeServiceability(config: BeamServiceabilityConfig): BeamServiceabilityResult {
    const bw = config.bw_mm;
    const h = config.h_mm;
    const d = config.d_mm;
    const dPrime = config.d_prime_mm || 50;
    const cc = config.clearCover_mm;
    const As = config.As_mm2;
    const AsPrime = config.As_prime_mm2 || 0;
    const s_bar = config.barSpacing_mm;
    const MD = config.MD_kNm;
    const ML = config.ML_kNm;
    const Ma = MD + ML; // Total service moment (kNm)
    const fc = config.concrete.fc_MPa;
    const fy = config.rebar.fy_MPa;
    const Ec = config.concrete.Ec_MPa;
    const Es = config.rebar.Es_MPa;
    const fr = config.concrete.fr_MPa; // Modulus of rupture

    const limitStates: ConcreteLimitStateResult[] = [];
    const steps: ConcreteCalculationStep[] = [];

    // 1. Gross section properties
    const Ig = (bw * Math.pow(h, 3)) / 12; // mm⁴
    const yt = h / 2;
    const Mcr = (fr * Ig) / (yt * 1e6); // kNm

    // 2. Cracked section properties (modular ratio n = Es / Ec)
    const n = Es / Ec;
    const rho = As / (bw * d);
    const rhoPrime = AsPrime / (bw * d);

    // Quadratic equation for cracked neutral axis k:
    // 0.5 * bw * (kd)^2 + (n - 1)*As'*(kd - d') = n*As*(d - kd)
    // 0.5 * bw * (kd)^2 + [(n - 1)*As' + n*As] * kd - [(n - 1)*As'*d' + n*As*d] = 0
    const A_quad = 0.5 * bw;
    const B_quad = (n - 1) * AsPrime + n * As;
    const C_quad = -((n - 1) * AsPrime * dPrime + n * As * d);

    const discriminant = B_quad * B_quad - 4 * A_quad * C_quad;
    const kd = (-B_quad + Math.sqrt(discriminant)) / (2 * A_quad);

    // Cracked moment of inertia Icr (mm⁴)
    const Icr_concrete = (bw * Math.pow(kd, 3)) / 3;
    const Icr_tensionSteel = n * As * Math.pow(d - kd, 2);
    const Icr_compSteel = AsPrime > 0 && kd > dPrime ? (n - 1) * AsPrime * Math.pow(kd - dPrime, 2) : 0;
    const Icr = Icr_concrete + Icr_tensionSteel + Icr_compSteel;

    // 3. Effective moment of inertia Ie (ACI 318-19 Eq. 24.2.3.5a Bischoff formula)
    let Ie = Ig;
    const crackingThreshold = (2.0 / 3.0) * Mcr;

    if (Ma > crackingThreshold) {
      const termRatio = (crackingThreshold / Ma);
      const denominator = 1.0 - Math.pow(termRatio, 2) * (1.0 - Icr / Ig);
      Ie = Math.min(Ig, Math.max(Icr, Icr / denominator));
    }

    // 4. Long-term deflection multiplier lambda_delta (ACI 318-19 Section 24.2.4.1.1)
    // xi = 2.0 for 5+ years sustained loading
    const xi = 2.0;
    const lambda_delta = xi / (1.0 + 50.0 * rhoPrime);

    // 5. Flexural crack control spacing (ACI 318-19 Section 24.3.2)
    // fs = service steel stress (approx (2/3)*fy or derived from cracked section)
    const armZ = d - kd / 3;
    const fs = Math.min((2 / 3) * fy, (Ma * 1e6) / (As * Math.max(10, armZ)));
    const s_max_crack = Math.min(
      380 * (280 / fs) - 2.5 * cc,
      300 * (280 / fs)
    );

    const crackSpacingPass = s_bar <= s_max_crack;
    limitStates.push({
      limitStateName: 'Flexural Crack Control Bar Spacing (ACI §24.3.2)',
      codeClause: 'ACI 318-19 Table 24.3.2',
      nominalCapacity: s_max_crack,
      designCapacity: s_max_crack,
      appliedDemand: s_bar,
      utilization: s_bar / s_max_crack,
      units: 'mm',
      governing: false,
      status: crackSpacingPass ? 'PASS' : 'FAIL',
      description: crackSpacingPass
        ? `Tension bar spacing (${s_bar} mm) satisfies crack control maximum (${s_max_crack.toFixed(0)} mm)`
        : `Tension bar spacing (${s_bar} mm) exceeds crack control limit (${s_max_crack.toFixed(0)} mm)`,
    });

    // 6. Direct characteristic crack width wk per Eurocode 2 Clause 7.3.4
    // wk = sr,max * (eps_sm - eps_cm)
    const barDiameter = Math.sqrt((4 * As) / (Math.PI * Math.max(1, Math.round(bw / s_bar))));
    const h_eff = Math.min(2.5 * (h - d), (h - kd) / 3, h / 2);
    const Ac_eff = bw * h_eff;
    const rho_p_eff = As / Ac_eff;
    // sr,max = 3.4 * cc + 0.425 * k1 * k2 * phi / rho_p_eff
    const k1 = 0.8; // high bond bars
    const k2 = 0.5; // pure bending
    const sr_max = 3.4 * cc + (0.425 * k1 * k2 * barDiameter) / Math.max(0.005, rho_p_eff);
    const eps_sm_minus_cm = Math.max(
      0.6 * (fs / Es),
      (fs - 0.4 * (fr / rho_p_eff)) / Es
    );
    const wk = Math.max(0, sr_max * eps_sm_minus_cm);
    const wk_pass = wk <= 0.30; // 0.3 mm standard limit for quasi-permanent loads

    limitStates.push({
      limitStateName: 'Characteristic Crack Width wk (EC2 Cl. 7.3.4)',
      codeClause: 'EN 1992-1-1 Cl. 7.3.4',
      nominalCapacity: 0.30,
      designCapacity: 0.30,
      appliedDemand: wk,
      utilization: wk / 0.30,
      units: 'mm',
      governing: false,
      status: wk_pass ? 'PASS' : 'FAIL',
      description: wk_pass
        ? `Crack width wk (${wk.toFixed(3)} mm) is within limit (0.300 mm)`
        : `Crack width wk (${wk.toFixed(3)} mm) exceeds limit (0.300 mm)`,
    });

    // Step-by-step logs
    steps.push({
      title: 'Cracking Moment & Section Stiffening',
      codeClause: 'ACI 318-19 §24.2.3.5',
      formulaLatex: 'M_{cr} = \\frac{f_r I_g}{y_t}',
      substitutionLatex: `\\frac{${fr.toFixed(2)} \\times ${(Ig / 1e6).toFixed(1)} \\times 10^6}{${yt.toFixed(0)}}`,
      resultLatex: `M_{cr} = ${Mcr.toFixed(1)} \\text{ kNm} \\quad (M_a = ${Ma.toFixed(1)} \\text{ kNm})`,
      status: 'INFO',
    });

    steps.push({
      title: 'Effective Moment of Inertia (Bischoff Equation)',
      codeClause: 'ACI 318-19 Eq. 24.2.3.5a',
      formulaLatex: 'I_e = \\frac{I_{cr}}{1 - \\left(\\frac{2}{3} \\frac{M_{cr}}{M_a}\\right)^2 \\left(1 - \\frac{I_{cr}}{I_g}\\right)} \\le I_g',
      substitutionLatex: `I_{cr} = ${(Icr / 1e6).toFixed(1)} \\times 10^6 \\text{ mm}^4, \\quad I_g = ${(Ig / 1e6).toFixed(1)} \\times 10^6 \\text{ mm}^4`,
      resultLatex: `I_e = ${(Ie / 1e6).toFixed(1)} \\times 10^6 \\text{ mm}^4 \\quad (I_e / I_g = ${(Ie / Ig).toFixed(2)})`,
      status: 'INFO',
    });

    steps.push({
      title: 'Long-Term Deflection Multiplier',
      codeClause: 'ACI 318-19 §24.2.4.1.1',
      formulaLatex: '\\lambda_\\Delta = \\frac{\\xi}{1 + 50 \\rho\'}',
      substitutionLatex: `\\frac{2.0}{1 + 50 \\times ${rhoPrime.toFixed(4)}}`,
      resultLatex: `\\lambda_\\Delta = ${lambda_delta.toFixed(2)}`,
      status: 'INFO',
    });

    return {
      fr_MPa: fr,
      Ig_mm4: Ig,
      Mcr_kNm: Mcr,
      kd_mm: kd,
      Icr_mm4: Icr,
      Ie_mm4: Ie,
      inertiaRatio: Ie / Ig,
      lambda_delta,
      s_max_crack_mm: s_max_crack,
      fs_MPa: fs,
      wk_mm: wk,
      status: crackSpacingPass && wk_pass ? 'PASS' : 'FAIL',
      limitStates,
      calculationSteps: steps,
    };
  }
}
