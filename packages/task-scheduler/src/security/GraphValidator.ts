import { ExecutionGraph } from '@beamlab/execution-graph';

export class GraphSecurityValidator {
  
  public validateForExecution(graph: ExecutionGraph): boolean {
    if (!graph || typeof graph !== 'object') {
      throw new Error('Graph rejection: Invalid graph object');
    }

    if (!graph.id || !graph.planId) {
      throw new Error('Graph rejection: Missing identifier mappings');
    }

    if (!graph.nodes || !Array.isArray(graph.nodes)) {
      throw new Error('Graph rejection: Malformed node list');
    }

    if (graph.nodes.length === 0) {
      // Empty graph is valid but practically a no-op
      return true;
    }

    // Guard against queue poisoning / enormous payloads designed to OOM
    if (graph.nodes.length > 500000) {
      throw new Error('Graph rejection: Exceeds absolute safety threshold (500k nodes)');
    }

    // Verify dependency integrity
    const nodeIds = new Set(graph.nodes.map(n => n.id));
    for (const node of graph.nodes) {
      for (const dep of node.dependencies) {
        if (!nodeIds.has(dep)) {
          throw new Error(`Graph rejection: Orphaned dependency reference ${dep} by node ${node.id}`);
        }
      }
    }

    return true;
  }
}
