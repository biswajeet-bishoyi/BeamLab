/**
 * Stress Contours & Multi-Axial Yield Criteria Types
 * BeamLab Sprint B19.4 — von Mises, Tresca & Principal Stresses
 */

export interface StressTensor2D {
  sigmax: number; // sigma_xx (Pa or MPa)
  sigmay: number; // sigma_yy (Pa or MPa)
  tauxy: number; // tau_xy (Pa or MPa)
  tauxz?: number; // tau_xz transverse shear (optional)
  tauyz?: number; // tau_yz transverse shear (optional)
}

export interface PrincipalStressResult {
  /** Maximum principal stress sigma_1 (tensile positive) */
  sigma1: number;
  /** Minimum principal stress sigma_2 (compressive negative) */
  sigma2: number;
  /** Maximum in-plane shear stress tau_max = (sigma1 - sigma2) / 2 */
  tauMax: number;
  /** Principal stress orientation angle in radians */
  thetaPrincipalRad: number;
  /** Principal stress orientation angle in degrees */
  thetaPrincipalDeg: number;
  /** Hydrostatic mean normal stress sigma_m = (sigma_x + sigma_y) / 2 */
  hydrostaticMeanStress: number;
}

export interface YieldCriteriaResult {
  /** Equivalent von Mises stress sigma_vm (Pa or MPa) */
  vonMisesStress: number;
  /** Tresca maximum shear stress criterion intensity (Pa or MPa) */
  trescaStress: number;
  /** Rankine maximum tensile stress (Pa or MPa) */
  rankineStress: number;
  /** Material yield strength f_y (Pa or MPa) */
  yieldStrength: number;
  /** von Mises utilization ratio UR = sigma_vm / f_y */
  utilizationVonMises: number;
  /** Tresca utilization ratio UR = sigma_tresca / f_y */
  utilizationTresca: number;
  /** Has element entered plastic yield regime? */
  isYielded: boolean;
}
