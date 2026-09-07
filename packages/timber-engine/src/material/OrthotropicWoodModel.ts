/**
 * Orthotropic wood constitutive behavior and off-axis strength formulation.
 * Implements Hankinson formula, 2D/3D orthotropic compliance, and Norris/Tsai-Hill criterion.
 */

import { TimberGradeDefinition } from './TimberMaterialDatabase';

export interface OrthotropicStiffnessMatrix2D {
  C11: number; // Parallel to grain
  C22: number; // Perpendicular to grain
  C12: number; // Coupling (nu * C22)
  C33: number; // Shear stiffness G0
}

export class OrthotropicWoodModel {
  /**
   * Hankinson formula for wood strength at an angle theta to the grain direction.
   * Widely codified in NDS Section 3.10.1.4, Eurocode 5 Clause 6.2.2, and IS 883.
   *
   * f_theta = (f_0 * f_90) / (f_0 * sin^2(theta) + f_90 * cos^2(theta))
   *
   * @param f0 Strength parallel to grain (theta = 0°)
   * @param f90 Strength perpendicular to grain (theta = 90°)
   * @param angleRad Angle in radians (0 to pi/2)
   */
  static hankinson(f0: number, f90: number, angleRad: number): number {
    const sinSq = Math.pow(Math.sin(angleRad), 2);
    const cosSq = Math.pow(Math.cos(angleRad), 2);
    const denom = f0 * sinSq + f90 * cosSq;
    if (denom <= 0) return 0;
    return (f0 * f90) / denom;
  }

  /**
   * Calculate plane stress 2D orthotropic stiffness matrix for timber lamella/member.
   *
   * [sigma_L, sigma_T, tau_LT]^T = [C] * [eps_L, eps_T, gamma_LT]^T
   */
  static computePlaneStressStiffness(
    E_L: number,
    E_T: number,
    G_LT: number,
    nu_LT: number = 0.40
  ): OrthotropicStiffnessMatrix2D {
    // Reciprocal Poisson's ratio relation: nu_TL = nu_LT * (E_T / E_L)
    const nu_TL = nu_LT * (E_T / E_L);
    const denom = 1.0 - nu_LT * nu_TL;
    const factor = denom > 0 ? 1.0 / denom : 1.0;

    return {
      C11: E_L * factor,
      C22: E_T * factor,
      C12: nu_TL * E_L * factor,
      C33: G_LT,
    };
  }

  /**
   * Norris / Tsai-Hill orthotropic interaction criterion for combined in-plane stress state.
   * Evaluates: (sigma_0 / f_0)^2 + (sigma_90 / f_90)^2 - (sigma_0 * sigma_90) / f_0^2 + (tau / f_v)^2 <= 1.0
   *
   * @returns Demand-to-Capacity ratio (D/C). Values <= 1.0 indicate safe compliance.
   */
  static evaluateNorrisCriterion(
    sigma_0: number,
    sigma_90: number,
    tau: number,
    f_0: number,
    f_90: number,
    f_v: number
  ): { dcr: number; isCompliant: boolean } {
    const term0 = Math.pow(Math.max(0, sigma_0) / Math.max(1e-3, f_0), 2);
    const term90 = Math.pow(Math.max(0, sigma_90) / Math.max(1e-3, f_90), 2);
    const crossTerm = (sigma_0 * sigma_90) / Math.pow(Math.max(1e-3, f_0), 2);
    const shearTerm = Math.pow(Math.abs(tau) / Math.max(1e-3, f_v), 2);

    const dcr = Math.sqrt(Math.max(0, term0 + term90 - crossTerm + shearTerm));
    return {
      dcr,
      isCompliant: dcr <= 1.0,
    };
  }
}
