/**
 * BeamLab B1.3 — Loading Domain Type Definitions
 *
 * All enumerations, discriminated unions, and shared interfaces
 * for the canonical loading domain.
 */

// ─── Load category ────────────────────────────────────────────────────────────

export type LoadCategory =
  | 'Gravity'
  | 'Lateral'
  | 'Thermal'
  | 'Dynamic'
  | 'Construction'
  | 'Accidental'
  | 'Environmental'
  | 'Pretension'
  | 'Settlement'
  | 'Custom';

// ─── Load type ────────────────────────────────────────────────────────────────

export type LoadType =
  | 'PointLoad'
  | 'DistributedLoad'
  | 'UniformLoad'
  | 'VariableLoad'
  | 'Moment'
  | 'TemperatureLoad'
  | 'Pressure'
  | 'SurfaceLoad'
  | 'BodyForce'
  | 'Settlement'
  | 'Pretension'
  | 'Custom';

// ─── Load distribution profile ────────────────────────────────────────────────

export type LoadDistribution =
  | 'Uniform'
  | 'Linear'
  | 'Trapezoidal'
  | 'Triangular'
  | 'Parabolic'
  | 'Custom';

// ─── Load pattern type ────────────────────────────────────────────────────────

export type LoadPatternType =
  | 'Dead'
  | 'SuperimposedDead'
  | 'Live'
  | 'ReducibleLive'
  | 'Wind'
  | 'Earthquake'
  | 'Snow'
  | 'Rain'
  | 'Temperature'
  | 'Construction'
  | 'Equipment'
  | 'MovingLoad'
  | 'Blast'
  | 'Impact'
  | 'Fatigue'
  | 'Pretension'
  | 'Custom';

// ─── Load group type ──────────────────────────────────────────────────────────

export type LoadGroupType =
  | 'Gravity'
  | 'Lateral'
  | 'Environmental'
  | 'Construction'
  | 'Temporary'
  | 'Accidental'
  | 'Custom';

// ─── Analysis type ────────────────────────────────────────────────────────────

export type AnalysisType =
  | 'LinearStatic'
  | 'NonlinearStatic'
  | 'Modal'
  | 'BucklingLinear'
  | 'BucklingNonlinear'
  | 'ResponseSpectrum'
  | 'TimeHistory'
  | 'MovingLoad'
  | 'ConstructionStage'
  | 'Pushover'
  | 'CFD'       // future
  | 'Thermal';  // future

// ─── Design standard ──────────────────────────────────────────────────────────

export type CombinationStandard =
  | 'IS456'
  | 'IS800'
  | 'IS1893'
  | 'Eurocode'
  | 'AISC-LRFD'
  | 'AISC-ASD'
  | 'ACI318'
  | 'ASCE7'
  | 'Custom';

// ─── Combination type ─────────────────────────────────────────────────────────

export type CombinationType =
  | 'LRFD'   // Load and Resistance Factor Design
  | 'ASD'    // Allowable Stress Design
  | 'ULS'    // Ultimate Limit State (Eurocode)
  | 'SLS'    // Serviceability Limit State (Eurocode)
  | 'Fatigue'
  | 'Custom';

// ─── Envelope type ────────────────────────────────────────────────────────────

export type EnvelopeType =
  | 'Maximum'
  | 'Minimum'
  | 'AbsoluteMaximum'
  | 'MaximumPositive'
  | 'MaximumNegative'
  | 'Custom';

// ─── Load target type ─────────────────────────────────────────────────────────

export type LoadTargetType =
  | 'Node'
  | 'Member'
  | 'Assembly'
  | 'Structure'
  | 'Plate'    // future
  | 'Shell'    // future
  | 'Solid';   // future

// ─── Force / moment vector ─────────────────────────────────────────────────────

export interface LoadVector {
  fx?: number;
  fy?: number;
  fz?: number;
  mx?: number;
  my?: number;
  mz?: number;
}

// ─── Built-in combination factor tables ───────────────────────────────────────

/**
 * Standard combination factor sets.
 * Each entry: [Dead, Live, Wind, Earthquake, Snow, Temperature]
 */
export interface StandardCombinationTemplate {
  name: string;
  standard: CombinationStandard;
  type: CombinationType;
  description: string;
}

export const IS800_LRFD_COMBINATIONS: StandardCombinationTemplate[] = [
  { name: '1.5DL', standard: 'IS800', type: 'LRFD', description: '1.5 × Dead Load (IS 800 Cl. 5.3)' },
  { name: '1.2DL+1.2LL+1.2WL', standard: 'IS800', type: 'LRFD', description: '1.2(DL+LL+WL) (IS 800 Cl. 5.3)' },
  { name: '1.2DL+1.2LL+1.2EL', standard: 'IS800', type: 'LRFD', description: '1.2(DL+LL+EL) (IS 800 Cl. 5.3)' },
  { name: '0.9DL+1.5WL', standard: 'IS800', type: 'LRFD', description: '0.9DL + 1.5WL (IS 800 Cl. 5.3)' },
  { name: '1.5DL+1.5LL', standard: 'IS800', type: 'LRFD', description: '1.5(DL+LL) (IS 800 Cl. 5.3)' },
];

export const EUROCODE_ULS_COMBINATIONS: StandardCombinationTemplate[] = [
  { name: 'EC-STR 6.10a', standard: 'Eurocode', type: 'ULS', description: '1.35Gk + 1.5Qk (EN 1990 Eq. 6.10a)' },
  { name: 'EC-STR 6.10b', standard: 'Eurocode', type: 'ULS', description: '1.35Gk + 1.5ψ₀Qk (EN 1990 Eq. 6.10b)' },
  { name: 'EC-SLS Char', standard: 'Eurocode', type: 'SLS', description: 'Gk + Qk (EN 1990 Eq. 6.14a)' },
];

export const AISC_LRFD_COMBINATIONS: StandardCombinationTemplate[] = [
  { name: 'ASCE 2-1', standard: 'AISC-LRFD', type: 'LRFD', description: '1.4D (ASCE 7 §2.3.1)' },
  { name: 'ASCE 2-2', standard: 'AISC-LRFD', type: 'LRFD', description: '1.2D + 1.6L (ASCE 7 §2.3.1)' },
  { name: 'ASCE 2-3', standard: 'AISC-LRFD', type: 'LRFD', description: '1.2D + 1.6W + L (ASCE 7 §2.3.1)' },
  { name: 'ASCE 2-6', standard: 'AISC-LRFD', type: 'LRFD', description: '0.9D + 1.6W (ASCE 7 §2.3.1)' },
];
