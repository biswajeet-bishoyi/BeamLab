/**
 * Weld Limit State Verification Engine
 * Implements:
 * 1. AISC 360-16 Section J2 (Fillet Welds, Directional Strength Eq. J2-5, Minimum/Maximum Weld Sizes)
 * 2. Eurocode 3 EN 1993-1-8 Section 4.5 (Simplified and Directional Methods, Correlation Factor beta_w)
 */

import {
  WELD_DATABASE,
  WeldElectrode,
  LimitStateResult,
  CalculationStep,
  DesignMethod,
} from '../core/ConnectionTypes';

// Eurocode 3 EN 1993-1-8 Table 4.1: Correlation factor beta_w
const EUROCODE_BETA_W: Record<string, number> = {
  S235: 0.80,
  S275: 0.85,
  S355: 0.90,
  S420: 1.00,
  S460: 1.00,
};

export class WeldLimitStateEngine {
  /**
   * AISC 360-16 Section J2.4 / Table J2.4: Minimum fillet weld leg size (mm)
   */
  public static getMinimumFilletWeldLeg_mm(thinnerPartThickness_mm: number): number {
    const t = thinnerPartThickness_mm;
    if (t <= 6.0) return 3.0; // 1/8 in
    if (t <= 13.0) return 5.0; // 3/16 in
    if (t <= 19.0) return 6.0; // 1/4 in
    return 8.0; // 5/16 in
  }

  /**
   * AISC 360-16 Section J2.2b: Maximum fillet weld leg size along edges (mm)
   */
  public static getMaximumFilletWeldLeg_mm(plateThickness_mm: number): number {
    const t = plateThickness_mm;
    if (t < 6.0) {
      return t;
    }
    return Math.max(1.0, t - 1.5); // t - 1/16 in
  }

  /**
   * AISC 360-16 Section J2.4: Fillet Weld Available Strength
   */
  public static checkAiscFilletWeld(options: {
    weldLeg_mm: number;      // w
    weldLength_mm: number;   // L
    electrode: WeldElectrode;
    loadAngle_deg?: number;  // theta: angle between weld longitudinal axis and resultant load (0 to 90 deg)
    demand_kN: number;
    method?: DesignMethod;
  }): LimitStateResult {
    const { weldLeg_mm, weldLength_mm, electrode, loadAngle_deg = 0, demand_kN, method = 'LRFD' } = options;
    const weldProps = WELD_DATABASE[electrode];
    const F_EXX = weldProps.tensileStrength_MPa;

    // Effective throat te = 0.7071 * w
    const te_mm = 0.7071 * weldLeg_mm;
    const effectiveArea_mm2 = te_mm * weldLength_mm;

    // Directional factor: (1.0 + 0.50 * sin(theta)^1.5)
    const thetaRad = (Math.min(90, Math.max(0, loadAngle_deg)) * Math.PI) / 180;
    const directionalFactor = 1.0 + 0.5 * Math.pow(Math.sin(thetaRad), 1.5);

    // Nominal weld stress: F_nw = 0.60 * F_EXX * directionalFactor
    const F_nw_MPa = 0.6 * F_EXX * directionalFactor;

    // Nominal strength Rn (kN)
    const Rn_kN = (F_nw_MPa * effectiveArea_mm2) / 1000;

    const phi = 0.75;
    const omega = 2.0;
    const designCapacity_kN = method === 'LRFD' ? phi * Rn_kN : Rn_kN / omega;
    const utilization = demand_kN / designCapacity_kN;

    const steps: CalculationStep[] = [
      {
        equationName: 'Effective Throat Thickness t_e',
        latexFormula: 't_e = 0.7071 \\cdot w',
        substitutedValues: `0.7071 \\cdot ${weldLeg_mm} = ${te_mm.toFixed(2)} mm`,
        resultValue: te_mm,
        unit: 'mm',
        citation: 'AISC 360-16 Section J2.2a',
        pass: true,
      },
      {
        equationName: 'Effective Weld Area A_we',
        latexFormula: 'A_{we} = t_e \\cdot L',
        substitutedValues: `${te_mm.toFixed(2)} \\cdot ${weldLength_mm} = ${effectiveArea_mm2.toFixed(1)} mm^2`,
        resultValue: effectiveArea_mm2,
        unit: 'mm²',
        citation: 'AISC 360-16 Section J2.4',
        pass: true,
      },
      {
        equationName: 'Directional Strength Factor',
        latexFormula: '(1.0 + 0.50 \\sin^{1.5}\\theta)',
        substitutedValues: `1.0 + 0.50 \\sin^{1.5}(${loadAngle_deg}^\\circ) = ${directionalFactor.toFixed(3)}`,
        resultValue: directionalFactor,
        unit: '',
        citation: 'AISC 360-16 Eq. J2-5',
        pass: true,
      },
      {
        equationName: 'Nominal Weld Strength R_n',
        latexFormula: 'R_n = F_{nw} \\cdot A_{we}',
        substitutedValues: `${F_nw_MPa.toFixed(1)} \\cdot ${effectiveArea_mm2.toFixed(1)} / 1000 = ${Rn_kN.toFixed(2)} kN`,
        resultValue: Rn_kN,
        unit: 'kN',
        citation: 'AISC 360-16 Eq. J2-4',
        pass: true,
      },
      {
        equationName: method === 'LRFD' ? 'Design Strength \\phi R_n' : 'Allowable Strength R_n / \\Omega',
        latexFormula: method === 'LRFD' ? '\\phi R_n = 0.75 \\cdot R_n' : 'R_n / \\Omega = R_n / 2.00',
        substitutedValues: `${designCapacity_kN.toFixed(2)} kN`,
        resultValue: designCapacity_kN,
        unit: 'kN',
        citation: 'AISC 360-16 Section J2.4',
        pass: utilization <= 1.0,
        utilization,
      },
    ];

    return {
      limitState: 'Fillet Weld Shear Rupture',
      capacity_kN: designCapacity_kN,
      demand_kN,
      utilization,
      pass: utilization <= 1.0,
      governingClause: 'AISC 360-16 Section J2.4 / Eq. J2-4 & J2-5',
      steps,
    };
  }

