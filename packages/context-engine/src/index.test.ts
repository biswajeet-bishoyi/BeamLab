import { describe, it, expect, vi, beforeEach } from 'vitest';
import { contextEngine } from './index';
import { contextCache } from './cache/ContextCache';
import { contextVersioner } from './cache/ContextVersioner';
import { eventSubscriber } from './events/EventSubscriber';
import { ContextGraph } from './graph/ContextGraph';

describe('Engineering Context Engine (ECE)', () => {
  beforeEach(() => {
    contextCache.invalidate('test_proj');
  });

  it('builds full context on first request', async () => {
    const context = await contextEngine.getFullContext('test_proj');
    expect(context).toBeTypeOf('string');
    
    // Verify cache was populated
    const graph = contextCache.get('test_proj');
    expect(graph).toBeInstanceOf(ContextGraph);
    expect(contextVersioner.getVersion('test_proj')).toBe(1);
  });

  it('incrementally updates graph via event subscriber', async () => {
    // 1. Initialize context
    await contextEngine.getFullContext('test_proj');
    
    const graph = contextCache.get('test_proj');
    expect(graph?.getNode('beam_123')).toBeUndefined();

    // 2. Trigger simulated event
    await eventSubscriber.handleToolCompleted('test_proj', 'createBeam.completed', {
      output: { beamId: 'beam_123' }
    });

    // 3. Verify incremental addition
    expect(graph?.getNode('beam_123')).toBeDefined();
    expect(graph?.getNode('beam_123')?.type).toBe('Beam');
  });

  it('incrementally deletes nodes via event subscriber', async () => {
    await contextEngine.getFullContext('test_proj');
    await eventSubscriber.handleToolCompleted('test_proj', 'createBeam.completed', {
      output: { beamId: 'beam_123' }
    });
    
    const graph = contextCache.get('test_proj');
    expect(graph?.getNode('beam_123')).toBeDefined();

    // Delete it
    await eventSubscriber.handleToolCompleted('test_proj', 'deleteBeam.completed', {
      input: { beamId: 'beam_123' }
    });

    expect(graph?.getNode('beam_123')).toBeUndefined();
  });
});
