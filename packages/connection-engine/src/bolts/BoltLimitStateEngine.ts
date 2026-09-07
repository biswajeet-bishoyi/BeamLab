/**
 * Bolt Limit State Verification Engine
 * Implements mechanical limit states for individual fasteners:
 * - AISC 360-16 Chapter J (Sections J3.6, J3.7, J3.8, J3.9, J3.10)
 * - Eurocode 3 EN 1993-1-8 (Clause 3.6, Clause 3.7, Table 3.4)
 */

import {
  BOLT_DATABASE,
  STANDARD_BOLT_GEOMETRY,
  BoltGrade,
  HoleType,
  LimitStateResult,
  CalculationStep,
  ThreadCondition,
  SlipSurfaceClass,
  DesignMethod,
} from '../core/ConnectionTypes';

// AISC 360-16 Table J3.1: Minimum Bolt Pretension T_b (kN)
const AISC_MINIMUM_BOLT_PRETENSION_KN: Record<number, Record<'A325' | 'A490' | 'GRADE_8_8' | 'GRADE_10_9', number>> = {
  16: { A325: 91, A490: 114, GRADE_8_8: 91, GRADE_10_9: 114 },
  20: { A325: 142, A490: 179, GRADE_8_8: 142, GRADE_10_9: 179 },
  22: { A325: 176, A490: 221, GRADE_8_8: 176, GRADE_10_9: 221 },
  24: { A325: 205, A490: 257, GRADE_8_8: 205, GRADE_10_9: 257 },
  27: { A325: 267, A490: 334, GRADE_8_8: 267, GRADE_10_9: 334 },
  30: { A325: 326, A490: 408, GRADE_8_8: 326, GRADE_10_9: 408 },
  36: { A325: 475, A490: 595, GRADE_8_8: 475, GRADE_10_9: 595 },
};

export class BoltLimitStateEngine {
  /**
   * AISC 360-16 Section J3.6: Bolt Shear Strength
   */
  public static checkAiscBoltShear(options: {
    grade: BoltGrade;
    diameter_mm: number;
    threadCondition: ThreadCondition;
    shearPlanes: number;
    demand_kN: number;
    method?: DesignMethod;
  }): LimitStateResult {
    const { grade, diameter_mm, threadCondition, shearPlanes, demand_kN, method = 'LRFD' } = options;
    const bolt = BOLT_DATABASE[grade];
    const geom = STANDARD_BOLT_GEOMETRY[diameter_mm] || {
      grossArea_mm2: (Math.PI * diameter_mm * diameter_mm) / 4,
      tensileStressArea_mm2: 0.78 * ((Math.PI * diameter_mm * diameter_mm) / 4),
      standardHole_mm: diameter_mm + 2,
    };

    const F_nv =
      threadCondition === 'INCLUDED'
        ? bolt.nominalShearStrengthThreadsIncluded_MPa
        : bolt.nominalShearStrengthThreadsExcluded_MPa;

    const A_b = geom.grossArea_mm2;
    const R_n_N = F_nv * A_b * shearPlanes;
    const R_n_kN = R_n_N / 1000;

    const phi = 0.75;
    const omega = 2.0;
    const designCapacity_kN = method === 'LRFD' ? phi * R_n_kN : R_n_kN / omega;
    const utilization = demand_kN / designCapacity_kN;

    const steps: CalculationStep[] = [
      {
        equationName: 'Nominal Shear Stress F_nv',
        latexFormula: 'F_{nv}',
        substitutedValues: `${F_nv} MPa (Threads ${threadCondition})`,
        resultValue: F_nv,
        unit: 'MPa',
        citation: 'AISC 360-16 Table J3.2',
        pass: true,
      },
      {
        equationName: 'Gross Bolt Area A_b',
        latexFormula: 'A_b = \\frac{\\pi d^2}{4}',
        substitutedValues: `\\frac{\\pi (${diameter_mm})^2}{4} = ${A_b.toFixed(1)} mm^2`,
        resultValue: A_b,
        unit: 'mm²',
        citation: 'AISC 360-16 Section J3.6',
        pass: true,
      },
      {
        equationName: 'Nominal Shear Strength R_n',
        latexFormula: 'R_n = F_{nv} \\cdot A_b \\cdot n_s',
        substitutedValues: `${F_nv} \\cdot ${A_b.toFixed(1)} \\cdot ${shearPlanes} = ${R_n_kN.toFixed(2)} kN`,
        resultValue: R_n_kN,
        unit: 'kN',
        citation: 'AISC 360-16 Eq. J3-1',
        pass: true,
      },
      {
        equationName: method === 'LRFD' ? 'Design Shear Strength \\phi R_n' : 'Allowable Shear Strength R_n / \\Omega',
        latexFormula: method === 'LRFD' ? '\\phi R_n = 0.75 \\cdot R_n' : 'R_n / \\Omega = R_n / 2.00',
        substitutedValues: `${method === 'LRFD' ? '0.75' : '1/2.00'} \\cdot ${R_n_kN.toFixed(2)} = ${designCapacity_kN.toFixed(2)} kN`,
        resultValue: designCapacity_kN,
        unit: 'kN',
        citation: 'AISC 360-16 Section J3.6',
        pass: utilization <= 1.0,
        utilization,
      },
    ];

    return {
      limitState: 'Bolt Shear Fracture',
      capacity_kN: designCapacity_kN,
      demand_kN,
      utilization,
      pass: utilization <= 1.0,
      governingClause: 'AISC 360-16 Section J3.6 / Table J3.2',
      steps,
    };
  }

