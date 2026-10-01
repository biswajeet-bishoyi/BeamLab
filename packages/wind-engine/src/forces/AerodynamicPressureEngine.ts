/**
 * AerodynamicPressureEngine.ts
 *
 * Building aerodynamic pressure coefficients (ASCE 7-22 Chapters 27 & 30, Eurocode 1 EN 1991-1-4),
 * Main Wind Force Resisting System (MWFRS) story wind load distribution,
 * floor shears, overturning moments, and Components & Cladding (C&C) suction zones.
 */

import { WindProfileEngine, Asce7WindOptions } from '../profile/WindProfileEngine';

export interface BuildingDimensions {
  length_m: number; // L: Dimension parallel to wind direction
  width_m: number; // B: Dimension perpendicular to wind direction (cross-wind width)
  meanRoofHeight_m: number; // h: Mean roof height
  parapetHeight_m?: number;
  enclosureClassification?: 'ENCLOSED' | 'PARTIALLY_ENCLOSED' | 'PARTIALLY_OPEN';
}

export interface BuildingStoryLevel {
  levelId: string;
  levelName: string;
  elevation_m: number;
  storyHeight_m: number;
}

export interface MwfrsPressureCoefficients {
  windwardCp: number;
  leewardCp: number;
  sideWallCp: number;
  roofCp: {
    zone0_to_half_h: number;
    zone_half_h_to_h: number;
    zone_beyond_h: number;
  };
  internalGpiPositive: number;
  internalGpiNegative: number;
}

export interface StoryWindForceResult {
  levelId: string;
  levelName: string;
  elevation_m: number;
  tributaryHeight_m: number;
  qz_N_m2: number;
  windwardPressure_N_m2: number;
  leewardPressure_N_m2: number;
  netDesignPressure_N_m2: number; // (Windward + |Leeward|)
  windwardForce_kN: number;
  leewardForce_kN: number;
  storyForce_kN: number;
  storyShear_kN: number; // Accumulated from top down
  overturningMoment_kNm: number; // Level contribution to base overturning moment
}

export interface CladdingZonePressure {
  zone: 'ZONE_4_INTERIOR_WALL' | 'ZONE_5_END_CORNER_WALL' | 'ZONE_1_ROOF_INTERIOR' | 'ZONE_2_ROOF_EDGE' | 'ZONE_3_ROOF_CORNER';
  dimension_a_m: number; // End zone dimension a = max(0.9m, min(0.1B, 0.1L, 0.4h))
  positivePressure_N_m2: number;
  suctionPressure_N_m2: number;
  designNetPressure_N_m2: number; // Governing absolute magnitude
}

export interface MwfrsAnalysisReport {
  dimensions: BuildingDimensions;
  gustFactorG: number;
  qh_N_m2: number; // Velocity pressure at mean roof height h
  coefficients: MwfrsPressureCoefficients;
  stories: StoryWindForceResult[];
  baseShear_kN: number;
  baseOverturningMoment_kNm: number;
  claddingZones: CladdingZonePressure[];
  summary: string;
}

export class AerodynamicPressureEngine {
  /**
   * Evaluates ASCE 7-22 external pressure coefficient Cp for walls per Figure 27.3-1.
   * L = length parallel to wind, B = width perpendicular to wind.
   */
  public static getWallCoefficients(L_m: number, B_m: number): {
    windwardCp: number;
    leewardCp: number;
    sideWallCp: number;
  } {
    const ratio = B_m > 0 ? L_m / B_m : 1.0;

    // Windward wall Cp = 0.8 for all L/B
    const windwardCp = 0.8;

    // Side walls Cp = -0.7 for all L/B
    const sideWallCp = -0.7;

    // Leeward wall Cp depends on L/B:
    // L/B <= 1.0 -> -0.5
    // L/B = 2.0 -> -0.3
    // L/B >= 4.0 -> -0.2
    let leewardCp: number;
    if (ratio <= 1.0) {
      leewardCp = -0.5;
    } else if (ratio <= 2.0) {
      // Linear interpolation between (1.0, -0.5) and (2.0, -0.3)
      leewardCp = -0.5 + (ratio - 1.0) * (-0.3 - -0.5);
    } else if (ratio <= 4.0) {
      // Linear interpolation between (2.0, -0.3) and (4.0, -0.2)
      leewardCp = -0.3 + ((ratio - 2.0) / 2.0) * (-0.2 - -0.3);
    } else {
      leewardCp = -0.2;
    }

    return {
      windwardCp,
      leewardCp: Number(leewardCp.toFixed(3)),
      sideWallCp,
    };
  }

