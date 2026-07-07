import { WorkflowGraph, WorkflowNode, WorkflowEdge } from '../models';

export class WorkflowPlanner {
  public generatePlan(request: any): WorkflowGraph {
    // Generate a basic Engineering Dependency Graph
    // For a standard end-to-end workflow:
    // Analysis -> Optimization, Compliance, Report
    // But we represent this as nodes and dependencies.

    const nodes: WorkflowNode[] = [
      { id: 'start', type: 'WorkflowStart', name: 'Start' },
      { id: 'analysis', type: 'Agent', name: 'Analysis', agentId: 'agent-analysis' },
      { id: 'optimization', type: 'Agent', name: 'Optimization', agentId: 'agent-optimization' },
      { id: 'compliance', type: 'Agent', name: 'Compliance', agentId: 'agent-code-compliance' },
      { id: 'design', type: 'Agent', name: 'Design', agentId: 'agent-design' },
      { id: 'sync', type: 'Synchronization', name: 'Sync Results' },
      { id: 'decision', type: 'Decision', name: 'Final Decision' },
      { id: 'report', type: 'Agent', name: 'Report Generation', agentId: 'agent-report' },
      { id: 'end', type: 'WorkflowEnd', name: 'End' }
    ];

    const edges: WorkflowEdge[] = [
      { id: 'e1', source: 'start', target: 'analysis', type: 'Triggers' },
      { id: 'e2', source: 'analysis', target: 'optimization', type: 'Produces', dataKey: 'AnalysisResult' },
      { id: 'e3', source: 'analysis', target: 'compliance', type: 'Produces', dataKey: 'AnalysisResult' },
      { id: 'e4', source: 'analysis', target: 'design', type: 'Produces', dataKey: 'AnalysisResult' },
      { id: 'e5', source: 'optimization', target: 'sync', type: 'Produces', dataKey: 'OptimizationRecommendation' },
      { id: 'e6', source: 'compliance', target: 'sync', type: 'Produces', dataKey: 'ComplianceCheck' },
      { id: 'e7', source: 'design', target: 'sync', type: 'Produces', dataKey: 'DesignRecommendation' },
      { id: 'e8', source: 'sync', target: 'decision', type: 'Triggers' },
      { id: 'e9', source: 'decision', target: 'report', type: 'Produces', dataKey: 'FinalDecision' },
      { id: 'e10', source: 'report', target: 'end', type: 'Triggers' }
    ];

    return {
      id: `wf-plan-${Date.now()}`,
      name: request.name || 'Standard Engineering Workflow',
      nodes,
      edges
    };
  }
}