  /**
   * AISC 360-16 Section J3.6: Bolt Tensile Strength
   */
  public static checkAiscBoltTension(options: {
    grade: BoltGrade;
    diameter_mm: number;
    demand_kN: number;
    method?: DesignMethod;
  }): LimitStateResult {
    const { grade, diameter_mm, demand_kN, method = 'LRFD' } = options;
    const bolt = BOLT_DATABASE[grade];
    const geom = STANDARD_BOLT_GEOMETRY[diameter_mm] || {
      grossArea_mm2: (Math.PI * diameter_mm * diameter_mm) / 4,
      tensileStressArea_mm2: 0.78 * ((Math.PI * diameter_mm * diameter_mm) / 4),
      standardHole_mm: diameter_mm + 2,
    };

    const F_nt = bolt.nominalTensileStrength_MPa;
    const A_b = geom.grossArea_mm2;
    const R_n_kN = (F_nt * A_b) / 1000;

    const phi = 0.75;
    const omega = 2.0;
    const designCapacity_kN = method === 'LRFD' ? phi * R_n_kN : R_n_kN / omega;
    const utilization = demand_kN / designCapacity_kN;

    const steps: CalculationStep[] = [
      {
        equationName: 'Nominal Tensile Stress F_nt',
        latexFormula: 'F_{nt}',
        substitutedValues: `${F_nt} MPa`,
        resultValue: F_nt,
        unit: 'MPa',
        citation: 'AISC 360-16 Table J3.2',
        pass: true,
      },
      {
        equationName: 'Nominal Tensile Strength R_n',
        latexFormula: 'R_n = F_{nt} \\cdot A_b',
        substitutedValues: `${F_nt} \\cdot ${A_b.toFixed(1)} = ${R_n_kN.toFixed(2)} kN`,
        resultValue: R_n_kN,
        unit: 'kN',
        citation: 'AISC 360-16 Eq. J3-1',
        pass: true,
      },
      {
        equationName: method === 'LRFD' ? 'Design Tensile Strength \\phi R_n' : 'Allowable Tensile Strength R_n / \\Omega',
        latexFormula: method === 'LRFD' ? '\\phi R_n = 0.75 \\cdot R_n' : 'R_n / \\Omega = R_n / 2.00',
        substitutedValues: `${designCapacity_kN.toFixed(2)} kN`,
        resultValue: designCapacity_kN,
        unit: 'kN',
        citation: 'AISC 360-16 Section J3.6',
        pass: utilization <= 1.0,
        utilization,
      },
    ];

    return {
      limitState: 'Bolt Tensile Rupture',
      capacity_kN: designCapacity_kN,
      demand_kN,
      utilization,
      pass: utilization <= 1.0,
      governingClause: 'AISC 360-16 Section J3.6 / Table J3.2',
      steps,
    };
  }

