import { ExecutionGraph } from '../models/ExecutionGraph';
import { DependencyResolver } from './DependencyResolver';

export class GraphValidator {
  constructor(private resolver: DependencyResolver) {}

  public validate(graph: ExecutionGraph): boolean {
    if (!graph.nodes || graph.nodes.length === 0) {
      throw new Error('Graph cannot be empty');
    }

    // Check for duplicate nodes
    const ids = new Set<string>();
    for (const node of graph.nodes) {
      if (ids.has(node.id)) {
        throw new Error(`Duplicate node ID found: ${node.id}`);
      }
      ids.add(node.id);
    }

    // DependencyResolver will check for cycles and missing nodes
    this.resolver.resolveOrder(graph);

    return true;
  }
}
