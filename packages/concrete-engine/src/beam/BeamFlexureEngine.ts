/**
 * BeamFlexureEngine.ts
 *
 * Reinforced concrete beam flexural design and verification per ACI 318-19 Chapter 9
 * and Eurocode 2 (EN 1992-1-1 Section 6.1).
 * Supports singly & doubly reinforced rectangular and flanged (T & L) cross-sections.
 */

import {
  ConcreteMaterial,
  RebarMaterial,
  ConcreteCalculationStep,
  ConcreteLimitStateResult,
} from '../core/ConcreteTypes';
import { ConcreteConstitutiveModel } from '../materials/ConcreteConstitutiveModel';

export interface BeamFlexureConfig {
  /** Standard: 'ACI_318_19' | 'EUROCODE_2' */
  standard?: 'ACI_318_19' | 'EUROCODE_2';
  /** Web width bw (mm) */
  bw_mm: number;
  /** Overall beam height h (mm) */
  h_mm: number;
  /** Effective depth d to tension centroid (mm) */
  d_mm: number;
  /** Effective depth d' to compression steel centroid (mm) */
  d_prime_mm?: number;
  /** Flange width bf (mm) - if flanged T-beam */
  bf_mm?: number;
  /** Flange thickness hf (mm) - if flanged T-beam */
  hf_mm?: number;
  /** Tension reinforcement area As (mm²) */
  As_mm2: number;
  /** Compression reinforcement area A's (mm²) */
  As_prime_mm2?: number;
  /** Concrete material */
  concrete: ConcreteMaterial;
  /** Rebar steel material */
  rebar: RebarMaterial;
  /** Factored design bending moment Mu (kNm) */
  Mu_kNm: number;
}

export interface BeamFlexureResult {
  /** Nominal flexural capacity Mn (kNm) */
  Mn_kNm: number;
  /** Factored design capacity phi*Mn or MRd (kNm) */
  phiMn_kNm: number;
  /** Strength reduction factor phi (ACI) or 1.0 (EC2 uses material factors) */
  phi: number;
  /** Neutral axis depth c (mm) */
  c_mm: number;
  /** Equivalent stress block depth a = beta1 * c (mm) */
  a_mm: number;
  /** Extreme tension steel strain eps_t */
  eps_t: number;
  /** Compression steel stress fs' (MPa) */
  fs_prime_MPa: number;
  /** Section classification: 'TENSION_CONTROLLED' | 'TRANSITION' | 'COMPRESSION_CONTROLLED' */
  sectionClassification: 'TENSION_CONTROLLED' | 'TRANSITION' | 'COMPRESSION_CONTROLLED';
  /** Minimum tensile steel area As,min (mm²) */
  As_min_mm2: number;
  /** Maximum tensile steel area As,max (mm²) */
  As_max_mm2: number;
  /** Flanged behavior flag (true if neutral axis penetrates web: a > hf) */
  isFlangedBehavior: boolean;
  /** Utilization ratio Mu / phiMn */
  utilization: number;
  /** Pass/Fail status */
  status: 'PASS' | 'FAIL';
  /** Limit states table */
  limitStates: ConcreteLimitStateResult[];
  /** Transparent mathematical derivations */
  calculationSteps: ConcreteCalculationStep[];
}