  /**
   * AISC 360-16 Section J3.7: Combined Tension and Shear in Bearing-Type Connections
   */
  public static checkAiscCombinedTensionShear(options: {
    grade: BoltGrade;
    diameter_mm: number;
    threadCondition: ThreadCondition;
    shearDemand_kN: number;
    tensionDemand_kN: number;
    method?: DesignMethod;
  }): LimitStateResult {
    const { grade, diameter_mm, threadCondition, shearDemand_kN, tensionDemand_kN, method = 'LRFD' } = options;
    const bolt = BOLT_DATABASE[grade];
    const geom = STANDARD_BOLT_GEOMETRY[diameter_mm] || {
      grossArea_mm2: (Math.PI * diameter_mm * diameter_mm) / 4,
      tensileStressArea_mm2: 0.78 * ((Math.PI * diameter_mm * diameter_mm) / 4),
      standardHole_mm: diameter_mm + 2,
    };

    const A_b = geom.grossArea_mm2;
    const F_nt = bolt.nominalTensileStrength_MPa;
    const F_nv =
      threadCondition === 'INCLUDED'
        ? bolt.nominalShearStrengthThreadsIncluded_MPa
        : bolt.nominalShearStrengthThreadsExcluded_MPa;

    // Required shear stress f_rv (MPa)
    const f_rv = (shearDemand_kN * 1000) / A_b;
    const phi = 0.75;
    const omega = 2.0;

    let F_nt_prime: number;
    if (method === 'LRFD') {
      // AISC Eq. J3-3a: F'_nt = 1.3 F_nt - (F_nt / (phi * F_nv)) * f_rv <= F_nt
      F_nt_prime = 1.3 * F_nt - (F_nt / (phi * F_nv)) * f_rv;
    } else {
      // AISC Eq. J3-3b: F'_nt = 1.3 F_nt - (omega * F_nt / F_nv) * f_rv <= F_nt
      F_nt_prime = 1.3 * F_nt - ((omega * F_nt) / F_nv) * f_rv;
    }
    F_nt_prime = Math.max(0, Math.min(F_nt, F_nt_prime));

    const nominalCapacity_kN = (F_nt_prime * A_b) / 1000;
    const designCapacity_kN = method === 'LRFD' ? phi * nominalCapacity_kN : nominalCapacity_kN / omega;
    const utilization = designCapacity_kN > 0 ? tensionDemand_kN / designCapacity_kN : 999.0;

    const steps: CalculationStep[] = [
      {
        equationName: 'Required Shear Stress f_rv',
        latexFormula: 'f_{rv} = \\frac{V_u}{A_b}',
        substitutedValues: `\\frac{${(shearDemand_kN * 1000).toFixed(0)}}{${A_b.toFixed(1)}} = ${f_rv.toFixed(1)} MPa`,
        resultValue: f_rv,
        unit: 'MPa',
        citation: 'AISC 360-16 Section J3.7',
        pass: true,
      },
      {
        equationName: 'Modified Nominal Tensile Stress F\'_nt',
        latexFormula: method === 'LRFD' 
          ? "F'_{nt} = 1.3 F_{nt} - \\frac{F_{nt}}{\\phi F_{nv}} f_{rv} \\le F_{nt}"
          : "F'_{nt} = 1.3 F_{nt} - \\frac{\\Omega F_{nt}}{F_{nv}} f_{rv} \\le F_{nt}",
        substitutedValues: `1.3(${F_nt}) - \\frac{${F_nt}}{${(phi * F_nv).toFixed(1)}}(${f_rv.toFixed(1)}) = ${F_nt_prime.toFixed(1)} MPa`,
        resultValue: F_nt_prime,
        unit: 'MPa',
        citation: method === 'LRFD' ? 'AISC 360-16 Eq. J3-3a' : 'AISC 360-16 Eq. J3-3b',
        pass: true,
      },
      {
        equationName: 'Available Combined Tensile Strength',
        latexFormula: method === 'LRFD' ? '\\phi R_n = 0.75 \\cdot F\'_{nt} \\cdot A_b' : 'R_n / \\Omega = F\'_{nt} A_b / 2.0',
        substitutedValues: `${designCapacity_kN.toFixed(2)} kN`,
        resultValue: designCapacity_kN,
        unit: 'kN',
        citation: 'AISC 360-16 Section J3.7',
        pass: utilization <= 1.0,
        utilization,
      },
    ];

    return {
      limitState: 'Combined Shear and Tension Interaction',
      capacity_kN: designCapacity_kN,
      demand_kN: tensionDemand_kN,
      utilization,
      pass: utilization <= 1.0,
      governingClause: 'AISC 360-16 Section J3.7 (Eq. J3-3)',
      steps,
    };
  }

