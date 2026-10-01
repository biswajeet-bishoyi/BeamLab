/**
 * FiberSectionAnalyzer.ts
 *
 * Non-linear strain-compatibility fiber section analyzer.
 * Integrates discrete concrete and rebar fibers over arbitrary strain profiles
 * to determine section resultant force vector [P, Mx, My] and moment-curvature behavior.
 */

import { FiberSection } from './FiberSection';
import { ConcreteConstitutiveModel } from '../materials/ConcreteConstitutiveModel';
import { RebarConstitutiveModel } from '../materials/RebarConstitutiveModel';
import { SectionResultantForce } from '../core/ConcreteTypes';

export interface FiberStrainState {
  /** Centroid axial strain (Positive = Tension, Negative = Compression) */
  eps0: number;
  /** Curvature about X axis (rad/mm) - positive causes compression at top (y > 0) */
  kappaX: number;
  /** Curvature about Y axis (rad/mm) - positive causes compression at right (x > 0) */
  kappaY: number;
}

export class FiberSectionAnalyzer {
  readonly section: FiberSection;
  readonly concreteModel: ConcreteConstitutiveModel;
  private readonly rebarModels: Map<string, RebarConstitutiveModel> = new Map();

  constructor(section: FiberSection, concreteModel?: ConcreteConstitutiveModel) {
    this.section = section;
    this.concreteModel =
      concreteModel || new ConcreteConstitutiveModel(section.concreteMaterial);

    // Initialize rebar constitutive models per distinct grade
    for (const rebar of section.rebarFibers) {
      if (!this.rebarModels.has(rebar.material.name)) {
        this.rebarModels.set(
          rebar.material.name,
          new RebarConstitutiveModel(rebar.material, false)
        );
      }
    }
  }

  /**
   * Evaluates the local mechanical strain at coordinate (x, y)
   * under centroid axial strain eps0 and curvatures kappaX, kappaY.
   *
   * Strain convention:
   *   eps > 0: Tension
   *   eps < 0: Compression
   * A positive kappaX causes compression (negative strain) at y > 0 (top face):
   *   eps(x, y) = eps0 - kappaX * y - kappaY * x
   */
  getStrainAt(x_mm: number, y_mm: number, strainState: FiberStrainState): number {
    return strainState.eps0 - strainState.kappaX * y_mm - strainState.kappaY * x_mm;
  }

