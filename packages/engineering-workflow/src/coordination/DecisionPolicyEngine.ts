import { RecommendationMetadata, DecisionPolicy, DecisionResult, DecisionMatrix, DecisionMatrixRow } from '../models';

export class DecisionPolicyEngine {
  private policies: Map<string, DecisionPolicy> = new Map();

  constructor() {
    this.registerDefaultPolicies();
  }

  public registerPolicy(policy: DecisionPolicy): void {
    this.policies.set(policy.id, policy);
  }

  public evaluate(policyId: string, recommendations: RecommendationMetadata[]): DecisionResult {
    const policy = this.policies.get(policyId);
    if (!policy) throw new Error(`Decision policy ${policyId} not found`);

    return policy.evaluate(recommendations);
  }

  private registerDefaultPolicies() {
    this.registerPolicy({
      id: 'policy-safety-first',
      name: 'Safety First',
      weights: { safety: 0.5, cost: 0.1, carbon: 0.1, constructability: 0.1, confidence: 0.2 },
      evaluate: (recs) => this.standardEvaluation(recs, { safety: 0.5, cost: 0.1, carbon: 0.1, constructability: 0.1, confidence: 0.2 })
    });
    // Add other policies as needed
  }

  private standardEvaluation(recs: RecommendationMetadata[], weights: any): DecisionResult {
    const rows: DecisionMatrixRow[] = recs.map(r => {
      const safetyScore = (100 - r.engineeringRisk) * weights.safety;
      const costScore = (100 - r.costImpact) * weights.cost;
      const carbonScore = (100 - r.carbonImpact) * weights.carbon;
      const constructabilityScore = r.constructabilityImpact * weights.constructability;
      const confidenceScore = r.confidence * weights.confidence;

      return {
        recommendationId: r.id,
        scores: {
          safety: safetyScore,
          cost: costScore,
          carbon: carbonScore,
          constructability: constructabilityScore,
          confidence: confidenceScore
        },
        totalScore: safetyScore + costScore + carbonScore + constructabilityScore + confidenceScore
      };
    });

    const matrix: DecisionMatrix = { rows };
    
    // Sort by total score
    rows.sort((a, b) => b.totalScore - a.totalScore);
    
    const top = rows[0];
    
    // Dummy Consensus Logic inside Policy
    return {
      outcome: top && top.totalScore > 50 ? 'Accepted' : 'Requires Human Review',
      selectedRecommendationId: top?.recommendationId,
      matrix,
      explanation: `Evaluated based on weights: ${JSON.stringify(weights)}`
    };
  }
}
