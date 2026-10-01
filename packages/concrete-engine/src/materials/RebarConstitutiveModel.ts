/**
 * RebarConstitutiveModel.ts
 *
 * Implements non-linear constitutive material laws for reinforcing steel bars (rebar):
 * Elastic-perfectly plastic and bilinear with strain-hardening.
 */

import { RebarMaterial } from '../core/ConcreteTypes';

export interface RebarStressResult {
  /** Stress in MPa (Positive = Tension, Negative = Compression) */
  stress_MPa: number;
  /** Tangent modulus Et = dsigma/deps (MPa) */
  tangentModulus_MPa: number;
  /** True if bar has yielded */
  hasYielded: boolean;
  /** True if bar has exceeded ultimate rupture strain */
  isRuptured: boolean;
}

export class RebarConstitutiveModel {
  readonly material: RebarMaterial;
  readonly includeStrainHardening: boolean;
  private readonly Esh_MPa: number;

  constructor(material: RebarMaterial, includeStrainHardening: boolean = false) {
    this.material = material;
    this.includeStrainHardening = includeStrainHardening;

    if (material.eps_uk > material.eps_y) {
      this.Esh_MPa = (material.fu_MPa - material.fy_MPa) / (material.eps_uk - material.eps_y);
    } else {
      this.Esh_MPa = 0;
    }
  }

  /**
   * Evaluates rebar stress (MPa) for a given strain eps.
   * Sign convention: eps > 0 is tension, eps < 0 is compression.
   */
  evaluateStress(eps: number): RebarStressResult {
    const sign = Math.sign(eps);
    const absEps = Math.abs(eps);
    const epsY = this.material.eps_y;
    const epsUk = this.material.eps_uk;
    const Es = this.material.Es_MPa;
    const fy = this.material.fy_MPa;
    const fu = this.material.fu_MPa;

    // Check rupture
    if (absEps > epsUk) {
      return {
        stress_MPa: 0,
        tangentModulus_MPa: 0,
        hasYielded: true,
        isRuptured: true,
      };
    }

    // Elastic regime
    if (absEps <= epsY) {
      return {
        stress_MPa: sign * Es * absEps,
        tangentModulus_MPa: Es,
        hasYielded: false,
        isRuptured: false,
      };
    }

    // Post-yield regime
    if (!this.includeStrainHardening) {
      // Elastic-perfectly plastic
      return {
        stress_MPa: sign * fy,
        tangentModulus_MPa: 0,
        hasYielded: true,
        isRuptured: false,
      };
    } else {
      // Bilinear strain hardening
      const stress = Math.min(fu, fy + this.Esh_MPa * (absEps - epsY));
      return {
        stress_MPa: sign * stress,
        tangentModulus_MPa: this.Esh_MPa,
        hasYielded: true,
        isRuptured: false,
      };
    }
  }
}
