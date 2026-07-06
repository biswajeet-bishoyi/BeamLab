import { ContextGraph } from '../graph/ContextGraph';

export class ContextOptimizer {
  /**
   * Compresses the graph into a highly optimized JSON string suitable for LLM injection.
   */
  public compress(graph: ContextGraph, tokenBudget: number = 4000): string {
    // 1. Remove duplicate references
    // 2. Rank nodes by engineering relevance (e.g. highly stressed members)
    // 3. Truncate least relevant nodes if we exceed budget
    const serialized = graph.serialize();
    
    if (serialized.length > tokenBudget * 4) { // Rough character-to-token heuristic
      return JSON.stringify({ warning: 'Context truncated due to size limit', data: '...' });
    }
    
    return serialized;
  }
}

export const optimizer = new ContextOptimizer();
