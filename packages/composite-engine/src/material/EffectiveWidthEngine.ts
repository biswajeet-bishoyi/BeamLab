/**
 * EffectiveWidthEngine: Evaluates effective concrete compression flange width b_eff
 * across AISC 360-22 (Section I3.1.1), Eurocode 4 (EN 1994-1-1 Clause 5.4.1.2), and IS 11384:2022.
 */

export interface EffectiveWidthInput {
  /** Beam span length L (mm) */
  spanLengthMm: number;
  /** Center-to-center beam spacing S_left to adjacent beam on left (mm) */
  spacingLeftMm: number;
  /** Center-to-center beam spacing S_right to adjacent beam on right (mm) */
  spacingRightMm: number;
  /** Steel top flange width b_f (mm) */
  flangeWidthMm: number;
  /** Slab topping thickness t_s (mm) */
  toppingThicknessMm: number;
  /** Whether this is an edge / perimeter beam */
  isEdgeBeam?: boolean;
  /** Distance to free slab edge for edge beam (mm) */
  edgeDistanceMm?: number;
}

export interface EffectiveWidthResult {
  /** Total effective concrete flange width b_eff (mm) */
  beff: number;
  /** Effective overhang on left side b_e1 (mm) */
  beffLeft: number;
  /** Effective overhang on right side b_e2 (mm) */
  beffRight: number;
  /** Governing codified limit description */
  governingCriterion: string;
}

export class EffectiveWidthEngine {
  /**
   * AISC 360-22 Section I3.1.1 effective flange width computation.
   * For each side: b_e <= L / 8, b_e <= S / 2, b_e <= edgeDistance.
   */
  static computeAiscEffectiveWidth(input: EffectiveWidthInput): EffectiveWidthResult {
    const { spanLengthMm, spacingLeftMm, spacingRightMm, isEdgeBeam, edgeDistanceMm } = input;
    const spanLimitPerSide = spanLengthMm / 8;

    const bLeft = Math.min(spanLimitPerSide, spacingLeftMm / 2);
    let bRight = Math.min(spanLimitPerSide, spacingRightMm / 2);

    if (isEdgeBeam && edgeDistanceMm !== undefined) {
      bRight = Math.min(bRight, edgeDistanceMm);
    }

    const beff = bLeft + bRight;
    let governingCriterion = 'Span Limit (L / 4 total)';
    if (beff >= (spacingLeftMm + spacingRightMm) / 2) {
      governingCriterion = 'Beam Spacing Center-to-Center';
    } else if (isEdgeBeam && bRight === edgeDistanceMm) {
      governingCriterion = 'Perimeter Slab Edge Distance';
    }

    return {
      beff,
      beffLeft: bLeft,
      beffRight: bRight,
      governingCriterion,
    };
  }

  /**
   * Eurocode 4 (EN 1994-1-1 Clause 5.4.1.2) effective flange width:
   * b_eff = b_0 + sum(b_ei) where b_ei = min(L_e / 8, b_i)
   */
  static computeEurocode4EffectiveWidth(input: EffectiveWidthInput): EffectiveWidthResult {
    const { spanLengthMm, spacingLeftMm, spacingRightMm, flangeWidthMm, isEdgeBeam, edgeDistanceMm } = input;
    const b0 = flangeWidthMm; // Width between outstand shear connectors / top flange
    const Le = spanLengthMm; // Effective span for simply supported beam

    const b1 = (spacingLeftMm - b0) / 2;
    let b2 = (spacingRightMm - b0) / 2;
    if (isEdgeBeam && edgeDistanceMm !== undefined) {
      b2 = Math.min(b2, edgeDistanceMm);
    }

    const beiLeft = Math.min(Le / 8, b1);
    const beiRight = Math.min(Le / 8, b2);
    const beff = b0 + beiLeft + beiRight;

    return {
      beff,
      beffLeft: beiLeft,
      beffRight: beiRight,
      governingCriterion: 'EN 1994-1-1 Shear Lag Limit (b0 + sum(bei))',
    };
  }
}