  /**
   * Eurocode 3 EN 1993-1-8 Clause 4.5.3.3: Simplified Method for Fillet Welds
   */
  public static checkEurocodeFilletWeldSimplified(options: {
    throat_mm: number;       // a
    weldLength_mm: number;   // L
    steelGrade: string;      // S235, S275, S355, S460
    fu_MPa: number;          // Base metal ultimate strength
    demand_kN: number;
    gammaM2?: number;
  }): LimitStateResult {
    const { throat_mm, weldLength_mm, steelGrade, fu_MPa, demand_kN, gammaM2 = 1.25 } = options;

    const beta_w = EUROCODE_BETA_W[steelGrade] || 0.90;

    // Design shear strength of the weld: f_vw,d = (f_u / sqrt(3)) / (beta_w * gamma_M2)
    const f_vw_d_MPa = (fu_MPa / Math.sqrt(3)) / (beta_w * gammaM2);

    // Design resistance per unit length: F_w,Rd_per_mm = f_vw,d * a
    const resistancePerMm_N = f_vw_d_MPa * throat_mm;

    // Total capacity = resistancePerMm * L
    const capacity_kN = (resistancePerMm_N * weldLength_mm) / 1000;
    const utilization = demand_kN / capacity_kN;

    const steps: CalculationStep[] = [
      {
        equationName: 'Correlation Factor \\beta_w',
        latexFormula: '\\beta_w',
        substitutedValues: `${beta_w} (${steelGrade})`,
        resultValue: beta_w,
        unit: '',
        citation: 'EN 1993-1-8 Table 4.1',
        pass: true,
      },
      {
        equationName: 'Design Shear Strength f_{vw,d}',
        latexFormula: 'f_{vw,d} = \\frac{f_u / \\sqrt{3}}{\\beta_w \\cdot \\gamma_{M2}}',
        substitutedValues: `\\frac{${fu_MPa} / 1.732}{${beta_w} \\cdot ${gammaM2}} = ${f_vw_d_MPa.toFixed(1)} MPa`,
        resultValue: f_vw_d_MPa,
        unit: 'MPa',
        citation: 'EN 1993-1-8 Eq. 4.4',
        pass: true,
      },
      {
        equationName: 'Design Weld Resistance F_{w,Rd}',
        latexFormula: 'F_{w,Rd} = f_{vw,d} \\cdot a \\cdot L',
        substitutedValues: `${f_vw_d_MPa.toFixed(1)} \\cdot ${throat_mm} \\cdot ${weldLength_mm} / 1000 = ${capacity_kN.toFixed(2)} kN`,
        resultValue: capacity_kN,
        unit: 'kN',
        citation: 'EN 1993-1-8 Clause 4.5.3.3',
        pass: utilization <= 1.0,
        utilization,
      },
    ];

    return {
      limitState: 'Fillet Weld Resistance (Eurocode 3 Simplified)',
      capacity_kN,
      demand_kN,
      utilization,
      pass: utilization <= 1.0,
      governingClause: 'EN 1993-1-8 Clause 4.5.3.3',
      steps,
    };
  }

