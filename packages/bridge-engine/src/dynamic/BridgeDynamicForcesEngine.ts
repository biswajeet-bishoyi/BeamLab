/**
 * @beamstudio/bridge-engine - Bridge Dynamic Forces, Centrifugal & Braking Force Engine
 * Compliant with AASHTO LRFD (Sections 3.6.2, 3.6.3, 3.6.4), Eurocode 1 (EN 1991-2), and IRC 6:2017
 */

export interface DynamicImpactInput {
  spanLengthM: number;
  bridgeMaterial?: 'concrete' | 'steel' | 'composite';
  limitState?: 'strength' | 'service' | 'fatigue' | 'deck-joint';
}

export interface CentrifugalForceInput {
  truckWeightKn: number;         // Total vehicle weight (e.g. 319 kN for HL-93)
  designSpeedKph: number;        // Highway design speed V (km/h)
  curveRadiusM: number;          // Horizontal curve radius of bridge alignment R (m)
  girderDepthMm: number;         // Girder depth (mm)
  deckHeightAboveBearingMm?: number; // Total distance from bearing seat to top of deck (mm)
  numberOfLoadedLanes?: number;  // Number of traffic lanes on curve
}

export interface BrakingForceInput {
  truckWeightKn: number;         // Total vehicle weight W_truck (kN)
  laneLengthM: number;           // Loaded length of lane L (m)
  laneLoadKnPerM?: number;       // Design lane load (default 9.3 kN/m)
  numberOfLoadedLanes?: number;  // Number of lanes braking simultaneously
}

export interface DynamicForcesReport {
  dynamicImpactFactorAashto: number;   // IM as fraction (e.g. 0.33)
  dynamicImpactFactorEurocode: number; // Phi_2 factor (e.g. 1.15)
  dynamicImpactFactorIrc: number;      // Fraction (e.g. 0.17)
  centrifugalForceKn?: number;         // Lateral force C (kN)
  centrifugalOverturningMomentKNm?: number; // Overturning moment about bearing seat (kNm)
  brakingForceKn: number;              // Longitudinal force BR (kN)
  brakingMomentAtBearingKNm: number;   // Moment about bearing line (kNm)
  multiPresenceFactor: number;
}

export class BridgeDynamicForcesEngine {
  /**
   * Calculate codified dynamic load allowance (IM / Impact Factor)
   */
  public static calculateDynamicImpact(input: DynamicImpactInput): {
    aashtoIM: number;
    eurocodePhi: number;
    ircImpact: number;
  } {
    const L = input.spanLengthM;
    const limitState = input.limitState ?? 'strength';
    const mat = input.bridgeMaterial ?? 'concrete';

    // AASHTO LRFD Table 3.6.2.1-1
    let aashtoIM = 0.33;
    if (limitState === 'deck-joint') {
      aashtoIM = 0.75;
    } else if (limitState === 'fatigue') {
      aashtoIM = 0.15;
    }

    // Eurocode 1 EN 1991-2 dynamic factor Phi_2
    // Phi_2 = 1.44 / sqrt(L - 0.2) + 0.82 (bounded between 1.00 and 1.67)
    const effectiveL = Math.max(1.0, L);
    const rawPhi = (1.44 / Math.sqrt(effectiveL - 0.2)) + 0.82;
    const eurocodePhi = Math.max(1.0, Math.min(1.67, rawPhi));

    // IRC 6:2017 Clause 208
    let ircImpact = 0.0;
    if (mat === 'concrete' || mat === 'composite') {
      // Impact = 4.5 / (6 + L) <= 0.50 (for spans > 3m)
      ircImpact = Math.min(0.50, 4.5 / (6.0 + L));
    } else {
      // Steel: 9.0 / (13.5 + L) <= 0.54
      ircImpact = Math.min(0.54, 9.0 / (13.5 + L));
    }

    return {
      aashtoIM: Math.round(aashtoIM * 100) / 100,
      eurocodePhi: Math.round(eurocodePhi * 1000) / 1000,
      ircImpact: Math.round(ircImpact * 1000) / 1000,
    };
  }

  /**
   * Calculate AASHTO LRFD Section 3.6.3 Centrifugal Force
   * C = f * (v^2 / (g * R)) * W
   */
  public static calculateCentrifugalForce(input: CentrifugalForceInput): {
    forceKn: number;
    lateralAccelerationG: number;
    overturningMomentKNm: number;
    multiPresenceFactor: number;
  } {
    const vMs = (input.designSpeedKph * 1000.0) / 3600.0; // km/h -> m/s
    const g = 9.81;
    const R = Math.max(10.0, input.curveRadiusM);
    const lanes = Math.max(1, input.numberOfLoadedLanes ?? 1);

    // Multi-presence factor m
    const m = lanes === 1 ? 1.20 : lanes === 2 ? 1.00 : lanes === 3 ? 0.85 : 0.65;

    // Lateral acceleration term: v^2 / (g * R)
    const latAccG = Math.pow(vMs, 2) / (g * R);

    // AASHTO factor f = 4/3 for Strength limit state (f = 1.0 for Fatigue)
    const f = 4.0 / 3.0;
    const totalW = input.truckWeightKn * lanes;
    const rawForce = f * latAccG * totalW * m;

    // Applied at 1.8 m above roadway surface
    const totalArmM = 1.8 + (input.girderDepthMm / 1000.0) + ((input.deckHeightAboveBearingMm ?? 250) / 1000.0);
    const overturningMoment = rawForce * totalArmM;

    return {
      forceKn: Math.round(rawForce * 10) / 10,
      lateralAccelerationG: Math.round(latAccG * 1000) / 1000,
      overturningMomentKNm: Math.round(overturningMoment * 10) / 10,
      multiPresenceFactor: m,
    };
  }

  /**
   * Calculate AASHTO LRFD Section 3.6.4 Braking Force
   * BR = max(0.25 * W_truck, 0.05 * (W_truck + W_lane))
   */
  public static calculateBrakingForce(input: BrakingForceInput): {
    forceKn: number;
    governingCriteria: string;
    momentAtBearingKNm: number;
    multiPresenceFactor: number;
  } {
    const lanes = Math.max(1, input.numberOfLoadedLanes ?? 1);
    const m = lanes === 1 ? 1.20 : lanes === 2 ? 1.00 : lanes === 3 ? 0.85 : 0.65;
    const laneLoadPerM = input.laneLoadKnPerM ?? 9.3;

    const Wtruck = input.truckWeightKn * lanes;
    const Wlane = laneLoadPerM * input.laneLengthM * lanes;

    // Criteria 1: 25% of truck weight alone
    const criteria1 = 0.25 * Wtruck;
    // Criteria 2: 5% of truck + lane load
    const criteria2 = 0.05 * (Wtruck + Wlane);

    const govForce = Math.max(criteria1, criteria2) * m;
    const govText = criteria1 >= criteria2
      ? '25% Design Truck Weight (governs)'
      : '5% Truck + Design Lane Weight (governs)';

    // Applied longitudinally 1.8 m above deck
    const armM = 1.8 + 1.2; // approx 1.2m girder+deck depth
    const momentAtBearing = govForce * armM;

    return {
      forceKn: Math.round(govForce * 10) / 10,
      governingCriteria: govText,
      momentAtBearingKNm: Math.round(momentAtBearing * 10) / 10,
      multiPresenceFactor: m,
    };
  }
}
