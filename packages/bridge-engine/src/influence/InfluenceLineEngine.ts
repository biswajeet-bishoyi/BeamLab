/**
 * @beamlab/bridge-engine - Müller-Breslau Influence Line & Surface Engine
 * Computes exact influence lines for shear, moment, and reactions on single and continuous bridge superstructures
 */

export type BridgeActionType = 'reaction' | 'moment' | 'shear' | 'deflection';

export interface BridgeSpanGeometry {
  spanLengthsM: number[]; // Array of span lengths, e.g. [20] or [24, 30, 24]
}

export interface InfluenceOrdinate {
  xM: number;       // Unit load position along bridge (m)
  value: number;    // Influence value (m/m for shear/reaction, m for moment, m/kN for deflection)
}

export interface InfluenceLineResult {
  actionType: BridgeActionType;
  evaluationStationM: number; // Station x0 where action is evaluated
  spanIndex: number;          // Span containing x0 (0-indexed)
  ordinates: InfluenceOrdinate[];
  peakPositiveValue: number;  // Max positive influence ordinate
  peakPositiveStationM: number;
  peakNegativeValue: number;  // Max negative influence ordinate (negative number)
  peakNegativeStationM: number;
  positiveAreaM: number;      // Area under positive portion of IL (for uniform lane loads)
  negativeAreaM: number;      // Area under negative portion of IL
  netAreaM: number;
  evaluateAt: (xM: number, preferRightSideAtDiscontinuity?: boolean) => number;
  calculateVehicleResponse: (axlePositionsM: number[], axleLoadsKn: number[], targetDiscontinuityLimit?: 'positive' | 'negative') => number;
  calculateLaneResponse: (laneLoadKnPerM: number, targetEnvelope: 'max-positive' | 'max-negative' | 'total') => number;
}

export class InfluenceLineEngine {
  /**
   * Generate influence line for a simply supported single-span bridge
   */
  public static generateSimpleSpanInfluenceLine(params: {
    spanLengthM: number;
    actionType: BridgeActionType;
    evaluationStationM: number; // For moment/shear: position x0. For reaction: 0 (left support) or L (right support)
    samplesCount?: number;
  }): InfluenceLineResult {
    const L = params.spanLengthM;
    const x0 = Math.max(0, Math.min(L, params.evaluationStationM));
    const samples = params.samplesCount ?? 81;
    const dx = L / (samples - 1);

    const evaluate = (x: number, preferRightSideAtDiscontinuity: boolean = false): number => {
      if (x < 0 || x > L) return 0;

      switch (params.actionType) {
        case 'reaction': {
          // Left reaction RA (x0 = 0) or Right reaction RB (x0 = L)
          if (x0 <= L / 2) {
            return (L - x) / L; // RA: 1.0 at x=0, 0 at x=L
          } else {
            return x / L;       // RB: 0 at x=0, 1.0 at x=L
          }
        }
        case 'moment': {
          // M(x0): For load at x <= x0: x * (L - x0) / L. For x > x0: x0 * (L - x) / L
          if (x <= x0) {
            return (x * (L - x0)) / L;
          } else {
            return (x0 * (L - x)) / L;
          }
        }
        case 'shear': {
          // V(x0): For load at x < x0: -x / L. For x > x0: (L - x) / L. Jump of 1.0 at x0.
          if (Math.abs(x - x0) < 1e-6) {
            return preferRightSideAtDiscontinuity ? (L - x0) / L : -x0 / L;
          }
          if (x < x0) {
            return -x / L;
          } else {
            return (L - x) / L;
          }
        }
        case 'deflection': {
          // delta(x0) from unit load at x (reciprocal theorem delta_x0(x) = delta_x(x0))
          // For simply supported beam under unit load at x: delta(x0) = (1/6 E I L) * ...
          // Normalized relative shape:
          if (x <= x0) {
            return (x * (L - x0) * (L * L - x * x - (L - x0) * (L - x0))) / (6 * L);
          } else {
            return (x0 * (L - x) * (L * L - x0 * x0 - (L - x) * (L - x))) / (6 * L);
          }
        }
      }
    };

    const ordinates: InfluenceOrdinate[] = [];
    let posArea = 0;
    let negArea = 0;

    for (let i = 0; i < samples; i++) {
      const x = i * dx;
      const val = evaluate(x);
      ordinates.push({ xM: x, value: val });
    }

    // Exact analytical areas for simply supported single spans to avoid discretization errors across discontinuities
    if (params.actionType === 'shear') {
      posArea = 0.5 * Math.pow(L - x0, 2) / L;
      negArea = -0.5 * Math.pow(x0, 2) / L;
    } else if (params.actionType === 'moment') {
      posArea = 0.5 * x0 * (L - x0);
      negArea = 0;
    } else if (params.actionType === 'reaction') {
      posArea = L / 2;
      negArea = 0;
    }

    // Identify peak ordinates
    let peakPos = 0;
    let peakPosStation = 0;
    let peakNeg = 0;
    let peakNegStation = 0;

    for (const o of ordinates) {
      if (o.value > peakPos) {
        peakPos = o.value;
        peakPosStation = o.xM;
      }
      if (o.value < peakNeg) {
        peakNeg = o.value;
        peakNegStation = o.xM;
      }
    }

    // For shear, include both sides of discontinuity in peak evaluation
    if (params.actionType === 'shear') {
      const leftVal = -x0 / L;
      const rightVal = (L - x0) / L;
      if (rightVal > peakPos) {
        peakPos = rightVal;
        peakPosStation = x0;
      }
      if (leftVal < peakNeg) {
        peakNeg = leftVal;
        peakNegStation = x0;
      }
    }

    return {
      actionType: params.actionType,
      evaluationStationM: x0,
      spanIndex: 0,
      ordinates,
      peakPositiveValue: peakPos,
      peakPositiveStationM: peakPosStation,
      peakNegativeValue: peakNeg,
      peakNegativeStationM: peakNegStation,
      positiveAreaM: Math.max(0, posArea),
      negativeAreaM: Math.min(0, negArea),
      netAreaM: posArea + negArea,
      evaluateAt: evaluate,
      calculateVehicleResponse: (axlePositionsM: number[], axleLoadsKn: number[], targetDiscontinuityLimit?: 'positive' | 'negative'): number => {
        let sum = 0;
        const preferRight = targetDiscontinuityLimit !== 'negative';
        for (let i = 0; i < axlePositionsM.length; i++) {
          const axPos = axlePositionsM[i];
          const axLoad = axleLoadsKn[i];
          if (axPos >= 0 && axPos <= L) {
            sum += axLoad * evaluate(axPos, preferRight);
          }
        }
        return sum;
      },
      calculateLaneResponse: (laneLoadKnPerM: number, targetEnvelope: 'max-positive' | 'max-negative' | 'total'): number => {
        if (targetEnvelope === 'max-positive') return laneLoadKnPerM * Math.max(0, posArea);
        if (targetEnvelope === 'max-negative') return laneLoadKnPerM * Math.min(0, negArea);
        return laneLoadKnPerM * (posArea + negArea);
      },
    };
  }

