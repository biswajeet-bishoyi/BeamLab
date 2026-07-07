import { SolverEvent, SolverEventType } from '../events/SolverEvents';

export interface ISolverRuntimeMetrics {
  jobCount: number;
  successRate: number;
  failureRate: number;
  cancellationRate: number;
  avgExecutionTimeMs: number;
  avgQueueTimeMs: number;
}

export class SolverDiagnostics {
  private history: SolverEvent[] = [];
  private metrics: ISolverRuntimeMetrics = {
    jobCount: 0,
    successRate: 100,
    failureRate: 0,
    cancellationRate: 0,
    avgExecutionTimeMs: 0,
    avgQueueTimeMs: 0
  };

  public recordEvent(type: SolverEventType, payload: any) {
    const event: SolverEvent = {
      id: crypto.randomUUID(),
      type,
      timestamp: Date.now(),
      payload
    };
    this.history.push(event);

    // Naive metric updates for simulation
    if (type === SolverEventType.SolverJobSubmitted) this.metrics.jobCount++;
  }

  public getMetrics(): ISolverRuntimeMetrics {
    return { ...this.metrics };
  }

  public getHistory(): SolverEvent[] {
    return [...this.history];
  }
}
