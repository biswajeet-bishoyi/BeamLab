import { describe, it, expect } from 'vitest';
import { DecisionPolicyEngine } from './DecisionPolicyEngine';
import { RecommendationMetadata } from '../models';

describe('DecisionPolicyEngine', () => {
  it('should evaluate recommendations based on the Safety First policy', () => {
    const engine = new DecisionPolicyEngine();
    
    const recs: RecommendationMetadata[] = [
      {
        id: 'rec1',
        agentId: 'agent-optimization',
        objective: 'cost',
        confidence: 90,
        evidenceRef: [],
        engineeringRisk: 40, // Higher risk
        policyImpact: 'Low',
        costImpact: 10,
        carbonImpact: 20,
        constructabilityImpact: 80,
        severity: 'Info',
        priority: 1,
        justification: 'test',
        proposedChange: { action: 'resize', size: 'W12x26' }
      },
      {
        id: 'rec2',
        agentId: 'agent-compliance',
        objective: 'compliance',
        confidence: 95,
        evidenceRef: [],
        engineeringRisk: 10, // Lower risk (safer)
        policyImpact: 'High',
        costImpact: 50,
        carbonImpact: 30,
        constructabilityImpact: 70,
        severity: 'Info',
        priority: 1,
        justification: 'test',
        proposedChange: { action: 'resize', size: 'W14x30' }
      }
    ];
    
    const result = engine.evaluate('policy-safety-first', recs);
    
    // Safety First should favor rec2 because it has much lower engineering risk (higher safety score)
    expect(result.selectedRecommendationId).toBe('rec2');
    expect(result.outcome).toBe('Accepted');
  });
});
