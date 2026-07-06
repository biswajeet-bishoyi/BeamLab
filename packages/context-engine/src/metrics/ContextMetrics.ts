import { logger } from '@beamlab/utils';

export class ContextMetrics {
  public logRebuild(projectId: string, durationMs: number, nodeCount: number) {
    logger.info({ projectId, durationMs, nodeCount }, 'Context Graph rebuilt');
  }

  public logIncrementalUpdate(projectId: string, durationMs: number) {
    logger.debug({ projectId, durationMs }, 'Context Graph updated incrementally');
  }
}

export const metrics = new ContextMetrics();
