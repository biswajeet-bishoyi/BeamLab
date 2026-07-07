import { OptimizationRecommendation, OptimizationSession } from '../models';

export interface IOptimizationRecommendationEngine {
  generate(session: OptimizationSession, reasoning: any): OptimizationRecommendation[];
}

export class OptimizationRecommendationEngine implements IOptimizationRecommendationEngine {
  public generate(session: OptimizationSession, reasoning: any): OptimizationRecommendation[] {
    if (!session.tradeOffs.length) return [];
    
    // In a real engine, extract the best candidate from TradeOff models.
    const bestTradeOff = session.tradeOffs[0];
    const candidateId = bestTradeOff.candidates[0]; // Simplification

    const recommendation: OptimizationRecommendation = {
      id: `rec-${Date.now()}`,
      candidateId,
      action: 'Adopt alternative',
      reasoning: bestTradeOff.explanation
    };

    return [recommendation];
  }
}
