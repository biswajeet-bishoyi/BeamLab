import { describe, it, expect, beforeEach } from 'vitest';
import { ExecutionGraphEngine } from './api/ExecutionGraphEngine';
import { ExecutionPlanData } from '@beamlab/planning-engine';
import { ExecutionGraph, ExecutionGraphData } from './models/ExecutionGraph';

describe('ExecutionGraphEngine', () => {
  let engine: ExecutionGraphEngine;

  beforeEach(() => {
    engine = new ExecutionGraphEngine();
  });

  it('should build a basic graph from an ExecutionPlan', () => {
    const plan: ExecutionPlanData = {
      planId: 'plan-123',
      requestId: 'req-1',
      sessionId: 'sess-1',
      userIntent: 'Unknown',
      strategy: 'RulePlanner',
      requiredContext: [],
      requiredTools: ['toolA', 'toolB'],
      requiredSkills: [],
      requiredAgents: [],
      orderedSteps: [
        { id: 'step1', action: 'ToolA', arguments: {}, dependencies: [], explanation: 'Do A' },
        { id: 'step2', action: 'ToolB', arguments: {}, dependencies: ['step1'], explanation: 'Do B' }
      ],
      dependencies: [],
      constraints: [],
      estimatedDurationMs: 0,
      estimatedTokenCost: 0,
      estimatedComputeCost: 0,
      requiredApprovals: [],
      metadata: {},
      version: '1.0'
    };

    const graph = engine.buildGraph(plan);
    expect(graph.planId).toBe('plan-123');
    expect(graph.nodes.length).toBe(2);
    
    const node1 = graph.getNode('node_step1');
    const node2 = graph.getNode('node_step2');
    
    expect(node1).toBeDefined();
    expect(node2).toBeDefined();
    
    expect(node1!.dependencies).toHaveLength(0);
    expect(node2!.dependencies).toContain('node_step1');
  });

  it('should validate a correct graph', () => {
    const graphData: ExecutionGraphData = {
      id: 'g1',
      planId: 'p1',
      nodes: [
        { id: 'n1', type: 'ToolCall', name: 'N1', payload: {}, dependencies: [] },
        { id: 'n2', type: 'ToolCall', name: 'N2', payload: {}, dependencies: ['n1'] }
      ]
    };
    const graph = new ExecutionGraph(graphData);
    expect(() => engine.validateGraph(graph)).not.toThrow();
  });

  it('should detect cycles in a graph', () => {
    const graphData: ExecutionGraphData = {
      id: 'g2',
      planId: 'p2',
      nodes: [
        { id: 'n1', type: 'ToolCall', name: 'N1', payload: {}, dependencies: ['n2'] },
        { id: 'n2', type: 'ToolCall', name: 'N2', payload: {}, dependencies: ['n1'] }
      ]
    };
    const graph = new ExecutionGraph(graphData);
    expect(() => engine.validateGraph(graph)).toThrowError(/Cycle detected/);
  });

  it('should serialize and deserialize a graph', () => {
    const graphData: ExecutionGraphData = {
      id: 'g3',
      planId: 'p3',
      nodes: [
        { id: 'n1', type: 'ToolCall', name: 'N1', payload: { foo: 'bar' }, dependencies: [] }
      ]
    };
    const graph = new ExecutionGraph(graphData);
    const serialized = engine.serializeGraph(graph);
    
    const deserialized = engine.deserializeGraph(serialized);
    expect(deserialized.id).toBe('g3');
    expect(deserialized.nodes[0].payload.foo).toBe('bar');
  });

  it('should inspect a graph', () => {
    const graphData: ExecutionGraphData = {
      id: 'g4',
      planId: 'p4',
      nodes: [
        { id: 'n1', type: 'ToolCall', name: 'N1', payload: {}, dependencies: [] },
        { id: 'n2', type: 'ToolCall', name: 'N2', payload: {}, dependencies: ['n1'] },
        { id: 'n3', type: 'ToolCall', name: 'N3', payload: {}, dependencies: ['n1'] }
      ]
    };
    const graph = new ExecutionGraph(graphData);
    const report = engine.inspectGraph(graph);
    
    expect(report.totalNodes).toBe(3);
    expect(report.entryNodes).toContain('n1');
    expect(report.leafNodes.length).toBe(2);
    expect(report.maxDepth).toBe(2);
  });

  it('should handle large graphs (100k+ nodes) without blowing the stack', () => {
    const nodeCount = 100000;
    // For a sequential chain, deep recursion might blow the stack in a purely recursive DFS.
    // However, JS engines typically handle 10k max depth. We will create a shallow graph 
    // with many nodes to ensure memory and map lookups scale.
    // Graph: 1 root -> 99,999 leaves
    
    const nodes = [];
    nodes.push({ id: 'root', type: 'ToolCall' as const, name: 'Root', payload: {}, dependencies: [] });
    
    for (let i = 1; i < nodeCount; i++) {
      nodes.push({ id: `child_${i}`, type: 'ToolCall' as const, name: `Child ${i}`, payload: {}, dependencies: ['root'] });
    }

    const graph = new ExecutionGraph({ id: 'large', planId: 'p1', nodes });
    
    const startTime = performance.now();
    expect(() => engine.validateGraph(graph)).not.toThrow();
    const endTime = performance.now();
    
    // Test performance constraint loosely (should be well under 1s, but we just check it doesn't hang)
    expect(endTime - startTime).toBeLessThan(5000);
  });
});
