export * from './interfaces/BaseTool';
export * from './registry/ToolRegistry';
export * from './executor/ToolExecutor';
export * from './validators/ToolValidator';
export * from './permissions/PermissionManager';
export * from './approval/ApprovalManager';
export * from './events/EventPublisher';
export * from './history/UndoManager';
export * from './logging/ExecutionLogger';

import { registry } from './registry/ToolRegistry';
import { createBeamTool, deleteBeamTool, moveBeamTool } from './tools/BeamTools';
import { addSupportTool, removeSupportTool } from './tools/SupportTools';
import { applyPointLoadTool, applyDistributedLoadTool } from './tools/LoadTools';
import { runAnalysisTool } from './tools/AnalysisTools';
import { saveProjectTool, exportProjectTool } from './tools/ProjectTools';

// Register core tools
registry.register(createBeamTool);
registry.register(deleteBeamTool);
registry.register(moveBeamTool);
registry.register(addSupportTool);
registry.register(removeSupportTool);
registry.register(applyPointLoadTool);
registry.register(applyDistributedLoadTool);
registry.register(runAnalysisTool);
registry.register(saveProjectTool);
registry.register(exportProjectTool);

export { registry };
