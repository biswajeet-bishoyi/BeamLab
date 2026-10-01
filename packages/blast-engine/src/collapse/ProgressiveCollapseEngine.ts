/**
 * Progressive Collapse & Alternate Load Path (ALP) Engine
 * Implemented per DoD UFC 4-023-03 and GSA Alternate Path Guidelines
 * @packageDocumentation
 */

import { ProgressiveCollapseScenario, ProgressiveCollapseResult } from '../types';

export class ProgressiveCollapseEngine {
  /**
   * Evaluate structural integrity following sudden column loss via Alternate Load Path method
   */
  public static evaluateAlternatePath(
    scenario: ProgressiveCollapseScenario
  ): ProgressiveCollapseResult {
    const {
      columnLocation,
      tributaryGravityLoadKN,
      spanBeamCapacityKNm,
      beamLengthM,
      dynamicAmplificationFactor,
    } = scenario;

    // Standard DAF per UFC 4-023-03: 2.0 for elastic, 1.4 for ductile framing
    const daf = dynamicAmplificationFactor ?? (columnLocation === 'corner' ? 2.0 : 1.5);

    // Double-span effect over removed column
    // Effective double span = 2 * beamLengthM
    const Leff = 2 * beamLengthM;

    // Equivalent distributed load w (kN/m) from tributary gravity load
    const wTrib = tributaryGravityLoadKN / Leff;

    // Peak dynamic moment demand over newly created double span:
    // Fixed-ended or continuous framing: M_dynamic = DAF * (w * Leff^2) / 12
    // Pin-ended or simple framing: M_dynamic = DAF * (w * Leff^2) / 8
    const momentDivisor = columnLocation === 'corner' ? 8 : 10;
    const dynamicAmplifiedDemand = daf * ((wTrib * (Leff ** 2)) / momentDivisor);

    // Demand-Capacity Ratio (DCR)
    const dcr = spanBeamCapacityKNm > 0 ? dynamicAmplifiedDemand / spanBeamCapacityKNm : 999;

    // Catenary action tension check at large plastic rotations (assume sag delta = 0.08 * Leff)
    const sagDelta = 0.08 * Leff;
    const catenaryTensionDemand = (wTrib * (Leff ** 2)) / (8 * Math.max(0.1, sagDelta));

    // Collapse criteria:
    // UFC 4-023-03 allows DCR up to 2.0 for ductile moment frames, 1.5 for ordinary frames
    const allowableDCR = columnLocation === 'corner' ? 1.5 : 2.0;
    const collapsePrevented = dcr <= allowableDCR;

    let failureMechanism: ProgressiveCollapseResult['failureMechanism'] = 'adequate-redistribution';
    if (!collapsePrevented) {
      if (dcr > 3.0) {
        failureMechanism = 'shear';
      } else if (catenaryTensionDemand > spanBeamCapacityKNm * 2) {
        failureMechanism = 'catenary-rupture';
      } else {
        failureMechanism = 'flexural';
      }
    }

    return {
      scenario,
      dynamicAmplifiedDemandKNm: dynamicAmplifiedDemand,
      demandCapacityRatio: dcr,
      catenaryTensionDemandKN: catenaryTensionDemand,
      collapsePrevented,
      failureMechanism,
    };
  }
}
