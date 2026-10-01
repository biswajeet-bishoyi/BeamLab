/**
 * Plate & Shell Internal Force Fields & Wood-Armer Design Types
 * BeamLab Sprint B19.3 — Wood-Armer Orthogonal Reinforcement Moments
 */

export interface PlateMomentField {
  mxx: number; // kNm/m
  myy: number; // kNm/m
  mxy: number; // kNm/m (twisting moment)
}

export interface WoodArmerResult {
  /** Bottom face (sagging) design moment for X-direction rebar (kNm/m) */
  mxdBottom: number;
  /** Bottom face (sagging) design moment for Y-direction rebar (kNm/m) */
  mydBottom: number;
  /** Top face (hogging) design moment for X-direction rebar (kNm/m) */
  mxdTop: number;
  /** Top face (hogging) design moment for Y-direction rebar (kNm/m) */
  mydTop: number;
  /** Governing moment case applied */
  governingCaseBottom: 'standard' | 'x-adjusted' | 'y-adjusted';
  governingCaseTop: 'standard' | 'x-adjusted' | 'y-adjusted';
}

export interface SlabTransverseShearResult {
  vx: number; // kN/m
  vy: number; // kN/m
  vResultant: number; // sqrt(vx^2 + vy^2) in kN/m
  shearStressMPa: number; // vResultant / (0.9 * t) in MPa
  shearCapacityVcMPa: number; // Concrete shear strength without rebar (e.g. EC2 / ACI)
  shearReinforcementRequired: boolean;
}
