/**
 * Block Shear Rupture Verification Engine
 * Implements 2D block shear failure path evaluation for plates and beam webs:
 * - AISC 360-16 Section J4.3 (Eq. J4-5)
 * - Eurocode 3 EN 1993-1-8 Clause 3.10.2 (Block Tearing)
 */

import { LimitStateResult, CalculationStep, DesignMethod } from '../core/ConnectionTypes';

export interface BlockShearInput {
  thickness_mm: number;       // Plate or web thickness t
  Fy_MPa: number;             // Yield strength
  Fu_MPa: number;             // Tensile strength
  holeDiameter_mm: number;    // Standard hole diameter d_h (typically d + 2 mm)
  shearLengthGross_mm: number; // L_gv: length of shear failure path (from top bolt to bottom edge)
  tensionLengthGross_mm: number; // L_gt: length of tension failure path (from bolt line to free edge)
  boltsInShearLine: number;   // Number of bolts along the shear line
  demand_kN: number;
  method?: DesignMethod;
  componentName?: string;     // e.g. "Shear Tab Plate" or "Beam Web"
}

export class BlockShearEngine {
  /**
   * AISC 360-16 Section J4.3: Block Shear Rupture Strength
   * R_n = 0.60 * F_u * A_nv + U_bs * F_u * A_nt <= 0.60 * F_y * A_gv + U_bs * F_u * A_nt
   */
  public static checkAiscBlockShear(input: BlockShearInput): LimitStateResult {
    const {
      thickness_mm,
      Fy_MPa,
      Fu_MPa,
      holeDiameter_mm,
      shearLengthGross_mm,
      tensionLengthGross_mm,
      boltsInShearLine,
      demand_kN,
      method = 'LRFD',
      componentName = 'Component',
    } = input;

    const t = thickness_mm;
    const dh = holeDiameter_mm;
    const n = boltsInShearLine;

    // Gross areas (mm2)
    const Agv = shearLengthGross_mm * t;
    const Agt = tensionLengthGross_mm * t;

    // Net areas (mm2)
    // Deduction for shear line: (n - 0.5) holes
    const Anv = Math.max(0, (shearLengthGross_mm - (n - 0.5) * dh) * t);
    // Deduction for tension line: 0.5 hole
    const Ant = Math.max(0, (tensionLengthGross_mm - 0.5 * dh) * t);

    // Reduction coefficient U_bs (uniform tension stress = 1.0)
    const Ubs = 1.0;

    // Failure Mode 1: Shear rupture + Tension rupture
    const Rn1_N = 0.60 * Fu_MPa * Anv + Ubs * Fu_MPa * Ant;

    // Failure Mode 2: Shear yielding + Tension rupture (upper limit)
    const Rn2_upper_N = 0.60 * Fy_MPa * Agv + Ubs * Fu_MPa * Ant;

    // Nominal capacity Rn is min(Rn1, Rn2_upper)
    const Rn_N = Math.min(Rn1_N, Rn2_upper_N);
    const Rn_kN = Rn_N / 1000;

    const phi = 0.75;
    const omega = 2.00;
    const designCapacity_kN = method === 'LRFD' ? phi * Rn_kN : Rn_kN / omega;
    const utilization = demand_kN / designCapacity_kN;

    const steps: CalculationStep[] = [
      {
        equationName: 'Gross Shear Area A_gv',
        latexFormula: 'A_{gv} = L_{gv} \\cdot t',
        substitutedValues: `${shearLengthGross_mm.toFixed(1)} \\cdot ${t.toFixed(1)} = ${Agv.toFixed(1)} mm^2`,
        resultValue: Agv,
        unit: 'mm²',
        citation: 'AISC 360-16 Section J4.3',
        pass: true,
      },
      {
        equationName: 'Net Shear Area A_nv',
        latexFormula: 'A_{nv} = [L_{gv} - (n - 0.5) d_h] \\cdot t',
        substitutedValues: `[${shearLengthGross_mm.toFixed(1)} - (${n} - 0.5)(${dh})] \\cdot ${t.toFixed(1)} = ${Anv.toFixed(1)} mm^2`,
        resultValue: Anv,
        unit: 'mm²',
        citation: 'AISC 360-16 Section J4.3',
        pass: true,
      },
      {
        equationName: 'Net Tension Area A_nt',
        latexFormula: 'A_{nt} = (L_{gt} - 0.5 d_h) \\cdot t',
        substitutedValues: `(${tensionLengthGross_mm.toFixed(1)} - 0.5(${dh})) \\cdot ${t.toFixed(1)} = ${Ant.toFixed(1)} mm^2`,
        resultValue: Ant,
        unit: 'mm²',
        citation: 'AISC 360-16 Section J4.3',
        pass: true,
      },
      {
        equationName: 'Nominal Block Shear Strength R_n',
        latexFormula: 'R_n = 0.60 F_u A_{nv} + U_{bs} F_u A_{nt} \\le 0.60 F_y A_{gv} + U_{bs} F_u A_{nt}',
        substitutedValues: `\\min(${(Rn1_N / 1000).toFixed(2)}, ${(Rn2_upper_N / 1000).toFixed(2)}) = ${Rn_kN.toFixed(2)} kN`,
        resultValue: Rn_kN,
        unit: 'kN',
        citation: 'AISC 360-16 Eq. J4-5',
        pass: true,
      },
      {
        equationName: method === 'LRFD' ? 'Design Strength \\phi R_n' : 'Allowable Strength R_n / \\Omega',
        latexFormula: method === 'LRFD' ? '\\phi R_n = 0.75 R_n' : 'R_n / \\Omega = R_n / 2.0',
        substitutedValues: `${designCapacity_kN.toFixed(2)} kN`,
        resultValue: designCapacity_kN,
        unit: 'kN',
        citation: 'AISC 360-16 Section J4.3',
        pass: utilization <= 1.0,
        utilization,
      },
    ];

    return {
      limitState: `Block Shear Rupture (${componentName})`,
      capacity_kN: designCapacity_kN,
      demand_kN,
      utilization,
      pass: utilization <= 1.0,
      governingClause: 'AISC 360-16 Section J4.3 (Eq. J4-5)',
      steps,
    };
  }

