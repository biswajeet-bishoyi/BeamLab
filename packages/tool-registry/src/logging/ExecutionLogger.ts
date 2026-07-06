import { BaseTool, ToolContext } from '../interfaces/BaseTool';
import { logger } from '@beamlab/utils';

export class ExecutionLogger {
  public logExecution(tool: BaseTool<any, any>, context: ToolContext, durationMs: number, status: 'success' | 'failed', error?: any) {
    logger.info({
      toolId: tool.metadata.id,
      userId: context.userId,
      projectId: context.projectId,
      durationMs,
      status,
      error: error?.message
    }, `Tool execution ${status}: ${tool.metadata.id}`);
  }
}

export const executionLogger = new ExecutionLogger();
