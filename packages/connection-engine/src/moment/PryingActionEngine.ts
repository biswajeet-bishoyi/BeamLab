/**
 * Non-Linear Prying Action & Equivalent T-Stub Mechanics Engine
 * Implements:
 * 1. AISC 15th Edition Manual Part 9 (Prying Action Formulation)
 * 2. Eurocode 3 EN 1993-1-8 Clause 6.2.4 (Equivalent T-Stub Plastic Modes 1, 2, 3)
 */

import { LimitStateResult, CalculationStep, DesignMethod } from '../core/ConnectionTypes';

export interface PryingActionInput {
  flangeThickness_mm: number;      // End-plate or column flange thickness t
  Fy_MPa: number;                  // Yield strength of plate/flange
  Fu_MPa: number;                  // Tensile strength of plate/flange
  boltDiameter_mm: number;         // d_b
  holeDiameter_mm: number;         // d_h
  boltTensionCapacity_kN: number;  // Available tension per bolt B (phi * F_nt * A_b)
  dimension_b_mm: number;          // Distance from bolt line to face of web or weld toe
  dimension_a_mm: number;          // Distance from bolt line to edge of plate/flange
  tributaryLength_p_mm: number;    // Tributary length per bolt p
  tensionDemandPerBolt_kN: number; // Applied tension demand per bolt T
  method?: DesignMethod;
}

export interface PryingActionResult {
  governingResistancePerBolt_kN: number;
  totalBoltTensionDemand_kN: number; // Applied tension T + prying force Q
  pryingForce_Q_kN: number;
  hasPrying: boolean;
  requiredThicknessNoPrying_tc_mm: number;
  alphaPrime: number;
  utilization: number;
  pass: boolean;
  limitStateResult: LimitStateResult;
}

export interface EurocodeTStubInput {
  flangeThickness_mm: number;
  effectiveLength_leff_mm: number; // sum l_eff
  fy_MPa: number;
  boltTensionResistance_Ft_Rd_kN: number; // sum F_t,Rd for the bolt pair/row
  dimension_m_mm: number;          // lever arm m
  dimension_e_mm: number;          // edge distance e
  tensionDemand_kN: number;
  gammaM0?: number;
  gammaM2?: number;
}

export interface EurocodeTStubResult {
  governingResistance_kN: number;
  governingMode: 'MODE_1_COMPLETE_FLANGE_YIELDING' | 'MODE_2_BOLT_FAILURE_WITH_FLANGE_YIELD' | 'MODE_3_BOLT_FAILURE_NO_PRYING';
  mode1Capacity_kN: number;
  mode2Capacity_kN: number;
  mode3Capacity_kN: number;
  utilization: number;
  pass: boolean;
  limitStateResult: LimitStateResult;
}

