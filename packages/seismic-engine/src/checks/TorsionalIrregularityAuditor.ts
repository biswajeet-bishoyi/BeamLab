/**
 * TorsionalIrregularityAuditor.ts
 *
 * Diaphragm edge displacement analysis, plan torsional irregularity classification
 * (ASCE 7-22 Table 12.3-1, Type 1a / 1b), and accidental eccentricity amplification (Ax).
 */

export type SeismicDesignCategory = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface DiaphragmStoryDisplacement {
  storyId: string;
  storyName: string;
  edge1Displacement_mm: number; // delta_1 at diaphragm edge 1
  edge2Displacement_mm: number; // delta_2 at diaphragm edge 2
  storyDimensionPerpendicular_m?: number; // Plan dimension B perpendicular to seismic action
}

export interface TorsionalIrregularityResult {
  storyId: string;
  storyName: string;
  maxDisplacement_mm: number; // delta_max
  minDisplacement_mm: number; // delta_min
  avgDisplacement_mm: number; // delta_avg = (delta_max + delta_min) / 2
  ratio: number; // delta_max / delta_avg
  irregularityType: 'NONE' | 'TYPE_1A_TORSIONAL' | 'TYPE_1B_EXTREME_TORSIONAL';
  amplificationFactor_Ax: number; // Ax = (delta_max / (1.2 * delta_avg))^2, bounded [1.0, 3.0]
  accidentalEccentricityDesign_m?: number; // 0.05 * B * Ax
  isPermittedInSDC: (sdc: SeismicDesignCategory) => boolean;
  diagnostics: string[];
}

export interface TorsionalAuditReport {
  stories: TorsionalIrregularityResult[];
  governingRatio: number;
  governingStoryId: string;
  governingIrregularityType: 'NONE' | 'TYPE_1A_TORSIONAL' | 'TYPE_1B_EXTREME_TORSIONAL';
  maxAmplificationAx: number;
  hasType1a: boolean;
  hasType1b: boolean;
  permittedInSDC_E_F: boolean;
  summary: string;
  recommendations: string[];
}

export class TorsionalIrregularityAuditor {
  /**
   * Calculates the ASCE 7-22 Section 12.8.4.3 accidental torsional amplification factor Ax.
   * Ax = (delta_max / (1.2 * delta_avg))^2, with 1.0 <= Ax <= 3.0
   */
  public static calculateAx(deltaMax_mm: number, deltaAvg_mm: number): number {
    if (deltaAvg_mm <= 1e-6) return 1.0;
    const base = deltaMax_mm / (1.2 * deltaAvg_mm);
    const ax = base ** 2;
    if (ax < 1.0) return 1.0;
    if (ax > 3.0) return 3.0;
    return Number(ax.toFixed(3));
  }

