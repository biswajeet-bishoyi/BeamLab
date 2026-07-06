import { TraceContext, TracingEngine } from '../observability/TracingEngine';

export type SchedulerEventType = 
  | 'SchedulerStarted'
  | 'SchedulerStopped'
  | 'GraphQueued'
  | 'GraphStarted'
  | 'NodeReady'
  | 'NodeStarted'
  | 'NodeCompleted'
  | 'NodeFailed'
  | 'RetryScheduled'
  | 'GraphCompleted'
  | 'GraphFailed'
  | 'GraphCancelled'
  | 'ExecutionPaused'
  | 'ExecutionResumed';

export interface SchedulerEvent {
  type: SchedulerEventType;
  timestamp: string;
  trace: TraceContext;
  payload?: any;
}

export class SchedulerEventPublisher {
  private handlers: Array<(event: SchedulerEvent) => void> = [];

  constructor(private tracing: TracingEngine) {}

  public subscribe(handler: (event: SchedulerEvent) => void) {
    this.handlers.push(handler);
  }

  public publish(type: SchedulerEventType, trace: TraceContext, payload?: any) {
    const event: SchedulerEvent = {
      type,
      timestamp: new Date().toISOString(),
      trace,
      payload
    };

    // Log the event explicitly for observability
    this.tracing.log(trace, 'info', `Event published: ${type}`, payload);

    for (const handler of this.handlers) {
      try {
        handler(event);
      } catch (err) {
        // Event handlers should not crash the publisher
        console.error('Error in event handler', err);
      }
    }
  }
}