  /**
   * AISC 360-16 Section J3.10: Bearing and Tearout Strength at Bolt Holes
   */
  public static checkAiscBearingAndTearout(options: {
    diameter_mm: number;
    plateThickness_mm: number;
    Fu_MPa: number;
    clearDistance_mm: number; // l_c
    deformationConsidered?: boolean;
    demand_kN: number;
    method?: DesignMethod;
  }): LimitStateResult {
    const {
      diameter_mm,
      plateThickness_mm,
      Fu_MPa,
      clearDistance_mm,
      deformationConsidered = true,
      demand_kN,
      method = 'LRFD',
    } = options;

    const t = plateThickness_mm;
    const d = diameter_mm;
    const lc = clearDistance_mm;

    // Nominal Tearout R_n,tearout
    const Rn_tearout_N = deformationConsidered ? 1.2 * lc * t * Fu_MPa : 1.5 * lc * t * Fu_MPa;

    // Nominal Bearing R_n,bearing
    const Rn_bearing_N = deformationConsidered ? 2.4 * d * t * Fu_MPa : 3.0 * d * t * Fu_MPa;

    // Governing capacity is minimum of tearout and bearing cap
    const Rn_governing_N = Math.min(Rn_tearout_N, Rn_bearing_N);
    const Rn_kN = Rn_governing_N / 1000;

    const phi = 0.75;
    const omega = 2.0;
    const designCapacity_kN = method === 'LRFD' ? phi * Rn_kN : Rn_kN / omega;
    const utilization = demand_kN / designCapacity_kN;

    const isTearoutGoverning = Rn_tearout_N < Rn_bearing_N;

    const steps: CalculationStep[] = [
      {
        equationName: 'Tearout Strength R_n,tearout',
        latexFormula: deformationConsidered ? 'R_n = 1.2 \\cdot l_c \\cdot t \\cdot F_u' : 'R_n = 1.5 \\cdot l_c \\cdot t \\cdot F_u',
        substitutedValues: `${deformationConsidered ? '1.2' : '1.5'} \\cdot ${lc.toFixed(1)} \\cdot ${t.toFixed(1)} \\cdot ${Fu_MPa} = ${(Rn_tearout_N / 1000).toFixed(2)} kN`,
        resultValue: Rn_tearout_N / 1000,
        unit: 'kN',
        citation: 'AISC 360-16 Eq. J3-6c / J3-6d',
        pass: true,
      },
      {
        equationName: 'Bearing Strength Limit R_n,bearing',
        latexFormula: deformationConsidered ? 'R_n \\le 2.4 \\cdot d \\cdot t \\cdot F_u' : 'R_n \\le 3.0 \\cdot d \\cdot t \\cdot F_u',
        substitutedValues: `${deformationConsidered ? '2.4' : '3.0'} \\cdot ${d} \\cdot ${t.toFixed(1)} \\cdot ${Fu_MPa} = ${(Rn_bearing_N / 1000).toFixed(2)} kN`,
        resultValue: Rn_bearing_N / 1000,
        unit: 'kN',
        citation: 'AISC 360-16 Eq. J3-6a / J3-6b',
        pass: true,
      },
      {
        equationName: 'Governing Design Strength',
        latexFormula: method === 'LRFD' ? '\\phi R_n = 0.75 \\cdot \\min(R_{n,tearout}, R_{n,bearing})' : 'R_n / \\Omega',
        substitutedValues: `${designCapacity_kN.toFixed(2)} kN (${isTearoutGoverning ? 'Tearout Governs' : 'Bearing Governs'})`,
        resultValue: designCapacity_kN,
        unit: 'kN',
        citation: 'AISC 360-16 Section J3.10',
        pass: utilization <= 1.0,
        utilization,
      },
    ];

    return {
      limitState: isTearoutGoverning ? 'Hole Tearout Rupture' : 'Bolt Hole Bearing Yielding',
      capacity_kN: designCapacity_kN,
      demand_kN,
      utilization,
      pass: utilization <= 1.0,
      governingClause: 'AISC 360-16 Section J3.10',
      steps,
    };
  }

