import { ContextGraph } from '../graph/ContextGraph';

export class ContextCache {
  private cache = new Map<string, ContextGraph>();

  public get(projectId: string): ContextGraph | undefined {
    return this.cache.get(projectId);
  }

  public set(projectId: string, graph: ContextGraph): void {
    this.cache.set(projectId, graph);
  }

  public invalidate(projectId: string): void {
    this.cache.delete(projectId);
  }
}

export const contextCache = new ContextCache();
