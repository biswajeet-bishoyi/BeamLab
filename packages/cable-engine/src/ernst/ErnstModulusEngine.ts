/**
 * Ernst Equivalent Modulus & Geometric Non-Linearity Engine
 * BeamLab Sprint B18.2 — Ernst Secant & Tangent Elasticity Formulations
 */

import { CableMaterial, CableCrossSection } from '../catenary/types';
import { CableStayGeometry, ErnstModulusResult, IterativeCableSolveResult, IterativeCableSolveStep } from './types';

export class ErnstModulusEngine {
  /**
   * Computes Ernst tangent equivalent elastic modulus E_tan and reduction factor.
   * E_tan = E / (1 + (w * L_h)^2 * E * A / (12 * T^3))
   *
   * @param geometry Cable geometric configuration (span, height, chord)
   * @param section Cross-sectional parameters (area, unit weight)
   * @param material Material parameters (modulus of elasticity)
   * @param tension Current axial tension T (N)
   */
  public static calculateTangentModulus(
    geometry: CableStayGeometry,
    section: CableCrossSection,
    material: CableMaterial,
    tension: number
  ): ErnstModulusResult {
    if (tension <= 0) {
      throw new Error(`Axial cable tension must be strictly positive, received ${tension} N.`);
    }

    const E0 = material.elasticModulus;
    const A = section.metallicArea;
    const w = section.unitWeight;
    const Lh = geometry.spanHorizontal;
    const Lc = geometry.chordLength;

    const stress = tension / A;
    const sagTerm = (Math.pow(w * Lh, 2) * E0 * A) / (12 * Math.pow(tension, 3));
    const Etan = E0 / (1 + sagTerm);
    const reductionFactor = Etan / E0;

    // Irvine parameter lambda^2 = (w * Lh / T)^2 * (E0 * A / T) * (Le / Lc)
    // For stay cables, Le / Lc is approx 1 / cos^2(theta)
    const cosTheta = Math.cos(geometry.inclinationAngleRad);
    const irvineFactor = cosTheta > 0.01 ? 1 / Math.pow(cosTheta, 2) : 1.0;
    const lambdaSq = Math.pow((w * Lh) / tension, 2) * ((E0 * A) / tension) * irvineFactor;

    const kEq = (Etan * A) / Lc;

    return {
      tangentModulus: Etan,
      secantModulus: Etan, // For instantaneous tension, secant equals tangent
      initialElasticModulus: E0,
      reductionFactor,
      irvineParameter: lambdaSq,
      equivalentStiffness: kEq,
      axialStress: stress,
    };
  }

  /**
   * Computes Ernst secant equivalent elastic modulus E_sec between two tension states T1 and T2.
   * E_sec = E / (1 + (w * L_h)^2 * E * A / 24 * (T1 + T2) / (T1^2 * T2^2))
   *
   * @param geometry Cable geometric configuration
   * @param section Cross-sectional parameters
   * @param material Material parameters
   * @param tension1 Initial state tension T1 (N)
   * @param tension2 Final state tension T2 (N)
   */
  public static calculateSecantModulus(
    geometry: CableStayGeometry,
    section: CableCrossSection,
    material: CableMaterial,
    tension1: number,
    tension2: number
  ): ErnstModulusResult {
    if (tension1 <= 0 || tension2 <= 0) {
      throw new Error('Both initial and final cable tensions must be strictly positive.');
    }

    const E0 = material.elasticModulus;
    const A = section.metallicArea;
    const w = section.unitWeight;
    const Lh = geometry.spanHorizontal;
    const Lc = geometry.chordLength;

    const tSum = tension1 + tension2;
    const tProdSq = Math.pow(tension1 * tension2, 2);
    const sagSecantTerm = ((Math.pow(w * Lh, 2) * E0 * A) / 24) * (tSum / tProdSq);
    const Esec = E0 / (1 + sagSecantTerm);

    const avgTension = 0.5 * (tension1 + tension2);
    const tanRes = this.calculateTangentModulus(geometry, section, material, avgTension);

    return {
      tangentModulus: tanRes.tangentModulus,
      secantModulus: Esec,
      initialElasticModulus: E0,
      reductionFactor: Esec / E0,
      irvineParameter: tanRes.irvineParameter,
      equivalentStiffness: (Esec * A) / Lc,
      axialStress: avgTension / A,
    };
  }

  /**
   * Iteratively determines the final cable tension and secant modulus
   * under an imposed chord displacement deltaLc.
   * Solves T_final = T_initial + E_sec(T_initial, T_final) * A / L_c * deltaLc
   */
  public static solveIterativeElongation(
    geometry: CableStayGeometry,
    section: CableCrossSection,
    material: CableMaterial,
    initialTension: number,
    deltaLc: number,
    maxIterations: number = 50,
    tolerance: number = 1e-6
  ): IterativeCableSolveResult {
    const A = section.metallicArea;
    const Lc = geometry.chordLength;

    let currentTension = initialTension;
    const history: IterativeCableSolveStep[] = [];
    let converged = false;
    let iter = 0;

    for (iter = 1; iter <= maxIterations; iter++) {
      const secResult = this.calculateSecantModulus(
        geometry,
        section,
        material,
        initialTension,
        currentTension
      );

      const deltaT = (secResult.secantModulus * A / Lc) * deltaLc;
      const nextTension = Math.max(10, initialTension + deltaT);
      const residual = Math.abs(nextTension - currentTension) / currentTension;

      history.push({
        iteration: iter,
        tension: nextTension,
        stress: nextTension / A,
        equivalentModulus: secResult.secantModulus,
        elongation: deltaLc,
        residual,
      });

      currentTension = nextTension;

      if (residual < tolerance) {
        converged = true;
        break;
      }
    }

    const finalSec = this.calculateSecantModulus(
      geometry,
      section,
      material,
      initialTension,
      currentTension
    );

    return {
      converged,
      iterations: iter,
      finalTension: currentTension,
      finalStress: currentTension / A,
      finalEquivalentModulus: finalSec.secantModulus,
      chordElongation: deltaLc,
      history,
    };
  }

  /**
   * Helper to construct CableStayGeometry from 2D coordinates (x1, y1) and (x2, y2).
   */
  public static createGeometry(
    id: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): CableStayGeometry {
    const spanHorizontal = Math.abs(x2 - x1);
    const levelDifference = y2 - y1;
    const chordLength = Math.hypot(spanHorizontal, levelDifference);
    const inclinationAngleRad = Math.atan2(Math.abs(levelDifference), spanHorizontal);

    return {
      id,
      spanHorizontal,
      levelDifference,
      chordLength,
      inclinationAngleRad,
    };
  }
}
