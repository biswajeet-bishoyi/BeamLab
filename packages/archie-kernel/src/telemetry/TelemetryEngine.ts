export class TelemetryEngine {
  private metrics: any[] = [];

  logLatency(operation: string, ms: number): void {
    this.metrics.push({ type: 'latency', operation, ms, timestamp: Date.now() });
  }

  logTokenUsage(model: string, inputTokens: number, outputTokens: number): void {
    this.metrics.push({ type: 'token_usage', model, inputTokens, outputTokens, timestamp: Date.now() });
  }

  getMetrics(): any[] {
    return this.metrics;
  }

  flush(): void {
    this.metrics = [];
  }
}