export class PryingActionEngine {
  /**
   * AISC 15th Edition Manual Part 9: Prying Action Analysis
   */
  public static calculateAiscPrying(input: PryingActionInput): PryingActionResult {
    const {
      flangeThickness_mm,
      Fy_MPa,
      boltDiameter_mm,
      holeDiameter_mm,
      boltTensionCapacity_kN,
      dimension_b_mm,
      dimension_a_mm,
      tributaryLength_p_mm,
      tensionDemandPerBolt_kN,
    } = input;

    const t = flangeThickness_mm;
    const B = boltTensionCapacity_kN;
    const p = tributaryLength_p_mm;
    const db = boltDiameter_mm;
    const dh = holeDiameter_mm;

    // a <= 1.25 b per AISC Manual Part 9
    const a = Math.min(dimension_a_mm, 1.25 * dimension_b_mm);
    const b = dimension_b_mm;

    const b_prime = Math.max(1, b - db / 2);
    const a_prime = a + db / 2;
    const rho = b_prime / a_prime;

    // delta = 1 - d'/p (ratio of net area at bolt line to gross area)
    const delta = Math.max(0.1, 1 - dh / p);

    // Critical thickness for no prying: t_c = sqrt(4 * B * 1000 * b' / (phi * F_y * p))
    // phi = 0.90 for plate bending
    const phiBending = 0.90;
    const tc_mm = Math.sqrt((4 * (B * 1000) * b_prime) / (phiBending * Fy_MPa * p));

    let alpha_prime = 0;
    let availableCapacityPerBolt_kN = B;
    let pryingForce_Q_kN = 0;
    let hasPrying = false;

    if (t >= tc_mm) {
      // No prying action develops: full bolt tension available
      hasPrying = false;
      availableCapacityPerBolt_kN = B;
      pryingForce_Q_kN = 0;
    } else {
      hasPrying = true;
      // alpha' = (1 / (delta * (1 + rho))) * ((t_c / t)^2 - 1)
      const thicknessRatioSq = Math.pow(tc_mm / t, 2);
      alpha_prime = (1 / (delta * (1 + rho))) * (thicknessRatioSq - 1);

      if (alpha_prime <= 0) {
        availableCapacityPerBolt_kN = B;
        pryingForce_Q_kN = 0;
      } else if (alpha_prime <= 1.0) {
        availableCapacityPerBolt_kN = B * Math.pow(t / tc_mm, 2) * (1 + delta * alpha_prime);
        pryingForce_Q_kN = B * (delta * alpha_prime * rho * Math.pow(t / tc_mm, 4));
      } else {
        availableCapacityPerBolt_kN = B * Math.pow(t / tc_mm, 2) * (1 + delta);
        pryingForce_Q_kN = B * (delta * rho * Math.pow(t / tc_mm, 4));
      }
    }

    const totalDemandPerBolt_kN = tensionDemandPerBolt_kN + pryingForce_Q_kN;
    const utilization = availableCapacityPerBolt_kN > 0 ? totalDemandPerBolt_kN / availableCapacityPerBolt_kN : 999;
    const pass = utilization <= 1.0;

    const steps: CalculationStep[] = [
      {
        equationName: 'Effective Lever Arm b\'',
        latexFormula: "b' = b - \\frac{d_b}{2}",
        substitutedValues: `${b.toFixed(1)} - \\frac{${db}}{2} = ${b_prime.toFixed(1)} mm`,
        resultValue: b_prime,
        unit: 'mm',
        citation: 'AISC Manual 15th Ed. Part 9',
        pass: true,
      },
      {
        equationName: 'Critical No-Prying Thickness t_c',
        latexFormula: 't_c = \\sqrt{\\frac{4 B b\'}{\\phi F_y p}}',
        substitutedValues: `\\sqrt{\\frac{4 (${(B * 1000).toFixed(0)}) (${b_prime.toFixed(1)})}{0.90 (${Fy_MPa}) (${p.toFixed(1)})}} = ${tc_mm.toFixed(1)} mm`,
        resultValue: tc_mm,
        unit: 'mm',
        citation: 'AISC Manual 15th Ed. Part 9 Eq. 9-20',
        pass: true,
      },
      {
        equationName: 'Prying Force Q per Bolt',
        latexFormula: 'Q = B \\cdot [\\delta \\alpha\' \\rho (t/t_c)^4]',
        substitutedValues: `${pryingForce_Q_kN.toFixed(2)} kN (${hasPrying ? 'Prying Active' : 'No Prying'})`,
        resultValue: pryingForce_Q_kN,
        unit: 'kN',
        citation: 'AISC Manual 15th Ed. Part 9 Eq. 9-28',
        pass: true,
      },
      {
        equationName: 'Available Tension Capacity with Prying',
        latexFormula: 'T_{avail}',
        substitutedValues: `${availableCapacityPerBolt_kN.toFixed(1)} kN (Total Demand = ${(totalDemandPerBolt_kN).toFixed(1)} kN)`,
        resultValue: availableCapacityPerBolt_kN,
        unit: 'kN',
        citation: 'AISC Manual 15th Ed. Part 9',
        pass,
        utilization,
      },
    ];

    const limitStateResult: LimitStateResult = {
      limitState: hasPrying ? 'Bolt Tension with Prying Action' : 'Bolt Tension (No Prying)',
      capacity_kN: availableCapacityPerBolt_kN,
      demand_kN: totalDemandPerBolt_kN,
      utilization,
      pass,
      governingClause: 'AISC 15th Ed. Manual Part 9 (Prying Action)',
      steps,
    };

    return {
      governingResistancePerBolt_kN: availableCapacityPerBolt_kN,
      totalBoltTensionDemand_kN: totalDemandPerBolt_kN,
      pryingForce_Q_kN,
      hasPrying,
      requiredThicknessNoPrying_tc_mm: tc_mm,
      alphaPrime: alpha_prime,
      utilization,
      pass,
      limitStateResult,
    };
  }

