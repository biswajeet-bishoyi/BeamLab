import { BaseTool, ToolContext } from '../interfaces/BaseTool';
import { logger } from '@beamlab/utils';

export class EventPublisher {
  public publish(event: string, payload: any): void {
    // In a real implementation, this would connect to Kafka, Redis Pub/Sub, or an EventBridge.
    logger.info({ event, payload }, `Event Published: ${event}`);
  }

  public emitToolLifecycle(tool: BaseTool<any, any>, status: 'started' | 'completed' | 'failed', context: ToolContext, payload?: any): void {
    const eventName = `${tool.metadata.id}.${status}`;
    this.publish(eventName, {
      toolId: tool.metadata.id,
      userId: context.userId,
      projectId: context.projectId,
      timestamp: new Date().toISOString(),
      payload
    });
  }
}

export const eventPublisher = new EventPublisher();
