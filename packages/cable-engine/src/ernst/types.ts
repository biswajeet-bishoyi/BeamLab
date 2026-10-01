/**
 * Ernst Equivalent Modulus & Geometric Non-Linearity Types
 * BeamLab Sprint B18.2 — Ernst Secant & Tangent Elasticity Formulations
 */

export interface CableStayGeometry {
  id: string;
  spanHorizontal: number; // L_h (meters)
  levelDifference: number; // h = y_tower - y_deck (meters)
  chordLength: number; // L_c = sqrt(L_h^2 + h^2) (meters)
  inclinationAngleRad: number; // theta = atan2(h, L_h)
}

export interface ErnstModulusResult {
  /** Tangent equivalent elastic modulus E_tan (Pa) */
  tangentModulus: number;
  /** Secant equivalent elastic modulus E_sec (Pa) between T1 and T2 */
  secantModulus: number;
  /** Material elastic modulus E_0 without sag degradation (Pa) */
  initialElasticModulus: number;
  /** Reduction factor eta = E_eq / E_0 (dimensionless, 0 < eta <= 1) */
  reductionFactor: number;
  /** Irvine sag parameter lambda^2 (dimensionless) */
  irvineParameter: number;
  /** Equivalent axial stiffness k_eq = E_eq * A / L_c (N/m) */
  equivalentStiffness: number;
  /** Axial stress sigma = T / A (Pa) */
  axialStress: number;
}

export interface IterativeCableSolveStep {
  iteration: number;
  tension: number; // N
  stress: number; // Pa
  equivalentModulus: number; // Pa
  elongation: number; // m
  residual: number; // relative change
}

export interface IterativeCableSolveResult {
  converged: boolean;
  iterations: number;
  finalTension: number; // N
  finalStress: number; // Pa
  finalEquivalentModulus: number; // Pa
  chordElongation: number; // m
  history: IterativeCableSolveStep[];
}
