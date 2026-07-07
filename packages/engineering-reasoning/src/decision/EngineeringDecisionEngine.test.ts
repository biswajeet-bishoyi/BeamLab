import { describe, it, expect } from 'vitest';
import { EngineeringDecisionEngine, EvaluationCriteria } from './EngineeringDecisionEngine';

describe('EngineeringDecisionEngine', () => {
  it('should evaluate candidates and determine the best trade-off', () => {
    const engine = new EngineeringDecisionEngine();
    
    const criteria: EvaluationCriteria[] = [
      { id: 'c1', name: 'Weight', weight: 0.6 },
      { id: 'c2', name: 'Cost', weight: 0.4 }
    ];

    const candidates = ['cand-A', 'cand-B'];
    
    const scoreFn = (candId: string, critId: string) => {
      if (candId === 'cand-A') return critId === 'c1' ? 90 : 50; // Total: 54 + 20 = 74
      if (candId === 'cand-B') return critId === 'c1' ? 60 : 90; // Total: 36 + 36 = 72
      return 0;
    };

    const matrix = engine.evaluate(candidates, criteria, scoreFn);
    expect(matrix.evaluations.length).toBe(2);

    const explanation = engine.decide(matrix);
    expect(explanation.recommendedCandidateId).toBe('cand-A');
    expect(explanation.keyTradeOffs.length).toBeGreaterThan(0);
    expect(explanation.keyTradeOffs[0]).toContain('Cost'); // B beat A in cost
  });
});
