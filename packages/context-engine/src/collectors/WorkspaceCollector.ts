import { IContextCollector } from '../interfaces/Collector';
import { WorkspaceContext } from '../interfaces/ContextTypes';

export class WorkspaceCollector implements IContextCollector<WorkspaceContext> {
  name = 'WorkspaceCollector';
  
  async collect(params: Record<string, any>): Promise<WorkspaceContext> {
    return {
      activeTab: 'engineering',
      zoomLevel: 1.0,
      gridEnabled: true
    };
  }
}
