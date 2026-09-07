/**
 * CltShearAnalogyEngine: Gamma Method and Kreuzinger Shear Analogy for Cross-Laminated Timber.
 * Implements effective bending stiffness (EI)_eff, effective shear stiffness (GA)_eff,
 * and shear-flexure coupled deflections per Eurocode 5 (Annex B) and PRG 320.
 */

import { CltLayupDefinition } from './CltLayupModel';

export interface CltCrossSectionProperties {
  totalThickness: number;
  stripWidth: number;
  /** Effective bending stiffness (EI)_eff in N*mm² per strip width */
  EI_eff: number;
  /** Effective shear stiffness (GA)_eff in N per strip width */
  GA_eff: number;
  /** Effective section modulus W_eff (mm³) */
  W_eff: number;
  /** First moment of area of outer longitudinal layer (ES)_eff in N*mm */
  ES_eff: number;
  /** Gamma efficiency factors for each layer */
  gammas: number[];
  /** Layer centroid coordinates z_i from neutral axis (mm) */
  layerCentroids: number[];
}

export class CltShearAnalogyEngine {
  /**
   * Calculate effective structural properties of a CLT layup along primary span direction (0°).
   *
   * @param layup CLT layup definition
   * @param spanLengthMm Primary panel span L in mm
   */
  static computeProperties(
    layup: CltLayupDefinition,
    spanLengthMm: number
  ): CltCrossSectionProperties {
    const b = layup.stripWidth;
    const h = layup.totalThickness;
    const n = layup.layers.length;

    // 1. Calculate layer centroid offsets relative to bottom face
    const layerOffsetsBottom: number[] = [];
    let accum = 0;
    for (let i = 0; i < n; i++) {
      const t = layup.layers[i].thickness;
      layerOffsetsBottom.push(accum + t / 2);
      accum += t;
    }

    // Neutral axis height from bottom for symmetric layup is h / 2
    const zNA = h / 2;
    const layerCentroids = layerOffsetsBottom.map(z => z - zNA);

    // 2. Compute Gamma factors for longitudinal layers (EN 1995-1-1 Annex B)
    // For middle layer of 3-ply or 5-ply, gamma_mid = 1.0.
    // Outer layers: gamma_i = 1 / (1 + (pi^2 * E_i * A_i * d_cross) / (L^2 * G_roll * b))
    const gammas: number[] = new Array(n).fill(0);
    const midIdx = Math.floor(n / 2);
    gammas[midIdx] = 1.0;

    for (let i = 0; i < n; i++) {
      const layer = layup.layers[i];
      if (layer.orientation === 0) {
        if (i === midIdx) {
          gammas[i] = 1.0;
        } else {
          // Distance to adjacent transverse layer
          const E_i = layer.grade.E0_mean;
          const A_i = b * layer.thickness;
          // Find adjacent cross layer thickness
          const crossIdx = i < midIdx ? i + 1 : i - 1;
          const t_cross = layup.layers[crossIdx]?.thickness ?? 20;
          const G_roll = layup.layers[crossIdx]?.grade.G90_mean ?? 65; // Rolling shear modulus

          const denom = 1.0 + (Math.pow(Math.PI, 2) * E_i * A_i * (t_cross / 2)) /
                              (Math.pow(spanLengthMm, 2) * G_roll * b);
          gammas[i] = 1.0 / Math.max(1.0, denom);
        }
      } else {
        // Transverse layers contribute very little in longitudinal direction
        // EN 1995-1-1 typically neglects transverse layer E or uses E90 = E0 / 30
        gammas[i] = 0.0;
      }
    }

    // 3. Compute (EI)_eff = sum( E_i * I_i + gamma_i * E_i * A_i * z_i^2 )
    let EI_eff = 0;
    for (let i = 0; i < n; i++) {
      const layer = layup.layers[i];
      const t = layer.thickness;
      const I_i = (b * Math.pow(t, 3)) / 12;
      const A_i = b * t;

      if (layer.orientation === 0) {
        const E_i = layer.grade.E0_mean;
        const gamma = gammas[i];
        const z = layerCentroids[i];
        EI_eff += E_i * I_i + gamma * E_i * A_i * Math.pow(z, 2);
      } else {
        // Weak axis contribution: E_90
        const E_90 = layer.grade.E90_mean;
        EI_eff += E_90 * I_i;
      }
    }

    // 4. Effective section modulus W_eff = 2 * (EI)_eff / (E_outer * h)
    const E_outer = layup.layers[0].grade.E0_mean;
    const W_eff = (2 * EI_eff) / (E_outer * h);

    // 5. First moment of area of outer layer for rolling shear: (ES)_eff = gamma_0 * E_0 * A_0 * z_0
    const t0 = layup.layers[0].thickness;
    const A0 = b * t0;
    const z0 = Math.abs(layerCentroids[0]);
    const ES_eff = gammas[0] * E_outer * A0 * z0;

    // 6. Effective shear stiffness (GA)_eff via Kreuzinger Shear Analogy
    // a^2 / (GA)_eff = t_0 / (2 * G_0 * b) + sum(t_cross / (G_roll * b)) + t_end / (2 * G_0 * b)
    // where a is the distance between centroids of outer longitudinal layers:
    const a_outer = Math.abs(layerCentroids[0] - layerCentroids[n - 1]);
    let shearCompliance = 0;
    for (let i = 0; i < n; i++) {
      const layer = layup.layers[i];
      const t = (i === 0 || i === n - 1) ? layer.thickness / 2 : layer.thickness;
      const G = layer.orientation === 90 ? layer.grade.G90_mean : layer.grade.G0_mean;
      shearCompliance += t / (G * b);
    }
    const GA_eff = shearCompliance > 0 ? Math.pow(a_outer, 2) / shearCompliance : 1e7;

    return {
      totalThickness: h,
      stripWidth: b,
      EI_eff,
      GA_eff,
      W_eff,
      ES_eff,
      gammas,
      layerCentroids,
    };
  }

  /**
   * Total panel deflection including bending and transverse shear deformation.
   *
   * w_total = w_flexure + w_shear = (5 * q * L^4) / (384 * EI_eff) + (q * L^2) / (8 * GA_eff)
   *
   * @param props CLT cross-section properties
   * @param spanLengthMm Panel span in mm
   * @param uniformLoadKNm2 Uniform surface load in kN/m²
   */
  static computePanelDeflection(
    props: CltCrossSectionProperties,
    spanLengthMm: number,
    uniformLoadKNm2: number
  ): { wBendingMm: number; wShearMm: number; wTotalMm: number; shearDeformationRatio: number } {
    // Convert kN/m² to N/mm for strip width b = 1000 mm:
    // q = uniformLoadKNm2 (kN/m²) * 1000 N/kN / (1e6 mm²/m²) * 1000 mm = uniformLoadKNm2 N/mm
    const q = uniformLoadKNm2; // N/mm

    const L = spanLengthMm;
    const wBendingMm = (5 * q * Math.pow(L, 4)) / (384 * props.EI_eff);
    const wShearMm = (q * Math.pow(L, 2)) / (8 * props.GA_eff);
    const wTotalMm = wBendingMm + wShearMm;
    const shearDeformationRatio = wShearMm / Math.max(1e-4, wTotalMm);

    return {
      wBendingMm,
      wShearMm,
      wTotalMm,
      shearDeformationRatio,
    };
  }
}
