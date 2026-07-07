import { describe, it, expect } from 'vitest';
import { EngineeringNegotiationEngine } from './EngineeringNegotiationEngine';
import { EngineeringBlackboard } from '../context/EngineeringBlackboard';
import { RecommendationMetadata } from '../models';

describe('EngineeringNegotiationEngine', () => {
  it('should reach consensus if all proposed changes are identical', async () => {
    const blackboard = new EngineeringBlackboard();
    const engine = new EngineeringNegotiationEngine(blackboard);
    
    const recs: RecommendationMetadata[] = [
      {
        id: 'rec1',
        agentId: 'agent1',
        objective: 'cost',
        confidence: 90,
        evidenceRef: [],
        engineeringRisk: 10,
        policyImpact: 'Low',
        costImpact: 20,
        carbonImpact: 10,
        constructabilityImpact: 5,
        severity: 'Info',
        priority: 1,
        justification: 'test',
        proposedChange: { action: 'resize', size: 'W12x26' }
      },
      {
        id: 'rec2',
        agentId: 'agent2',
        objective: 'compliance',
        confidence: 95,
        evidenceRef: [],
        engineeringRisk: 5,
        policyImpact: 'High',
        costImpact: 25,
        carbonImpact: 15,
        constructabilityImpact: 10,
        severity: 'Info',
        priority: 1,
        justification: 'test',
        proposedChange: { action: 'resize', size: 'W12x26' }
      }
    ];
    
    const result = await engine.negotiate(['agent1', 'agent2'], recs);
    expect(result.status).toBe('Consensus');
    expect(result.rounds).toBe(0);
  });

  it('should escalate if no consensus is reached after max rounds', async () => {
    const blackboard = new EngineeringBlackboard();
    const engine = new EngineeringNegotiationEngine(blackboard);
    
    const recs: RecommendationMetadata[] = [
      {
        id: 'rec1',
        agentId: 'agent1',
        objective: 'cost',
        confidence: 90,
        evidenceRef: [],
        engineeringRisk: 10,
        policyImpact: 'Low',
        costImpact: 20,
        carbonImpact: 10,
        constructabilityImpact: 5,
        severity: 'Info',
        priority: 1,
        justification: 'test',
        proposedChange: { action: 'resize', size: 'W12x26' }
      },
      {
        id: 'rec2',
        agentId: 'agent2',
        objective: 'compliance',
        confidence: 95,
        evidenceRef: [],
        engineeringRisk: 5,
        policyImpact: 'High',
        costImpact: 25,
        carbonImpact: 15,
        constructabilityImpact: 10,
        severity: 'Info',
        priority: 1,
        justification: 'test',
        proposedChange: { action: 'resize', size: 'W14x30' } // Different size
      }
    ];
    
    const result = await engine.negotiate(['agent1', 'agent2'], recs);
    expect(result.status).toBe('Escalated');
    expect(result.rounds).toBe(3); // Default maxRounds
  });
});
