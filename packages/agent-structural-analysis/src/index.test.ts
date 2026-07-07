import { describe, it, expect } from 'vitest';
import { StructuralAnalysisAgent } from './agent/StructuralAnalysisAgent';
import { ExecutionContext } from '@beamlab/agent-framework';

describe('StructuralAnalysisAgent', () => {
  it('should be instantiable and initialize', async () => {
    const agent = new StructuralAnalysisAgent();
    expect(agent).toBeDefined();
    
    // Test that manifest is loaded
    expect(agent.manifest.id).toBe('structural-analysis');
    
    // Test initialization
    const mockContext: ExecutionContext = {
      executionId: 'test-exec-1',
      sessionData: {}
    } as any; // Using "any" for testing purposes

    await agent.initialize(mockContext);
    
    // At this point we expect the pipeline to be ready (no errors thrown)
  });
});
