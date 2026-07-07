import { OptimizationCandidate, TradeOffModel } from '../models';
import { EngineeringDecisionEngine, EvaluationCriteria } from '@beamlab/engineering-reasoning';

export interface ITradeOffAnalyzer {
  analyze(candidates: OptimizationCandidate[]): TradeOffModel[];
}

export class TradeOffAnalyzer implements ITradeOffAnalyzer {
  private decisionEngine = new EngineeringDecisionEngine();

  public analyze(candidates: OptimizationCandidate[]): TradeOffModel[] {
    const evaluatedCandidates = candidates.filter(c => c.status === 'evaluated');
    if (evaluatedCandidates.length === 0) return [];

    const criteria: EvaluationCriteria[] = [
      { id: 'weight', name: 'Weight Reduction', weight: 0.5 },
      { id: 'cost', name: 'Material Cost', weight: 0.3 },
      { id: 'constructability', name: 'Constructability', weight: 0.2 }
    ];

    // Mock score function
    const scoreFn = (candidateId: string, criteriaId: string) => {
      // In real implementation, extract these from candidate metrics
      return Math.random() * 100;
    };

    const matrix = this.decisionEngine.evaluate(
      evaluatedCandidates.map(c => c.id), 
      criteria, 
      scoreFn
    );
    
    const explanation = this.decisionEngine.decide(matrix);

    const model: TradeOffModel = {
      id: `tradeoff-${Date.now()}`,
      candidates: evaluatedCandidates.map(c => c.id),
      metrics: { matrix },
      explanation: explanation.rationale + ' ' + explanation.keyTradeOffs.join(' ')
    };

    return [model];
  }
}