export class BeamFlexureEngine {
  static analyzeFlexure(config: BeamFlexureConfig): BeamFlexureResult {
    const standard = config.standard || 'ACI_318_19';
    const bw = config.bw_mm;
    const h = config.h_mm;
    const d = config.d_mm;
    const dPrime = config.d_prime_mm || 50;
    const bf = config.bf_mm || bw;
    const hf = config.hf_mm || 0;
    const As = config.As_mm2;
    const AsPrime = config.As_prime_mm2 || 0;
    const fc = config.concrete.fc_MPa;
    const fy = config.rebar.fy_MPa;
    const Es = config.rebar.Es_MPa;
    const epsCu = config.concrete.eps_cu; // 0.003 ACI, 0.0035 EC2
    const epsY = fy / Es;

    const concreteModel = new ConcreteConstitutiveModel(config.concrete);
    const beta1 = concreteModel.beta1_aci;

    const limitStates: ConcreteLimitStateResult[] = [];
    const steps: ConcreteCalculationStep[] = [];

    // 1. Minimum reinforcement check
    let As_min = 0;
    if (standard === 'EUROCODE_2') {
      // EC2 Clause 9.2.1.1: As,min = 0.26 * (fctm / fyk) * bt * d >= 0.0013 * bt * d
      const fctm = config.concrete.fr_MPa;
      As_min = Math.max(0.26 * (fctm / fy) * bw * d, 0.0013 * bw * d);
    } else {
      // ACI 318-19 Section 9.6.1.2: As,min = max(0.25 * sqrt(f'c)/fy, 1.4/fy) * bw * d
      As_min = Math.max((0.25 * Math.sqrt(fc) / fy) * bw * d, (1.4 / fy) * bw * d);
    }

    const minPass = As >= As_min;
    limitStates.push({
      limitStateName: 'Minimum Flexural Reinforcement (As,min)',
      codeClause: standard === 'EUROCODE_2' ? 'EN 1992-1-1 Cl. 9.2.1.1' : 'ACI 318-19 §9.6.1.2',
      nominalCapacity: As_min,
      designCapacity: As_min,
      appliedDemand: As,
      utilization: As > 0 ? As_min / As : 10,
      units: 'mm²',
      governing: false,
      status: minPass ? 'PASS' : 'FAIL',
      description: minPass
        ? `Tension steel As (${As.toFixed(0)} mm²) exceeds minimum required As,min (${As_min.toFixed(0)} mm²)`
        : `Tension steel As (${As.toFixed(0)} mm²) is less than minimum As,min (${As_min.toFixed(0)} mm²)`,
    });

    steps.push({
      title: 'Minimum Reinforcement Verification',
      codeClause: standard === 'EUROCODE_2' ? 'EN 1992-1-1 Cl. 9.2.1.1' : 'ACI 318-19 §9.6.1.2',
      formulaLatex: 'A_{s,min} = \\max\\left(\\frac{0.25\\sqrt{f\'_c}}{f_y}, \\frac{1.4}{f_y}\\right) b_w d',
      substitutionLatex: `\\max\\left(\\frac{0.25\\sqrt{${fc.toFixed(1)}}}{${fy.toFixed(0)}}, \\frac{1.4}{${fy.toFixed(0)}}\\right) \\times ${bw} \\times ${d}`,
      resultLatex: `A_{s,min} = ${As_min.toFixed(1)} \\text{ mm}^2 \\implies \\text{${minPass ? 'Adequate' : 'Under-reinforced'}}`,
      status: minPass ? 'PASS' : 'FAIL',
    });

    // 2. Iterative equilibrium solution for neutral axis depth c (mm)
    // C_c(c) + C_s(c) = T_s(c)
    let c = 50.0;
    let a = beta1 * c;
    let fsPrime = 0;
    let isFlanged = false;

    for (let iter = 0; iter < 50; iter++) {
      a = beta1 * c;

      // Concrete compression force
      let Cc = 0;
      if (bf > bw && hf > 0 && a > hf) {
        // Flanged T-beam behavior: concrete stress block extends into web
        isFlanged = true;
        const Cc_flange = 0.85 * fc * (bf - bw) * hf;
        const Cc_web = 0.85 * fc * bw * a;
        Cc = Cc_flange + Cc_web;
      } else {
        // Rectangular behavior with width b (bf if flanged and a <= hf, else bw)
        isFlanged = false;
        const bEffective = bf > bw && a <= hf ? bf : bw;
        Cc = 0.85 * fc * bEffective * a;
      }

      // Compression steel force
      let Cs = 0;
      if (AsPrime > 0) {
        const epsSPrime = epsCu * (c - dPrime) / c;
        if (epsSPrime > 0) {
          fsPrime = Math.min(fy, Math.max(-fy, Es * epsSPrime));
          // Subtract concrete displaced by compression rebar (0.85*f'c)
          Cs = AsPrime * (fsPrime - 0.85 * fc);
        } else {
          fsPrime = 0;
          Cs = 0;
        }
      }

      // Tension steel force
      const epsT = epsCu * (d - c) / c;
      const fs = Math.min(fy, Math.max(-fy, Es * epsT));
      const Ts = As * fs;

      const residual = Cc + Cs - Ts;
      if (Math.abs(residual) < 10) {
        // Equilibrium converged within 10 N
        break;
      }

      // Secant/Newton step
      const dCc_dc = 0.85 * fc * (isFlanged ? bw : (bf > bw && a <= hf ? bf : bw)) * beta1;
      const dCs_dc = AsPrime > 0 && c > dPrime ? AsPrime * Es * (epsCu * dPrime / (c * c)) : 0;
      const dTs_dc = -As * (epsT < epsY ? Es * (epsCu * d / (c * c)) : 0);
      const dRes_dc = dCc_dc + dCs_dc - dTs_dc;

      const step = dRes_dc > 0 ? residual / dRes_dc : residual / 1000;
      c = Math.max(5.0, Math.min(d * 0.95, c - step));
    }

    a = beta1 * c;
    const epsT = epsCu * (d - c) / c;

    // 3. Section Classification & Strength Reduction Factor phi
    let classification: 'TENSION_CONTROLLED' | 'TRANSITION' | 'COMPRESSION_CONTROLLED' = 'TENSION_CONTROLLED';
    let phi = 0.90;

    if (standard === 'EUROCODE_2') {
      phi = 1.0; // EC2 applies partial factors on material properties (1.5 concrete, 1.15 steel)
      classification = epsT >= 0.005 ? 'TENSION_CONTROLLED' : 'TRANSITION';
    } else {
      // ACI 318-19 Table 21.2.2
      if (epsT >= 0.005) {
        classification = 'TENSION_CONTROLLED';
        phi = 0.90;
      } else if (epsT <= epsY) {
        classification = 'COMPRESSION_CONTROLLED';
        phi = 0.65;
      } else {
        classification = 'TRANSITION';
        phi = 0.65 + (epsT - epsY) * (0.25 / (0.005 - epsY));
      }
    }

    // 4. Nominal flexural strength Mn (kNm)
    let Mn = 0;
    if (isFlanged) {
      const Cc_flange = 0.85 * fc * (bf - bw) * hf;
      const Cc_web = 0.85 * fc * bw * a;
      const Mn_flange = Cc_flange * (d - hf / 2);
      const Mn_web = Cc_web * (d - a / 2);
      let Mn_Cs = 0;
      if (AsPrime > 0 && fsPrime > 0) {
        Mn_Cs = AsPrime * (fsPrime - 0.85 * fc) * (d - dPrime);
      }
      Mn = (Mn_flange + Mn_web + Mn_Cs) / 1e6; // kNm
    } else {
      const bEff = bf > bw && a <= hf ? bf : bw;
      const Cc = 0.85 * fc * bEff * a;
      const Mn_concrete = Cc * (d - a / 2);
      let Mn_Cs = 0;
      if (AsPrime > 0 && fsPrime > 0) {
        Mn_Cs = AsPrime * (fsPrime - 0.85 * fc) * (d - dPrime);
      }
      Mn = (Mn_concrete + Mn_Cs) / 1e6; // kNm
    }

    const phiMn = phi * Mn;
    const utilization = config.Mu_kNm / phiMn;
    const flexurePass = utilization <= 1.0;

    limitStates.push({
      limitStateName: 'Flexural Moment Resistance (phi*Mn)',
      codeClause: standard === 'EUROCODE_2' ? 'EN 1992-1-1 Cl. 6.1' : 'ACI 318-19 §9.5.2 / Table 21.2.2',
      nominalCapacity: Mn,
      designCapacity: phiMn,
      appliedDemand: config.Mu_kNm,
      utilization,
      units: 'kNm',
      governing: true,
      status: flexurePass ? 'PASS' : 'FAIL',
      description: flexurePass
        ? `Factored moment capacity phi*Mn (${phiMn.toFixed(1)} kNm) exceeds demand Mu (${config.Mu_kNm.toFixed(1)} kNm)`
        : `Applied moment Mu (${config.Mu_kNm.toFixed(1)} kNm) exceeds factored capacity phi*Mn (${phiMn.toFixed(1)} kNm)`,
    });

    // 5. Maximum reinforcement limit (Ductility check: eps_t >= 0.004 per ACI 318 Section 9.3.3.1)
    const ductilityPass = epsT >= 0.004;
    limitStates.push({
      limitStateName: 'Tension Ductility Limit (eps_t >= 0.004)',
      codeClause: 'ACI 318-19 §9.3.3.1',
      nominalCapacity: 0.004,
      designCapacity: 0.004,
      appliedDemand: epsT,
      utilization: epsT > 0 ? 0.004 / epsT : 10,
      units: 'strain',
      governing: false,
      status: ductilityPass ? 'PASS' : 'FAIL',
      description: ductilityPass
        ? `Tensile strain eps_t (${epsT.toFixed(4)}) exceeds ductility threshold 0.004`
        : `Tensile strain eps_t (${epsT.toFixed(4)}) is below minimum ductility limit 0.004 (brittle behavior)`,
    });

    steps.push({
      title: 'Neutral Axis Depth & Compression Block',
      codeClause: 'ACI 318-19 §22.2.2.4',
      formulaLatex: 'a = \\beta_1 c, \\quad C_c = 0.85 f\'_c b_w a',
      substitutionLatex: `a = ${beta1.toFixed(3)} \\times ${c.toFixed(1)} = ${a.toFixed(1)} \\text{ mm}`,
      resultLatex: `c = ${c.toFixed(1)} \\text{ mm}, \\quad \\epsilon_t = ${epsT.toFixed(4)}`,
      status: 'INFO',
    });

    steps.push({
      title: 'Strength Reduction Factor (phi)',
      codeClause: 'ACI 318-19 Table 21.2.2',
      formulaLatex: '\\phi = 0.65 + (\\epsilon_t - \\epsilon_y) \\frac{0.25}{0.005 - \\epsilon_y} \\le 0.90',
      substitutionLatex: `\\epsilon_t = ${epsT.toFixed(4)}, \\quad \\epsilon_y = ${epsY.toFixed(4)}`,
      resultLatex: `\\phi = ${phi.toFixed(3)} \\quad (\\text{${classification}})`,
      status: 'INFO',
    });

    steps.push({
      title: 'Factored Flexural Moment Capacity',
      codeClause: 'ACI 318-19 §22.1.2',
      formulaLatex: '\\phi M_n = \\phi \\left[ A_s f_y (d - a/2) \\right]',
      substitutionLatex: `${phi.toFixed(3)} \\times ${Mn.toFixed(1)} \\text{ kNm}`,
      resultLatex: `\\phi M_n = ${phiMn.toFixed(1)} \\text{ kNm} \\quad (D/C = ${utilization.toFixed(2)})`,
      status: flexurePass ? 'PASS' : 'FAIL',
    });

    // Compute As,max (approximate corresponding to eps_t = 0.004)
    const c_max = (epsCu / (epsCu + 0.004)) * d;
    const a_max = beta1 * c_max;
    const As_max = (0.85 * fc * bw * a_max) / fy;

    return {
      Mn_kNm: Mn,
      phiMn_kNm: phiMn,
      phi,
      c_mm: c,
      a_mm: a,
      eps_t: epsT,
      fs_prime_MPa: fsPrime,
      sectionClassification: classification,
      As_min_mm2: As_min,
      As_max_mm2: As_max,
      isFlangedBehavior: isFlanged,
      utilization,
      status: flexurePass && minPass && ductilityPass ? 'PASS' : 'FAIL',
      limitStates,
      calculationSteps: steps,
    };
  }
}