  /**
   * Eurocode 3 EN 1993-1-8 Clause 3.10.2: Block Tearing V_eff,1,Rd
   * V_eff,1,Rd = (f_u * A_nt) / gamma_M2 + (f_y * A_nv / sqrt(3)) / gamma_M0
   */
  public static checkEurocodeBlockTearing(input: BlockShearInput): LimitStateResult {
    const {
      thickness_mm,
      Fy_MPa,
      Fu_MPa,
      holeDiameter_mm,
      shearLengthGross_mm,
      tensionLengthGross_mm,
      boltsInShearLine,
      demand_kN,
      componentName = 'Component',
    } = input;

    const t = thickness_mm;
    const dh = holeDiameter_mm;
    const n = boltsInShearLine;

    const Anv = Math.max(0, (shearLengthGross_mm - (n - 0.5) * dh) * t);
    const Ant = Math.max(0, (tensionLengthGross_mm - 0.5 * dh) * t);

    const gammaM0 = 1.0;
    const gammaM2 = 1.25;

    // V_eff,1,Rd = (f_u * A_nt / gamma_M2) + (f_y * A_nv / sqrt(3) / gamma_M0)
    const V_tension_N = (Fu_MPa * Ant) / gammaM2;
    const V_shear_N = (Fy_MPa * Anv) / (Math.sqrt(3) * gammaM0);
    const V_eff_N = V_tension_N + V_shear_N;
    const capacity_kN = V_eff_N / 1000;
    const utilization = demand_kN / capacity_kN;

    const steps: CalculationStep[] = [
      {
        equationName: 'Net Tension Area A_nt',
        latexFormula: 'A_{nt} = (L_{gt} - 0.5 d_0) \\cdot t',
        substitutedValues: `${Ant.toFixed(1)} mm^2`,
        resultValue: Ant,
        unit: 'mm²',
        citation: 'EN 1993-1-8 Clause 3.10.2',
        pass: true,
      },
      {
        equationName: 'Net Shear Area A_nv',
        latexFormula: 'A_{nv} = [L_{gv} - (n - 0.5) d_0] \\cdot t',
        substitutedValues: `${Anv.toFixed(1)} mm^2`,
        resultValue: Anv,
        unit: 'mm²',
        citation: 'EN 1993-1-8 Clause 3.10.2',
        pass: true,
      },
      {
        equationName: 'Design Block Tearing Resistance V_eff,1,Rd',
        latexFormula: 'V_{eff,1,Rd} = \\frac{f_u A_{nt}}{\\gamma_{M2}} + \\frac{f_y A_{nv}}{\\sqrt{3}\\gamma_{M0}}',
        substitutedValues: `\\frac{${Fu_MPa}(${Ant.toFixed(1)})}{1.25} + \\frac{${Fy_MPa}(${Anv.toFixed(1)})}{1.732(1.0)} = ${capacity_kN.toFixed(2)} kN`,
        resultValue: capacity_kN,
        unit: 'kN',
        citation: 'EN 1993-1-8 Eq. 3.9',
        pass: utilization <= 1.0,
        utilization,
      },
    ];

    return {
      limitState: `Block Tearing (${componentName})`,
      capacity_kN,
      demand_kN,
      utilization,
      pass: utilization <= 1.0,
      governingClause: 'EN 1993-1-8 Clause 3.10.2',
      steps,
    };
  }
}
