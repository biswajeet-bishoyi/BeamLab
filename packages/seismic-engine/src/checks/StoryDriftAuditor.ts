/**
 * StoryDriftAuditor.ts
 *
 * Seismic story drift verification, P-Delta stability coefficient calculation,
 * and multi-code compliance auditing (ASCE 7-22, Eurocode 8, IS 1893:2016).
 */

export type DriftStandard = 'ASCE_7_22' | 'EUROCODE_8' | 'IS_1893_2016';
export type RiskCategory = 'I' | 'II' | 'III' | 'IV';
export type StructureType =
  | 'ALL_OTHER'
  | 'MASONRY'
  | 'CANTILEVER'
  | 'BRITTLE_NONSTRUCTURAL'
  | 'DUCTILE_NONSTRUCTURAL';

export interface StoryDefinition {
  storyId: string;
  storyName: string;
  elevation_m: number;
  storyHeight_m: number;
  totalVerticalLoad_kN?: number; // P_x: Total vertical design load at and above story x
  storyShear_kN?: number; // V_x: Seismic design story shear force
}

export interface StoryDisplacement {
  storyId: string;
  elasticDisplacement_mm: number; // delta_xe: Elastic displacement at top of story
}

export interface DriftCheckConfig {
  standard: DriftStandard;
  riskCategory?: RiskCategory;
  structureType?: StructureType;
  Cd?: number; // ASCE 7 deflection amplification factor (default 5.0)
  Ie?: number; // Seismic importance factor (default 1.0)
  q?: number; // Eurocode 8 behavior factor (default 3.0)
  nu?: number; // Eurocode 8 reduction factor for damage limitation (default 0.5)
  beta?: number; // ASCE 7 ratio of shear demand to capacity (default 1.0)
  customAllowableDriftRatio?: number;
}

export interface StoryDriftResult {
  storyId: string;
  storyName: string;
  storyHeight_m: number;
  elasticDisplacement_mm: number;
  elasticDrift_mm: number;
  designDisplacement_mm: number;
  designDrift_mm: number;
  driftRatio: number; // designDrift_mm / (storyHeight_m * 1000)
  allowableDriftRatio: number;
  allowableDrift_mm: number;
  demandCapacityRatio: number;
  isCompliant: boolean;
  pDeltaCoefficient?: number; // theta
  pDeltaMaxCoefficient?: number; // theta_max
  pDeltaAmplificationFactor?: number; // 1 / (1 - theta)
  pDeltaStatus?: 'NEGLIGIBLE' | 'AMPLIFY' | 'UNSTABLE';
}

export interface StoryDriftAuditReport {
  standard: DriftStandard;
  stories: StoryDriftResult[];
  maxDriftRatio: number;
  governingStoryId: string;
  maxDemandCapacityRatio: number;
  allCompliant: boolean;
  maxPDeltaCoefficient?: number;
  pDeltaGoverningStatus?: 'NEGLIGIBLE' | 'AMPLIFY' | 'UNSTABLE';
  summary: string;
  recommendations: string[];
}

export class StoryDriftAuditor {
  /**
   * Evaluates allowable story drift ratio per standard.
   */
  public static getAllowableDriftRatio(config: DriftCheckConfig): number {
    if (config.customAllowableDriftRatio && config.customAllowableDriftRatio > 0) {
      return config.customAllowableDriftRatio;
    }

    const { standard, riskCategory = 'II', structureType = 'ALL_OTHER' } = config;

    switch (standard) {
      case 'ASCE_7_22': {
        // ASCE 7-22 Table 12.12-1: Allowable Story Drift Delta_a
        if (structureType === 'MASONRY') {
          return 0.007;
        }
        if (structureType === 'CANTILEVER') {
          return riskCategory === 'IV' ? 0.010 : riskCategory === 'III' ? 0.010 : 0.0125;
        }
        switch (riskCategory) {
          case 'IV':
            return 0.010;
          case 'III':
            return 0.015;
          case 'I':
          case 'II':
          default:
            return 0.020;
        }
      }

      case 'EUROCODE_8': {
        // EN 1998-1:2004 Section 4.4.3.2: Damage limitation requirement
        // d_r * nu <= allowable_ratio * h
        const nu = config.nu ?? 0.5;
        let baseLimit = 0.0075;
        if (structureType === 'BRITTLE_NONSTRUCTURAL') {
          baseLimit = 0.005;
        } else if (structureType === 'DUCTILE_NONSTRUCTURAL') {
          baseLimit = 0.0075;
        } else {
          baseLimit = 0.01;
        }
        return baseLimit / nu;
      }

      case 'IS_1893_2016': {
        // IS 1893 (Part 1): 2016 Cl 7.11.1
        // Story drift shall not exceed 0.004 times the story height under design lateral force
        return 0.004;
      }
    }
  }