  /**
   * Continuous 2-span symmetric bridge influence lines (Equal spans L1 = L2 = L)
   * Using exact 3-Moment formulation:
   * Redundant interior support reaction R_B(x):
   * For load in Span 1 (x <= L): R_B(x) = (x / (2 L^3)) * (5 L^2 - x^2) - ...
   * Interior support moment M_B(x) = - (P x (L^2 - x^2)) / (4 L)
   */
  public static generateContinuousTwoSpanInfluenceLine(params: {
    spanLengthM: number;        // Length of each span L
    actionType: BridgeActionType;
    evaluationStationM: number; // Station x0 in [0, 2L]
    samplesCount?: number;
  }): InfluenceLineResult {
    const L = params.spanLengthM;
    const totalL = 2 * L;
    const x0 = Math.max(0, Math.min(totalL, params.evaluationStationM));
    const samples = params.samplesCount ?? 121;
    const dx = totalL / (samples - 1);

    // Support locations: A at 0, B at L, C at 2L
    // Closed-form moment at intermediate pier B under unit load at x:
    const getPierBMoment = (x: number): number => {
      if (x <= L) {
        // Load in Span 1: M_B = - (x * (L*L - x*x)) / (4 * L * L)
        return -(x * (L * L - x * x)) / (4 * L * L);
      } else {
        // Load in Span 2: let u = 2L - x (distance from right support C)
        const u = 2 * L - x;
        return -(u * (L * L - u * u)) / (4 * L * L);
      }
    };

    // Reaction at pier B under unit load at x:
    const getReactionB = (x: number): number => {
      const Mb = getPierBMoment(x);
      if (x <= L) {
        // R_B = (x/L) - (2 * M_B / L)
        return (x / L) - (2 * Mb / L);
      } else {
        const u = 2 * L - x;
        return (u / L) - (2 * Mb / L);
      }
    };

    const evaluate = (x: number, preferRightSideAtDiscontinuity: boolean = false): number => {
      if (x < 0 || x > totalL) return 0;

      const Mb = getPierBMoment(x);

      switch (params.actionType) {
        case 'reaction': {
          if (Math.abs(x0 - L) < 1e-6) {
            return getReactionB(x);
          } else if (x0 < L / 2) {
            // Reaction R_A:
            if (x <= L) {
              return ((L - x) / L) + (Mb / L);
            } else {
              return Mb / L;
            }
          } else {
            // Reaction R_C:
            const u = 2 * L - x;
            if (x >= L) {
              return ((L - u) / L) + (Mb / L);
            } else {
              return Mb / L;
            }
          }
        }
        case 'moment': {
          // If evaluated exactly at interior pier B:
          if (Math.abs(x0 - L) < 1e-6) {
            return Mb;
          }

          // If evaluated in Span 1 (x0 < L):
          if (x0 < L) {
            // Simply supported moment M_0(x0) under load at x
            let M0 = 0;
            if (x <= L) {
              if (x <= x0) {
                M0 = (x * (L - x0)) / L;
              } else {
                M0 = (x0 * (L - x)) / L;
              }
            }
            // Superposition: M(x0) = M_0(x0) + M_B * (x0 / L)
            return M0 + Mb * (x0 / L);
          } else {
            // Evaluated in Span 2 (x0 > L):
            const x0Rel = x0 - L;
            let M0 = 0;
            if (x >= L) {
              const xRel = x - L;
              if (xRel <= x0Rel) {
                M0 = (xRel * (L - x0Rel)) / L;
              } else {
                M0 = (x0Rel * (L - xRel)) / L;
              }
            }
            return M0 + Mb * ((L - x0Rel) / L);
          }
        }
        case 'shear': {
          // V(x0) = V_0(x0) + (M_B / L)
          if (x0 < L) {
            let V0 = 0;
            if (x <= L) {
              if (Math.abs(x - x0) < 1e-6) {
                V0 = preferRightSideAtDiscontinuity ? (L - x0) / L : -x0 / L;
              } else if (x < x0) {
                V0 = -x / L;
              } else {
                V0 = (L - x) / L;
              }
            }
            return V0 + (Mb / L);
          } else {
            const x0Rel = x0 - L;
            let V0 = 0;
            if (x >= L) {
              const xRel = x - L;
              if (Math.abs(xRel - x0Rel) < 1e-6) {
                V0 = preferRightSideAtDiscontinuity ? (L - x0Rel) / L : -x0Rel / L;
              } else if (xRel < x0Rel) {
                V0 = -xRel / L;
              } else {
                V0 = (L - xRel) / L;
              }
            }
            return V0 - (Mb / L);
          }
        }
        case 'deflection': {
          return 0; // Simplified for 2-span
        }
      }
    };

    const ordinates: InfluenceOrdinate[] = [];
    let posArea = 0;
    let negArea = 0;

    for (let i = 0; i < samples; i++) {
      const x = i * dx;
      const val = evaluate(x);
      ordinates.push({ xM: x, value: val });

      if (i > 0) {
        const avgVal = (ordinates[i - 1].value + val) / 2;
        if (avgVal > 0) posArea += avgVal * dx;
        else negArea += avgVal * dx;
      }
    }

    let peakPos = 0;
    let peakPosStation = 0;
    let peakNeg = 0;
    let peakNegStation = 0;

    for (const o of ordinates) {
      if (o.value > peakPos) {
        peakPos = o.value;
        peakPosStation = o.xM;
      }
      if (o.value < peakNeg) {
        peakNeg = o.value;
        peakNegStation = o.xM;
      }
    }

    return {
      actionType: params.actionType,
      evaluationStationM: x0,
      spanIndex: x0 <= L ? 0 : 1,
      ordinates,
      peakPositiveValue: peakPos,
      peakPositiveStationM: peakPosStation,
      peakNegativeValue: peakNeg,
      peakNegativeStationM: peakNegStation,
      positiveAreaM: Math.max(0, posArea),
      negativeAreaM: Math.min(0, negArea),
      netAreaM: posArea + negArea,
      evaluateAt: evaluate,
      calculateVehicleResponse: (axlePositionsM: number[], axleLoadsKn: number[], targetDiscontinuityLimit?: 'positive' | 'negative'): number => {
        let sum = 0;
        const preferRight = targetDiscontinuityLimit !== 'negative';
        for (let i = 0; i < axlePositionsM.length; i++) {
          const axPos = axlePositionsM[i];
          const axLoad = axleLoadsKn[i];
          if (axPos >= 0 && axPos <= totalL) {
            sum += axLoad * evaluate(axPos, preferRight);
          }
        }
        return sum;
      },
      calculateLaneResponse: (laneLoadKnPerM: number, targetEnvelope: 'max-positive' | 'max-negative' | 'total'): number => {
        if (targetEnvelope === 'max-positive') return laneLoadKnPerM * Math.max(0, posArea);
        if (targetEnvelope === 'max-negative') return laneLoadKnPerM * Math.min(0, negArea);
        return laneLoadKnPerM * (posArea + negArea);
      },
    };
  }
}
