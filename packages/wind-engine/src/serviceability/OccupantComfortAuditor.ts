/**
 * OccupantComfortAuditor.ts
 *
 * High-rise building serviceability and occupant comfort acceleration auditor
 * per ISO 10137:2007, AIJ guidelines, and ASCE Serviceability Recommendations.
 * Evaluates along-wind and cross-wind peak horizontal roof accelerations in milli-g
 * and computes Tuned Mass Damper (TMD) supplemental damping requirements.
 */

export type OccupancyType = 'RESIDENTIAL' | 'OFFICE' | 'HOTEL';
export type StormReturnPeriod = '1_YEAR' | '5_YEAR' | '10_YEAR';

export interface ComfortAuditInput {
  buildingHeight_m: number; // h
  crossWindWidth_m: number; // B
  alongWindLength_m: number; // L
  totalBuildingMass_tonnes: number; // Mt in metric tonnes (1000 kg)
  fundamentalFrequencyAlongWind_Hz: number; // fx (Hz)
  fundamentalFrequencyCrossWind_Hz: number; // fy (Hz)
  dampingRatio: number; // xi (e.g. 0.015 for steel, 0.02 for concrete)
  occupancyType: OccupancyType;
  stormReturnPeriod: StormReturnPeriod;
  meanWindSpeedAtRoof_mps: number; // V_h
  gustFactorG: number; // G or Gf
  resonantFactorR?: number;
}

export type PerceptionClass =
  | 'NOT_PERCEPTIBLE'
  | 'PERCEPTIBLE_QUIET'
  | 'MODERATE_MOTION'
  | 'UNACCEPTABLE_DISCOMFORT';

export interface TmdSizingRecommendation {
  isTmdRecommended: boolean;
  requiredSupplementalDamping: number; // Delta_xi (e.g. 0.015)
  targetDampingRatio: number; // xi_target
  massRatio_mu: number; // M_tmd / M_generalized
  recommendedTmdMass_tonnes: number;
  optimalTmdFrequency_Hz: number;
}

export interface ComfortAuditResult {
  alongWindAcceleration_mg: number; // ax (milli-g)
  crossWindAcceleration_mg: number; // ay (milli-g)
  peakHorizontalAcceleration_mg: number; // a_peak = sqrt(ax^2 + ay^2)
  peakHorizontalAcceleration_m_s2: number;
  allowableAcceleration_mg: number;
  demandCapacityRatio: number; // a_peak / a_allowable
  isComfortCompliant: boolean;
  perceptionLevel: PerceptionClass;
  tmdMitigation: TmdSizingRecommendation;
  recommendations: string[];
}

export class OccupantComfortAuditor {
  private static readonly G_ACCEL = 9.80665; // m/s^2

  /**
   * Returns ISO 10137 allowable peak horizontal acceleration threshold in milli-g.
   * Based on return period, occupancy, and natural vibration frequency.
   */
  public static getAllowableAcceleration_mg(
    frequency_Hz: number,
    occupancy: OccupancyType,
    returnPeriod: StormReturnPeriod
  ): number {
    // Standard ISO 10137 baseline:
    // 1-year residential threshold ~ 5 - 8 mg for frequencies 0.15 - 0.5 Hz
    // 1-year office threshold ~ 7 - 12 mg
    // 10-year storm thresholds: 15 - 18 mg (residential), 20 - 25 mg (office)
    const baseFreq = Math.max(0.1, Math.min(frequency_Hz, 1.0));

    if (returnPeriod === '1_YEAR') {
      if (occupancy === 'RESIDENTIAL') {
        // Curve: ~ 5.0 / sqrt(f) bounded [4.5, 8.0] mg
        return Number(Math.min(8.0, Math.max(4.5, 5.0 / Math.sqrt(baseFreq))).toFixed(1));
      } else {
        // Office / Hotel
        return Number(Math.min(12.0, Math.max(7.0, 7.5 / Math.sqrt(baseFreq))).toFixed(1));
      }
    } else if (returnPeriod === '5_YEAR') {
      if (occupancy === 'RESIDENTIAL') {
        return Number(Math.min(14.0, Math.max(9.0, 9.5 / Math.sqrt(baseFreq))).toFixed(1));
      } else {
        return Number(Math.min(18.0, Math.max(12.0, 13.0 / Math.sqrt(baseFreq))).toFixed(1));
      }
    } else {
      // 10-YEAR / Design storm
      if (occupancy === 'RESIDENTIAL') {
        return 15.0; // 15 mg (ASCE serviceability guide)
      } else {
        return 22.0; // 22 mg
      }
    }
  }