  /**
   * AISC 360-16 Section J3.8: High-Strength Slip-Critical Connections
   */
  public static checkAiscSlipCritical(options: {
    grade: BoltGrade;
    diameter_mm: number;
    holeType: HoleType;
    surfaceClass: SlipSurfaceClass;
    shearPlanes: number;
    demand_kN: number;
  }): LimitStateResult {
    const { grade, diameter_mm, holeType, surfaceClass, shearPlanes, demand_kN } = options;

    const mu = surfaceClass === 'CLASS_A' ? 0.30 : surfaceClass === 'CLASS_B' ? 0.50 : 0.35;
    const Du = 1.13;
    const hf = 1.0; // Assuming no fillers

    const pretensionMap = AISC_MINIMUM_BOLT_PRETENSION_KN[diameter_mm];
    const Tb_kN = pretensionMap ? pretensionMap[grade as keyof typeof pretensionMap] || 142 : 142;

    // Resistance factor phi (Table J3.8): Standard hole phi = 1.00, Oversized/Short slotted = 0.85, Long slotted = 0.70
    let phi = 1.0;
    if (holeType === 'OVERSIZED' || holeType === 'SHORT_SLOT') phi = 0.85;
    if (holeType === 'LONG_SLOT') phi = 0.7;

    // R_n = mu * D_u * h_f * T_b * n_s (Eq. J3-4)
    const Rn_kN = mu * Du * hf * Tb_kN * shearPlanes;
    const designCapacity_kN = phi * Rn_kN;
    const utilization = demand_kN / designCapacity_kN;

    const steps: CalculationStep[] = [
      {
        equationName: 'Mean Slip Coefficient \\mu',
        latexFormula: '\\mu',
        substitutedValues: `${mu} (${surfaceClass})`,
        resultValue: mu,
        unit: '',
        citation: 'AISC 360-16 Section J3.8',
        pass: true,
      },
      {
        equationName: 'Minimum Bolt Pretension T_b',
        latexFormula: 'T_b',
        substitutedValues: `${Tb_kN} kN (${grade} dia ${diameter_mm}mm)`,
        resultValue: Tb_kN,
        unit: 'kN',
        citation: 'AISC 360-16 Table J3.1',
        pass: true,
      },
      {
        equationName: 'Nominal Slip Resistance R_n',
        latexFormula: 'R_n = \\mu \\cdot D_u \\cdot h_f \\cdot T_b \\cdot n_s',
        substitutedValues: `${mu} \\cdot 1.13 \\cdot 1.0 \\cdot ${Tb_kN} \\cdot ${shearPlanes} = ${Rn_kN.toFixed(2)} kN`,
        resultValue: Rn_kN,
        unit: 'kN',
        citation: 'AISC 360-16 Eq. J3-4',
        pass: true,
      },
      {
        equationName: 'Design Slip Resistance \\phi R_n',
        latexFormula: '\\phi R_n',
        substitutedValues: `${phi} \\cdot ${Rn_kN.toFixed(2)} = ${designCapacity_kN.toFixed(2)} kN`,
        resultValue: designCapacity_kN,
        unit: 'kN',
        citation: 'AISC 360-16 Section J3.8',
        pass: utilization <= 1.0,
        utilization,
      },
    ];

    return {
      limitState: 'Slip-Critical Friction Resistance',
      capacity_kN: designCapacity_kN,
      demand_kN,
      utilization,
      pass: utilization <= 1.0,
      governingClause: 'AISC 360-16 Section J3.8 (Eq. J3-4)',
      steps,
    };
  }

