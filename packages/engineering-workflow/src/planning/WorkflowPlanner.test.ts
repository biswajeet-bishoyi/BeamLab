import { describe, it, expect } from 'vitest';
import { WorkflowPlanner } from './WorkflowPlanner';

describe('WorkflowPlanner', () => {
  it('should generate a valid Engineering Dependency Graph', () => {
    const planner = new WorkflowPlanner();
    const request = { name: 'Test Workflow' };
    
    const graph = planner.generatePlan(request);
    
    expect(graph.name).toBe('Test Workflow');
    expect(graph.nodes.length).toBeGreaterThan(0);
    expect(graph.edges.length).toBeGreaterThan(0);
    
    const startNode = graph.nodes.find(n => n.type === 'WorkflowStart');
    expect(startNode).toBeDefined();
    
    const endNode = graph.nodes.find(n => n.type === 'WorkflowEnd');
    expect(endNode).toBeDefined();
    
    // Check specific nodes
    const analysisNode = graph.nodes.find(n => n.id === 'analysis');
    expect(analysisNode?.type).toBe('Agent');
  });
});
