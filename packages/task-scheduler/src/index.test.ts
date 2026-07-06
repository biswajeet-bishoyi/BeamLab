import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SchedulerRuntime } from './core/SchedulerRuntime';
import { ExecutionGraph, ExecutionGraphData } from '@beamlab/execution-graph';

describe('SchedulerRuntime', () => {
  let runtime: SchedulerRuntime;

  beforeEach(() => {
    runtime = new SchedulerRuntime();
  });

  it('should initialize and register health', async () => {
    expect(runtime.health.getStatus()).toBe('Starting');
    await runtime.start();
    expect(runtime.health.getStatus()).toBe('Healthy');
    await runtime.stop();
    expect(runtime.health.getStatus()).toBe('Degraded');
  });

  it('should reject malformed graphs', () => {
    // Cast intentionally invalid graph
    const invalidGraph = {} as ExecutionGraph;
    const result = runtime.enqueueGraph(invalidGraph, 'req-1');
    expect(result).toBe(false);
    expect(runtime.health.getStatus()).toBe('Degraded');
  });

  it('should enqueue valid graphs within 5ms insertion budget', () => {
    const data: ExecutionGraphData = {
      id: 'graph-1',
      planId: 'plan-1',
      nodes: [
        { id: 'node-1', type: 'ToolCall', name: 'N1', payload: {}, dependencies: [] }
      ]
    };
    const graph = new ExecutionGraph(data);
    
    const t0 = performance.now();
    const result = runtime.enqueueGraph(graph, 'req-2');
    const t1 = performance.now();
    
    expect(result).toBe(true);
    expect(t1 - t0).toBeLessThanOrEqual(5); // 5ms budget
  });

  it('should process graph execution and publish events', async () => {
    const publishSpy = vi.spyOn(runtime.events, 'publish');
    
    const data: ExecutionGraphData = {
      id: 'graph-2',
      planId: 'plan-2',
      nodes: [
        { id: 'node-2', type: 'ToolCall', name: 'N2', payload: {}, dependencies: [] }
      ]
    };
    const graph = new ExecutionGraph(data);
    
    await runtime.start();
    runtime.enqueueGraph(graph, 'req-3');
    
    // Give event loop a moment to pick up the queue
    await new Promise(resolve => setTimeout(resolve, 50));
    
    expect(publishSpy).toHaveBeenCalledWith('GraphQueued', expect.anything(), expect.anything());
    expect(publishSpy).toHaveBeenCalledWith('GraphStarted', expect.anything(), expect.anything());
    expect(publishSpy).toHaveBeenCalledWith('NodeStarted', expect.anything());
    expect(publishSpy).toHaveBeenCalledWith('GraphCompleted', expect.anything());
    
    await runtime.stop();
  });
});
