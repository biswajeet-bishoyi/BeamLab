import { DecisionResult, RecommendationMetadata } from '../models';
import { DecisionPolicyEngine } from './DecisionPolicyEngine';

export class ConsensusEngine {
  constructor(private policyEngine: DecisionPolicyEngine) {}

  public reachConsensus(policyId: string, recommendations: RecommendationMetadata[]): DecisionResult {
    // 1. Check for immediate human review triggers
    const criticalSafety = recommendations.some(r => r.severity === 'Critical');
    const lowConfidence = recommendations.some(r => r.confidence < 50);

    if (criticalSafety || lowConfidence) {
      return {
        outcome: 'Requires Human Review',
        matrix: { rows: [] },
        explanation: 'Triggered human review due to critical severity or low confidence recommendations.'
      };
    }

    // 2. Delegate to policy engine
    return this.policyEngine.evaluate(policyId, recommendations);
  }
}
