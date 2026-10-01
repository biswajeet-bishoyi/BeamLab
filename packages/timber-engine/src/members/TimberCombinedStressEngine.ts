/**
 * TimberCombinedStressEngine: Combined axial and flexural interaction,
 * longitudinal shear verification (with crack factor k_cr), and serviceability deflection audits.
 */

import { TimberCrossSectionProperties, TimberMemberForces } from './TimberMemberModels';
import { TimberDesignStrengths } from '../material/TimberMaterialEngine';
import { TimberFlexureEngine } from './TimberFlexureEngine';
import { TimberAxialEngine } from './TimberAxialEngine';

export interface TimberCombinedStressResult {
  /** Combined stress interaction index (must be <= 1.0) */
  interactionDcr: number;
  /** Bending DCR */
  bendingDcr: number;
  /** Axial DCR */
  axialDcr: number;
  /** Shear stress check */
  shearResult: {
    appliedShearStress: number;
    allowableShearStress: number;
    shearDcr: number;
    isCompliant: boolean;
  };
  /** Serviceability deflection check */
  deflectionResult: {
    instantaneousMm: number;
    finalCreepMm: number;
    spanRatio: number; // e.g. L / 350
    isCompliant: boolean;
  };
  isCompliant: boolean;
  governingFailureMode: string;
}

export class TimberCombinedStressEngine {
  /**
   * Complete member design verification according to Eurocode 5 (Clauses 6.1, 6.2, 6.3).
   */
  static verifyEurocode5Member(
    props: TimberCrossSectionProperties,
    strengths: TimberDesignStrengths,
    forces: TimberMemberForces,
    deadLoadRatio: number = 0.60
  ): TimberCombinedStressResult {
    const flexure = TimberFlexureEngine.checkEurocode5Bending(props, strengths, forces.momentY);
    const axial = TimberAxialEngine.checkEurocode5Axial(props, strengths, forces.axialForce);

    // Major bending + minor bending + axial interaction
    // EN 1995-1-1 Equation 6.23 & 6.24:
    // (sigma_c,0,d / (k_c,y * f_c,0,d)) + (sigma_m,y,d / f_m,y,d) + k_m * (sigma_m,z,d / f_m,z,d) <= 1.0
    const km = 0.70; // For rectangular sections
    const appliedSigmaZ = forces.momentZ ? (Math.abs(forces.momentZ) * 1e6) / props.Sy : 0;
    const termZ = (appliedSigmaZ / Math.max(1e-3, strengths.fm_d)) * km;

    let interactionDcr = 0;
    if (axial.action === 'COMPRESSION') {
      interactionDcr = axial.dcr + flexure.appliedStress / Math.max(1e-3, strengths.fm_d) + termZ;
    } else {
      interactionDcr = axial.dcr + flexure.dcr + termZ;
    }

    // Shear check with crack factor k_cr (EN 1995-1-1 Clause 6.1.7)
    // k_cr = 0.67 for solid timber and glulam
    const k_cr = 0.67;
    const beff = props.b * k_cr;
    const appliedShearStress = (1.5 * Math.abs(forces.shearZ) * 1000) / (beff * props.d);
    const shearDcr = appliedShearStress / Math.max(1e-3, strengths.fv_d);

    // Serviceability: deflection calculation assuming simply supported UDL equivalent
    // w_inst = (5 * M * L^2) / (48 * E * I)
    const M_Nmm = Math.abs(forces.momentY) * 1e6;
    const w_inst = (5 * M_Nmm * Math.pow(props.L, 2)) / (48 * strengths.E0_mean_d * props.Ix);
    // Long term deflection with creep: w_fin = w_inst * (1 + k_def * deadLoadRatio)
    const k_def = (strengths.E0_mean_d / strengths.E0_eff) - 1.0;
    const w_fin = w_inst * (1.0 + k_def * deadLoadRatio);
    const spanRatio = props.L / Math.max(1e-3, w_fin);
    const deflectionCompliant = spanRatio >= 250; // L / 250 limit for total deflection

    const overallCompliant =
      interactionDcr <= 1.0 && shearDcr <= 1.0 && deflectionCompliant;

    let governingFailureMode = 'Combined Compression & Flexure';
    if (shearDcr > interactionDcr && shearDcr > (250 / spanRatio)) {
      governingFailureMode = 'Longitudinal Shear';
    } else if ((250 / spanRatio) > interactionDcr) {
      governingFailureMode = 'Long-Term Creep Deflection';
    }

    return {
      interactionDcr,
      bendingDcr: flexure.dcr,
      axialDcr: axial.dcr,
      shearResult: {
        appliedShearStress,
        allowableShearStress: strengths.fv_d,
        shearDcr,
        isCompliant: shearDcr <= 1.0,
      },
      deflectionResult: {
        instantaneousMm: w_inst,
        finalCreepMm: w_fin,
        spanRatio,
        isCompliant: deflectionCompliant,
      },
      isCompliant: overallCompliant,
      governingFailureMode,
    };
  }