  /**
   * Conducts a complete story drift audit across all building levels.
   */
  public static audit(
    stories: StoryDefinition[],
    displacements: StoryDisplacement[],
    config: DriftCheckConfig
  ): StoryDriftAuditReport {
    // Sort stories by elevation ascending (ground to roof)
    const sortedStories = [...stories].sort((a, b) => a.elevation_m - b.elevation_m);
    const dispMap = new Map<string, number>();
    for (const d of displacements) {
      dispMap.set(d.storyId, d.elasticDisplacement_mm);
    }

    const Cd = config.Cd ?? 5.0;
    const Ie = config.Ie ?? 1.0;
    const q = config.q ?? 3.0;
    const allowableRatio = this.getAllowableDriftRatio(config);

    const storyResults: StoryDriftResult[] = [];
    let prevElasticDisp = 0;
    let prevDesignDisp = 0;

    let maxRatio = 0;
    let maxDCR = 0;
    let governingStoryId = '';
    let maxTheta = 0;
    let worstPDelta: 'NEGLIGIBLE' | 'AMPLIFY' | 'UNSTABLE' = 'NEGLIGIBLE';

    for (let i = 0; i < sortedStories.length; i++) {
      const story = sortedStories[i];
      const elasticDisp = dispMap.get(story.storyId) ?? 0;
      const elasticDrift = Math.max(0, elasticDisp - prevElasticDisp);

      // Design displacement & drift
      let designDisp = 0;
      let designDrift = 0;

      if (config.standard === 'ASCE_7_22') {
        // delta_x = Cd * delta_xe / Ie
        designDisp = (Cd * elasticDisp) / Ie;
        designDrift = designDisp - prevDesignDisp;
      } else if (config.standard === 'EUROCODE_8') {
        // d_s = q * d_e
        designDisp = q * elasticDisp;
        designDrift = designDisp - prevDesignDisp;
      } else {
        // IS 1893:2016 checks elastic drift directly against 0.004 h
        designDisp = elasticDisp;
        designDrift = elasticDrift;
      }

      const storyHeight_mm = story.storyHeight_m * 1000;
      const driftRatio = storyHeight_mm > 0 ? designDrift / storyHeight_mm : 0;
      const allowableDrift_mm = allowableRatio * storyHeight_mm;
      const dcr = allowableRatio > 0 ? driftRatio / allowableRatio : 0;
      const isCompliant = dcr <= 1.0;

      if (driftRatio > maxRatio) {
        maxRatio = driftRatio;
        governingStoryId = story.storyId;
      }
      if (dcr > maxDCR) {
        maxDCR = dcr;
      }

      // P-Delta Stability Coefficient (ASCE 7-22 Section 12.8.7)
      let theta: number | undefined;
      let thetaMax: number | undefined;
      let pDeltaAmp: number | undefined;
      let pDeltaStatus: ('NEGLIGIBLE' | 'AMPLIFY' | 'UNSTABLE') | undefined;

      if (
        story.totalVerticalLoad_kN !== undefined &&
        story.storyShear_kN !== undefined &&
        story.storyShear_kN > 0
      ) {
        const beta = config.beta ?? 1.0;
        const Px = story.totalVerticalLoad_kN;
        const Vx = story.storyShear_kN;
        const Delta = designDrift; // mm
        const hsx = storyHeight_mm; // mm

        // theta = (Px * Delta * Ie) / (Vx * hsx * Cd)
        theta = Number(((Px * Delta * Ie) / (Vx * hsx * Cd)).toFixed(4));
        const computedThetaMax = 0.5 / (beta * Cd);
        thetaMax = Number(Math.min(0.25, computedThetaMax).toFixed(4));

        if (theta <= 0.1) {
          pDeltaStatus = 'NEGLIGIBLE';
          pDeltaAmp = 1.0;
        } else if (theta <= thetaMax) {
          pDeltaStatus = 'AMPLIFY';
          pDeltaAmp = Number((1 / (1 - theta)).toFixed(3));
          if (worstPDelta === 'NEGLIGIBLE') worstPDelta = 'AMPLIFY';
        } else {
          pDeltaStatus = 'UNSTABLE';
          pDeltaAmp = undefined;
          worstPDelta = 'UNSTABLE';
        }

        if (theta > maxTheta) maxTheta = theta;
      }

      storyResults.push({
        storyId: story.storyId,
        storyName: story.storyName,
        storyHeight_m: story.storyHeight_m,
        elasticDisplacement_mm: Number(elasticDisp.toFixed(2)),
        elasticDrift_mm: Number(elasticDrift.toFixed(2)),
        designDisplacement_mm: Number(designDisp.toFixed(2)),
        designDrift_mm: Number(designDrift.toFixed(2)),
        driftRatio: Number(driftRatio.toFixed(5)),
        allowableDriftRatio: Number(allowableRatio.toFixed(5)),
        allowableDrift_mm: Number(allowableDrift_mm.toFixed(2)),
        demandCapacityRatio: Number(dcr.toFixed(3)),
        isCompliant,
        pDeltaCoefficient: theta,
        pDeltaMaxCoefficient: thetaMax,
        pDeltaAmplificationFactor: pDeltaAmp,
        pDeltaStatus,
      });

      prevElasticDisp = elasticDisp;
      prevDesignDisp = designDisp;
    }

    const allCompliant = storyResults.every(s => s.isCompliant) && worstPDelta !== 'UNSTABLE';

    // Formulate engineering recommendations
    const recommendations: string[] = [];
    if (!allCompliant) {
      const failingStories = storyResults.filter(s => !s.isCompliant);
      recommendations.push(
        `Drift limit exceeded at ${failingStories.length} story level(s): ${failingStories.map(s => s.storyName).join(', ')}. Increase lateral stiffness via shear walls or bracing.`
      );
    }
    if (worstPDelta === 'AMPLIFY') {
      recommendations.push(
        `P-Delta coefficient theta exceeds 0.10 (max theta = ${maxTheta}). Scale lateral story forces and story drifts by the computed amplification factor.`
      );
    } else if (worstPDelta === 'UNSTABLE') {
      recommendations.push(
        `CRITICAL: P-Delta stability limit theta_max exceeded (max theta = ${maxTheta}). Structure possesses dynamic instability risk and must be redesigned.`
      );
    }
    if (allCompliant && worstPDelta === 'NEGLIGIBLE') {
      recommendations.push(
        `All story drift and P-Delta stability requirements satisfied in full compliance with ${config.standard}.`
      );
    }

    const summary = allCompliant
      ? `PASS: Maximum story drift ratio ${(maxRatio * 100).toFixed(3)}% is within allowable limit ${(allowableRatio * 100).toFixed(3)}% (Max D/C = ${maxDCR.toFixed(2)}).`
      : `FAIL: Maximum story drift ratio ${(maxRatio * 100).toFixed(3)}% exceeds allowable limit ${(allowableRatio * 100).toFixed(3)}% (Max D/C = ${maxDCR.toFixed(2)}).`;

    return {
      standard: config.standard,
      stories: storyResults,
      maxDriftRatio: Number(maxRatio.toFixed(5)),
      governingStoryId: governingStoryId || (sortedStories[0]?.storyId ?? ''),
      maxDemandCapacityRatio: Number(maxDCR.toFixed(3)),
      allCompliant,
      maxPDeltaCoefficient: maxTheta > 0 ? Number(maxTheta.toFixed(4)) : undefined,
      pDeltaGoverningStatus: maxTheta > 0 ? worstPDelta : undefined,
      summary,
      recommendations,
    };
  }
}
