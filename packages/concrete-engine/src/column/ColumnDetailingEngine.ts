/**
 * ColumnDetailingEngine.ts
 *
 * RC column detailing verification:
 * 1. Longitudinal reinforcement limits (rho_g between 1% and 4%-8%).
 * 2. Standard tie sizing and spacing per ACI 318-19 Section 25.7.2.
 * 3. Seismic confinement detailing for plastic hinge regions per ACI 318-19 Section 18.7.5.
 */

import {
  ConcreteMaterial,
  RebarMaterial,
  ConcreteLimitStateResult,
  ConcreteCalculationStep,
} from '../core/ConcreteTypes';

export interface ColumnDetailingConfig {
  /** Column width b (mm) */
  b_mm: number;
  /** Column height h (mm) */
  h_mm: number;
  /** Unsupported height lu (mm) */
  lu_mm: number;
  /** Clear concrete cover cc (mm) */
  clearCover_mm: number;
  /** Number of longitudinal bars */
  numLongitudinalBars: number;
  /** Longitudinal bar diameter db (mm) */
  db_longitudinal_mm: number;
  /** Total longitudinal steel area Ast (mm²) */
  Ast_mm2: number;
  /** Transverse tie bar diameter d_tie (mm) */
  d_tie_mm: number;
  /** Provided tie spacing s (mm) */
  s_tie_mm: number;
  /** Number of tie legs in X and Y directions */
  numTieLegsX?: number;
  numTieLegsY?: number;
  /** Concrete material */
  concrete: ConcreteMaterial;
  /** Transverse rebar material */
  tieRebar: RebarMaterial;
  /** Seismic special moment frame flag */
  isSeismicSpecialMomentFrame?: boolean;
}

export interface ColumnDetailingResult {
  /** Gross area Ag (mm²) */
  Ag_mm2: number;
  /** Longitudinal reinforcement ratio rho_g */
  rho_g: number;
  /** Maximum standard tie spacing s_max (mm) */
  s_max_standard_mm: number;
  /** Plastic hinge confinement length lo (mm) */
  lo_confinement_mm: number;
  /** Maximum confinement tie spacing so (mm) */
  so_confinement_mm: number;
  /** Required total cross-sectional tie area Ash per spacing s (mm²) */
  Ash_required_mm2: number;
  /** Pass/Fail status */
  status: 'PASS' | 'FAIL';
  /** Limit states table */
  limitStates: ConcreteLimitStateResult[];
  /** Transparent mathematical derivations */
  calculationSteps: ConcreteCalculationStep[];
}