  /**
   * Complete member design verification according to NDS 2024 (Sections 3.4, 3.7, 3.9).
   */
  static verifyNdsMember(
    props: TimberCrossSectionProperties,
    strengths: TimberDesignStrengths,
    forces: TimberMemberForces,
    deadLoadRatio: number = 0.60
  ): TimberCombinedStressResult {
    const flexure = TimberFlexureEngine.checkNdsBending(props, strengths, forces.momentY);
    const axial = TimberAxialEngine.checkNdsAxial(props, strengths, forces.axialForce);

    // NDS Equation 3.9-3: (fc / Fc')^2 + fbx / [Fbx' * (1 - fc / FcE1)] <= 1.0
    let interactionDcr = 0;
    if (axial.action === 'COMPRESSION') {
      const fc_ratio = axial.appliedStress / Math.max(1e-3, strengths.fc0_d);
      const PDeltaAmp = Math.max(0.1, 1.0 - axial.appliedStress / Math.max(1e-3, axial.criticalEulerStress));
      const fb_term = flexure.appliedStress / (flexure.designCapacity * PDeltaAmp);
      interactionDcr = Math.pow(fc_ratio, 2) + fb_term;
    } else {
      interactionDcr = axial.dcr + flexure.dcr;
    }

    // NDS Shear check: fv = 1.5 * V / (b * d) <= Fv'
    const appliedShearStress = (1.5 * Math.abs(forces.shearZ) * 1000) / (props.b * props.d);
    const shearDcr = appliedShearStress / Math.max(1e-3, strengths.fv_d);

    // Serviceability deflection
    const M_Nmm = Math.abs(forces.momentY) * 1e6;
    const w_inst = (5 * M_Nmm * Math.pow(props.L, 2)) / (48 * strengths.E0_mean_d * props.Ix);
    const creepMultiplier = 1.5; // NDS typical creep factor for long-term load
    const w_fin = w_inst * (1.0 + (creepMultiplier - 1.0) * deadLoadRatio);
    const spanRatio = props.L / Math.max(1e-3, w_fin);
    const deflectionCompliant = spanRatio >= 240;

    const overallCompliant = interactionDcr <= 1.0 && shearDcr <= 1.0 && deflectionCompliant;

    return {
      interactionDcr,
      bendingDcr: flexure.dcr,
      axialDcr: axial.dcr,
      shearResult: {
        appliedShearStress,
        allowableShearStress: strengths.fv_d,
        shearDcr,
        isCompliant: shearDcr <= 1.0,
      },
      deflectionResult: {
        instantaneousMm: w_inst,
        finalCreepMm: w_fin,
        spanRatio,
        isCompliant: deflectionCompliant,
      },
      isCompliant: overallCompliant,
      governingFailureMode: interactionDcr > shearDcr ? 'Combined Axial & Bending Interaction' : 'Longitudinal Shear',
    };
  }
}
