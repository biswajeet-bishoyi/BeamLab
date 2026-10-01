/**
 * CltPanelStressAuditor: Evaluates multi-layer CLT stresses:
 * - Outer layer extreme fiber bending stress sigma_m
 * - Interlaminar rolling shear stress tau_roll in cross layers (critical failure mode)
 * - Longitudinal shear stress tau_v
 * - Serviceability deflection and vibration frequency
 */

import { CltLayupDefinition } from './CltLayupModel';
import { CltShearAnalogyEngine, CltCrossSectionProperties } from './CltShearAnalogyEngine';
import { TimberDesignStrengths } from '../material/TimberMaterialEngine';

export interface CltStressAuditResult {
  /** Maximum outer layer bending stress (MPa) */
  appliedBendingStress: number;
  /** Design bending strength of outer layer (MPa) */
  allowableBendingStress: number;
  bendingDcr: number;

  /** Interlaminar rolling shear stress (MPa) in cross layer */
  appliedRollingShearStress: number;
  /** Design rolling shear strength f_r,d (MPa) */
  allowableRollingShearStress: number;
  rollingShearDcr: number;

  /** Total deflection (mm) and span ratio */
  deflectionMm: number;
  spanRatio: number;
  deflectionCompliant: boolean;

  /** Estimated fundamental floor vibration frequency f_1 (Hz) */
  naturalFrequencyHz: number;
  vibrationCompliant: boolean; // f_1 >= 8.0 Hz (Eurocode 5 residential floor vibration criterion)

  governingDcr: number;
  isCompliant: boolean;
  governingMode: string;
}

export class CltPanelStressAuditor {
  /**
   * Audit structural capacity and serviceability of a CLT panel floor or roof under out-of-plane loading.
   *
   * @param layup CLT layup definition
   * @param spanLengthMm Primary panel span in mm
   * @param strengths Design material strengths
   * @param appliedMomentKNm Major bending moment M_Ed per 1m strip (kNm/m)
   * @param appliedShearKN Major shear force V_Ed per 1m strip (kN/m)
   * @param uniformLoadKNm2 Service load in kN/m² for deflection and vibration check
   */
  static auditPanel(
    layup: CltLayupDefinition,
    spanLengthMm: number,
    strengths: TimberDesignStrengths,
    appliedMomentKNm: number,
    appliedShearKN: number,
    uniformLoadKNm2: number
  ): CltStressAuditResult {
    const props = CltShearAnalogyEngine.computeProperties(layup, spanLengthMm);
    const M_Nmm = Math.abs(appliedMomentKNm) * 1e6;
    const V_N = Math.abs(appliedShearKN) * 1000;

    // 1. Extreme fiber bending stress in outer layer (z = h / 2)
    // sigma_m = M * (E_outer * (h / 2)) / (EI)_eff
    const E_outer = layup.layers[0].grade.E0_mean;
    const z_outer = props.totalThickness / 2;
    const appliedBendingStress = (M_Nmm * E_outer * z_outer) / props.EI_eff;
    const allowableBendingStress = strengths.fm_d;
    const bendingDcr = appliedBendingStress / Math.max(1e-3, allowableBendingStress);

    // 2. Interlaminar rolling shear stress in the cross layer:
    // tau_roll = (V * (ES)_eff) / ((EI)_eff * b)
    // where (ES)_eff is the first moment of area of the outer layer
    const appliedRollingShearStress = (V_N * props.ES_eff) / (props.EI_eff * props.stripWidth);
    const allowableRollingShearStress = strengths.fr_d;
    const rollingShearDcr = appliedRollingShearStress / Math.max(1e-3, allowableRollingShearStress);

    // 3. Deflection calculation
    const defl = CltShearAnalogyEngine.computePanelDeflection(props, spanLengthMm, uniformLoadKNm2);
    const spanRatio = spanLengthMm / Math.max(1e-3, defl.wTotalMm);
    const deflectionCompliant = spanRatio >= 300; // L / 300 total deflection limit

    // 4. Fundamental floor vibration frequency f_1 (EN 1995-1-1 Clause 7.3.1):
    // f_1 = (pi / (2 * L^2)) * sqrt((EI)_eff / m)
    // where m is the vibrating mass: self-weight + quasi-permanent imposed load (psi_2 = 0.20)
    const massDensity = layup.layers[0].grade.density; // kg/m³
    const volumePerMeterStrip = (props.stripWidth / 1000) * (props.totalThickness / 1000) * 1.0;
    const selfWeightKgPerM = massDensity * volumePerMeterStrip;
    const psi_2 = 0.20; // Quasi-permanent combination factor
    const quasiPermanentMassKgPerM = (uniformLoadKNm2 * 1000 / 9.81) * (props.stripWidth / 1000) * psi_2;
    const totalMassKgPerM = selfWeightKgPerM + quasiPermanentMassKgPerM;

    // (EI)_eff is in N*mm² = 1e-6 N*m²
    const EI_Nm2 = props.EI_eff * 1e-6;
    const L_m = spanLengthMm / 1000;
    const naturalFrequencyHz =
      (Math.PI / (2 * Math.pow(L_m, 2))) * Math.sqrt(Math.max(1e-3, EI_Nm2 / Math.max(1e-3, totalMassKgPerM)));
    const vibrationCompliant = naturalFrequencyHz >= 8.0; // High-frequency floor threshold

    const governingDcr = Math.max(bendingDcr, rollingShearDcr);
    const isCompliant = governingDcr <= 1.0 && deflectionCompliant;

    let governingMode = 'Bending Tension / Compression';
    if (rollingShearDcr > bendingDcr) {
      governingMode = 'Interlaminar Rolling Shear';
    } else if (!deflectionCompliant) {
      governingMode = 'Panel Deflection';
    } else if (!vibrationCompliant) {
      governingMode = 'Low Frequency Floor (< 8.0 Hz)';
    }

    return {
      appliedBendingStress,
      allowableBendingStress,
      bendingDcr,
      appliedRollingShearStress,
      allowableRollingShearStress,
      rollingShearDcr,
      deflectionMm: defl.wTotalMm,
      spanRatio,
      deflectionCompliant,
      naturalFrequencyHz,
      vibrationCompliant,
      governingDcr,
      isCompliant,
      governingMode,
    };
  }
}