  /**
   * Audits peak dynamic acceleration at the highest occupied level and checks occupant comfort.
   */
  public static audit(input: ComfortAuditInput): ComfortAuditResult {
    const {
      buildingHeight_m: h,
      crossWindWidth_m: B,
      alongWindLength_m: L,
      totalBuildingMass_tonnes: Mt,
      fundamentalFrequencyAlongWind_Hz: fx,
      fundamentalFrequencyCrossWind_Hz: fy,
      dampingRatio: xi,
      occupancyType,
      stormReturnPeriod,
      meanWindSpeedAtRoof_mps: Vh,
      gustFactorG,
      resonantFactorR = 0.4,
    } = input;

    // 1. Generalized modal mass for fundamental linear mode shape:
    // M1 approx (1/3) * Mt (in kg)
    const generalizedMass_kg = (Mt * 1000) / 3.0;

    // 2. Along-wind RMS and peak acceleration:
    // Spectral dynamic wind force on frontal area: F_dyn ~ 0.5 * rho * Vh^2 * B * h * G * R
    const rho = 1.25;
    const peakFactor_g = 3.5;
    const dynamicForceAlong_N = 0.5 * rho * (Vh * Vh) * B * h * 0.8 * resonantFactorR;

    // a_x (m/s^2) = (F_dyn * peakFactor) / (generalizedMass * (2*pi*fx)^2) * (2*pi*fx)^2 = F_dyn * g / M1
    const ax_mps2 = (dynamicForceAlong_N * peakFactor_g) / Math.max(1e3, generalizedMass_kg);
    const ax_mg = (ax_mps2 / this.G_ACCEL) * 1000;

    // 3. Cross-wind vortex/wake buffeting acceleration:
    // Cross-wind dynamic force is strongly dependent on aspect ratio and reduced velocity:
    // V_red = Vh / (fy * B)
    const V_red = Vh / Math.max(0.1, fy * B);
    const crossWindForceCoeff = 0.03 * Math.pow(Math.min(V_red, 10), 1.6);
    const dynamicForceCross_N = 0.5 * rho * (Vh * Vh) * L * h * crossWindForceCoeff;

    const ay_mps2 = (dynamicForceCross_N * peakFactor_g) / Math.max(1e3, generalizedMass_kg);
    const ay_mg = (ay_mps2 / this.G_ACCEL) * 1000;

    // 4. Combined horizontal peak acceleration:
    const aPeak_mg = Math.sqrt(ax_mg * ax_mg + ay_mg * ay_mg);
    const aPeak_mps2 = (aPeak_mg / 1000) * this.G_ACCEL;

    // 5. Allowable acceleration threshold per ISO 10137:
    const governingFreq = Math.min(fx, fy);
    const allowable_mg = this.getAllowableAcceleration_mg(governingFreq, occupancyType, stormReturnPeriod);
    const dcr = aPeak_mg / allowable_mg;
    const isCompliant = dcr <= 1.0;

    // 6. Perception classification
    let perception: PerceptionClass;
    if (aPeak_mg < 5.0) {
      perception = 'NOT_PERCEPTIBLE';
    } else if (aPeak_mg < 15.0) {
      perception = 'PERCEPTIBLE_QUIET';
    } else if (aPeak_mg < 25.0) {
      perception = 'MODERATE_MOTION';
    } else {
      perception = 'UNACCEPTABLE_DISCOMFORT';
    }

    // 7. Tuned Mass Damper (TMD) Mitigation sizing
    let isTmdRecommended = false;
    let reqSuppDamping = 0;
    let targetXi = xi;
    let massRatio_mu = 0;
    let tmdMass_tonnes = 0;
    let optTmdFreq = governingFreq;

    if (!isCompliant) {
      isTmdRecommended = true;
      // Acceleration ~ 1 / sqrt(xi)
      // xi_target = xi * (aPeak / allowable)^2
      targetXi = xi * Math.pow(dcr, 2);
      reqSuppDamping = Number((targetXi - xi).toFixed(3));

      // Sizing TMD: mass ratio mu ~ 4 * (Delta_xi)^2 (approximate Den Hartog formulation)
      massRatio_mu = Number(Math.min(0.04, Math.max(0.01, 2.5 * reqSuppDamping)).toFixed(4));
      tmdMass_tonnes = Number(((generalizedMass_kg / 1000) * massRatio_mu).toFixed(1));
      optTmdFreq = Number((governingFreq / (1 + massRatio_mu)).toFixed(3));
    }

    // Recommendations
    const recommendations: string[] = [];
    if (isCompliant) {
      recommendations.push(
        `PASS: Peak roof acceleration (${aPeak_mg.toFixed(1)} mg) satisfies ISO 10137 criteria (${allowable_mg.toFixed(1)} mg) for ${occupancyType.toLowerCase()} buildings.`
      );
    } else {
      recommendations.push(
        `EXCEEDED: Peak acceleration (${aPeak_mg.toFixed(1)} mg) exceeds ISO 10137 allowable threshold (${allowable_mg.toFixed(1)} mg, D/C = ${dcr.toFixed(2)}).`
      );
      recommendations.push(
        `Occupants will experience perceptible/uncomfortable lateral sway during ${stormReturnPeriod.replace(/_/g, '-').toLowerCase()} storms.`
      );
      recommendations.push(
        `Recommended mitigation: Install a Tuned Mass Damper (TMD) of approximately ${tmdMass_tonnes} tonnes tuned to ${optTmdFreq} Hz to provide +${(reqSuppDamping * 100).toFixed(1)}% supplemental damping.`
      );
    }

    return {
      alongWindAcceleration_mg: Number(ax_mg.toFixed(2)),
      crossWindAcceleration_mg: Number(ay_mg.toFixed(2)),
      peakHorizontalAcceleration_mg: Number(aPeak_mg.toFixed(2)),
      peakHorizontalAcceleration_m_s2: Number(aPeak_mps2.toFixed(4)),
      allowableAcceleration_mg: allowable_mg,
      demandCapacityRatio: Number(dcr.toFixed(2)),
      isComfortCompliant: isCompliant,
      perceptionLevel: perception,
      tmdMitigation: {
        isTmdRecommended,
        requiredSupplementalDamping: reqSuppDamping,
        targetDampingRatio: Number(targetXi.toFixed(3)),
        massRatio_mu,
        recommendedTmdMass_tonnes: tmdMass_tonnes,
        optimalTmdFrequency_Hz: optTmdFreq,
      },
      recommendations,
    };
  }
}