  /**
   * Integrates stresses across all concrete and rebar fibers for a given strain state.
   *
   * Resultant force convention:
   *   P > 0: Compression (kN)
   *   P < 0: Tension (kN)
   *   Mx (kNm): Bending moment about X axis
   *   My (kNm): Bending moment about Y axis
   */
  integrateForces(strainState: FiberStrainState): SectionResultantForce {
    let P_N = 0;
    let Mx_Nmm = 0;
    let My_Nmm = 0;

    let maxCompStrain = 0;
    let maxTensStrain = 0;

    // 1. Concrete fiber integration
    for (const fiber of this.section.concreteFibers) {
      const eps = this.getStrainAt(fiber.x_mm, fiber.y_mm, strainState);

      if (eps < 0) {
        // Concrete in compression
        const epsComp = -eps;
        if (epsComp > maxCompStrain) maxCompStrain = epsComp;

        const stress = this.concreteModel.evaluateStress(epsComp, fiber.isConfined).stress_MPa;
        const dF = stress * fiber.area_mm2; // Force in N (compression)

        P_N += dF;
        Mx_Nmm += dF * fiber.y_mm;
        My_Nmm -= dF * fiber.x_mm;
      }
    }

    // 2. Rebar fiber integration
    for (const rebar of this.section.rebarFibers) {
      const eps = this.getStrainAt(rebar.x_mm, rebar.y_mm, strainState);

      if (eps > maxTensStrain) maxTensStrain = eps;
      if (-eps > maxCompStrain) maxCompStrain = -eps;

      const model = this.rebarModels.get(rebar.material.name)!;
      const res = model.evaluateStress(eps);
      // res.stress_MPa: positive = tension, negative = compression
      // dF_compression = -stress * area
      const dF_comp = -res.stress_MPa * rebar.area_mm2;

      P_N += dF_comp;
      Mx_Nmm += dF_comp * rebar.y_mm;
      My_Nmm -= dF_comp * rebar.x_mm;
    }

    // Geometric neutral axis calculation
    const kappaTotal = Math.sqrt(strainState.kappaX * strainState.kappaX + strainState.kappaY * strainState.kappaY);
    let theta_rad = 0;
    let c_depth_mm = 0;

    if (kappaTotal > 1e-12) {
      theta_rad = Math.atan2(strainState.kappaY, strainState.kappaX);
      // Neutral axis line: eps(x, y) = 0 => eps0 = kappaX * y + kappaY * x
      // Distance from origin to neutral axis: d = eps0 / kappaTotal
      // Distance from extreme compression fiber to neutral axis:
      const yExtComp = strainState.kappaX >= 0 ? this.section.geometry.height_mm / 2 : -this.section.geometry.height_mm / 2;
      const xExtComp = strainState.kappaY >= 0 ? this.section.geometry.width_mm / 2 : -this.section.geometry.width_mm / 2;
      const epsExtComp = -(strainState.eps0 - strainState.kappaX * yExtComp - strainState.kappaY * xExtComp);
      c_depth_mm = Math.max(0, epsExtComp / kappaTotal);
    } else {
      // Pure axial
      c_depth_mm = strainState.eps0 < 0 ? Infinity : 0;
    }

    return {
      P_kN: P_N / 1000,
      Mx_kNm: Mx_Nmm / 1e6,
      My_kNm: My_Nmm / 1e6,
      eps_c: maxCompStrain,
      eps_s: maxTensStrain,
      theta_rad,
      c_depth_mm,
    };
  }

  /**
   * Computes pure concentric compressive axial capacity P0 (kN)
   * ACI 318-19 Eq. 22.4.2.2: P0 = 0.85 * f'c * (Ag - Ast) + fy * Ast
   */
  computePureAxialCompressionCapacity(standard: string = 'ACI_318_19'): {
    P0_nominal_kN: number;
    Pmax_design_kN: number;
    phi: number;
  } {
    const Ag = this.section.geometry.grossArea_mm2;
    const Ast = this.section.getTotalSteelArea_mm2();
    const Ac = Ag - Ast;
    const fc = this.section.concreteMaterial.fc_MPa;

    // Weighted average fy if multiple rebar grades exist
    const fyTotal = this.section.rebarFibers.reduce(
      (acc, r) => acc + r.material.fy_MPa * r.area_mm2,
      0
    );
    const fy = Ast > 0 ? fyTotal / Ast : 414;

    if (standard === 'EUROCODE_2') {
      // EC2 Clause 5.8.4
      const fcd = (0.85 * fc) / 1.5;
      const fyd = fy / 1.15;
      const NRd = (Ac * fcd + Ast * fyd) / 1000;
      return { P0_nominal_kN: (Ac * fc + Ast * fy) / 1000, Pmax_design_kN: NRd, phi: 1.0 };
    }

    // ACI 318-19
    const P0 = (0.85 * fc * Ac + fy * Ast) / 1000; // kN
    // ACI Table 21.2.2: phi = 0.65 for tied columns, 0.75 for spiral
    // ACI Table 22.4.2.1: Pn,max = 0.80 * P0 (tied) or 0.85 * P0 (spiral)
    const isSpiral = this.section.geometry.type === 'CIRCULAR';
    const alphaMax = isSpiral ? 0.85 : 0.80;
    const phi = isSpiral ? 0.75 : 0.65;
    const Pmax_design = phi * alphaMax * P0;

    return {
      P0_nominal_kN: P0,
      Pmax_design_kN: Pmax_design,
      phi,
    };
  }

