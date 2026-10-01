/**
 * End-Plate Moment Connection Design Engine
 * Evaluates Flush and Extended (4E, 4ES, 8ES) End-Plate Moment Connections
 * per AISC Design Guide 4, AISC Design Guide 16, AISC 358-16, AISC 360-16 Chapter J,
 * and Eurocode 3 EN 1993-1-8.
 */

import {
  EndPlateConfig,
  MomentConnectionEvaluation,
} from './MomentConnectionTypes';
import {
  DesignStandard,
  DesignMethod,
  LimitStateResult,
  STANDARD_BOLT_GEOMETRY,
  CalculationStep,
} from '../core/ConnectionTypes';
import { BoltLimitStateEngine } from '../bolts/BoltLimitStateEngine';
import { PryingActionEngine } from './PryingActionEngine';
import { WeldLimitStateEngine } from '../welds/WeldLimitStateEngine';

export class EndPlateMomentEngine {
  /**
   * Evaluates an End-Plate Beam-to-Column Moment Connection
   */
  public static evaluate(options: {
    config: EndPlateConfig;
    momentDemand_kNm: number;
    shearDemand_kN: number;
    standard?: DesignStandard;
    method?: DesignMethod;
  }): MomentConnectionEvaluation {
    const {
      config,
      momentDemand_kNm,
      shearDemand_kN,
      standard = 'AISC_360_16',
      method = 'LRFD',
    } = options;

    const limitStateResults: LimitStateResult[] = [];
    const geom = STANDARD_BOLT_GEOMETRY[config.boltDiameter_mm] || {
      grossArea_mm2: (Math.PI * config.boltDiameter_mm * config.boltDiameter_mm) / 4,
      tensileStressArea_mm2: 0.78 * ((Math.PI * config.boltDiameter_mm * config.boltDiameter_mm) / 4),
      standardHole_mm: config.boltDiameter_mm + 2,
    };
    const dh = geom.standardHole_mm;

    // Beam moment lever arm: distance between flange centroids
    const leverArm_d_mm = config.beam.depth_mm - config.beam.flangeThickness_mm;
    // Flange force demand: F_f = M_u / (d - t_f)
    const flangeForceDemand_kN = leverArm_d_mm > 0 ? (momentDemand_kNm * 1000) / leverArm_d_mm : 0;

    // -------------------------------------------------------------
    // 1. Bolt Tensile Rupture with Prying Action
    // -------------------------------------------------------------
    // For 4E (4-bolt extended unstiffened), 4 bolts resist the tension flange force (2 outside, 2 inside)
    // For Flush, 2 bolts resist the tension flange force (inside only)
    const tensionBoltsCount = config.endPlateType === 'FLUSH' ? 2 : config.endPlateType === 'EXTENDED_8ES' ? 8 : 4;

    const singleBoltTension =
      standard === 'AISC_360_16'
        ? BoltLimitStateEngine.checkAiscBoltTension({
            grade: config.boltGrade,
            diameter_mm: config.boltDiameter_mm,
            demand_kN: flangeForceDemand_kN / tensionBoltsCount,
            method,
          })
        : BoltLimitStateEngine.checkEurocodeBoltTension({
            grade: config.boltGrade,
            diameter_mm: config.boltDiameter_mm,
            demand_kN: flangeForceDemand_kN / tensionBoltsCount,
          });

    const dim_b = config.pitchFlangeInside_mm - config.beam.flangeThickness_mm / 2;
    const dim_a = (config.plateWidth_mm - config.gageX_mm) / 2;
    const tributary_p = config.plateWidth_mm / 2;

    const pryingResult = PryingActionEngine.calculateAiscPrying({
      flangeThickness_mm: config.plateThickness_mm,
      Fy_MPa: config.plateFy_MPa,
      Fu_MPa: config.plateFu_MPa,
      boltDiameter_mm: config.boltDiameter_mm,
      holeDiameter_mm: dh,
      boltTensionCapacity_kN: singleBoltTension.capacity_kN,
      dimension_b_mm: dim_b,
      dimension_a_mm: dim_a,
      tributaryLength_p_mm: tributary_p,
      tensionDemandPerBolt_kN: flangeForceDemand_kN / tensionBoltsCount,
      method,
    });

    // Total available flange force from bolts with prying
    const availableFlangeForce_bolts_kN = pryingResult.governingResistancePerBolt_kN * tensionBoltsCount;
    // Equivalent moment capacity = F_f,avail * leverArm
    const momentCapacity_bolts_kNm = (availableFlangeForce_bolts_kN * leverArm_d_mm) / 1000;

    limitStateResults.push({
      limitState: 'Bolt Tensile Rupture with Prying Action',
      capacity_kN: availableFlangeForce_bolts_kN,
      demand_kN: flangeForceDemand_kN,
      utilization: flangeForceDemand_kN / availableFlangeForce_bolts_kN,
      pass: flangeForceDemand_kN <= availableFlangeForce_bolts_kN,
      governingClause: 'AISC Manual 15th Ed. Part 9 / AISC 358-16',
      steps: [
        {
          equationName: 'Flange Tension Force Demand F_f',
          latexFormula: 'F_f = \\frac{M_u}{d - t_f}',
          substitutedValues: `\\frac{${(momentDemand_kNm * 1000).toFixed(0)}}{${leverArm_d_mm.toFixed(1)}} = ${flangeForceDemand_kN.toFixed(1)} kN`,
          resultValue: flangeForceDemand_kN,
          unit: 'kN',
          citation: 'AISC Design Guide 4 Section 2.2',
          pass: true,
        },
        ...pryingResult.limitStateResult.steps,
        {
          equationName: 'Moment Capacity from Bolt Tension',
          latexFormula: '\\phi M_n = \\sum T_{avail} \\cdot (d - t_f)',
          substitutedValues: `${availableFlangeForce_bolts_kN.toFixed(1)} \\cdot ${leverArm_d_mm.toFixed(1)} / 1000 = ${momentCapacity_bolts_kNm.toFixed(1)} kNm`,
          resultValue: momentCapacity_bolts_kNm,
          unit: 'kNm',
          citation: 'AISC Design Guide 4',
          pass: momentDemand_kNm <= momentCapacity_bolts_kNm,
          utilization: momentDemand_kNm / momentCapacity_bolts_kNm,
        },
      ],
    });

    // -------------------------------------------------------------
    // 2. End-Plate Flexural Yielding (Yield Line Mechanism)
    // -------------------------------------------------------------
    // AISC DG 4 Yield line parameter Y_p
    const bp = config.plateWidth_mm;
    const g = config.gageX_mm;
    const pfi = config.pitchFlangeInside_mm;
    const pfo = config.pitchFlangeOutside_mm || pfi;
    const h0 = leverArm_d_mm - pfi;
    const h1 = leverArm_d_mm + pfo;

    let Y_p: number;
    if (config.endPlateType === 'FLUSH') {
      // Flush end-plate yield line: Y = (bp / 2) * [ (1/pfi) ] + (2/g) * [ pfi ]
      Y_p = (bp / 2) * (1 / pfi) + (2 / g) * pfi;
    } else {
      // 4E Unstiffened extended end-plate (AISC DG 4 Table 3-1):
      // Y_p = (bp / 2) * [ h1 * (1/pfo + 1/pfi) + h0 * (1/pfi) ] / leverArm + ...
      const s = 0.5 * Math.sqrt(bp * g);
      Y_p = ((bp / 2) * (h1 * (1 / pfo) + h0 * (1 / pfi))) / leverArm_d_mm + (2 / g) * (h1 * (pfo + 0.75 * pfi));
    }

    // Nominal end-plate moment capacity: M_np = F_y,plate * t_p^2 * Y_p
    const Mnp_plate_Nmm = config.plateFy_MPa * Math.pow(config.plateThickness_mm, 2) * Y_p;
    const phiBending = 0.90;
    const momentCapacity_plate_kNm = (phiBending * Mnp_plate_Nmm) / 1e6;
    const plateUtil = momentCapacity_plate_kNm > 0 ? momentDemand_kNm / momentCapacity_plate_kNm : 999;

    limitStateResults.push({
      limitState: 'End-Plate Flexural Yielding (Yield Line)',
      capacity_kN: (momentCapacity_plate_kNm * 1000) / leverArm_d_mm,
      demand_kN: flangeForceDemand_kN,
      utilization: plateUtil,
      pass: plateUtil <= 1.0,
      governingClause: 'AISC Design Guide 4 / AISC 358-16 Chapter 6',
      steps: [
        {
          equationName: 'Yield Line Parameter Y_p',
          latexFormula: 'Y_p',
          substitutedValues: `${Y_p.toFixed(1)} mm`,
          resultValue: Y_p,
          unit: 'mm',
          citation: 'AISC Design Guide 4 Table 3-1',
          pass: true,
        },
        {
          equationName: 'End-Plate Design Moment Capacity \\phi M_{np}',
          latexFormula: '\\phi M_{np} = 0.90 \\cdot F_{y,p} \\cdot t_p^2 \\cdot Y_p',
          substitutedValues: `0.90 (${config.plateFy_MPa}) (${config.plateThickness_mm}^2) (${Y_p.toFixed(1)}) / 10^6 = ${momentCapacity_plate_kNm.toFixed(1)} kNm`,
          resultValue: momentCapacity_plate_kNm,
          unit: 'kNm',
          citation: 'AISC 358-16 Eq. 6.8-1',
          pass: plateUtil <= 1.0,
          utilization: plateUtil,
        },
      ],
    });

    // -------------------------------------------------------------
    // 3. Column Web Panel-Zone Shear (AISC 360-16 Section J10.6)
    // -------------------------------------------------------------
    // Panel zone shear demand: V_pz = F_f - V_column (assuming V_col ~ 0.15 * F_f)
    const V_pz_demand_kN = 0.85 * flangeForceDemand_kN;
    const dc = config.column.depth_mm;
    const bcf = config.column.flangeWidth_mm;
    const tcf = config.column.flangeThickness_mm;
    const tcw = config.column.webThickness_mm + (config.hasWebDoublerPlate ? config.webDoublerThickness_mm || 0 : 0);
    const Fyc = config.column.yieldStrength_MPa;
    const db = config.beam.depth_mm;

    // AISC Eq. J10-11: R_n = 0.60 * F_y * d_c * t_w * [1 + (3 * b_cf * t_cf^2) / (d_b * d_c * t_cw)]
    const panelFactor = 1 + (3 * bcf * Math.pow(tcf, 2)) / (db * dc * tcw);
    const Rn_panel_kN = (0.60 * Fyc * dc * tcw * panelFactor) / 1000;
    const phiPz = 0.90;
    const panelCapacity_kN = phiPz * Rn_panel_kN;
    const panelUtil = panelCapacity_kN > 0 ? V_pz_demand_kN / panelCapacity_kN : 999;
    const momentCapacity_panel_kNm = (panelCapacity_kN * leverArm_d_mm) / (0.85 * 1000);

    limitStateResults.push({
      limitState: 'Column Web Panel-Zone Shear',
      capacity_kN: panelCapacity_kN,
      demand_kN: V_pz_demand_kN,
      utilization: panelUtil,
      pass: panelUtil <= 1.0,
      governingClause: 'AISC 360-16 Section J10.6 (Eq. J10-11)',
      steps: [
        {
          equationName: 'Column Panel-Zone Shear Demand V_{pz}',
          latexFormula: 'V_{pz} = F_f - V_{col} \\approx 0.85 F_f',
          substitutedValues: `0.85 (${flangeForceDemand_kN.toFixed(1)}) = ${V_pz_demand_kN.toFixed(1)} kN`,
          resultValue: V_pz_demand_kN,
          unit: 'kN',
          citation: 'AISC 360-16 Section J10.6',
          pass: true,
        },
        {
          equationName: 'Design Panel-Zone Shear Strength \\phi R_n',
          latexFormula: '\\phi R_n = 0.90 \\cdot 0.60 F_y d_c t_{cw} [1 + \\frac{3 b_{cf} t_{cf}^2}{d_b d_c t_{cw}}]',
          substitutedValues: `0.90(0.60)(${Fyc})(${dc})(${tcw})[${panelFactor.toFixed(3)}] / 1000 = ${panelCapacity_kN.toFixed(1)} kN`,
          resultValue: panelCapacity_kN,
          unit: 'kN',
          citation: 'AISC 360-16 Eq. J10-11',
          pass: panelUtil <= 1.0,
          utilization: panelUtil,
        },
      ],
    });

    // -------------------------------------------------------------
    // 4. Column Web Local Yielding (AISC 360-16 Section J10.2)
    // -------------------------------------------------------------
    // R_n = F_yw * t_w * (5 * k_c + t_fb), phi = 1.00
    const kc = config.column.rootRadius_mm;
    const tfb = config.beam.flangeThickness_mm;
    const Rn_webYield_kN = (Fyc * tcw * (5 * kc + tfb)) / 1000;
    const phiWebYield = 1.00;
    const webYieldCapacity_kN = phiWebYield * Rn_webYield_kN;
    const webYieldUtil = webYieldCapacity_kN > 0 ? flangeForceDemand_kN / webYieldCapacity_kN : 999;

    limitStateResults.push({
      limitState: 'Column Web Local Yielding',
      capacity_kN: webYieldCapacity_kN,
      demand_kN: flangeForceDemand_kN,
      utilization: webYieldUtil,
      pass: webYieldUtil <= 1.0,
      governingClause: 'AISC 360-16 Section J10.2 (Eq. J10-2)',
      steps: [
        {
          equationName: 'Column Web Local Yielding Strength',
          latexFormula: '\\phi R_n = 1.00 \\cdot F_{yw} t_{cw} (5 k_c + t_{fb})',
          substitutedValues: `1.00 (${Fyc}) (${tcw}) (5(${kc}) + ${tfb}) / 1000 = ${webYieldCapacity_kN.toFixed(1)} kN`,
          resultValue: webYieldCapacity_kN,
          unit: 'kN',
          citation: 'AISC 360-16 Eq. J10-2',
          pass: webYieldUtil <= 1.0,
          utilization: webYieldUtil,
        },
      ],
    });

    // -------------------------------------------------------------
    // 5. Column Web Local Crippling (AISC Section J10.3)
    // -------------------------------------------------------------
    // R_n = 0.80 * t_cw^2 * [1 + 3 * (t_fb / d_c) * (t_cw / t_cf)^1.5] * sqrt(E * F_yw * t_cf / t_cw)
    const E_MPa = 200000;
    const cripplingTerm1 = 1 + 3 * (tfb / dc) * Math.pow(tcw / tcf, 1.5);
    const cripplingTerm2 = Math.sqrt((E_MPa * Fyc * tcf) / tcw);
    const Rn_crippling_kN = (0.80 * Math.pow(tcw, 2) * cripplingTerm1 * cripplingTerm2) / 1000;
    const phiCrippling = 0.75;
    const cripplingCapacity_kN = phiCrippling * Rn_crippling_kN;
    const cripplingUtil = cripplingCapacity_kN > 0 ? flangeForceDemand_kN / cripplingCapacity_kN : 999;

    limitStateResults.push({
      limitState: 'Column Web Local Crippling',
      capacity_kN: cripplingCapacity_kN,
      demand_kN: flangeForceDemand_kN,
      utilization: cripplingUtil,
      pass: cripplingUtil <= 1.0,
      governingClause: 'AISC 360-16 Section J10.3 (Eq. J10-4)',
      steps: [
        {
          equationName: 'Column Web Local Crippling Strength',
          latexFormula: '\\phi R_n = 0.75 \\cdot 0.80 t_{cw}^2 [1 + 3(t_{fb}/d_c)(t_{cw}/t_{cf})^{1.5}] \\sqrt{\\frac{E F_{yw} t_{cf}}{t_{cw}}}',
          substitutedValues: `${cripplingCapacity_kN.toFixed(1)} kN`,
          resultValue: cripplingCapacity_kN,
          unit: 'kN',
          citation: 'AISC 360-16 Eq. J10-4',
          pass: cripplingUtil <= 1.0,
          utilization: cripplingUtil,
        },
      ],
    });

    // -------------------------------------------------------------
    // 6. Beam Web Shear Transfer
    // -------------------------------------------------------------
    // Double fillet weld or bolts in web transferring shear
    const webWeld = WeldLimitStateEngine.checkAiscFilletWeld({
      weldLeg_mm: config.webWeldLeg_mm,
      weldLength_mm: 2 * (config.beam.depth_mm - 2 * config.beam.flangeThickness_mm),
      electrode: config.weldElectrode,
      demand_kN: shearDemand_kN,
      method,
    });
    limitStateResults.push({
      limitState: 'Beam Web to End-Plate Weld Shear',
      capacity_kN: webWeld.capacity_kN,
      demand_kN: shearDemand_kN,
      utilization: shearDemand_kN / webWeld.capacity_kN,
      pass: shearDemand_kN <= webWeld.capacity_kN,
      governingClause: 'AISC 360-16 Section J2.4',
      steps: webWeld.steps,
    });

    // -------------------------------------------------------------
    // Determine Governing Limit State
    // -------------------------------------------------------------
    // Compare moment capacities:
    // 1. Bolts with prying
    // 2. End-plate yield line
    // 3. Panel zone shear
    // 4. Column web yielding
    // 5. Column web crippling
    const momentCapacities: { name: string; capacity_kNm: number }[] = [
      { name: 'Bolt Tensile Rupture with Prying Action', capacity_kNm: momentCapacity_bolts_kNm },
      { name: 'End-Plate Flexural Yielding (Yield Line)', capacity_kNm: momentCapacity_plate_kNm },
      { name: 'Column Web Panel-Zone Shear', capacity_kNm: momentCapacity_panel_kNm },
      { name: 'Column Web Local Yielding', capacity_kNm: (webYieldCapacity_kN * leverArm_d_mm) / 1000 },
      { name: 'Column Web Local Crippling', capacity_kNm: (cripplingCapacity_kN * leverArm_d_mm) / 1000 },
    ];

    let minMomentCap = Infinity;
    let governingLS = '';

    for (const mc of momentCapacities) {
      if (mc.capacity_kNm < minMomentCap) {
        minMomentCap = mc.capacity_kNm;
        governingLS = mc.name;
      }
    }

    const momentUtil = minMomentCap > 0 ? momentDemand_kNm / minMomentCap : 999;
    const shearUtil = webWeld.capacity_kN > 0 ? shearDemand_kN / webWeld.capacity_kN : 999;
    const overallPass = momentUtil <= 1.0 && shearUtil <= 1.0;

    return {
      connectionId: config.connectionId,
      endPlateType: config.endPlateType,
      standard,
      method,
      designMomentCapacity_kNm: minMomentCap,
      appliedMomentDemand_kNm: momentDemand_kNm,
      designShearCapacity_kN: webWeld.capacity_kN,
      appliedShearDemand_kN: shearDemand_kN,
      momentUtilization: momentUtil,
      shearUtilization: shearUtil,
      governingLimitState: governingLS,
      pass: overallPass,
      limitStateResults,
    };
  }
}
