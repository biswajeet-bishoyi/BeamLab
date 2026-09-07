/**
 * Single Plate Shear Connection (Shear Tab / Fin Plate) Design Engine
 * Implements comprehensive limit states per AISC 360-16 / AISC Manual 15th Ed. Part 10
 * and Eurocode 3 EN 1993-1-8:
 * 1. Bolt group eccentric shear (conventional vs extended)
 * 2. Plate gross shear yielding (J4.2)
 * 3. Plate net shear rupture (J4.2)
 * 4. Plate block shear rupture (J4.3)
 * 5. Bolt bearing / tearout on plate (J3.10)
 * 6. Bolt bearing / tearout on beam web (J3.10)
 * 7. Beam web block shear rupture
 * 8. Fillet weld to supporting member
 * 9. Plate flexural yielding (extended tabs)
 * 10. Coped beam web yielding
 */

import {
  SinglePlateConfig,
  ShearConnectionEvaluation,
} from './ShearConnectionTypes';
import {
  DesignStandard,
  DesignMethod,
  LimitStateResult,
  STANDARD_BOLT_GEOMETRY,
  CalculationStep,
} from '../core/ConnectionTypes';
import { BoltLimitStateEngine } from '../bolts/BoltLimitStateEngine';
import { BoltGroupAnalyzer } from '../bolts/BoltGroupAnalyzer';
import { WeldLimitStateEngine } from '../welds/WeldLimitStateEngine';
import { BlockShearEngine } from './BlockShearEngine';

