export interface SchedulerMetrics {
  queueLength: number;
  queueWaitTimeAvgMs: number;
  schedulerLatencyAvgMs: number;
  graphBuildTimeAvgMs: number;
  graphExecutionTimeAvgMs: number;
  nodeExecutionTimeAvgMs: number;
  retryCount: number;
  failureCount: number;
  cancellationCount: number;
  throughput: number;
  memoryUsageMb: number;
  cpuUsagePercent: number;
  activeExecutions: number;
}

export class MetricsCollector {
  private metrics: SchedulerMetrics = {
    queueLength: 0,
    queueWaitTimeAvgMs: 0,
    schedulerLatencyAvgMs: 0,
    graphBuildTimeAvgMs: 0,
    graphExecutionTimeAvgMs: 0,
    nodeExecutionTimeAvgMs: 0,
    retryCount: 0,
    failureCount: 0,
    cancellationCount: 0,
    throughput: 0,
    memoryUsageMb: 0,
    cpuUsagePercent: 0,
    activeExecutions: 0
  };

  public recordQueueLength(length: number) {
    this.metrics.queueLength = length;
  }

  public recordWaitTime(ms: number) {
    this.updateAverage('queueWaitTimeAvgMs', ms);
  }

  public recordLatency(ms: number) {
    this.updateAverage('schedulerLatencyAvgMs', ms);
  }

  public recordExecution(status: 'success' | 'failure' | 'cancelled') {
    this.metrics.throughput++;
    if (status === 'failure') this.metrics.failureCount++;
    if (status === 'cancelled') this.metrics.cancellationCount++;
  }

  public setActiveExecutions(count: number) {
    this.metrics.activeExecutions = count;
  }

  public getSnapshot(): SchedulerMetrics {
    // Collect real-time system metrics
    const memory = process.memoryUsage();
    this.metrics.memoryUsageMb = Math.round(memory.heapUsed / 1024 / 1024);
    
    return { ...this.metrics };
  }

  private updateAverage(key: keyof SchedulerMetrics, newValue: number) {
    const current = this.metrics[key];
    // Simple moving average approximation for now
    this.metrics[key] = current === 0 ? newValue : (current * 0.9) + (newValue * 0.1);
  }
}
