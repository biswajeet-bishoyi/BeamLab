import { ContextGraph } from '../graph/ContextGraph';
import { contextCache } from '../cache/ContextCache';
import { contextVersioner } from '../cache/ContextVersioner';
import { optimizer } from '../optimizer/ContextOptimizer';
import { metrics } from '../metrics/ContextMetrics';

// Collectors
import { ProjectCollector } from '../collectors/ProjectCollector';
import { WorkspaceCollector } from '../collectors/WorkspaceCollector';

export class ContextEngine {
  private projectCollector = new ProjectCollector();
  private workspaceCollector = new WorkspaceCollector();

  public async getFullContext(projectId: string): Promise<string> {
    let graph = contextCache.get(projectId);
    
    if (!graph) {
      const startTime = Date.now();
      graph = new ContextGraph();
      
      // Simulate running collectors
      const pContext = await this.projectCollector.collect({ projectId });
      graph.addNode({ id: pContext.id, type: 'Project', data: pContext, children: [], parents: [] });
      
      contextCache.set(projectId, graph);
      contextVersioner.bumpVersion(projectId);
      metrics.logRebuild(projectId, Date.now() - startTime, 1);
    }
    
    return optimizer.compress(graph);
  }
}

export const contextEngine = new ContextEngine();
