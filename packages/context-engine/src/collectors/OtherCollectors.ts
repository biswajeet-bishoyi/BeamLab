import { IContextCollector } from '../interfaces/Collector';

export class SelectionCollector implements IContextCollector {
  name = 'SelectionCollector';
  async collect(params: Record<string, any>) { return { selectedIds: [] }; }
}

export class EngineeringModelCollector implements IContextCollector {
  name = 'EngineeringModelCollector';
  async collect(params: Record<string, any>) { return { frames: [], materials: [], sections: [] }; }
}

export class AnalysisCollector implements IContextCollector {
  name = 'AnalysisCollector';
  async collect(params: Record<string, any>) { return { status: 'idle', lastRun: null }; }
}

export class ResultsCollector implements IContextCollector {
  name = 'ResultsCollector';
  async collect(params: Record<string, any>) { return { displacements: [], forces: [] }; }
}

export class PermissionsCollector implements IContextCollector {
  name = 'PermissionsCollector';
  async collect(params: Record<string, any>) { return { canEdit: true, canAnalyze: true }; }
}

export class SkillsCollector implements IContextCollector {
  name = 'SkillsCollector';
  async collect(params: Record<string, any>) { return { activeSkills: ['AISC_Checker'] }; }
}

export class ConversationCollector implements IContextCollector {
  name = 'ConversationCollector';
  async collect(params: Record<string, any>) { return { history: [] }; }
}

export class RecentActionsCollector implements IContextCollector {
  name = 'RecentActionsCollector';
  async collect(params: Record<string, any>) { return { actions: [] }; }
}

export class ViewportCollector implements IContextCollector {
  name = 'ViewportCollector';
  async collect(params: Record<string, any>) { return { bounds: { x: 0, y: 0, width: 1920, height: 1080 } }; }
}
