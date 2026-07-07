import { AnalysisEvent, AnalysisEventType } from '../events/AnalysisEvents';

export class ExecutionRecorder {
  private history: AnalysisEvent[] = [];

  public record(type: AnalysisEventType, payload: any, correlationId?: string) {
    const event: AnalysisEvent = {
      id: crypto.randomUUID(),
      type,
      timestamp: Date.now(),
      payload,
      correlationId
    };
    this.history.push(event);
    
    // Simulate telemetry hooks
    // console.log(`[ExecutionRecorder] Recorded ${type}`);
  }

  public getHistory(): AnalysisEvent[] {
    return [...this.history];
  }

  public clear() {
    this.history = [];
  }
}
