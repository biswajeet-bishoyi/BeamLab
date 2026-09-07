/**
 * TransformedSectionEngine: Computes elastic transformed composite cross-section properties
 * accounting for short-term and long-term modular ratios (creep and shrinkage).
 */

import { SteelSectionProperties, ConcreteSlabProperties } from './CompositeMaterialModel';

export interface TransformedSectionProperties {
  /** Modular ratio n = E_s / E_c */
  modularRatio: number;
  /** Transformed concrete slab width b_tr = b_eff / n (mm) */
  btr: number;
  /** Transformed total area A_tr (mm²) */
  areaTr: number;
  /** Neutral axis distance from bottom of steel beam y_bar_tr (mm) */
  ybarTr: number;
  /** Transformed moment of inertia about elastic neutral axis I_tr (mm⁴) */
  Itr: number;
  /** Transformed section modulus at bottom of steel beam S_tr,bot (mm³) */
  StrBot: number;
  /** Transformed section modulus at top of steel beam S_tr,top,steel (mm³) */
  StrTopSteel: number;
  /** Transformed section modulus at top of concrete slab S_tr,top,conc (mm³, includes n factor) */
  StrTopConc: number;
}

export class TransformedSectionEngine {
  /**
   * Calculate short-term modular ratio n_0 = E_s / E_c.
   */
  static computeShortTermModularRatio(Es: number, Ec: number): number {
    return Math.max(3.0, Es / Math.max(1e-3, Ec));
  }

  /**
   * Calculate long-term modular ratio n_eff accounting for sustained concrete creep.
   * Typically n_long = n_0 * (1 + psi_L * phi_t), commonly taken as 2 * n_0 or 3 * n_0.
   */
  static computeLongTermModularRatio(n0: number, creepCoefficient: number = 2.0): number {
    return n0 * (1.0 + creepCoefficient);
  }

  /**
   * Compute uncracked elastic transformed section properties of composite beam.
   *
   * @param steel Steel section properties
   * @param concrete Concrete slab properties
   * @param beff Effective concrete flange width (mm)
   * @param modularRatio n = E_s / E_c (short-term or long-term)
   */
  static computeTransformedSection(
    steel: SteelSectionProperties,
    concrete: ConcreteSlabProperties,
    beff: number,
    modularRatio: number
  ): TransformedSectionProperties {
    const n = modularRatio;
    const btr = beff / n;

    // Steel section centroid from bottom:
    const ys = steel.d / 2;
    const As = steel.area;

    // Concrete slab: solid topping thickness t_s sits above ribHeight h_r
    const ts = concrete.toppingThickness;
    const hr = concrete.ribHeight;
    const Ac_tr = btr * ts; // transformed solid concrete area

    // Centroid of solid concrete topping from bottom of steel beam:
    // Bottom of slab is at y = d. Solid topping starts at y = d + hr.
    const yc = steel.d + hr + ts / 2;

    // Combined transformed area
    const areaTr = As + Ac_tr;

    // Composite elastic neutral axis from bottom of steel:
    const ybarTr = (As * ys + Ac_tr * yc) / areaTr;

    // Transformed moment of inertia using parallel axis theorem:
    const Is = steel.Ix;
    const Ic_tr = (btr * Math.pow(ts, 3)) / 12;
    const Itr = Is + As * Math.pow(ybarTr - ys, 2) + Ic_tr + Ac_tr * Math.pow(yc - ybarTr, 2);

    // Section moduli:
    const StrBot = Itr / ybarTr;
    const distTopSteel = Math.max(1, steel.d - ybarTr);
    const StrTopSteel = Itr / distTopSteel;

    const totalHeight = steel.d + concrete.totalThickness;
    const distTopConc = Math.max(1, totalHeight - ybarTr);
    const StrTopConc = (n * Itr) / distTopConc;

    return {
      modularRatio: n,
      btr,
      areaTr,
      ybarTr,
      Itr,
      StrBot,
      StrTopSteel,
      StrTopConc,
    };
  }
}
