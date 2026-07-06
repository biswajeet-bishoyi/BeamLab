import { ExecutionPlanData, PlanStep } from '@beamlab/planning-engine';
import { ExecutionGraph, ExecutionGraphData, GraphNodeData } from '../models/ExecutionGraph';

export class GraphBuilder {
  public build(plan: ExecutionPlanData): ExecutionGraph {
    const nodes: GraphNodeData[] = [];
    let prevNodeId: string | null = null;

    for (let i = 0; i < plan.orderedSteps.length; i++) {
      const step = plan.orderedSteps[i];
      const nodeId = `node_${step.id}`;
      
      const node: GraphNodeData = {
        id: nodeId,
        type: 'ToolCall', // Initially treating all as ToolCall for simple seq
        name: step.action,
        payload: {
          toolId: step.action,
          parameters: step.arguments,
          description: step.explanation
        },
        dependencies: prevNodeId ? [prevNodeId] : []
      };

      nodes.push(node);
      prevNodeId = nodeId;
    }

    const graphData: ExecutionGraphData = {
      id: `graph_${plan.planId}`,
      planId: plan.planId,
      nodes
    };

    return new ExecutionGraph(graphData);
  }
}
