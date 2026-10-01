/**
 * Blast, Impact & Extreme Dynamic Loading Engine - Core Types
 * @packageDocumentation
 */

export type ExplosiveType = 'TNT' | 'Comp-B' | 'ANFO' | 'C4' | 'RDX' | 'PETN' | 'Semtex';

export interface ExplosiveProperties {
  type: ExplosiveType;
  name: string;
  tntEquivalentMass: number; // Pressure equivalence factor (e.g. 1.0 for TNT, 1.11 for Comp-B, 1.30 for C4)
  tntEquivalentImpulse: number; // Impulse equivalence factor
}

export type BurstType = 'free-air' | 'surface';

export interface BlastSourceParams {
  chargeMass: number; // kg of explosive
  explosiveType?: ExplosiveType;
  standoffDistance: number; // m
  burstType?: BurstType; // 'surface' uses hemispherical reflection enhancement factor 1.8
  angleIncidenceDeg?: number; // degrees from surface normal (0 = normal reflection)
}

export interface BlastWaveformParameters {
  scaledDistanceZ: number; // m / kg^(1/3)
  effectiveChargeMassTNT: number; // kg TNT equivalent
  peakIncidentPressure: number; // kPa (P_so)
  peakReflectedPressure: number; // kPa (P_r)
  shockArrivalTimestamp: number; // ms (t_a)
  positivePhaseDuration: number; // ms (t_d)
  positiveIncidentImpulse: number; // kPa·ms (I_s)
  positiveReflectedImpulse: number; // kPa·ms (I_r)
  shockVelocity: number; // m/s (U)
  decayWaveformFactor: number; // b (Friedlander shape parameter)
}

export interface TimePressurePoint {
  timeMs: number; // ms
  incidentPressureKPa: number; // kPa
  reflectedPressureKPa: number; // kPa
}

export type BoundaryCondition = 'simply-supported' | 'fixed-fixed' | 'cantilever' | 'propped-cantilever';
export type StructuralMemberType = 'beam' | 'one-way-slab' | 'column';

export interface SDOFSystemParams {
  memberType: StructuralMemberType;
  boundary: BoundaryCondition;
  spanLength: number; // m
  width?: number; // m (tributary width)
  totalMassKg: number; // kg
  yieldResistanceKN: number; // kN (R_y)
  elasticStiffnessKNm: number; // kN/m (k)
  dampingRatio?: number; // e.g. 0.02 (2%)
  dynamicIncreaseFactor?: number; // DIF for material strain rate (typically 1.15 ~ 1.30)
}

export interface SDOFResponseHistoryPoint {
  timeMs: number;
  displacementMm: number;
  velocityMPerS: number;
  accelerationMPerS2: number;
  appliedForceKN: number;
  resistanceKN: number;
}

export interface SDOFAnalysisResult {
  naturalPeriodMs: number; // ms (T_n)
  equivalentMassKg: number; // kg (M_e = K_LM * M)
  loadMassFactorKLM: number; // K_LM
  maxDisplacementMm: number; // y_max
  yieldDisplacementMm: number; // y_el = R_y / k
  ductilityRatio: number; // mu = y_max / y_el
  supportRotationDeg: number; // theta = arctan(y_max / (L/2))
  timeHistory: SDOFResponseHistoryPoint[];
  protectionLevel: 'low' | 'medium' | 'high'; // ASCE 59-11 / UFC 3-340-02 damage levels
}

export interface ProgressiveCollapseScenario {
  scenarioId: string;
  removedColumnId: string;
  columnLocation: 'corner' | 'exterior-middle' | 'interior';
  tributaryGravityLoadKN: number;
  spanBeamCapacityKNm: number;
  beamLengthM: number;
  dynamicAmplificationFactor?: number; // DAF (typically 1.5 ~ 2.0 per UFC 4-023-03)
}

export interface ProgressiveCollapseResult {
  scenario: ProgressiveCollapseScenario;
  dynamicAmplifiedDemandKNm: number;
  demandCapacityRatio: number; // DCR = M_demand / M_capacity
  catenaryTensionDemandKN: number;
  collapsePrevented: boolean; // DCR <= 1.5 - 2.0 depending on ductility
  failureMechanism: 'flexural' | 'shear' | 'catenary-rupture' | 'adequate-redistribution';
}

export interface ProjectileImpactParams {
  projectileMassKg: number; // kg
  initialVelocityMPerS: number; // m/s
  projectileDiameterM: number; // m (d)
  noseShapeFactor?: number; // N* (0.72 flat, 0.84 blunt, 1.0 spherical, 1.14 conical, 1.25 ogive)
  targetMaterial: 'reinforced-concrete' | 'structural-steel';
  targetThicknessM: number; // m
  concreteCompressiveStrengthMPa?: number; // f'c (MPa)
  steelYieldStrengthMPa?: number; // f_y (MPa)
}

export interface ProjectileImpactResult {
  penetrationDepthM: number; // x (m)
  scabbingLimitThicknessM: number; // h_s (m)
  perforationLimitThicknessM: number; // h_p (m)
  residualVelocityMPerS: number; // v_r (m/s if perforated, 0 if stopped)
  perforated: boolean;
  scabbingOccurs: boolean;
  damageLevel: 'superficial' | 'cratering' | 'scabbing' | 'full-perforation';
}