  /**
   * Computes pure concentric tension capacity Pt (kN)
   * Pure steel yielding: Pt = Ast * fy
   */
  computePureAxialTensionCapacity(): { Pt_nominal_kN: number; Pt_design_kN: number; phi: number } {
    const Ast = this.section.getTotalSteelArea_mm2();
    const fyTotal = this.section.rebarFibers.reduce(
      (acc, r) => acc + r.material.fy_MPa * r.area_mm2,
      0
    );
    const fy = Ast > 0 ? fyTotal / Ast : 414;
    const Pt_nominal = (Ast * fy) / 1000;
    // ACI 318 phi = 0.90 for tension-controlled
    return {
      Pt_nominal_kN: Pt_nominal,
      Pt_design_kN: 0.90 * Pt_nominal,
      phi: 0.90,
    };
  }

  /**
   * Evaluates the section under a given neutral axis depth c (mm)
   * at an ultimate concrete compressive strain eps_cu (e.g. 0.003 ACI).
   *
   * @param c_depth_mm Depth of neutral axis from extreme compression face (mm)
   * @param theta_rad Neutral axis angle (0 = bending about X-axis, PI/2 = bending about Y-axis)
   */
  evaluateAtNeutralAxisDepth(
    c_depth_mm: number,
    theta_rad: number = 0,
    eps_cu?: number
  ): SectionResultantForce {
    const epsCu = eps_cu || this.section.concreteMaterial.eps_cu;

    if (c_depth_mm <= 1e-4) {
      // Pure tension
      return this.integrateForces({
        eps0: 0.01,
        kappaX: 0,
        kappaY: 0,
      });
    }

    const kappa = epsCu / c_depth_mm;
    const kappaX = kappa * Math.cos(theta_rad);
    const kappaY = kappa * Math.sin(theta_rad);

    // Extreme compression fiber location
    const h = this.section.geometry.height_mm;
    const w = this.section.geometry.width_mm;
    const yExtComp = kappaX >= 0 ? h / 2 : -h / 2;
    const xExtComp = kappaY >= 0 ? w / 2 : -w / 2;

    // Strain at extreme compression fiber must equal -epsCu
    // eps(xExt, yExt) = eps0 - kappaX * yExt - kappaY * xExt = -epsCu
    const eps0 = -epsCu + kappaX * yExtComp + kappaY * xExtComp;

    return this.integrateForces({
      eps0,
      kappaX,
      kappaY,
    });
  }

  /**
   * Solves for the neutral axis depth c (mm) corresponding to a specified axial force P (kN)
   * using a bounded bisection / secant numerical root finder.
   *
   * @param targetP_kN Target axial compression force (positive = compression)
   * @param theta_rad Neutral axis angle
   */
  solveNeutralAxisForAxialLoad(
    targetP_kN: number,
    theta_rad: number = 0,
    tol_kN: number = 0.5,
    maxIter: number = 40
  ): SectionResultantForce {
    const h = Math.max(this.section.geometry.height_mm, this.section.geometry.width_mm);

    let cMin = 1.0; // 1 mm
    let cMax = 5.0 * h; // Very large compression depth

    let bestResult: SectionResultantForce = this.evaluateAtNeutralAxisDepth(h / 2, theta_rad);

    for (let iter = 0; iter < maxIter; iter++) {
      const cMid = 0.5 * (cMin + cMax);
      const res = this.evaluateAtNeutralAxisDepth(cMid, theta_rad);
      const diff = res.P_kN - targetP_kN;

      bestResult = res;

      if (Math.abs(diff) <= tol_kN) {
        break;
      }

      if (diff > 0) {
        // Concrete is providing too much compression, reduce c
        cMax = cMid;
      } else {
        // Need more compression, increase c
        cMin = cMid;
      }
    }

    return bestResult;
  }
}
