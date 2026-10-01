/**
 * BeamLab B1.4 — Analysis Case Result Container
 */

import { ResultAnalysisCategory, Force3D, Moment3D } from './ResultTypes';
import { NodeResult } from './NodeResult';
import { MemberResult } from './MemberResult';

export interface GlobalEquilibriumCheck {
  readonly sumAppliedForces: Force3D;
  readonly sumReactions: Force3D;
  readonly sumAppliedMoments: Moment3D;
  readonly sumReactionMoments: Moment3D;
  /** Residual imbalance vector: F_applied + F_reactions (should be ~0) */
  readonly forceImbalance: Force3D;
  readonly momentImbalance: Moment3D;
  readonly isEquilibriumSatisfied: boolean;
  readonly relativeErrorPercent: number;
}

export interface AnalysisCaseResult {
  readonly caseId: string;
  readonly caseName: string;
  readonly category: ResultAnalysisCategory;
  
  /** Results mapped by target ID */
  readonly nodeResults: Map<string, NodeResult>;
  readonly memberResults: Map<string, MemberResult>;

  /** Overall structure extremes */
  readonly maxSystemDisplacement: {
    readonly nodeId: string;
    readonly magnitude: number;
  };
  readonly maxSystemMoment: {
    readonly memberId: string;
    readonly magnitude: number;
  };
  readonly maxSystemShear: {
    readonly memberId: string;
    readonly magnitude: number;
  };

  /** Global statics equilibrium check */
  readonly equilibrium?: GlobalEquilibriumCheck;
}
