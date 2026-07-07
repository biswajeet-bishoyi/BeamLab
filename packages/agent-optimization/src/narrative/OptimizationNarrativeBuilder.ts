import { OptimizationRecommendation, OptimizationSession } from '../models';

export interface IOptimizationNarrativeBuilder {
  build(session: OptimizationSession, recommendations: OptimizationRecommendation[]): any;
}

export class OptimizationNarrativeBuilder implements IOptimizationNarrativeBuilder {
  public build(session: OptimizationSession, recommendations: OptimizationRecommendation[]): any {
    return {
      title: 'Optimization Analysis Narrative',
      summary: `Evaluated ${session.candidates.length} candidates against ${session.objectives.length} objectives.`,
      recommendation: recommendations.length > 0 ? recommendations[0].reasoning : 'No improvements found.'
    };
  }
}
