import { TendonAssembly } from '../tendon/StrandCatalog.js';
import { ConcreteCrossSection, ConcreteMaterialProperties } from './FiberStressAuditor.js';

export interface MildRebarInput {
  areaTensionMm2?: number;      // A_s (bottom rebar, typically grade 60 / 420 or 500 MPa)
  depthTensionMm?: number;      // d
  areaCompressionMm2?: number;  // A'_s (top rebar)
  depthCompressionMm?: number;  // d'
  yieldStrengthMpa?: number;    // f_y (e.g. 420 or 500 MPa)
}

export interface UltimateFlexureInput {
  section: ConcreteCrossSection;
  concrete: ConcreteMaterialProperties;
  tendon: TendonAssembly;
  effectivePrestressForceKn: number;
  tendonDepthFromTopMm: number; // d_p (mm)
  mildRebar?: MildRebarInput;
  factoredMomentDemandKnm: number; // M_u
}

export interface UltimateFlexureResult {
  tendonDepthMm: number;        // d_p
  stressInStrandAtNominalStrengthMpa: number; // f_ps (MPa)
  stressBlockDepthMm: number;   // a (mm)
  neutralAxisDepthMm: number;   // c = a / beta_1 (mm)
  beta1: number;
  netTensileStrain: number;     // epsilon_t
  strainClassification: 'tension-controlled' | 'transition' | 'compression-controlled';
  strengthReductionFactorPhi: number; // phi (0.65 to 0.90)
  nominalMomentCapacityKnm: number;   // M_n (kNm)
  designMomentCapacityAciKnm: number; // phi * M_n (kNm)
  designMomentCapacityEc2Knm: number; // M_Rd (kNm)
  factoredDemandKnm: number;          // M_u
  flexuralPass: boolean;
  flexuralUtilization: number;        // M_u / (phi * M_n)
  governingStandard: string;
}

