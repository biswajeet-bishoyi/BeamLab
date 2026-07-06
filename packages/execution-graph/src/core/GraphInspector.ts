import { ExecutionGraph, GraphNode } from '../models/ExecutionGraph';

export interface GraphInspectionReport {
  totalNodes: number;
  entryNodes: string[];
  leafNodes: string[];
  maxDepth: number;
}

export class GraphInspector {
  public explainGraph(graph: ExecutionGraph): GraphInspectionReport {
    const nodes = graph.nodes;
    const entryNodes = nodes.filter(n => n.dependencies.length === 0).map(n => n.id);
    
    const dependencySet = new Set<string>();
    nodes.forEach(n => n.dependencies.forEach(d => dependencySet.add(d)));
    
    const leafNodes = nodes.filter(n => !dependencySet.has(n.id)).map(n => n.id);

    return {
      totalNodes: nodes.length,
      entryNodes,
      leafNodes,
      maxDepth: this.calculateMaxDepth(graph)
    };
  }

  private calculateMaxDepth(graph: ExecutionGraph): number {
    if (graph.nodes.length === 0) return 0;
    
    const depthMap = new Map<string, number>();
    
    const getDepth = (nodeId: string): number => {
      if (depthMap.has(nodeId)) {
        return depthMap.get(nodeId)!;
      }
      
      const node = graph.getNode(nodeId);
      if (!node) return 0;
      
      if (node.dependencies.length === 0) {
        depthMap.set(nodeId, 1);
        return 1;
      }
      
      const depsDepths = node.dependencies.map(d => getDepth(d));
      const maxDep = Math.max(...depsDepths);
      const depth = maxDep + 1;
      
      depthMap.set(nodeId, depth);
      return depth;
    };

    const allDepths = graph.nodes.map(n => getDepth(n.id));
    return Math.max(...allDepths);
  }
}
