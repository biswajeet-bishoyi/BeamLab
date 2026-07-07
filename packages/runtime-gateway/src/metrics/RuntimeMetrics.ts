import { logger } from '@beamlab/utils';

export class RuntimeMetrics {
  public logPipelinePhase(traceId: string, phase: string, durationMs: number, metadata?: any) {
    logger.debug({ traceId, phase, durationMs, ...metadata }, `Pipeline phase completed: ${phase}`);
  }

  public logToolExecution(traceId: string, toolId: string, durationMs: number, status: 'success' | 'failed') {
    logger.info({ traceId, toolId, durationMs, status }, `Tool executed via ARG: ${toolId}`);
  }

  public logError(traceId: string, phase: string, error: Error) {
    logger.error({ traceId, phase, error: error.message, stack: error.stack }, `Pipeline error in phase: ${phase}`);
  }
}

export const metrics = new RuntimeMetrics();