  /**
   * Returns internal pressure coefficient (GCpi) per ASCE 7-22 Table 26.13-1.
   */
  public static getInternalPressureCoefficients(
    enclosure: 'ENCLOSED' | 'PARTIALLY_ENCLOSED' | 'PARTIALLY_OPEN' = 'ENCLOSED'
  ): { positive: number; negative: number } {
    switch (enclosure) {
      case 'PARTIALLY_ENCLOSED':
        return { positive: 0.55, negative: -0.55 };
      case 'PARTIALLY_OPEN':
        return { positive: 0.0, negative: 0.0 };
      case 'ENCLOSED':
      default:
        return { positive: 0.18, negative: -0.18 };
    }
  }

  /**
   * Computes Components & Cladding (C&C) end zone dimension a per ASCE 7-22 Section 30.3.
   * a = max(0.9m, min(0.1*B, 0.1*L, 0.4*h))
   */
  public static getCladdingZoneDimensionA(dim: BuildingDimensions): number {
    const minVal = Math.min(0.1 * dim.width_m, 0.1 * dim.length_m, 0.4 * dim.meanRoofHeight_m);
    const a = Math.max(0.9, minVal);
    return Number(a.toFixed(2));
  }

  /**
   * Conducts full MWFRS story wind load analysis and C&C localized suction evaluation.
   */
  public static analyzeMwfrs(
    dimensions: BuildingDimensions,
    stories: BuildingStoryLevel[],
    windOptions: Asce7WindOptions,
    gustFactorG: number = 0.85
  ): MwfrsAnalysisReport {
    // 1. Aerodynamic wall coefficients
    const wallCp = this.getWallCoefficients(dimensions.length_m, dimensions.width_m);
    const internalGpi = this.getInternalPressureCoefficients(dimensions.enclosureClassification);

    // Roof coefficients for flat/low-slope roof (ASCE 7 Figure 27.3-1)
    const hOverL = dimensions.meanRoofHeight_m / Math.max(1e-4, dimensions.length_m);
    const zone0_to_half_h = hOverL <= 0.5 ? -0.9 : -1.3;
    const zone_half_h_to_h = -0.9;
    const zone_beyond_h = -0.5;

    const coefficients: MwfrsPressureCoefficients = {
      windwardCp: wallCp.windwardCp,
      leewardCp: wallCp.leewardCp,
      sideWallCp: wallCp.sideWallCp,
      roofCp: {
        zone0_to_half_h,
        zone_half_h_to_h,
        zone_beyond_h,
      },
      internalGpiPositive: internalGpi.positive,
      internalGpiNegative: internalGpi.negative,
    };

    // Velocity pressure at mean roof height qh
    const qh = WindProfileEngine.getAsce7VelocityPressure(dimensions.meanRoofHeight_m, windOptions);

    // 2. Story wind force distribution
    // Sort stories from ground to roof
    const sortedStories = [...stories].sort((a, b) => a.elevation_m - b.elevation_m);
    const rawResults: Array<Omit<StoryWindForceResult, 'storyShear_kN'>> = [];

    let totalBaseShear = 0;
    let totalOverturningMoment = 0;

    for (let i = 0; i < sortedStories.length; i++) {
      const story = sortedStories[i]!;
      const z = story.elevation_m;

      // Tributary height
      let tribHeight = story.storyHeight_m;
      if (i === sortedStories.length - 1 && dimensions.parapetHeight_m && dimensions.parapetHeight_m > 0) {
        tribHeight += dimensions.parapetHeight_m;
      }

      // qz at level z
      const qz = WindProfileEngine.getAsce7VelocityPressure(z, windOptions);

      // Pressures (N/m^2):
      // Windward: p_w = qz * G * Cp_w
      // Leeward: p_l = qh * G * Cp_l
      const p_w = qz * gustFactorG * wallCp.windwardCp;
      const p_l = qh * gustFactorG * Math.abs(wallCp.leewardCp);
      const p_net = p_w + p_l;

      // Tributary area perpendicular to wind: B * tribHeight
      const tribArea = dimensions.width_m * tribHeight;

      // Forces in kN:
      const force_w_kN = (p_w * tribArea) / 1000;
      const force_l_kN = (p_l * tribArea) / 1000;
      const storyForce_kN = force_w_kN + force_l_kN;

      // Overturning moment contribution: Force * z (kN·m)
      const storyOTM_kNm = storyForce_kN * z;

      totalBaseShear += storyForce_kN;
      totalOverturningMoment += storyOTM_kNm;

      rawResults.push({
        levelId: story.levelId,
        levelName: story.levelName,
        elevation_m: z,
        tributaryHeight_m: Number(tribHeight.toFixed(2)),
        qz_N_m2: qz,
        windwardPressure_N_m2: Number(p_w.toFixed(1)),
        leewardPressure_N_m2: Number(p_l.toFixed(1)),
        netDesignPressure_N_m2: Number(p_net.toFixed(1)),
        windwardForce_kN: Number(force_w_kN.toFixed(2)),
        leewardForce_kN: Number(force_l_kN.toFixed(2)),
        storyForce_kN: Number(storyForce_kN.toFixed(2)),
        overturningMoment_kNm: Number(storyOTM_kNm.toFixed(1)),
      });
    }

    // Accumulate story shears from roof downwards
    let runningShear = 0;
    const finalStories: StoryWindForceResult[] = new Array(rawResults.length);
    for (let i = rawResults.length - 1; i >= 0; i--) {
      const item = rawResults[i]!;
      runningShear += item.storyForce_kN;
      finalStories[i] = {
        ...item,
        storyShear_kN: Number(runningShear.toFixed(2)),
      };
    }

    // 3. Components & Cladding (C&C) Pressures
    const dimA = this.getCladdingZoneDimensionA(dimensions);
    // Typical design pressures for wall & roof cladding zones (ASCE 7-22 Chapter 30)
    // Wall Zone 4 (Interior): GCp = +1.0 / -0.9
    // Wall Zone 5 (Corner edge a): GCp = +1.0 / -1.2
    // Roof Zone 1 (Field): GCp = +0.3 / -1.0
    // Roof Zone 2 (Edge): GCp = +0.3 / -1.8
    // Roof Zone 3 (Corner): GCp = +0.3 / -2.8
    const posGpi = internalGpi.positive;
    const negGpi = internalGpi.negative;

    const calcCC = (
      zone: CladdingZonePressure['zone'],
      extPos: number,
      extSuction: number
    ): CladdingZonePressure => {
      // Net positive: qh * (extPos - negGpi)
      const pPos = qh * (extPos - negGpi);
      // Net suction: qh * (extSuction - posGpi)
      const pNeg = qh * (extSuction - posGpi);
      const net = Math.max(Math.abs(pPos), Math.abs(pNeg));
      return {
        zone,
        dimension_a_m: dimA,
        positivePressure_N_m2: Number(pPos.toFixed(1)),
        suctionPressure_N_m2: Number(pNeg.toFixed(1)),
        designNetPressure_N_m2: Number(net.toFixed(1)),
      };
    };

    const claddingZones: CladdingZonePressure[] = [
      calcCC('ZONE_4_INTERIOR_WALL', 1.0, -0.9),
      calcCC('ZONE_5_END_CORNER_WALL', 1.0, -1.2),
      calcCC('ZONE_1_ROOF_INTERIOR', 0.3, -1.0),
      calcCC('ZONE_2_ROOF_EDGE', 0.3, -1.8),
      calcCC('ZONE_3_ROOF_CORNER', 0.3, -2.8),
    ];

    const summary = `MWFRS Total Base Shear = ${totalBaseShear.toFixed(1)} kN, Overturning Moment = ${totalOverturningMoment.toFixed(1)} kN·m (qh = ${qh.toFixed(1)} N/m², G = ${gustFactorG}).`;

    return {
      dimensions,
      gustFactorG,
      qh_N_m2: qh,
      coefficients,
      stories: finalStories,
      baseShear_kN: Number(totalBaseShear.toFixed(2)),
      baseOverturningMoment_kNm: Number(totalOverturningMoment.toFixed(1)),
      claddingZones,
      summary,
    };
  }
}
