/**
 * ConcreteConstitutiveModel.ts
 *
 * Implements non-linear constitutive material laws for unconfined and confined concrete
 * across ACI 318-19, Eurocode 2 (EN 1992-1-1), and Modified Kent-Park / Mander formulations.
 */

import { ConcreteMaterial, DesignStandard } from '../core/ConcreteTypes';

export interface ConcreteStressResult {
  /** Compressive stress in MPa (positive = compression, 0 = tension/cracked) */
  stress_MPa: number;
  /** Tangent modulus Et = dsigma/deps (MPa) */
  tangentModulus_MPa: number;
  /** Crushing state flag */
  isCrushed: boolean;
}

export class ConcreteConstitutiveModel {
  readonly material: ConcreteMaterial;
  readonly standard: DesignStandard;

  // ACI 318 Whitney parameters
  readonly beta1_aci: number;

  // Eurocode 2 parabolic-rectangular parameters
  readonly eps_c2_ec2: number;
  readonly eps_cu2_ec2: number;
  readonly n_ec2: number;
  readonly fcd_ec2: number;

  // Confinement factors (Kent-Park / Mander)
  private confinementFactorK: number = 1.0;
  private fcc_MPa: number;
  private eps_cc0: number;
  private eps_ccu: number;

  constructor(material: ConcreteMaterial, confinementFactorK: number = 1.0) {
    this.material = material;
    this.standard = material.standard;
    this.confinementFactorK = Math.max(1.0, confinementFactorK);

    // 1. Calculate ACI 318-19 beta1 (Table 22.2.2.4.3)
    const fc = material.fc_MPa;
    if (fc <= 27.58) {
      this.beta1_aci = 0.85;
    } else if (fc < 55.16) {
      this.beta1_aci = Math.max(0.65, 0.85 - (0.05 * (fc - 27.58)) / 6.89);
    } else {
      this.beta1_aci = 0.65;
    }

    // 2. Calculate Eurocode 2 parameters (EN 1992-1-1 Table 3.1)
    if (fc <= 50.0) {
      this.eps_c2_ec2 = 0.0020;
      this.eps_cu2_ec2 = 0.0035;
      this.n_ec2 = 2.0;
    } else {
      this.eps_c2_ec2 = 0.0020 + 0.000085 * Math.pow(fc - 50.0, 0.53);
      this.eps_cu2_ec2 = 0.0026 + 0.035 * Math.pow((90.0 - fc) / 100.0, 4.0);
      this.n_ec2 = 1.4 + 23.4 * Math.pow((90.0 - fc) / 100.0, 4.0);
    }
    // Design strength with gamma_c = 1.5, alpha_cc = 0.85 (or 1.0 depending on national annex)
    this.fcd_ec2 = (0.85 * fc) / 1.5;

    // 3. Confined core parameters
    this.fcc_MPa = this.material.fc_MPa * this.confinementFactorK;
    this.eps_cc0 = this.material.eps_c0 * (1.0 + 5.0 * (this.confinementFactorK - 1.0));
    this.eps_ccu = this.material.eps_cu * (1.0 + 3.0 * (this.confinementFactorK - 1.0));
  }

  /**
   * Evaluates concrete compressive stress (MPa) for a given compressive strain eps_c.
   * Convention: eps_c > 0 is compression, eps_c <= 0 is tension.
   */
  evaluateStress(eps_c: number, isConfined: boolean = false): ConcreteStressResult {
    // Concrete has zero tensile strength in non-linear flexure/axial design
    if (eps_c <= 0) {
      return { stress_MPa: 0, tangentModulus_MPa: 0, isCrushed: false };
    }

    if (this.standard === 'EUROCODE_2') {
      return this.evaluateEC2Parabolic(eps_c, isConfined);
    } else {
      return this.evaluateModifiedKentPark(eps_c, isConfined);
    }
  }