  /**
   * Eurocode 3 EN 1993-1-8 Table 3.4: Bolt Shear Resistance F_v,Rd
   */
  public static checkEurocodeBoltShear(options: {
    grade: BoltGrade;
    diameter_mm: number;
    threadCondition: ThreadCondition;
    shearPlanes: number;
    demand_kN: number;
    gammaM2?: number;
  }): LimitStateResult {
    const { grade, diameter_mm, threadCondition, shearPlanes, demand_kN, gammaM2 = 1.25 } = options;
    const bolt = BOLT_DATABASE[grade];
    const geom = STANDARD_BOLT_GEOMETRY[diameter_mm] || {
      grossArea_mm2: (Math.PI * diameter_mm * diameter_mm) / 4,
      tensileStressArea_mm2: 0.78 * ((Math.PI * diameter_mm * diameter_mm) / 4),
      standardHole_mm: diameter_mm + 2,
    };

    const fub = bolt.ultimateStrength_MPa;
    const isThreaded = threadCondition === 'INCLUDED';
    const area_mm2 = isThreaded ? geom.tensileStressArea_mm2 : geom.grossArea_mm2;

    // alpha_v = 0.6 for 4.6, 5.6, 8.8. For 10.9 alpha_v = 0.5 (if threaded). If unthreaded alpha_v = 0.6
    let alpha_v = 0.6;
    if (grade === 'GRADE_10_9' && isThreaded) {
      alpha_v = 0.5;
    }

    const F_v_Rd_N = (alpha_v * fub * area_mm2 * shearPlanes) / gammaM2;
    const capacity_kN = F_v_Rd_N / 1000;
    const utilization = demand_kN / capacity_kN;

    const steps: CalculationStep[] = [
      {
        equationName: 'Ultimate Bolt Tensile Strength f_ub',
        latexFormula: 'f_{ub}',
        substitutedValues: `${fub} MPa`,
        resultValue: fub,
        unit: 'MPa',
        citation: 'EN 1993-1-8 Table 3.1',
        pass: true,
      },
      {
        equationName: 'Design Shear Resistance F_v,Rd',
        latexFormula: 'F_{v,Rd} = \\frac{\\alpha_v \\cdot f_{ub} \\cdot A \\cdot n_s}{\\gamma_{M2}}',
        substitutedValues: `\\frac{${alpha_v} \\cdot ${fub} \\cdot ${area_mm2.toFixed(1)} \\cdot ${shearPlanes}}{${gammaM2}} = ${capacity_kN.toFixed(2)} kN`,
        resultValue: capacity_kN,
        unit: 'kN',
        citation: 'EN 1993-1-8 Table 3.4',
        pass: utilization <= 1.0,
        utilization,
      },
    ];

    return {
      limitState: 'Bolt Shear Resistance (Eurocode 3)',
      capacity_kN,
      demand_kN,
      utilization,
      pass: utilization <= 1.0,
      governingClause: 'EN 1993-1-8 Table 3.4',
      steps,
    };
  }

