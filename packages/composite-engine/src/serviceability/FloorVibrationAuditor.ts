export type OccupancyCategory = 'office_residential' | 'shopping_mall' | 'sensitive_laboratory';

export interface FloorVibrationInput {
  /** Beam span length Lj (m) */
  beamSpanM: number;
  /** Beam spacing S (m) */
  beamSpacingM: number;
  /** Total floor width perpendicular to beam span (m), default 3 * spacing */
  totalFloorWidthM?: number;
  /** Effective composite moment of inertia I_eff (cm^4) */
  effectiveMomentOfInertiaCm4: number;
  /** Concrete slab topping thickness (mm) */
  slabThicknessMm: number;
  /** Concrete elastic modulus Ec (MPa) */
  concreteElasticModulusMPa: number;
  /** Structural steel elastic modulus Es (MPa), default 200,000 */
  steelElasticModulusMPa?: number;
  /** Total actual dead load (kN/m^2) including steel, slab, deck, finishes */
  deadLoadKPa: number;
  /** Expected live load for vibration (kN/m^2), AISC DG11 recommends 0.25 to 0.50 kPa */
  vibrationLiveLoadKPa?: number;
  /** Modal damping ratio beta (0.02 open plan, 0.03 partitioned office, 0.05 full partitions) */
  dampingRatioBeta?: number;
  /** Occupancy category */
  occupancy?: OccupancyCategory;
  /** Whether interior beam or edge beam */
  isInteriorBeam?: boolean;
}

export interface FloorVibrationResult {
  naturalFrequencyFn: number; // Hz
  deflectionUnderVibrationWeight: number; // mm
  effectivePanelWidthB: number; // m
  effectivePanelWeightW: number; // kN
  peakAccelerationPercentG: number; // ap / g (%)
  accelerationLimitPercentG: number; // (%)
  vibrationUtilization: number;
  dampingRatioBeta: number;
  isComfortable: boolean;
  frequencyStatus: 'Adequate (> 3 Hz)' | 'Low Frequency (< 3 Hz, resonance risk)';
  comfortVerdict: string;
  recommendations: string[];
}

/**
 * FloorVibrationAuditor evaluates human comfort walking vibration in steel-concrete composite
 * floors in accordance with AISC Design Guide 11 (2nd Edition, 2016).
 */
export class FloorVibrationAuditor {
  public static auditVibration(input: FloorVibrationInput): FloorVibrationResult {
    const L = input.beamSpanM;
    const S = input.beamSpacingM;
    const L_mm = L * 1000;
    const S_mm = S * 1000;
    const floorWidth = input.totalFloorWidthM ?? Math.max(3 * S, 12);

    const Es = input.steelElasticModulusMPa ?? 200000;
    const Ec = input.concreteElasticModulusMPa;
    const Ieff_mm4 = input.effectiveMomentOfInertiaCm4 * 1e4;

    const dead = input.deadLoadKPa;
    const liveVib = input.vibrationLiveLoadKPa ?? 0.25; // 0.25 kPa typical office sustained
    const totalUnitAreaLoad = dead + liveVib; // kPa = kN/m^2

    // Line load on beam w in kN/m = N/mm
    const wLine = totalUnitAreaLoad * S; // kN/m

    // Midspan deflection under vibration weight
    // Delta_j = (5 * w * L^4) / (384 * Es * Ieff)
    const deltaJ_mm = (5 * wLine * Math.pow(L_mm, 4)) / (384 * Es * Ieff_mm4);

    // Fundamental beam panel frequency: fn = 0.18 * sqrt(g / delta_j) = 17.8 / sqrt(deltaJ)
    const fn = deltaJ_mm > 0 ? 17.8 / Math.sqrt(deltaJ_mm) : 10.0;

    // Effective panel width B per AISC DG11 Eq. 4.3a:
    // Dj = Es * Ieff / S (N*mm^2 / mm)
    // Dg = Ec * tSlab^3 / 12 (N*mm^2 / mm)
    const Dj = (Es * Ieff_mm4) / S_mm;
    const Dg = (Ec * Math.pow(input.slabThicknessMm, 3)) / 12;

    const Cj = input.isInteriorBeam !== false ? 2.0 : 1.0;
    const ratioStiffness = Dg > 0 && Dj > 0 ? Math.pow(Dg / Dj, 0.25) : 0.3;
    const rawB_m = Cj * ratioStiffness * L;

    // B is limited to (2/3) * floorWidth and at least 1.0 * S
    const maxB = (2 / 3) * floorWidth;
    const effB_m = Math.min(maxB, Math.max(S, rawB_m));

    // Effective panel weight W (kN) per AISC DG11 Eq. 4.2
    // W = w_unit_area * B * L
    const W_kN = totalUnitAreaLoad * effB_m * L;

    // Walking parameters
    const occupancy = input.occupancy ?? 'office_residential';
    let Po = 0.29; // kN walking force constant
    let accLimitPercent = 0.5; // 0.5% g for office / residential

    if (occupancy === 'shopping_mall') {
      Po = 0.41;
      accLimitPercent = 1.5; // 1.5% g
    } else if (occupancy === 'sensitive_laboratory') {
      Po = 0.20;
      accLimitPercent = 0.15; // 0.15% g
    }

    const beta = input.dampingRatioBeta ?? 0.03; // default 3% modal damping

    // AISC DG11 Eq. 4.1:
    // (ap / g) = (Po * exp(-0.35 * fn)) / (beta * W)
    const apOverGRaw = (Po * Math.exp(-0.35 * fn)) / (beta * W_kN);
    const apOverGPercent = apOverGRaw * 100; // in percent of g

    const util = apOverGPercent / accLimitPercent;
    const isPassing = util <= 1.0;

    const freqStatus: 'Adequate (> 3 Hz)' | 'Low Frequency (< 3 Hz, resonance risk)' =
      fn >= 3.0 ? 'Adequate (> 3 Hz)' : 'Low Frequency (< 3 Hz, resonance risk)';

    const recommendations: string[] = [];
    let verdict = 'Floor meets AISC DG11 human comfort walking vibration limits.';

    if (!isPassing) {
      verdict = `FAIL: Floor peak acceleration (${apOverGPercent.toFixed(2)}% g) exceeds comfort limit (${accLimitPercent.toFixed(2)}% g).`;
      if (fn < 3.0) {
        recommendations.push(
          'Increase steel section depth to increase fundamental frequency above 3.0 Hz.'
        );
      }
      recommendations.push(
        'Increase concrete slab topping thickness to elevate panel weight W and transverse stiffness Dg.'
      );
      recommendations.push(
        'Add full-height architectural partitions to increase damping ratio beta from 0.02/0.03 to 0.05.'
      );
    }

    return {
      naturalFrequencyFn: Math.round(fn * 100) / 100,
      deflectionUnderVibrationWeight: Math.round(deltaJ_mm * 100) / 100,
      effectivePanelWidthB: Math.round(effB_m * 100) / 100,
      effectivePanelWeightW: Math.round(W_kN * 10) / 10,
      peakAccelerationPercentG: Math.round(apOverGPercent * 1000) / 1000,
      accelerationLimitPercentG: accLimitPercent,
      vibrationUtilization: Math.round(util * 1000) / 1000,
      dampingRatioBeta: beta,
      isComfortable: isPassing,
      frequencyStatus: freqStatus,
      comfortVerdict: verdict,
      recommendations,
    };
  }
}