export class UltimateFlexuralCapacityEngine {
  public static calculateUltimateCapacity(input: UltimateFlexureInput): UltimateFlexureResult {
    const { section, concrete, tendon, effectivePrestressForceKn: Peff, tendonDepthFromTopMm: dp } = input;
    const Mu = input.factoredMomentDemandKnm;

    const fc = concrete.fcMpa;
    const fpu = tendon.fpuMpa;
    const fpy = tendon.fpyMpa;
    const Aps = tendon.totalAreaMm2;
    const b = section.flangeWidthMm ?? section.webWidthMm; // effective compression flange width

    // Effective prestress in strands (MPa)
    const fpe = (Peff * 1000) / Aps;

    // Beta 1 factor per ACI 318-19 Section 22.2.2.4.3:
    // beta_1 = 0.85 for fc <= 28 MPa, reduces by 0.05 per 7 MPa above 28, min 0.65
    let beta1 = 0.85;
    if (fc > 28) {
      beta1 = Math.max(0.65, 0.85 - (0.05 * (fc - 28)) / 7);
    }

    // Prestress steel ratio:
    const rhoP = Aps / (b * dp);

    // Mild rebar parameters
    const As = input.mildRebar?.areaTensionMm2 ?? 0;
    const d = input.mildRebar?.depthTensionMm ?? dp;
    const AsPrime = input.mildRebar?.areaCompressionMm2 ?? 0;
    const dPrime = input.mildRebar?.depthCompressionMm ?? 50;
    const fy = input.mildRebar?.yieldStrengthMpa ?? 420;

    const omega = (As * fy) / (b * dp * fc);
    const omegaPrime = (AsPrime * fy) / (b * dp * fc);

    // 1. Calculate f_ps at nominal strength
    let fps = 0;
    if (tendon.systemType === 'bonded') {
      // ACI 318-19 Eq. 20.3.2.3.1:
      // f_ps = f_pu * [ 1 - (gamma_p / beta_1) * (rho_p * f_pu / f_c + d/d_p * (omega - omega')) ]
      // gamma_p = 0.28 for fpy / fpu >= 0.90 (low-relaxation strand)
      const gammaP = 0.28;
      const reinforcementIndex = (rhoP * fpu) / fc + (d / dp) * (omega - omegaPrime);
      fps = fpu * (1 - (gammaP / beta1) * Math.max(0, reinforcementIndex));
      fps = Math.min(fpu, Math.max(fpe, fps));
    } else {
      // Unbonded tendon per ACI 318-19 Eq. 20.3.2.4.1 (for span/depth <= 35):
      // f_ps = f_pe + 70 + f_c / (100 * rho_p) <= min(f_py, f_pe + 420)
      const unbondedIncrease = 70 + fc / (100 * Math.max(0.001, rhoP));
      fps = fpe + unbondedIncrease;
      fps = Math.min(fpy, Math.min(fpe + 420, fps));
    }

    // 2. Equilibrium: C = T => 0.85 * f_c * b * a = A_ps * f_ps + A_s * f_y - A'_s * f_y
    const totalTensionForceN = Aps * fps + As * fy - AsPrime * fy;
    const a = totalTensionForceN / (0.85 * fc * b);
    const c = a / beta1;

    // 3. Net tensile strain in extreme tension reinforcement:
    // epsilon_t = (d_p - c) / c * 0.003
    const epsilonT = Math.max(0, ((dp - c) / c) * 0.003);

    let strainClass: 'tension-controlled' | 'transition' | 'compression-controlled';
    let phi = 0.90;

    if (epsilonT >= 0.005) {
      strainClass = 'tension-controlled';
      phi = 0.90;
    } else if (epsilonT >= 0.002) {
      strainClass = 'transition';
      phi = 0.65 + 0.25 * ((epsilonT - 0.002) / 0.003);
    } else {
      strainClass = 'compression-controlled';
      phi = 0.65;
    }

    // 4. Nominal flexural strength M_n:
    // M_n = A_ps * f_ps * (d_p - a/2) + A_s * f_y * (d - a/2) (N*mm / 1e6 => kNm)
    const mnPrestressNmm = Aps * fps * (dp - a / 2);
    const mnMildNmm = As * fy * (d - a / 2);
    const mnKnm = (mnPrestressNmm + mnMildNmm) / 1e6;

    const phiMnAciKnm = phi * mnKnm;

    // Eurocode 2 EN 1992-1-1 Section 6.1:
    // Design yield f_pd = f_py / 1.15, concrete f_cd = 0.85 * f_c / 1.50 = 0.567 * f_c
    const fpd = fpy / 1.15;
    const fcd = (0.85 * fc) / 1.50;
    const aEc2 = (Aps * fpd + As * (fy / 1.15)) / (fcd * b);
    const mRdEc2Nmm = Aps * fpd * (dp - aEc2 / 2) + As * (fy / 1.15) * (d - aEc2 / 2);
    const mRdEc2Knm = mRdEc2Nmm / 1e6;

    const flexuralPass = phiMnAciKnm >= Mu;
    const flexuralUtilization = Mu / (phiMnAciKnm || 1);

    return {
      tendonDepthMm: Math.round(dp * 10) / 10,
      stressInStrandAtNominalStrengthMpa: Math.round(fps * 10) / 10,
      stressBlockDepthMm: Math.round(a * 10) / 10,
      neutralAxisDepthMm: Math.round(c * 10) / 10,
      beta1: Math.round(beta1 * 1000) / 1000,
      netTensileStrain: Math.round(epsilonT * 10000) / 10000,
      strainClassification: strainClass,
      strengthReductionFactorPhi: Math.round(phi * 1000) / 1000,
      nominalMomentCapacityKnm: Math.round(mnKnm * 10) / 10,
      designMomentCapacityAciKnm: Math.round(phiMnAciKnm * 10) / 10,
      designMomentCapacityEc2Knm: Math.round(mRdEc2Knm * 10) / 10,
      factoredDemandKnm: Math.round(Mu * 10) / 10,
      flexuralPass,
      flexuralUtilization: Math.round(flexuralUtilization * 1000) / 1000,
      governingStandard: 'ACI 318-19 Section 22.2 / Eurocode 2 Section 6.1',
    };
  }
}
