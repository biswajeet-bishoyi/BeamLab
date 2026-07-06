import { IContextCollector } from '../interfaces/Collector';
import { ProjectContext } from '../interfaces/ContextTypes';

export class ProjectCollector implements IContextCollector<ProjectContext> {
  name = 'ProjectCollector';
  
  async collect(params: Record<string, any>): Promise<ProjectContext> {
    // Scaffold: Fetch from DB using params.projectId
    return {
      id: params.projectId || 'proj_mock',
      name: 'Mock Project',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
}
