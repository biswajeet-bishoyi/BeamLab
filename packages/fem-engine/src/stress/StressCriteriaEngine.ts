/**
 * Stress Contours & Multi-Axial Yield Criteria Engine
 * BeamLab Sprint B19.4 — von Mises, Tresca & Principal Stresses
 */

import { StressTensor2D, PrincipalStressResult, YieldCriteriaResult } from './types';

export class StressCriteriaEngine {
  /**
   * Computes 2D principal stresses (sigma_1, sigma_2), maximum shear stress (tau_max),
   * and principal angle orientation (theta_p).
   */
  public static calculatePrincipalStresses(tensor: StressTensor2D): PrincipalStressResult {
    const { sigmax, sigmay, tauxy } = tensor;
    const avg = 0.5 * (sigmax + sigmay);
    const radius = Math.hypot(0.5 * (sigmax - sigmay), tauxy);

    const sigma1 = avg + radius;
    const sigma2 = avg - radius;
    const tauMax = radius;

    const thetaPrincipalRad = 0.5 * Math.atan2(2 * tauxy, sigmax - sigmay);
    const thetaPrincipalDeg = (thetaPrincipalRad * 180) / Math.PI;

    return {
      sigma1,
      sigma2,
      tauMax,
      thetaPrincipalRad,
      thetaPrincipalDeg,
      hydrostaticMeanStress: avg,
    };
  }

  /**
   * Evaluates classical multi-axial yield criteria:
   * - Huber-von Mises J2 distortion energy yield stress
   * - Tresca maximum shear stress criterion
   * - Rankine maximum normal tensile stress
   * - Capacity utilization ratios against material yield strength f_y
   */
  public static evaluateYieldCriteria(
    tensor: StressTensor2D,
    yieldStrength: number
  ): YieldCriteriaResult {
    if (yieldStrength <= 0) {
      throw new Error(`Yield strength must be strictly positive, received ${yieldStrength}.`);
    }

    const { sigmax, sigmay, tauxy } = tensor;
    const tauxz = tensor.tauxz ?? 0;
    const tauyz = tensor.tauyz ?? 0;

    // von Mises equivalent stress in 3D-extended plane stress
    const vmSq =
      sigmax * sigmax -
      sigmax * sigmay +
      sigmay * sigmay +
      3 * (tauxy * tauxy + tauxz * tauxz + tauyz * tauyz);
    const vonMisesStress = Math.sqrt(Math.max(0, vmSq));

    // Principal stresses for Tresca & Rankine
    const principal = this.calculatePrincipalStresses(tensor);
    const { sigma1, sigma2 } = principal;

    // In plane stress, third out-of-plane principal stress sigma3 = 0
    const trescaStress = Math.max(
      Math.abs(sigma1 - sigma2),
      Math.abs(sigma1),
      Math.abs(sigma2)
    );

    const rankineStress = Math.max(0, sigma1);

    const utilizationVonMises = vonMisesStress / yieldStrength;
    const utilizationTresca = trescaStress / yieldStrength;
    const isYielded = vonMisesStress >= yieldStrength;

    return {
      vonMisesStress,
      trescaStress,
      rankineStress,
      yieldStrength,
      utilizationVonMises,
      utilizationTresca,
      isYielded,
    };
  }

  /**
   * Smooths element-centroid/Gauss stresses to mesh nodes using area-weighted inverse distance averaging
   * to create continuous contour gradient fields across the 3D finite element mesh.
   */
  public static smoothElementStressesToNodes(
    nodeIds: string[],
    elements: Array<{ id: string; nodeIds: string[]; area: number }>,
    elementStressMap: Map<string, number>
  ): Map<string, number> {
    const nodeAccumulators = new Map<string, { sumStressWeight: number; sumWeight: number }>();
    nodeIds.forEach((id) => nodeAccumulators.set(id, { sumStressWeight: 0, sumWeight: 0 }));

    elements.forEach((el) => {
      const stress = elementStressMap.get(el.id);
      if (stress === undefined) return;
      const weight = Math.max(1e-4, el.area);

      el.nodeIds.forEach((nId) => {
        const acc = nodeAccumulators.get(nId);
        if (acc) {
          acc.sumStressWeight += stress * weight;
          acc.sumWeight += weight;
        }
      });
    });

    const nodalStressMap = new Map<string, number>();
    nodeIds.forEach((id) => {
      const acc = nodeAccumulators.get(id);
      if (acc && acc.sumWeight > 0) {
        nodalStressMap.set(id, acc.sumStressWeight / acc.sumWeight);
      } else {
        nodalStressMap.set(id, 0);
      }
    });

    return nodalStressMap;
  }
}
