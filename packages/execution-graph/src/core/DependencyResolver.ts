import { ExecutionGraph, GraphNode } from '../models/ExecutionGraph';

export class DependencyResolver {
  public resolveOrder(graph: ExecutionGraph): GraphNode[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const order: GraphNode[] = [];

    // Map for O(1) lookups
    const nodesMap = new Map<string, GraphNode>();
    for (const node of graph.nodes) {
      nodesMap.set(node.id, node);
    }

    const dfs = (nodeId: string) => {
      if (recursionStack.has(nodeId)) {
        throw new Error(`Cycle detected involving node: ${nodeId}`);
      }
      if (visited.has(nodeId)) {
        return;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const node = nodesMap.get(nodeId);
      if (!node) {
        throw new Error(`Missing dependency node in graph: ${nodeId}`);
      }

      for (const depId of node.dependencies) {
        dfs(depId);
      }

      recursionStack.delete(nodeId);
      order.push(node); // Post-order push (dependencies added first)
    };

    for (const node of graph.nodes) {
      if (!visited.has(node.id)) {
        dfs(node.id);
      }
    }

    return order;
  }
}