  /**
   * Eurocode 2 Parabolic-Rectangular stress-strain curve (EN 1992-1-1 Clause 3.1.5)
   */
  private evaluateEC2Parabolic(eps_c: number, isConfined: boolean): ConcreteStressResult {
    const fcMax = isConfined ? this.fcc_MPa / 1.5 : this.fcd_ec2;
    const epsC2 = isConfined ? this.eps_cc0 : this.eps_c2_ec2;
    const epsCu2 = isConfined ? this.eps_ccu : this.eps_cu2_ec2;
    const n = this.n_ec2;

    if (eps_c > epsCu2) {
      return { stress_MPa: 0, tangentModulus_MPa: 0, isCrushed: true };
    }

    if (eps_c <= epsC2) {
      const ratio = eps_c / epsC2;
      const bracket = 1.0 - Math.pow(1.0 - ratio, n);
      const stress = fcMax * bracket;
      const dbracket_deps = (n / epsC2) * Math.pow(1.0 - ratio, n - 1.0);
      const tangent = fcMax * dbracket_deps;
      return { stress_MPa: Math.max(0, stress), tangentModulus_MPa: tangent, isCrushed: false };
    } else {
      // Plastic plateau
      return { stress_MPa: fcMax, tangentModulus_MPa: 0, isCrushed: false };
    }
  }

  /**
   * Modified Kent-Park stress-strain curve for ACI 318 / IS 456
   *
   * Ascending branch (eps <= eps_0):
   *   sigma = K * f'c * [ 2*(eps/eps_0) - (eps/eps_0)^2 ]
   * Descending branch (eps_0 < eps <= eps_u):
   *   sigma = K * f'c * [ 1 - Z * (eps - eps_0) ] >= 0.2 * K * f'c
   */
  private evaluateModifiedKentPark(eps_c: number, isConfined: boolean): ConcreteStressResult {
    const K = isConfined ? this.confinementFactorK : 1.0;
    const fcPeak = K * this.material.fc_MPa;
    const eps0 = isConfined ? this.eps_cc0 : this.material.eps_c0;
    const epsU = isConfined ? this.eps_ccu : this.material.eps_cu;

    if (eps_c > epsU) {
      return { stress_MPa: 0, tangentModulus_MPa: 0, isCrushed: true };
    }

    if (eps_c <= eps0) {
      const eta = eps_c / eps0;
      const stress = fcPeak * (2.0 * eta - eta * eta);
      const tangent = (2.0 * fcPeak / eps0) * (1.0 - eta);
      return { stress_MPa: Math.max(0, stress), tangentModulus_MPa: tangent, isCrushed: false };
    } else {
      // Descending softening branch
      const Z = 0.5 / (epsU - eps0);
      const softened = fcPeak * (1.0 - Z * (eps_c - eps0));
      const residual = 0.20 * fcPeak;
      const stress = Math.max(residual, softened);
      const tangent = softened > residual ? -Z * fcPeak : 0;
      return { stress_MPa: stress, tangentModulus_MPa: tangent, isCrushed: false };
    }
  }

  /**
   * Returns ACI 318 equivalent Whitney rectangular stress block parameters:
   * alpha1 = 0.85, beta1 per Table 22.2.2.4.3
   */
  getWhitneyBlockParameters(): { alpha1: number; beta1: number; eps_cu: number } {
    return {
      alpha1: 0.85,
      beta1: this.beta1_aci,
      eps_cu: this.material.eps_cu,
    };
  }

  /**
   * Sets the confinement multiplier K (e.g. from transverse tie/spiral confinement)
   */
  setConfinement(K: number): void {
    this.confinementFactorK = Math.max(1.0, K);
    this.fcc_MPa = this.material.fc_MPa * this.confinementFactorK;
    this.eps_cc0 = this.material.eps_c0 * (1.0 + 5.0 * (this.confinementFactorK - 1.0));
    this.eps_ccu = this.material.eps_cu * (1.0 + 3.0 * (this.confinementFactorK - 1.0));
  }
}
