/**
 * SoilStratigraphy.ts
 *
 * Multi-layer geotechnical soil profile and stress state engine.
 * Computes depth-dependent total stress, pore water pressure, and effective vertical
 * stress sigma'_v(z) under variable water table levels, as well as depth-weighted
 * average strength parameters across foundation shear zones.
 */

export type SoilType = 'SAND' | 'CLAY' | 'SILT' | 'GRAVEL' | 'ROCK' | 'GENERIC';

export interface SoilLayer {
  readonly id: string;
  readonly name: string;
  readonly depthTop_m: number;
  readonly depthBottom_m: number;
  readonly dryUnitWeight_kN_m3: number;
  readonly saturatedUnitWeight_kN_m3: number;
  readonly cohesion_kPa: number; // c or cu
  readonly frictionAngle_deg: number; // phi
  readonly elasticModulus_MPa: number; // Es
  readonly poissonRatio: number; // nu_s (typically 0.25 - 0.35)
  readonly voidRatio?: number; // e_0 for consolidation
  readonly compressionIndex?: number; // Cc
  readonly recompressionIndex?: number; // Cr or Cs
  readonly soilType?: SoilType;
}

export interface SoilStratigraphyProfile {
  readonly name: string;
  readonly waterTableDepth_m: number; // Depth below ground surface (m)
  readonly layers: SoilLayer[];
}

export class SoilStratigraphy {
  private readonly gammaW = 9.81; // Unit weight of water in kN/m3
  readonly profile: SoilStratigraphyProfile;

  constructor(profile: SoilStratigraphyProfile) {
    // Sort layers by depthTop
    const sortedLayers = [...profile.layers].sort((a, b) => a.depthTop_m - b.depthBottom_m);
    this.profile = {
      ...profile,
      layers: sortedLayers,
    };
  }

  /**
   * Returns all layers in stratigraphy profile.
   */
  getLayers(): readonly SoilLayer[] {
    return this.profile.layers;
  }

  /**
   * Returns the soil layer at a specific depth z.
   */
  getLayerAtDepth(depth_m: number): SoilLayer | undefined {
    return this.profile.layers.find(
      l => depth_m >= l.depthTop_m && depth_m <= l.depthBottom_m
    ) || this.profile.layers[this.profile.layers.length - 1];
  }

  /**
   * Computes pore water pressure u at depth z (kPa).
   */
  getPoreWaterPressure(depth_m: number): number {
    if (depth_m <= this.profile.waterTableDepth_m) {
      return 0;
    }
    return (depth_m - this.profile.waterTableDepth_m) * this.gammaW;
  }

  /**
   * Computes total vertical overburden stress sigma_v at depth z (kPa).
   */
  getTotalVerticalStress(depth_m: number): number {
    if (depth_m <= 0) return 0;
    let sigma_v = 0;
    const wtDepth = this.profile.waterTableDepth_m;

    for (const layer of this.profile.layers) {
      if (layer.depthTop_m >= depth_m) break;

      const zTop = layer.depthTop_m;
      const zBottom = Math.min(layer.depthBottom_m, depth_m);

      if (zBottom <= wtDepth) {
        // Entirely above water table
        const dz = zBottom - zTop;
        sigma_v += dz * layer.dryUnitWeight_kN_m3;
      } else if (zTop >= wtDepth) {
        // Entirely below water table
        const dz = zBottom - zTop;
        sigma_v += dz * layer.saturatedUnitWeight_kN_m3;
      } else {
        // Subdivided by water table
        const dzAbove = wtDepth - zTop;
        const dzBelow = zBottom - wtDepth;
        sigma_v += dzAbove * layer.dryUnitWeight_kN_m3 + dzBelow * layer.saturatedUnitWeight_kN_m3;
      }
    }

    return sigma_v;
  }

  /**
   * Computes effective vertical stress sigma'_v = sigma_v - u at depth z (kPa).
   */
  getEffectiveVerticalStress(depth_m: number): number {
    const total = this.getTotalVerticalStress(depth_m);
    const u = this.getPoreWaterPressure(depth_m);
    return Math.max(0, total - u);
  }

  /**
   * Computes weighted average soil strength parameters across an influence depth zone
   * (e.g. from footing base Df to Df + B).
   */
  getWeightedParameters(depthTop_m: number, depthBottom_m: number): {
    cohesion_kPa: number;
    frictionAngle_deg: number;
    effectiveGamma_kN_m3: number;
    elasticModulus_MPa: number;
    poissonRatio: number;
  } {
    const totalDepth = depthBottom_m - depthTop_m;
    if (totalDepth <= 1e-4) {
      const layer = this.getLayerAtDepth(depthTop_m);
      if (!layer) {
        return {
          cohesion_kPa: 0,
          frictionAngle_deg: 30,
          effectiveGamma_kN_m3: 18,
          elasticModulus_MPa: 25,
          poissonRatio: 0.3,
        };
      }
      const isSubmerged = depthTop_m > this.profile.waterTableDepth_m;
      const effGamma = isSubmerged ? layer.saturatedUnitWeight_kN_m3 - this.gammaW : layer.dryUnitWeight_kN_m3;
      return {
        cohesion_kPa: layer.cohesion_kPa,
        frictionAngle_deg: layer.frictionAngle_deg,
        effectiveGamma_kN_m3: effGamma,
        elasticModulus_MPa: layer.elasticModulus_MPa,
        poissonRatio: layer.poissonRatio,
      };
    }

    let sumC = 0;
    let sumPhi = 0;
    let sumGamma = 0;
    let sumEs = 0;
    let sumNu = 0;
    let accumulatedH = 0;

    for (const layer of this.profile.layers) {
      const zStart = Math.max(layer.depthTop_m, depthTop_m);
      const zEnd = Math.min(layer.depthBottom_m, depthBottom_m);

      if (zEnd > zStart) {
        const h = zEnd - zStart;
        accumulatedH += h;

        sumC += layer.cohesion_kPa * h;
        sumPhi += layer.frictionAngle_deg * h;
        sumEs += layer.elasticModulus_MPa * h;
        sumNu += layer.poissonRatio * h;

        // Effective unit weight calculation based on water table intersection
        const wt = this.profile.waterTableDepth_m;
        if (zEnd <= wt) {
          sumGamma += layer.dryUnitWeight_kN_m3 * h;
        } else if (zStart >= wt) {
          sumGamma += (layer.saturatedUnitWeight_kN_m3 - this.gammaW) * h;
        } else {
          const hAbove = wt - zStart;
          const hBelow = zEnd - wt;
          sumGamma += layer.dryUnitWeight_kN_m3 * hAbove + (layer.saturatedUnitWeight_kN_m3 - this.gammaW) * hBelow;
        }
      }
    }

    const denom = accumulatedH > 0 ? accumulatedH : 1;
    return {
      cohesion_kPa: Number((sumC / denom).toFixed(2)),
      frictionAngle_deg: Number((sumPhi / denom).toFixed(2)),
      effectiveGamma_kN_m3: Number((sumGamma / denom).toFixed(2)),
      elasticModulus_MPa: Number((sumEs / denom).toFixed(2)),
      poissonRatio: Number((sumNu / denom).toFixed(3)),
    };
  }
}