  /**
   * Eurocode 3 EN 1993-1-8 Table 3.4: Bolt Tension Resistance F_t,Rd
   */
  public static checkEurocodeBoltTension(options: {
    grade: BoltGrade;
    diameter_mm: number;
    demand_kN: number;
    gammaM2?: number;
  }): LimitStateResult {
    const { grade, diameter_mm, demand_kN, gammaM2 = 1.25 } = options;
    const bolt = BOLT_DATABASE[grade];
    const geom = STANDARD_BOLT_GEOMETRY[diameter_mm] || {
      grossArea_mm2: (Math.PI * diameter_mm * diameter_mm) / 4,
      tensileStressArea_mm2: 0.78 * ((Math.PI * diameter_mm * diameter_mm) / 4),
      standardHole_mm: diameter_mm + 2,
    };

    const fub = bolt.ultimateStrength_MPa;
    const As = geom.tensileStressArea_mm2;
    const k2 = 0.9;

    const Ft_Rd_N = (k2 * fub * As) / gammaM2;
    const capacity_kN = Ft_Rd_N / 1000;
    const utilization = demand_kN / capacity_kN;

    const steps: CalculationStep[] = [
      {
        equationName: 'Design Tension Resistance F_t,Rd',
        latexFormula: 'F_{t,Rd} = \\frac{k_2 \\cdot f_{ub} \\cdot A_s}{\\gamma_{M2}}',
        substitutedValues: `\\frac{0.9 \\cdot ${fub} \\cdot ${As.toFixed(1)}}{${gammaM2}} = ${capacity_kN.toFixed(2)} kN`,
        resultValue: capacity_kN,
        unit: 'kN',
        citation: 'EN 1993-1-8 Table 3.4',
        pass: utilization <= 1.0,
        utilization,
      },
    ];

    return {
      limitState: 'Bolt Tension Resistance (Eurocode 3)',
      capacity_kN,
      demand_kN,
      utilization,
      pass: utilization <= 1.0,
      governingClause: 'EN 1993-1-8 Table 3.4',
      steps,
    };
  }

  /**
   * Eurocode 3 EN 1993-1-8 Table 3.4: Combined Shear and Tension Interaction
   * F_v,Ed / F_v,Rd + F_t,Ed / (1.4 F_t,Rd) <= 1.0
   */
  public static checkEurocodeCombinedInteraction(options: {
    shearDemand_kN: number;
    shearCapacity_kN: number;
    tensionDemand_kN: number;
    tensionCapacity_kN: number;
  }): LimitStateResult {
    const { shearDemand_kN, shearCapacity_kN, tensionDemand_kN, tensionCapacity_kN } = options;

    const ratioShear = shearDemand_kN / shearCapacity_kN;
    const ratioTension = tensionDemand_kN / (1.4 * tensionCapacity_kN);
    const interactionSum = ratioShear + ratioTension;
    const tensionOnlyRatio = tensionDemand_kN / tensionCapacity_kN;

    const governingRatio = Math.max(interactionSum, tensionOnlyRatio);

    const steps: CalculationStep[] = [
      {
        equationName: 'Combined Shear & Tension Interaction',
        latexFormula: '\\frac{F_{v,Ed}}{F_{v,Rd}} + \\frac{F_{t,Ed}}{1.4 F_{t,Rd}} \\le 1.0',
        substitutedValues: `\\frac{${shearDemand_kN.toFixed(1)}}{${shearCapacity_kN.toFixed(1)}} + \\frac{${tensionDemand_kN.toFixed(1)}}{1.4(${tensionCapacity_kN.toFixed(1)})} = ${interactionSum.toFixed(3)}`,
        resultValue: interactionSum,
        unit: '',
        citation: 'EN 1993-1-8 Table 3.4',
        pass: interactionSum <= 1.0,
        utilization: interactionSum,
      },
    ];

    return {
      limitState: 'Combined Shear and Tension (Eurocode 3)',
      capacity_kN: tensionCapacity_kN,
      demand_kN: tensionDemand_kN,
      utilization: governingRatio,
      pass: governingRatio <= 1.0,
      governingClause: 'EN 1993-1-8 Table 3.4',
      steps,
    };
  }

