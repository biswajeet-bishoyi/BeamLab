import { describe, it, expect } from 'vitest';
import { OptimizationPipeline } from './OptimizationPipeline';

describe('OptimizationPipeline', () => {
  it('should generate tradeoffs successfully', async () => {
    const pipeline = new OptimizationPipeline();
    const result = await pipeline.execute({}, {} as any);
    
    expect(result.status).toBe('success');
    expect(result.data.session).toBeDefined();
    expect(result.data.session.objectives.length).toBeGreaterThan(0);
    expect(result.data.session.constraints.length).toBeGreaterThan(0);
    expect(result.data.session.candidates.length).toBeGreaterThan(0);
    expect(result.data.session.tradeOffs.length).toBeGreaterThan(0);
  });
});