  /**
   * Eurocode 3 EN 1993-1-8 Clause 6.2.4: Equivalent T-Stub in Tension
   * Evaluates Plastic Failure Modes 1, 2, and 3
   */
  public static calculateEurocodeTStub(input: EurocodeTStubInput): EurocodeTStubResult {
    const {
      flangeThickness_mm,
      effectiveLength_leff_mm,
      fy_MPa,
      boltTensionResistance_Ft_Rd_kN,
      dimension_m_mm,
      dimension_e_mm,
      tensionDemand_kN,
      gammaM0 = 1.0,
      gammaM2 = 1.25,
    } = input;

    const tf = flangeThickness_mm;
    const leff = effectiveLength_leff_mm;
    const m = dimension_m_mm;
    const n = Math.min(dimension_e_mm, 1.25 * m);

    // Plastic moment resistance of flange:
    // M_pl,1,Rd = 0.25 * leff * tf^2 * fy / gamma_M0 (N*mm)
    const M_pl_1_Rd_Nmm = (0.25 * leff * Math.pow(tf, 2) * fy_MPa) / gammaM0;
    const M_pl_1_Rd_kNm = M_pl_1_Rd_Nmm / 1e6;

    // Mode 1: Complete flange yielding
    // F_T,1,Rd = 4 * M_pl_1_Rd / m
    const FT_1_Rd_kN = (4 * M_pl_1_Rd_Nmm) / m / 1000;

    // Mode 2: Bolt failure with flange yielding
    // F_T,2,Rd = (2 * M_pl_2_Rd + n * sum(Ft,Rd)) / (m + n)
    const sumFt_Rd_N = boltTensionResistance_Ft_Rd_kN * 1000;
    const FT_2_Rd_kN = (2 * M_pl_1_Rd_Nmm + n * sumFt_Rd_N) / (m + n) / 1000;

    // Mode 3: Bolt tensile rupture without prying
    // F_T,3,Rd = sum(Ft,Rd)
    const FT_3_Rd_kN = boltTensionResistance_Ft_Rd_kN;

    // Governing resistance is minimum of Mode 1, Mode 2, and Mode 3
    let governingCapacity = FT_1_Rd_kN;
    let governingMode: EurocodeTStubResult['governingMode'] = 'MODE_1_COMPLETE_FLANGE_YIELDING';

    if (FT_2_Rd_kN < governingCapacity) {
      governingCapacity = FT_2_Rd_kN;
      governingMode = 'MODE_2_BOLT_FAILURE_WITH_FLANGE_YIELD';
    }
    if (FT_3_Rd_kN < governingCapacity) {
      governingCapacity = FT_3_Rd_kN;
      governingMode = 'MODE_3_BOLT_FAILURE_NO_PRYING';
    }

    const utilization = governingCapacity > 0 ? tensionDemand_kN / governingCapacity : 999;
    const pass = utilization <= 1.0;

    const steps: CalculationStep[] = [
      {
        equationName: 'Plastic Moment of T-Stub Flange M_{pl,1,Rd}',
        latexFormula: 'M_{pl,1,Rd} = 0.25 \\cdot l_{eff} \\cdot t_f^2 \\cdot f_y / \\gamma_{M0}',
        substitutedValues: `0.25(${leff.toFixed(0)})(${tf}^2)(${fy_MPa}) / 10^6 = ${M_pl_1_Rd_kNm.toFixed(2)} kNm`,
        resultValue: M_pl_1_Rd_kNm,
        unit: 'kNm',
        citation: 'EN 1993-1-8 Table 6.2',
        pass: true,
      },
      {
        equationName: 'Mode 1: Complete Flange Yielding Resistance',
        latexFormula: 'F_{T,1,Rd} = \\frac{4 M_{pl,1,Rd}}{m}',
        substitutedValues: `\\frac{4 (${M_pl_1_Rd_Nmm.toFixed(0)})}{${m.toFixed(1)}} / 1000 = ${FT_1_Rd_kN.toFixed(1)} kN`,
        resultValue: FT_1_Rd_kN,
        unit: 'kN',
        citation: 'EN 1993-1-8 Table 6.2',
        pass: true,
      },
      {
        equationName: 'Mode 2: Bolt Failure with Flange Yielding',
        latexFormula: 'F_{T,2,Rd} = \\frac{2 M_{pl,2,Rd} + n \\sum F_{t,Rd}}{m + n}',
        substitutedValues: `\\frac{2(${M_pl_1_Rd_Nmm.toFixed(0)}) + ${n.toFixed(1)}(${sumFt_Rd_N.toFixed(0)})}{${(m + n).toFixed(1)}} / 1000 = ${FT_2_Rd_kN.toFixed(1)} kN`,
        resultValue: FT_2_Rd_kN,
        unit: 'kN',
        citation: 'EN 1993-1-8 Table 6.2',
        pass: true,
      },
      {
        equationName: 'Mode 3: Bolt Tension Failure (No Prying)',
        latexFormula: 'F_{T,3,Rd} = \\sum F_{t,Rd}',
        substitutedValues: `${FT_3_Rd_kN.toFixed(1)} kN`,
        resultValue: FT_3_Rd_kN,
        unit: 'kN',
        citation: 'EN 1993-1-8 Table 6.2',
        pass: true,
      },
      {
        equationName: 'Governing T-Stub Resistance F_{T,Rd}',
        latexFormula: 'F_{T,Rd} = \\min(F_{T,1,Rd}, F_{T,2,Rd}, F_{T,3,Rd})',
        substitutedValues: `\\min(${FT_1_Rd_kN.toFixed(1)}, ${FT_2_Rd_kN.toFixed(1)}, ${FT_3_Rd_kN.toFixed(1)}) = ${governingCapacity.toFixed(1)} kN (${governingMode})`,
        resultValue: governingCapacity,
        unit: 'kN',
        citation: 'EN 1993-1-8 Clause 6.2.4',
        pass,
        utilization,
      },
    ];

    const limitStateResult: LimitStateResult = {
      limitState: `Equivalent T-Stub Tension (${governingMode})`,
      capacity_kN: governingCapacity,
      demand_kN: tensionDemand_kN,
      utilization,
      pass,
      governingClause: 'EN 1993-1-8 Clause 6.2.4 (Table 6.2)',
      steps,
    };

    return {
      governingResistance_kN: governingCapacity,
      governingMode,
      mode1Capacity_kN: FT_1_Rd_kN,
      mode2Capacity_kN: FT_2_Rd_kN,
      mode3Capacity_kN: FT_3_Rd_kN,
      utilization,
      pass,
      limitStateResult,
    };
  }
}