  /**
   * Eurocode 3 EN 1993-1-8 Table 3.4: Plate Bearing Resistance F_b,Rd
   */
  public static checkEurocodeBearing(options: {
    grade: BoltGrade;
    diameter_mm: number;
    plateThickness_mm: number;
    plateFu_MPa: number;
    e1_mm: number; // end distance in load direction
    p1_mm: number; // pitch in load direction
    e2_mm: number; // edge distance perpendicular to load direction
    p2_mm: number; // gage perpendicular to load direction
    isEndBolt: boolean;
    demand_kN: number;
    gammaM2?: number;
  }): LimitStateResult {
    const {
      grade,
      diameter_mm,
      plateThickness_mm,
      plateFu_MPa,
      e1_mm,
      p1_mm,
      e2_mm,
      isEndBolt,
      demand_kN,
      gammaM2 = 1.25,
    } = options;

    const bolt = BOLT_DATABASE[grade];
    const geom = STANDARD_BOLT_GEOMETRY[diameter_mm] || { standardHole_mm: diameter_mm + 2 };
    const d0 = geom.standardHole_mm;
    const fub = bolt.ultimateStrength_MPa;
    const fu = plateFu_MPa;
    const d = diameter_mm;
    const t = plateThickness_mm;

    // alpha_d calculation
    const alpha_d = isEndBolt ? e1_mm / (3 * d0) : p1_mm / (3 * d0) - 0.25;
    const alpha_b = Math.min(alpha_d, fub / fu, 1.0);

    // k1 calculation
    const k1 = Math.min(2.8 * (e2_mm / d0) - 1.7, 2.5);

    // F_b,Rd = (k1 * alpha_b * fu * d * t) / gammaM2
    const Fb_Rd_N = (k1 * alpha_b * fu * d * t) / gammaM2;
    const capacity_kN = Fb_Rd_N / 1000;
    const utilization = demand_kN / capacity_kN;

    const steps: CalculationStep[] = [
      {
        equationName: 'Bearing Parameter \\alpha_b',
        latexFormula: '\\alpha_b = \\min\\left(\\alpha_d, \\frac{f_{ub}}{f_u}, 1.0\\right)',
        substitutedValues: `\\min(${alpha_d.toFixed(2)}, ${(fub / fu).toFixed(2)}, 1.0) = ${alpha_b.toFixed(2)}`,
        resultValue: alpha_b,
        unit: '',
        citation: 'EN 1993-1-8 Table 3.4',
        pass: true,
      },
      {
        equationName: 'Edge Factor k_1',
        latexFormula: 'k_1 = \\min\\left(2.8 \\frac{e_2}{d_0} - 1.7, 2.5\\right)',
        substitutedValues: `\\min(2.8 \\cdot \\frac{${e2_mm}}{${d0}} - 1.7, 2.5) = ${k1.toFixed(2)}`,
        resultValue: k1,
        unit: '',
        citation: 'EN 1993-1-8 Table 3.4',
        pass: true,
      },
      {
        equationName: 'Design Bearing Resistance F_b,Rd',
        latexFormula: 'F_{b,Rd} = \\frac{k_1 \\cdot \\alpha_b \\cdot f_u \\cdot d \\cdot t}{\\gamma_{M2}}',
        substitutedValues: `\\frac{${k1.toFixed(2)} \\cdot ${alpha_b.toFixed(2)} \\cdot ${fu} \\cdot ${d} \\cdot ${t}}{${gammaM2}} = ${capacity_kN.toFixed(2)} kN`,
        resultValue: capacity_kN,
        unit: 'kN',
        citation: 'EN 1993-1-8 Table 3.4',
        pass: utilization <= 1.0,
        utilization,
      },
    ];

    return {
      limitState: 'Plate Bearing Resistance (Eurocode 3)',
      capacity_kN,
      demand_kN,
      utilization,
      pass: utilization <= 1.0,
      governingClause: 'EN 1993-1-8 Table 3.4',
      steps,
    };
  }
}