  /**
   * Audits torsional irregularity for all floor diaphragms.
   */
  public static audit(
    diaphragms: DiaphragmStoryDisplacement[],
    seismicDesignCategory: SeismicDesignCategory = 'D'
  ): TorsionalAuditReport {
    let maxRatio = 0;
    let governingStoryId = '';
    let governingType: 'NONE' | 'TYPE_1A_TORSIONAL' | 'TYPE_1B_EXTREME_TORSIONAL' = 'NONE';
    let maxAx = 1.0;
    let hasType1a = false;
    let hasType1b = false;

    const results: TorsionalIrregularityResult[] = [];

    for (const d of diaphragms) {
      const d1 = Math.abs(d.edge1Displacement_mm);
      const d2 = Math.abs(d.edge2Displacement_mm);
      const deltaMax = Math.max(d1, d2);
      const deltaMin = Math.min(d1, d2);
      const deltaAvg = (deltaMax + deltaMin) / 2;

      const ratio = deltaAvg > 1e-6 ? Number((deltaMax / deltaAvg).toFixed(3)) : 1.0;
      const ax = this.calculateAx(deltaMax, deltaAvg);
      if (ax > maxAx) maxAx = ax;

      let irregularityType: 'NONE' | 'TYPE_1A_TORSIONAL' | 'TYPE_1B_EXTREME_TORSIONAL' = 'NONE';
      const diagnostics: string[] = [];

      if (ratio > 1.4) {
        irregularityType = 'TYPE_1B_EXTREME_TORSIONAL';
        hasType1b = true;
        diagnostics.push(
          `Extreme Torsional Irregularity (Type 1b): Drift ratio ${ratio.toFixed(3)} > 1.40.`
        );
        diagnostics.push(
          `Prohibited in SDC E and F (ASCE 7-22 Table 12.3-1). Requires 3D modal/time-history analysis.`
        );
      } else if (ratio > 1.2) {
        irregularityType = 'TYPE_1A_TORSIONAL';
        hasType1a = true;
        diagnostics.push(
          `Torsional Irregularity (Type 1a): Drift ratio ${ratio.toFixed(3)} > 1.20 and <= 1.40.`
        );
        diagnostics.push(
          `Accidental eccentricity must be amplified by Ax = ${ax.toFixed(2)}.`
        );
      } else {
        diagnostics.push(`Diaphragm is regular in torsion (ratio ${ratio.toFixed(3)} <= 1.20).`);
      }

      // Design accidental eccentricity: 0.05 * B * Ax
      let designEccentricity: number | undefined;
      if (d.storyDimensionPerpendicular_m && d.storyDimensionPerpendicular_m > 0) {
        designEccentricity = Number((0.05 * d.storyDimensionPerpendicular_m * ax).toFixed(3));
      }

      if (ratio > maxRatio) {
        maxRatio = ratio;
        governingStoryId = d.storyId;
        governingType = irregularityType;
      }

      results.push({
        storyId: d.storyId,
        storyName: d.storyName,
        maxDisplacement_mm: Number(deltaMax.toFixed(2)),
        minDisplacement_mm: Number(deltaMin.toFixed(2)),
        avgDisplacement_mm: Number(deltaAvg.toFixed(2)),
        ratio,
        irregularityType,
        amplificationFactor_Ax: ax,
        accidentalEccentricityDesign_m: designEccentricity,
        isPermittedInSDC: (sdc: SeismicDesignCategory) => {
          if (irregularityType === 'TYPE_1B_EXTREME_TORSIONAL' && (sdc === 'E' || sdc === 'F')) {
            return false;
          }
          return true;
        },
        diagnostics,
      });
    }

    const permittedInSDC_E_F = !hasType1b;

    // Recommendations
    const recommendations: string[] = [];
    if (hasType1b) {
      recommendations.push(
        `CRITICAL: Extreme Torsional Irregularity (Type 1b) detected. If building is in SDC E or F, this structure is PROHIBITED by ASCE 7-22 Table 12.3-1. Reconfigure perimeter stiffness.`
      );
      recommendations.push(
        `3D Dynamic Response Spectrum Analysis or Time-History Analysis is MANDATORY.`
      );
    } else if (hasType1a) {
      recommendations.push(
        `Type 1a Torsional Irregularity detected. Apply torsional amplification factor Ax up to ${maxAx.toFixed(2)} to design accidental eccentricity (0.05 * B).`
      );
    } else {
      recommendations.push(
        `Building diaphragm displacements are torsionally regular (delta_max / delta_avg <= 1.20 across all levels). Ax = 1.0.`
      );
    }

    const summary = hasType1b
      ? `TYPE 1B EXTREME TORSIONAL IRREGULARITY (Governing ratio ${maxRatio.toFixed(2)} at ${governingStoryId}). Max Ax = ${maxAx.toFixed(2)}.`
      : hasType1a
      ? `TYPE 1A TORSIONAL IRREGULARITY (Governing ratio ${maxRatio.toFixed(2)} at ${governingStoryId}). Max Ax = ${maxAx.toFixed(2)}.`
      : `TORSIONALLY REGULAR (Max ratio ${maxRatio.toFixed(2)} <= 1.20). Ax = 1.0.`;

    return {
      stories: results,
      governingRatio: maxRatio,
      governingStoryId: governingStoryId || (diaphragms[0]?.storyId ?? ''),
      governingIrregularityType: governingType,
      maxAmplificationAx: maxAx,
      hasType1a,
      hasType1b,
      permittedInSDC_E_F,
      summary,
      recommendations,
    };
  }
}
