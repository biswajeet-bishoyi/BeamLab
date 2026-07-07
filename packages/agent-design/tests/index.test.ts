import { describe, it, expect } from 'vitest';
import { DesignAgent } from '../src/agent/DesignAgent';
import { DesignPipeline } from '../src/pipeline/DesignPipeline';

describe('DesignAgent', () => {
  it('should be instantiable and initialize', async () => {
    const agent = new DesignAgent();
    expect(agent.manifest.id).toBe('agent-structural-design');
    
    // Test initialization without real context
    await agent.initialize({} as any);
  });
});

describe('DesignPipeline', () => {
  it('should execute design pipeline successfully', async () => {
    const pipeline = new DesignPipeline();
    const result = await pipeline.execute({ request: 'Test design' }, {} as any);
    
    expect(result.status).toBe('success');
    expect(result.data.narrative).toBeDefined();
    expect(result.data.recommendations).toBeDefined();
    expect(result.data.executionResult.alternatives.length).toBeGreaterThan(0);
  });
});