export class ColumnDetailingEngine {
  static analyzeDetailing(config: ColumnDetailingConfig): ColumnDetailingResult {
    const b = config.b_mm;
    const h = config.h_mm;
    const lu = config.lu_mm;
    const cc = config.clearCover_mm;
    const numBars = config.numLongitudinalBars;
    const db = config.db_longitudinal_mm;
    const Ast = config.Ast_mm2;
    const d_tie = config.d_tie_mm;
    const s_tie = config.s_tie_mm;
    const fc = config.concrete.fc_MPa;
    const fyt = config.tieRebar.fy_MPa;
    const isSeismic = config.isSeismicSpecialMomentFrame ?? false;

    const limitStates: ConcreteLimitStateResult[] = [];
    const steps: ConcreteCalculationStep[] = [];

    // 1. Longitudinal reinforcement limits (ACI 318-19 Section 10.6.1.1)
    const Ag = b * h;
    const rho_g = Ast / Ag;
    const minRho = 0.01; // 1%
    const maxRho = 0.04; // 4% practical limit (code upper bound 8%)

    const rhoMinPass = rho_g >= minRho;
    const rhoMaxPass = rho_g <= maxRho;

    limitStates.push({
      limitStateName: 'Minimum Longitudinal Reinforcement Ratio (rho_g >= 1.0%)',
      codeClause: 'ACI 318-19 §10.6.1.1',
      nominalCapacity: minRho,
      designCapacity: minRho,
      appliedDemand: rho_g,
      utilization: rho_g > 0 ? minRho / rho_g : 10,
      units: 'ratio',
      governing: false,
      status: rhoMinPass ? 'PASS' : 'FAIL',
      description: rhoMinPass
        ? `Longitudinal steel ratio (${(rho_g * 100).toFixed(2)}%) satisfies 1.0% minimum`
        : `Longitudinal steel ratio (${(rho_g * 100).toFixed(2)}%) is below 1.0% minimum`,
    });

    limitStates.push({
      limitStateName: 'Maximum Longitudinal Reinforcement Ratio (rho_g <= 4.0%)',
      codeClause: 'ACI 318-19 §10.6.1.1',
      nominalCapacity: maxRho,
      designCapacity: maxRho,
      appliedDemand: rho_g,
      utilization: rho_g / maxRho,
      units: 'ratio',
      governing: false,
      status: rhoMaxPass ? 'PASS' : 'FAIL',
      description: rhoMaxPass
        ? `Longitudinal steel ratio (${(rho_g * 100).toFixed(2)}%) is within 4.0% limit`
        : `Longitudinal steel ratio (${(rho_g * 100).toFixed(2)}%) exceeds 4.0% congestion limit`,
    });

    // 2. Minimum number of bars (ACI 318-19 Section 10.7.3.1)
    const numBarsPass = numBars >= 4;
    limitStates.push({
      limitStateName: 'Minimum Bar Count (Tied Column >= 4 bars)',
      codeClause: 'ACI 318-19 §10.7.3.1',
      nominalCapacity: 4,
      designCapacity: 4,
      appliedDemand: numBars,
      utilization: numBars >= 4 ? 4 / numBars : 2,
      units: 'bars',
      governing: false,
      status: numBarsPass ? 'PASS' : 'FAIL',
      description: numBarsPass
        ? `Column provides ${numBars} longitudinal bars (>= 4 required)`
        : `Column has only ${numBars} bars (minimum 4 required for tied rectangular column)`,
    });

    // 3. Minimum tie diameter (ACI 318-19 Table 25.7.2.2)
    const minTieDia = db <= 32 ? 9.5 : 12.7; // #3 for db <= #10, #4 for db >= #11
    const tieDiaPass = d_tie >= minTieDia - 0.5;

    limitStates.push({
      limitStateName: 'Transverse Tie Diameter',
      codeClause: 'ACI 318-19 Table 25.7.2.2',
      nominalCapacity: minTieDia,
      designCapacity: minTieDia,
      appliedDemand: d_tie,
      utilization: minTieDia / d_tie,
      units: 'mm',
      governing: false,
      status: tieDiaPass ? 'PASS' : 'FAIL',
      description: tieDiaPass
        ? `Tie diameter (${d_tie} mm) meets minimum (${minTieDia.toFixed(1)} mm)`
        : `Tie diameter (${d_tie} mm) is less than required (${minTieDia.toFixed(1)} mm)`,
    });

    // 4. Maximum standard tie spacing (ACI 318-19 Table 25.7.2.1)
    // s <= min(16 * db, 48 * d_tie, least column dimension)
    const s_max_std = Math.min(16 * db, 48 * d_tie, b, h);
    const spacingPass = s_tie <= s_max_std;

    limitStates.push({
      limitStateName: 'Maximum Standard Tie Spacing',
      codeClause: 'ACI 318-19 Table 25.7.2.1',
      nominalCapacity: s_max_std,
      designCapacity: s_max_std,
      appliedDemand: s_tie,
      utilization: s_tie / s_max_std,
      units: 'mm',
      governing: false,
      status: spacingPass ? 'PASS' : 'FAIL',
      description: spacingPass
        ? `Tie spacing (${s_tie} mm) satisfies maximum limit (${s_max_std.toFixed(0)} mm)`
        : `Tie spacing (${s_tie} mm) exceeds code maximum (${s_max_std.toFixed(0)} mm)`,
    });

    // 5. Seismic Confinement Detailing (ACI 318-19 Section 18.7.5)
    // lo >= max(h, b, lu / 6, 450 mm)
    const lo_conf = Math.max(h, b, lu / 6, 450.0);
    // so <= min(b/4, h/4, 6 * db, 100 to 150 mm)
    const so_conf = Math.min(b / 4, h / 4, 6 * db, 150.0);

    // Ash required:
    // Ash / s >= max(0.3 * (Ag/Ach - 1) * (fc/fyt) * bc, 0.09 * (fc/fyt) * bc)
    const bc = Math.max(100, Math.min(b, h) - 2 * cc);
    const Ach = (b - 2 * cc) * (h - 2 * cc);
    const Ash_req_per_s = Math.max(
      0.3 * (Ag / Ach - 1.0) * (fc / fyt) * bc,
      0.09 * (fc / fyt) * bc
    );
    const Ash_req = Ash_req_per_s * Math.min(s_tie, so_conf);

    if (isSeismic) {
      const seismicSpacingPass = s_tie <= so_conf;
      limitStates.push({
        limitStateName: 'Seismic Plastic Hinge Confinement Spacing (so)',
        codeClause: 'ACI 318-19 §18.7.5.3',
        nominalCapacity: so_conf,
        designCapacity: so_conf,
        appliedDemand: s_tie,
        utilization: s_tie / so_conf,
        units: 'mm',
        governing: false,
        status: seismicSpacingPass ? 'PASS' : 'FAIL',
        description: seismicSpacingPass
          ? `Plastic hinge tie spacing (${s_tie} mm) meets seismic limit (${so_conf.toFixed(0)} mm)`
          : `Plastic hinge tie spacing (${s_tie} mm) exceeds seismic limit (${so_conf.toFixed(0)} mm)`,
      });
    }

    // Step derivations
    steps.push({
      title: 'Longitudinal Reinforcement Ratio',
      codeClause: 'ACI 318-19 §10.6.1.1',
      formulaLatex: '\\rho_g = \\frac{A_{st}}{A_g}, \\quad 0.01 \\le \\rho_g \\le 0.04',
      substitutionLatex: `\\frac{${Ast.toFixed(0)}}{${Ag.toFixed(0)}}`,
      resultLatex: `\\rho_g = ${(rho_g * 100).toFixed(2)}\\%`,
      status: rhoMinPass && rhoMaxPass ? 'PASS' : 'FAIL',
    });

    steps.push({
      title: 'Maximum Standard Tie Spacing',
      codeClause: 'ACI 318-19 Table 25.7.2.1',
      formulaLatex: 's_{max} = \\min(16 d_b, 48 d_{tie}, b, h)',
      substitutionLatex: `\\min(16 \\times ${db}, 48 \\times ${d_tie}, ${b}, ${h})`,
      resultLatex: `s_{max} = ${s_max_std.toFixed(0)} \\text{ mm}`,
      status: spacingPass ? 'PASS' : 'FAIL',
    });

    const allPass = rhoMinPass && rhoMaxPass && numBarsPass && tieDiaPass && spacingPass;

    return {
      Ag_mm2: Ag,
      rho_g,
      s_max_standard_mm: s_max_std,
      lo_confinement_mm: lo_conf,
      so_confinement_mm: so_conf,
      Ash_required_mm2: Ash_req,
      status: allPass ? 'PASS' : 'FAIL',
      limitStates,
      calculationSteps: steps,
    };
  }
}