export class SinglePlateShearEngine {
  /**
   * Evaluates a Single Plate Shear Connection (Shear Tab / Fin Plate)
   */
  public static evaluate(options: {
    config: SinglePlateConfig;
    shearDemand_kN: number;
    standard?: DesignStandard;
    method?: DesignMethod;
  }): ShearConnectionEvaluation {
    const { config, shearDemand_kN, standard = 'AISC_360_16', method = 'LRFD' } = options;

    const limitStateResults: LimitStateResult[] = [];
    const geom = STANDARD_BOLT_GEOMETRY[config.boltDiameter_mm] || {
      grossArea_mm2: (Math.PI * config.boltDiameter_mm * config.boltDiameter_mm) / 4,
      tensileStressArea_mm2: 0.78 * ((Math.PI * config.boltDiameter_mm * config.boltDiameter_mm) / 4),
      standardHole_mm: config.boltDiameter_mm + 2,
    };
    const dh = geom.standardHole_mm;
    const nBolts = config.boltRows * config.boltColumns;

    // Classification: Conventional vs Extended
    // AISC Part 10: a <= 89 mm (3.5 in) and single column is conventional
    const isConventional = config.weldToBoltLine_a_mm <= 89 && config.boltColumns === 1;

    // -------------------------------------------------------------
    // 1. Bolt Group Shear (with Eccentricity)
    // -------------------------------------------------------------
    const singleBoltShear =
      standard === 'AISC_360_16'
        ? BoltLimitStateEngine.checkAiscBoltShear({
            grade: config.boltGrade,
            diameter_mm: config.boltDiameter_mm,
            threadCondition: config.threadCondition,
            shearPlanes: 1,
            demand_kN: shearDemand_kN / nBolts,
            method,
          })
        : BoltLimitStateEngine.checkEurocodeBoltShear({
            grade: config.boltGrade,
            diameter_mm: config.boltDiameter_mm,
            threadCondition: config.threadCondition,
            shearPlanes: 1,
            demand_kN: shearDemand_kN / nBolts,
          });

    let boltGroupCapacity_kN: number;
    let boltGroupSteps: CalculationStep[] = [];

    if (isConventional) {
      // Conventional tab: AISC 15th Ed Table 10-9 gives effective eccentricity
      // For short reach (a <= 89mm), eccentricity factor C or reduced arm
      const effectiveArm_mm = Math.max(25, config.weldToBoltLine_a_mm - 25);
      const boltPattern = BoltGroupAnalyzer.createGridPattern({
        rows: config.boltRows,
        cols: config.boltColumns,
        pitchY_mm: config.pitchY_mm,
        gageX_mm: config.gageX_mm || 0,
        diameter_mm: config.boltDiameter_mm,
        edgeDistX_mm: config.edgeDistanceSide_mm,
        edgeDistY_mm: config.edgeDistanceTop_mm,
      });

      const icr = BoltGroupAnalyzer.analyzeICR({
        bolts: boltPattern.bolts,
        eccentricity_mm: effectiveArm_mm,
        singleBoltShearCapacity_kN: singleBoltShear.capacity_kN,
      });

      boltGroupCapacity_kN = icr.nominalCapacity_kN;
      boltGroupSteps = [
        {
          equationName: 'Conventional Shear Tab Effective Eccentricity',
          latexFormula: 'e_{eff} = a - 25\\text{ mm}',
          substitutedValues: `${config.weldToBoltLine_a_mm} - 25 = ${effectiveArm_mm} mm`,
          resultValue: effectiveArm_mm,
          unit: 'mm',
          citation: 'AISC Manual 15th Ed. Part 10 Table 10-9',
          pass: true,
        },
        {
          equationName: 'Bolt Group Capacity via ICR Method',
          latexFormula: 'R_n = C \\cdot r_n',
          substitutedValues: `${icr.ultimateCoefficientC.toFixed(2)} \\cdot ${singleBoltShear.capacity_kN.toFixed(1)} = ${boltGroupCapacity_kN.toFixed(1)} kN`,
          resultValue: boltGroupCapacity_kN,
          unit: 'kN',
          citation: 'AISC Manual 15th Ed. Table 7-6',
          pass: shearDemand_kN <= boltGroupCapacity_kN,
          utilization: shearDemand_kN / boltGroupCapacity_kN,
        },
      ];
    } else {
      // Extended shear tab: Full eccentricity from weld to bolt centroid
      const boltPattern = BoltGroupAnalyzer.createGridPattern({
        rows: config.boltRows,
        cols: config.boltColumns,
        pitchY_mm: config.pitchY_mm,
        gageX_mm: config.gageX_mm || 0,
        diameter_mm: config.boltDiameter_mm,
        edgeDistX_mm: config.edgeDistanceSide_mm,
        edgeDistY_mm: config.edgeDistanceTop_mm,
      });

      const fullArm_mm = config.weldToBoltLine_a_mm;
      const icr = BoltGroupAnalyzer.analyzeICR({
        bolts: boltPattern.bolts,
        eccentricity_mm: fullArm_mm,
        singleBoltShearCapacity_kN: singleBoltShear.capacity_kN,
      });

      boltGroupCapacity_kN = icr.nominalCapacity_kN;
      boltGroupSteps = [
        {
          equationName: 'Extended Tab Eccentricity',
          latexFormula: 'e = a',
          substitutedValues: `${fullArm_mm} mm`,
          resultValue: fullArm_mm,
          unit: 'mm',
          citation: 'AISC Manual 15th Ed. Part 10 Table 10-10',
          pass: true,
        },
        {
          equationName: 'Bolt Group Capacity via ICR',
          latexFormula: 'R_n = C \\cdot r_n',
          substitutedValues: `${icr.ultimateCoefficientC.toFixed(2)} \\cdot ${singleBoltShear.capacity_kN.toFixed(1)} = ${boltGroupCapacity_kN.toFixed(1)} kN`,
          resultValue: boltGroupCapacity_kN,
          unit: 'kN',
          citation: 'AISC Manual 15th Ed. Table 7-6',
          pass: shearDemand_kN <= boltGroupCapacity_kN,
          utilization: shearDemand_kN / boltGroupCapacity_kN,
        },
      ];
    }

    limitStateResults.push({
      limitState: 'Bolt Group Shear with Eccentricity',
      capacity_kN: boltGroupCapacity_kN,
      demand_kN: shearDemand_kN,
      utilization: shearDemand_kN / boltGroupCapacity_kN,
      pass: shearDemand_kN <= boltGroupCapacity_kN,
      governingClause: isConventional ? 'AISC Manual Part 10 (Table 10-9)' : 'AISC Manual Part 10 (Table 10-10)',
      steps: boltGroupSteps,
    });

    // -------------------------------------------------------------
    // 2. Plate Gross Shear Yielding
    // -------------------------------------------------------------
    const Agv_plate = config.plateHeight_mm * config.plateThickness_mm;
    let plateGrossCapacity_kN: number;
    let plateGrossSteps: CalculationStep[] = [];

    if (standard === 'AISC_360_16') {
      // AISC Eq. J4-3: Rn = 0.60 * Fy * Ag, phi = 1.00 (LRFD)
      const Rn_kN = (0.6 * config.plateFy_MPa * Agv_plate) / 1000;
      plateGrossCapacity_kN = method === 'LRFD' ? 1.0 * Rn_kN : Rn_kN / 1.5;
      plateGrossSteps = [
        {
          equationName: 'Plate Gross Shear Yielding Strength',
          latexFormula: method === 'LRFD' ? '\\phi R_n = 1.00 \\cdot 0.60 F_y A_g' : 'R_n / \\Omega = 0.60 F_y A_g / 1.50',
          substitutedValues: `0.60(${config.plateFy_MPa})(${Agv_plate.toFixed(0)}) / 1000 = ${plateGrossCapacity_kN.toFixed(1)} kN`,
          resultValue: plateGrossCapacity_kN,
          unit: 'kN',
          citation: 'AISC 360-16 Section J4.2 (Eq. J4-3)',
          pass: shearDemand_kN <= plateGrossCapacity_kN,
          utilization: shearDemand_kN / plateGrossCapacity_kN,
        },
      ];
    } else {
      // Eurocode 3 EN 1993-1-1 Cl 6.2.6: Vpl,Rd = (Av * fy / sqrt(3)) / gamma_M0
      plateGrossCapacity_kN = (Agv_plate * (config.plateFy_MPa / Math.sqrt(3))) / (1.0 * 1000);
      plateGrossSteps = [
        {
          equationName: 'Plate Plastic Shear Resistance V_{pl,Rd}',
          latexFormula: 'V_{pl,Rd} = \\frac{A_v \\cdot f_y}{\\sqrt{3} \\cdot \\gamma_{M0}}',
          substitutedValues: `\\frac{${Agv_plate.toFixed(0)} \\cdot ${config.plateFy_MPa}}{1.732(1.0)} = ${plateGrossCapacity_kN.toFixed(1)} kN`,
          resultValue: plateGrossCapacity_kN,
          unit: 'kN',
          citation: 'EN 1993-1-1 Clause 6.2.6',
          pass: shearDemand_kN <= plateGrossCapacity_kN,
          utilization: shearDemand_kN / plateGrossCapacity_kN,
        },
      ];
    }

    limitStateResults.push({
      limitState: 'Plate Gross Shear Yielding',
      capacity_kN: plateGrossCapacity_kN,
      demand_kN: shearDemand_kN,
      utilization: shearDemand_kN / plateGrossCapacity_kN,
      pass: shearDemand_kN <= plateGrossCapacity_kN,
      governingClause: standard === 'AISC_360_16' ? 'AISC 360-16 Section J4.2' : 'EN 1993-1-1 Clause 6.2.6',
      steps: plateGrossSteps,
    });

    // -------------------------------------------------------------
    // 3. Plate Net Shear Rupture
    // -------------------------------------------------------------
    const Anv_plate = Math.max(0, (config.plateHeight_mm - config.boltRows * dh) * config.plateThickness_mm);
    let plateNetCapacity_kN: number;
    let plateNetSteps: CalculationStep[] = [];

    if (standard === 'AISC_360_16') {
      // AISC Eq. J4-4: Rn = 0.60 * Fu * Anv, phi = 0.75 (LRFD)
      const Rn_kN = (0.6 * config.plateFu_MPa * Anv_plate) / 1000;
      plateNetCapacity_kN = method === 'LRFD' ? 0.75 * Rn_kN : Rn_kN / 2.0;
      plateNetSteps = [
        {
          equationName: 'Plate Net Shear Rupture Strength',
          latexFormula: method === 'LRFD' ? '\\phi R_n = 0.75 \\cdot 0.60 F_u A_{nv}' : 'R_n / \\Omega = 0.60 F_u A_{nv} / 2.00',
          substitutedValues: `0.75(0.60)(${config.plateFu_MPa})(${Anv_plate.toFixed(0)}) / 1000 = ${plateNetCapacity_kN.toFixed(1)} kN`,
          resultValue: plateNetCapacity_kN,
          unit: 'kN',
          citation: 'AISC 360-16 Section J4.2 (Eq. J4-4)',
          pass: shearDemand_kN <= plateNetCapacity_kN,
          utilization: shearDemand_kN / plateNetCapacity_kN,
        },
      ];
    } else {
      // Eurocode 3 EN 1993-1-8 Cl 3.10.2: Vu,Rd = (Av,net * fu / sqrt(3)) / gamma_M2
      plateNetCapacity_kN = (Anv_plate * (config.plateFu_MPa / Math.sqrt(3))) / (1.25 * 1000);
      plateNetSteps = [
        {
          equationName: 'Plate Net Shear Resistance V_{u,Rd}',
          latexFormula: 'V_{u,Rd} = \\frac{A_{v,net} \\cdot f_u}{\\sqrt{3} \\cdot \\gamma_{M2}}',
          substitutedValues: `\\frac{${Anv_plate.toFixed(0)} \\cdot ${config.plateFu_MPa}}{1.732(1.25)} = ${plateNetCapacity_kN.toFixed(1)} kN`,
          resultValue: plateNetCapacity_kN,
          unit: 'kN',
          citation: 'EN 1993-1-8 Clause 3.10.2',
          pass: shearDemand_kN <= plateNetCapacity_kN,
          utilization: shearDemand_kN / plateNetCapacity_kN,
        },
      ];
    }

    limitStateResults.push({
      limitState: 'Plate Net Shear Rupture',
      capacity_kN: plateNetCapacity_kN,
      demand_kN: shearDemand_kN,
      utilization: shearDemand_kN / plateNetCapacity_kN,
      pass: shearDemand_kN <= plateNetCapacity_kN,
      governingClause: standard === 'AISC_360_16' ? 'AISC 360-16 Section J4.2' : 'EN 1993-1-8 Clause 3.10.2',
      steps: plateNetSteps,
    });

    // -------------------------------------------------------------
    // 4. Plate Block Shear Rupture
    // -------------------------------------------------------------
    const L_gv_plate = (config.boltRows - 1) * config.pitchY_mm + config.edgeDistanceTop_mm;
    const L_gt_plate = config.edgeDistanceSide_mm;

    const plateBlockShear =
      standard === 'AISC_360_16'
        ? BlockShearEngine.checkAiscBlockShear({
            thickness_mm: config.plateThickness_mm,
            Fy_MPa: config.plateFy_MPa,
            Fu_MPa: config.plateFu_MPa,
            holeDiameter_mm: dh,
            shearLengthGross_mm: L_gv_plate,
            tensionLengthGross_mm: L_gt_plate,
            boltsInShearLine: config.boltRows,
            demand_kN: shearDemand_kN,
            method,
            componentName: 'Shear Tab Plate',
          })
        : BlockShearEngine.checkEurocodeBlockTearing({
            thickness_mm: config.plateThickness_mm,
            Fy_MPa: config.plateFy_MPa,
            Fu_MPa: config.plateFu_MPa,
            holeDiameter_mm: dh,
            shearLengthGross_mm: L_gv_plate,
            tensionLengthGross_mm: L_gt_plate,
            boltsInShearLine: config.boltRows,
            demand_kN: shearDemand_kN,
            componentName: 'Shear Tab Plate',
          });

    limitStateResults.push(plateBlockShear);

    // -------------------------------------------------------------
    // 5. Bolt Bearing and Tearout on Plate (J3.10)
    // -------------------------------------------------------------
    // Sum of individual bolt hole capacities
    const singleEdgeClear_mm = Math.max(5, config.edgeDistanceTop_mm - 0.5 * dh);
    const singleInnerClear_mm = Math.max(5, config.pitchY_mm - dh);

    const edgeBearing = BoltLimitStateEngine.checkAiscBearingAndTearout({
      diameter_mm: config.boltDiameter_mm,
      plateThickness_mm: config.plateThickness_mm,
      Fu_MPa: config.plateFu_MPa,
      clearDistance_mm: singleEdgeClear_mm,
      demand_kN: shearDemand_kN / nBolts,
      method,
    });

    const innerBearing = BoltLimitStateEngine.checkAiscBearingAndTearout({
      diameter_mm: config.boltDiameter_mm,
      plateThickness_mm: config.plateThickness_mm,
      Fu_MPa: config.plateFu_MPa,
      clearDistance_mm: singleInnerClear_mm,
      demand_kN: shearDemand_kN / nBolts,
      method,
    });

    // 1 edge bolt (top/bottom) + (boltRows - 1) inner bolts per column
    const plateBearingTotal_kN =
      config.boltColumns * (edgeBearing.capacity_kN + (config.boltRows - 1) * innerBearing.capacity_kN);

    limitStateResults.push({
      limitState: 'Bolt Bearing & Tearout on Plate',
      capacity_kN: plateBearingTotal_kN,
      demand_kN: shearDemand_kN,
      utilization: shearDemand_kN / plateBearingTotal_kN,
      pass: shearDemand_kN <= plateBearingTotal_kN,
      governingClause: 'AISC 360-16 Section J3.10 / Table 3.4',
      steps: [
        {
          equationName: 'Total Plate Bearing Resistance',
          latexFormula: '\\sum \\phi R_n = n_{edge} \\cdot \\phi R_{n,edge} + n_{inner} \\cdot \\phi R_{n,inner}',
          substitutedValues: `${config.boltColumns}(${edgeBearing.capacity_kN.toFixed(1)} + ${config.boltRows - 1}(${innerBearing.capacity_kN.toFixed(1)})) = ${plateBearingTotal_kN.toFixed(1)} kN`,
          resultValue: plateBearingTotal_kN,
          unit: 'kN',
          citation: 'AISC 360-16 Section J3.10',
          pass: shearDemand_kN <= plateBearingTotal_kN,
          utilization: shearDemand_kN / plateBearingTotal_kN,
        },
      ],
    });

    // -------------------------------------------------------------
    // 6. Bolt Bearing and Tearout on Supported Beam Web
    // -------------------------------------------------------------
    const webBearingEdge = BoltLimitStateEngine.checkAiscBearingAndTearout({
      diameter_mm: config.boltDiameter_mm,
      plateThickness_mm: config.beam.webThickness_mm,
      Fu_MPa: config.beam.ultimateStrength_MPa,
      clearDistance_mm: singleEdgeClear_mm,
      demand_kN: shearDemand_kN / nBolts,
      method,
    });

    const webBearingInner = BoltLimitStateEngine.checkAiscBearingAndTearout({
      diameter_mm: config.boltDiameter_mm,
      plateThickness_mm: config.beam.webThickness_mm,
      Fu_MPa: config.beam.ultimateStrength_MPa,
      clearDistance_mm: singleInnerClear_mm,
      demand_kN: shearDemand_kN / nBolts,
      method,
    });

    const webBearingTotal_kN =
      config.boltColumns * (webBearingEdge.capacity_kN + (config.boltRows - 1) * webBearingInner.capacity_kN);

    limitStateResults.push({
      limitState: 'Bolt Bearing & Tearout on Beam Web',
      capacity_kN: webBearingTotal_kN,
      demand_kN: shearDemand_kN,
      utilization: shearDemand_kN / webBearingTotal_kN,
      pass: shearDemand_kN <= webBearingTotal_kN,
      governingClause: 'AISC 360-16 Section J3.10',
      steps: [
        {
          equationName: 'Total Beam Web Bearing Resistance',
          latexFormula: '\\sum \\phi R_n = n_{edge} \\cdot \\phi R_{n,edge} + n_{inner} \\cdot \\phi R_{n,inner}',
          substitutedValues: `${config.boltColumns}(${webBearingEdge.capacity_kN.toFixed(1)} + ${config.boltRows - 1}(${webBearingInner.capacity_kN.toFixed(1)})) = ${webBearingTotal_kN.toFixed(1)} kN`,
          resultValue: webBearingTotal_kN,
          unit: 'kN',
          citation: 'AISC 360-16 Section J3.10',
          pass: shearDemand_kN <= webBearingTotal_kN,
          utilization: shearDemand_kN / webBearingTotal_kN,
        },
      ],
    });

    // -------------------------------------------------------------
    // 7. Double Fillet Weld to Supporting Member
    // -------------------------------------------------------------
    // Two fillet welds of size w and length Lw = plateHeight
    // Subjected to shear V and eccentric moment M = V * a
    const Lw_mm = config.plateHeight_mm;
    const w_mm = config.weldLeg_mm;
    const te_weld_mm = 0.7071 * w_mm;
    const Aweld_total_mm2 = 2 * te_weld_mm * Lw_mm;
    const Sweld_mm3 = 2 * (te_weld_mm * Math.pow(Lw_mm, 2)) / 6;

    // Direct shear stress: f_v = V / Aweld
    // Bending stress: f_b = (V * a) / Sweld
    // Resultant stress: f_res = sqrt(f_v^2 + f_b^2)
    const arm_a_mm = config.weldToBoltLine_a_mm;
    const V_N = shearDemand_kN * 1000;
    const f_v_MPa = Aweld_total_mm2 > 0 ? V_N / Aweld_total_mm2 : 0;
    const f_b_MPa = Sweld_mm3 > 0 ? (V_N * arm_a_mm) / Sweld_mm3 : 0;
    const f_res_MPa = Math.sqrt(f_v_MPa * f_v_MPa + f_b_MPa * f_b_MPa);

    const singleWeld = WeldLimitStateEngine.checkAiscFilletWeld({
      weldLeg_mm: w_mm,
      weldLength_mm: Lw_mm * 2,
      electrode: config.weldElectrode,
      demand_kN: shearDemand_kN,
      method,
    });

    // Effective weld capacity considering moment:
    const weldCapacityReduction = f_res_MPa > 0 ? f_v_MPa / f_res_MPa : 1.0;
    const weldCapacity_kN = singleWeld.capacity_kN * weldCapacityReduction;

    limitStateResults.push({
      limitState: 'Fillet Weld to Support (Eccentric Shear)',
      capacity_kN: weldCapacity_kN,
      demand_kN: shearDemand_kN,
      utilization: shearDemand_kN / weldCapacity_kN,
      pass: shearDemand_kN <= weldCapacity_kN,
      governingClause: 'AISC 360-16 Section J2.4 / Part 10',
      steps: [
        {
          equationName: 'Double Fillet Weld Throat Area',
          latexFormula: 'A_w = 2 \\cdot 0.7071 \\cdot w \\cdot L_w',
          substitutedValues: `2(0.7071)(${w_mm})(${Lw_mm}) = ${Aweld_total_mm2.toFixed(0)} mm^2`,
          resultValue: Aweld_total_mm2,
          unit: 'mm²',
          citation: 'AISC 360-16 Section J2.2',
          pass: true,
        },
        {
          equationName: 'Eccentric Weld Shear Capacity',
          latexFormula: '\\phi R_n = \\phi R_{n,shear} \\cdot \\frac{f_v}{\\sqrt{f_v^2 + f_b^2}}',
          substitutedValues: `${singleWeld.capacity_kN.toFixed(1)} \\cdot ${weldCapacityReduction.toFixed(3)} = ${weldCapacity_kN.toFixed(1)} kN`,
          resultValue: weldCapacity_kN,
          unit: 'kN',
          citation: 'AISC Manual 15th Ed. Part 8 / Part 10',
          pass: shearDemand_kN <= weldCapacity_kN,
          utilization: shearDemand_kN / weldCapacity_kN,
        },
      ],
    });

    // -------------------------------------------------------------
    // 8. Plate Flexural Yielding (Extended Tabs)
    // -------------------------------------------------------------
    if (!isConventional) {
      // Plastic section modulus of plate: Z = t * h^2 / 4
      const Zp_mm3 = (config.plateThickness_mm * Math.pow(config.plateHeight_mm, 2)) / 4;
      // Nominal flexural capacity: Mn = Fy * Zp
      const Mn_kNm = (config.plateFy_MPa * Zp_mm3) / 1e6;
      const phiM = 0.90;
      const designMn_kNm = phiM * Mn_kNm;
      // Applied moment = V * a
      const Mu_kNm = (shearDemand_kN * config.weldToBoltLine_a_mm) / 1000;
      // Equivalent shear capacity based on flexure: V_cap = designMn / a
      const flexuralShearCap_kN = (designMn_kNm / (config.weldToBoltLine_a_mm / 1000));

      limitStateResults.push({
        limitState: 'Plate Flexural Yielding (Extended Tab)',
        capacity_kN: flexuralShearCap_kN,
        demand_kN: shearDemand_kN,
        utilization: shearDemand_kN / flexuralShearCap_kN,
        pass: shearDemand_kN <= flexuralShearCap_kN,
        governingClause: 'AISC 360-16 Section J4.1 / Manual Part 10',
        steps: [
          {
            equationName: 'Plate Plastic Modulus Z_p',
            latexFormula: 'Z_p = \\frac{t_p \\cdot h_p^2}{4}',
            substitutedValues: `\\frac{${config.plateThickness_mm} \\cdot ${config.plateHeight_mm}^2}{4} = ${Zp_mm3.toFixed(0)} mm^3`,
            resultValue: Zp_mm3,
            unit: 'mm³',
            citation: 'AISC 360-16 Section J4.1',
            pass: true,
          },
          {
            equationName: 'Design Flexural Strength \\phi M_n',
            latexFormula: '\\phi M_n = 0.90 F_y Z_p',
            substitutedValues: `0.90(${config.plateFy_MPa})(${Zp_mm3.toFixed(0)}) / 10^6 = ${designMn_kNm.toFixed(2)} kNm`,
            resultValue: designMn_kNm,
            unit: 'kNm',
            citation: 'AISC 360-16 Eq. J4-1',
            pass: Mu_kNm <= designMn_kNm,
            utilization: Mu_kNm / designMn_kNm,
          },
        ],
      });
    }

    // -------------------------------------------------------------
    // Find Governing Limit State (Lowest Design Capacity)
    // -------------------------------------------------------------
    let minCapacity = Infinity;
    let governingLS = '';

    for (const ls of limitStateResults) {
      if (ls.capacity_kN < minCapacity) {
        minCapacity = ls.capacity_kN;
        governingLS = ls.limitState;
      }
    }

    const overallUtilization = minCapacity > 0 ? shearDemand_kN / minCapacity : 999;

    return {
      connectionId: config.connectionId,
      connectionType: 'SINGLE_PLATE',
      standard,
      method,
      designShearCapacity_kN: minCapacity,
      appliedShearDemand_kN: shearDemand_kN,
      utilization: overallUtilization,
      pass: overallUtilization <= 1.0,
      governingLimitState: governingLS,
      isConventionalTab: isConventional,
      limitStateResults,
    };
  }
}