  /**
   * Eurocode 3 EN 1993-1-8 Clause 4.5.3.2: Directional Method for Fillet Welds
   * Checks: sqrt(sigma_perp^2 + 3 * (tau_perp^2 + tau_par^2)) <= fu / (beta_w * gamma_M2)
   * and sigma_perp <= 0.9 * fu / gamma_M2
   */
  public static checkEurocodeFilletWeldDirectional(options: {
    throat_mm: number;
    weldLength_mm: number;
    steelGrade: string;
    fu_MPa: number;
    sigmaPerp_MPa: number; // Normal stress perpendicular to throat
    tauPerp_MPa: number;   // Shear stress perpendicular to weld axis in throat plane
    tauParallel_MPa: number; // Shear stress along weld axis
    gammaM2?: number;
  }): LimitStateResult {
    const {
      throat_mm,
      weldLength_mm,
      steelGrade,
      fu_MPa,
      sigmaPerp_MPa,
      tauPerp_MPa,
      tauParallel_MPa,
      gammaM2 = 1.25,
    } = options;

    const beta_w = EUROCODE_BETA_W[steelGrade] || 0.90;

    // Equivalent Von Mises stress in throat:
    const vonMises_MPa = Math.sqrt(
      Math.pow(sigmaPerp_MPa, 2) + 3 * (Math.pow(tauPerp_MPa, 2) + Math.pow(tauParallel_MPa, 2))
    );

    const allowableStress_MPa = fu_MPa / (beta_w * gammaM2);
    const allowableNormal_MPa = (0.9 * fu_MPa) / gammaM2;

    const utilVonMises = vonMises_MPa / allowableStress_MPa;
    const utilNormal = sigmaPerp_MPa / allowableNormal_MPa;
    const governingUtil = Math.max(utilVonMises, utilNormal);

    const steps: CalculationStep[] = [
      {
        equationName: 'Equivalent Weld Stress \\sigma_{eq}',
        latexFormula: '\\sigma_{eq} = \\sqrt{\\sigma_\\perp^2 + 3(\\tau_\\perp^2 + \\tau_\\parallel^2)}',
        substitutedValues: `\\sqrt{${sigmaPerp_MPa.toFixed(1)}^2 + 3(${tauPerp_MPa.toFixed(1)}^2 + ${tauParallel_MPa.toFixed(1)}^2)} = ${vonMises_MPa.toFixed(1)} MPa`,
        resultValue: vonMises_MPa,
        unit: 'MPa',
        citation: 'EN 1993-1-8 Eq. 4.1',
        pass: utilVonMises <= 1.0,
        utilization: utilVonMises,
      },
      {
        equationName: 'Stress Limit \\frac{f_u}{\\beta_w \\gamma_{M2}}',
        latexFormula: '\\frac{f_u}{\\beta_w \\gamma_{M2}}',
        substitutedValues: `\\frac{${fu_MPa}}{${beta_w} \\cdot ${gammaM2}} = ${allowableStress_MPa.toFixed(1)} MPa`,
        resultValue: allowableStress_MPa,
        unit: 'MPa',
        citation: 'EN 1993-1-8 Eq. 4.1',
        pass: true,
      },
      {
        equationName: 'Normal Stress Limit 0.9 \\frac{f_u}{\\gamma_{M2}}',
        latexFormula: '\\sigma_\\perp \\le 0.9 \\frac{f_u}{\\gamma_{M2}}',
        substitutedValues: `${sigmaPerp_MPa.toFixed(1)} \\le 0.9 \\frac{${fu_MPa}}{${gammaM2}} = ${allowableNormal_MPa.toFixed(1)} MPa`,
        resultValue: allowableNormal_MPa,
        unit: 'MPa',
        citation: 'EN 1993-1-8 Eq. 4.1',
        pass: utilNormal <= 1.0,
        utilization: utilNormal,
      },
    ];

    // Equivalent capacity in kN based on throat area and governing allowable stress
    const throatArea_mm2 = throat_mm * weldLength_mm;
    const capacity_kN = (allowableStress_MPa * throatArea_mm2) / 1000;
    const demand_kN = (vonMises_MPa * throatArea_mm2) / 1000;

    return {
      limitState: 'Fillet Weld Resistance (Eurocode 3 Directional)',
      capacity_kN,
      demand_kN,
      utilization: governingUtil,
      pass: governingUtil <= 1.0,
      governingClause: 'EN 1993-1-8 Clause 4.5.3.2',
      steps,
    };
  }
}
