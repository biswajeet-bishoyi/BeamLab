import { BaseTool, ToolContext } from '../interfaces/BaseTool';
import { registry } from '../registry/ToolRegistry';
import { validator } from '../validators/ToolValidator';
import { permissionManager } from '../permissions/PermissionManager';
import { approvalManager } from '../approval/ApprovalManager';
import { eventPublisher } from '../events/EventPublisher';
import { undoManager } from '../history/UndoManager';
import { executionLogger } from '../logging/ExecutionLogger';

export class ToolExecutor {
  public async execute<I, O>(toolId: string, input: any, context: ToolContext): Promise<O> {
    const tool = registry.get(toolId) as BaseTool<I, O> | undefined;
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`);
    }

    // Phase 1: Permissions
    permissionManager.authorize(tool, context);

    // Phase 2: Schema & Engineering Validation
    const validatedInput = await validator.validate(tool, input, context);

    // Phase 3: Approval
    await approvalManager.requestApproval(tool, validatedInput, context);

    // Phase 4: Execute & Events
    const startTime = Date.now();
    try {
      eventPublisher.emitToolLifecycle(tool, 'started', context);
      const output = await tool.execute(validatedInput, context);
      
      const durationMs = Date.now() - startTime;
      executionLogger.logExecution(tool, context, durationMs, 'success');
      eventPublisher.emitToolLifecycle(tool, 'completed', context, { output });

      // Phase 5: History (Undo)
      if (tool.history.supportsUndo && tool.createUndoAction) {
        const undoPayload = tool.createUndoAction(validatedInput, output, context);
        undoManager.push(undoPayload);
      }

      return output;
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      executionLogger.logExecution(tool, context, durationMs, 'failed', error);
      eventPublisher.emitToolLifecycle(tool, 'failed', context, { error: error.message });
      throw error;
    }
  }
}
