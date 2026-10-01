/**
 * Double Web Angle Connection (Clip Angles) Design Engine
 * Evaluates all-bolted or welded/bolted double clip angle simple shear connections
 * per AISC 360-16 / AISC Manual 15th Ed. Part 10 and Eurocode 3 EN 1993-1-8.
 */

import { DoubleAngleConfig, ShearConnectionEvaluation } from './ShearConnectionTypes';
import {
  DesignStandard,
  DesignMethod,
  LimitStateResult,
  STANDARD_BOLT_GEOMETRY,
  CalculationStep,
} from '../core/ConnectionTypes';
import { BoltLimitStateEngine } from '../bolts/BoltLimitStateEngine';
import { BlockShearEngine } from './BlockShearEngine';
import { WeldLimitStateEngine } from '../welds/WeldLimitStateEngine';

export class DoubleAngleShearEngine {
  public static evaluate(options: {
    config: DoubleAngleConfig;
    shearDemand_kN: number;
    standard?: DesignStandard;
    method?: DesignMethod;
  }): ShearConnectionEvaluation {
    const { config, shearDemand_kN, standard = 'AISC_360_16', method = 'LRFD' } = options;
    const limitStateResults: LimitStateResult[] = [];

    const geomWeb = STANDARD_BOLT_GEOMETRY[config.webBoltDiameter_mm] || {
      standardHole_mm: config.webBoltDiameter_mm + 2,
    };
    const dh_web = geomWeb.standardHole_mm;
    const nWebBolts = config.webBoltRows;

    // -------------------------------------------------------------
    // 1. Fasteners in Beam Web (Double Shear)
    // -------------------------------------------------------------
    const webBoltShear =
      standard === 'AISC_360_16'
        ? BoltLimitStateEngine.checkAiscBoltShear({
            grade: config.webBoltGrade,
            diameter_mm: config.webBoltDiameter_mm,
            threadCondition: 'INCLUDED',
            shearPlanes: 2, // Double shear through 2 angles
            demand_kN: shearDemand_kN / nWebBolts,
            method,
          })
        : BoltLimitStateEngine.checkEurocodeBoltShear({
            grade: config.webBoltGrade,
            diameter_mm: config.webBoltDiameter_mm,
            threadCondition: 'INCLUDED',
            shearPlanes: 2,
            demand_kN: shearDemand_kN / nWebBolts,
          });

    const webBoltGroupCapacity_kN = webBoltShear.capacity_kN * nWebBolts;
    limitStateResults.push({
      limitState: 'Beam Web Bolts Double Shear',
      capacity_kN: webBoltGroupCapacity_kN,
      demand_kN: shearDemand_kN,
      utilization: shearDemand_kN / webBoltGroupCapacity_kN,
      pass: shearDemand_kN <= webBoltGroupCapacity_kN,
      governingClause: 'AISC 360-16 Section J3.6 (Double Shear)',
      steps: [
        {
          equationName: 'Double Shear Bolt Group Capacity',
          latexFormula: '\\sum \\phi R_n = n \\cdot (2 \\cdot \\phi R_{n,single})',
          substitutedValues: `${nWebBolts} \\cdot ${webBoltShear.capacity_kN.toFixed(1)} = ${webBoltGroupCapacity_kN.toFixed(1)} kN`,
          resultValue: webBoltGroupCapacity_kN,
          unit: 'kN',
          citation: 'AISC 360-16 Section J3.6',
          pass: shearDemand_kN <= webBoltGroupCapacity_kN,
          utilization: shearDemand_kN / webBoltGroupCapacity_kN,
        },
      ],
    });

    // -------------------------------------------------------------
    // 2. Bolt Bearing on Beam Web
    // -------------------------------------------------------------
    const webClearDist_mm = Math.max(5, config.webEdgeDistanceTop_mm - 0.5 * dh_web);
    const webInnerClearDist_mm = Math.max(5, config.webBoltPitch_mm - dh_web);

    const webBearingEdge = BoltLimitStateEngine.checkAiscBearingAndTearout({
      diameter_mm: config.webBoltDiameter_mm,
      plateThickness_mm: config.beam.webThickness_mm,
      Fu_MPa: config.beam.ultimateStrength_MPa,
      clearDistance_mm: webClearDist_mm,
      demand_kN: shearDemand_kN / nWebBolts,
      method,
    });

    const webBearingInner = BoltLimitStateEngine.checkAiscBearingAndTearout({
      diameter_mm: config.webBoltDiameter_mm,
      plateThickness_mm: config.beam.webThickness_mm,
      Fu_MPa: config.beam.ultimateStrength_MPa,
      clearDistance_mm: webInnerClearDist_mm,
      demand_kN: shearDemand_kN / nWebBolts,
      method,
    });

    const totalWebBearing_kN =
      webBearingEdge.capacity_kN + (nWebBolts - 1) * webBearingInner.capacity_kN;

    limitStateResults.push({
      limitState: 'Bolt Bearing & Tearout on Beam Web',
      capacity_kN: totalWebBearing_kN,
      demand_kN: shearDemand_kN,
      utilization: shearDemand_kN / totalWebBearing_kN,
      pass: shearDemand_kN <= totalWebBearing_kN,
      governingClause: 'AISC 360-16 Section J3.10',
      steps: [
        {
          equationName: 'Beam Web Bearing Resistance',
          latexFormula: '\\sum \\phi R_n = \\phi R_{n,edge} + (n - 1) \\phi R_{n,inner}',
          substitutedValues: `${webBearingEdge.capacity_kN.toFixed(1)} + ${nWebBolts - 1}(${webBearingInner.capacity_kN.toFixed(1)}) = ${totalWebBearing_kN.toFixed(1)} kN`,
          resultValue: totalWebBearing_kN,
          unit: 'kN',
          citation: 'AISC 360-16 Section J3.10',
          pass: shearDemand_kN <= totalWebBearing_kN,
          utilization: shearDemand_kN / totalWebBearing_kN,
        },
      ],
    });

    // -------------------------------------------------------------
    // 3. Double Angle Gross Shear Yielding
    // -------------------------------------------------------------
    // 2 angles of length L_a and thickness t_a
    const Agv_angles = 2 * (config.angleLength_mm * config.angleThickness_mm);
    const Rn_angleYield_kN = (0.60 * config.angleFy_MPa * Agv_angles) / 1000;
    const phiYield = 1.00;
    const angleGrossCapacity_kN = method === 'LRFD' ? phiYield * Rn_angleYield_kN : Rn_angleYield_kN / 1.5;

    limitStateResults.push({
      limitState: 'Double Angles Gross Shear Yielding',
      capacity_kN: angleGrossCapacity_kN,
      demand_kN: shearDemand_kN,
      utilization: shearDemand_kN / angleGrossCapacity_kN,
      pass: shearDemand_kN <= angleGrossCapacity_kN,
      governingClause: 'AISC 360-16 Section J4.2',
      steps: [
        {
          equationName: 'Double Angle Gross Shear Yielding',
          latexFormula: '\\phi R_n = 1.00 \\cdot 0.60 F_y (2 A_g)',
          substitutedValues: `0.60(${config.angleFy_MPa})(${Agv_angles.toFixed(0)}) / 1000 = ${angleGrossCapacity_kN.toFixed(1)} kN`,
          resultValue: angleGrossCapacity_kN,
          unit: 'kN',
          citation: 'AISC 360-16 Section J4.2',
          pass: shearDemand_kN <= angleGrossCapacity_kN,
          utilization: shearDemand_kN / angleGrossCapacity_kN,
        },
      ],
    });

    // -------------------------------------------------------------
    // 4. Double Angle Net Shear Rupture
    // -------------------------------------------------------------
    const Anv_angles = 2 * Math.max(0, (config.angleLength_mm - nWebBolts * dh_web) * config.angleThickness_mm);
    const Rn_angleRupture_kN = (0.60 * config.angleFu_MPa * Anv_angles) / 1000;
    const phiRupture = 0.75;
    const angleNetCapacity_kN = method === 'LRFD' ? phiRupture * Rn_angleRupture_kN : Rn_angleRupture_kN / 2.0;

    limitStateResults.push({
      limitState: 'Double Angles Net Shear Rupture',
      capacity_kN: angleNetCapacity_kN,
      demand_kN: shearDemand_kN,
      utilization: shearDemand_kN / angleNetCapacity_kN,
      pass: shearDemand_kN <= angleNetCapacity_kN,
      governingClause: 'AISC 360-16 Section J4.2',
      steps: [
        {
          equationName: 'Double Angle Net Shear Rupture',
          latexFormula: '\\phi R_n = 0.75 \\cdot 0.60 F_u (2 A_{nv})',
          substitutedValues: `0.75(0.60)(${config.angleFu_MPa})(${Anv_angles.toFixed(0)}) / 1000 = ${angleNetCapacity_kN.toFixed(1)} kN`,
          resultValue: angleNetCapacity_kN,
          unit: 'kN',
          citation: 'AISC 360-16 Section J4.2',
          pass: shearDemand_kN <= angleNetCapacity_kN,
          utilization: shearDemand_kN / angleNetCapacity_kN,
        },
      ],
    });

    // -------------------------------------------------------------
    // 5. Double Angle Block Shear Rupture
    // -------------------------------------------------------------
    const L_gv_angle = (nWebBolts - 1) * config.webBoltPitch_mm + config.webEdgeDistanceTop_mm;
    const L_gt_angle = config.webEdgeDistanceEnd_mm;

    const angleBlockShearSingle = BlockShearEngine.checkAiscBlockShear({
      thickness_mm: config.angleThickness_mm,
      Fy_MPa: config.angleFy_MPa,
      Fu_MPa: config.angleFu_MPa,
      holeDiameter_mm: dh_web,
      shearLengthGross_mm: L_gv_angle,
      tensionLengthGross_mm: L_gt_angle,
      boltsInShearLine: nWebBolts,
      demand_kN: shearDemand_kN / 2, // Half per angle
      method,
      componentName: 'Single Clip Angle',
    });

    const angleBlockShearTotal_kN = angleBlockShearSingle.capacity_kN * 2;
    limitStateResults.push({
      limitState: 'Double Angles Block Shear Rupture',
      capacity_kN: angleBlockShearTotal_kN,
      demand_kN: shearDemand_kN,
      utilization: shearDemand_kN / angleBlockShearTotal_kN,
      pass: shearDemand_kN <= angleBlockShearTotal_kN,
      governingClause: 'AISC 360-16 Section J4.3',
      steps: [
        {
          equationName: 'Double Angle Combined Block Shear',
          latexFormula: '\\sum \\phi R_n = 2 \\cdot \\phi R_{n,single\\_angle}',
          substitutedValues: `2 \\cdot ${angleBlockShearSingle.capacity_kN.toFixed(1)} = ${angleBlockShearTotal_kN.toFixed(1)} kN`,
          resultValue: angleBlockShearTotal_kN,
          unit: 'kN',
          citation: 'AISC 360-16 Section J4.3',
          pass: shearDemand_kN <= angleBlockShearTotal_kN,
          utilization: shearDemand_kN / angleBlockShearTotal_kN,
        },
      ],
    });

    // -------------------------------------------------------------
    // 6. Fasteners / Weld to Supporting Member
    // -------------------------------------------------------------
    if (config.supportFastenerType === 'BOLTED' && config.supportBoltGrade && config.supportBoltDiameter_mm) {
      // Outstanding legs bolted to support (typically 2 bolts per row, 1 in each angle leg)
      const nSupportBolts = 2 * config.webBoltRows;
      const singleSupportBolt = BoltLimitStateEngine.checkAiscBoltShear({
        grade: config.supportBoltGrade,
        diameter_mm: config.supportBoltDiameter_mm,
        threadCondition: 'INCLUDED',
        shearPlanes: 1, // Single shear in outstanding legs
        demand_kN: shearDemand_kN / nSupportBolts,
        method,
      });

      const totalSupportBoltsCap_kN = singleSupportBolt.capacity_kN * nSupportBolts;
      limitStateResults.push({
        limitState: 'Support Fasteners Shear (Outstanding Legs)',
        capacity_kN: totalSupportBoltsCap_kN,
        demand_kN: shearDemand_kN,
        utilization: shearDemand_kN / totalSupportBoltsCap_kN,
        pass: shearDemand_kN <= totalSupportBoltsCap_kN,
        governingClause: 'AISC 360-16 Section J3.6',
        steps: [
          {
            equationName: 'Outstanding Leg Bolts Capacity',
            latexFormula: '\\sum \\phi R_n = n_{sup} \\cdot \\phi R_{nv}',
            substitutedValues: `${nSupportBolts} \\cdot ${singleSupportBolt.capacity_kN.toFixed(1)} = ${totalSupportBoltsCap_kN.toFixed(1)} kN`,
            resultValue: totalSupportBoltsCap_kN,
            unit: 'kN',
            citation: 'AISC 360-16 Section J3.6',
            pass: shearDemand_kN <= totalSupportBoltsCap_kN,
            utilization: shearDemand_kN / totalSupportBoltsCap_kN,
          },
        ],
      });
    } else if (config.supportFastenerType === 'WELDED' && config.supportWeldLeg_mm && config.supportWeldElectrode) {
      // Welded outstanding legs: 2 fillet welds of length L_a
      const weldResult = WeldLimitStateEngine.checkAiscFilletWeld({
        weldLeg_mm: config.supportWeldLeg_mm,
        weldLength_mm: 2 * config.angleLength_mm,
        electrode: config.supportWeldElectrode,
        demand_kN: shearDemand_kN,
        method,
      });

      limitStateResults.push({
        limitState: 'Support Welds Shear (Outstanding Legs)',
        capacity_kN: weldResult.capacity_kN,
        demand_kN: shearDemand_kN,
        utilization: shearDemand_kN / weldResult.capacity_kN,
        pass: shearDemand_kN <= weldResult.capacity_kN,
        governingClause: 'AISC 360-16 Section J2.4',
        steps: weldResult.steps,
      });
    }

    // -------------------------------------------------------------
    // Find Governing Limit State
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
      connectionType: 'DOUBLE_ANGLE',
      standard,
      method,
      designShearCapacity_kN: minCapacity,
      appliedShearDemand_kN: shearDemand_kN,
      utilization: overallUtilization,
      pass: overallUtilization <= 1.0,
      governingLimitState: governingLS,
      limitStateResults,
    };
  }
}
