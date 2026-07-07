export interface AgentHealthStatus {
  agentId: string;
  isRegistered: boolean;
  isInitialized: boolean;
  executionCount: number;
  failureCount: number;
  failureRate: number; // 0.0 to 1.0
  averageDurationMs: number;
  totalQueueTimeMs: number;
  averageQueueTimeMs: number;
  averageMemoryUsageMB: number;
  errorFrequencyLastHour: number;
  healthScore: number; // 0 to 100
}

/**
 * Tracks and computes the health of agents based on execution metrics.
 */
export class AgentHealthMonitor {
  private healthData = new Map<string, AgentHealthStatus>();

  public registerAgent(agentId: string) {
    if (!this.healthData.has(agentId)) {
      this.healthData.set(agentId, {
        agentId,
        isRegistered: true,
        isInitialized: true,
        executionCount: 0,
        failureCount: 0,
        failureRate: 0,
        averageDurationMs: 0,
        totalQueueTimeMs: 0,
        averageQueueTimeMs: 0,
        averageMemoryUsageMB: 0,
        errorFrequencyLastHour: 0,
        healthScore: 100
      });
    }
  }

  public recordExecution(agentId: string, durationMs: number, memoryMB: number, success: boolean) {
    const data = this.healthData.get(agentId);
    if (!data) return;

    data.executionCount++;
    if (!success) {
      data.failureCount++;
      data.errorFrequencyLastHour++;
    }

    data.failureRate = data.failureCount / data.executionCount;

    // Moving average approximation for duration and memory
    data.averageDurationMs = data.averageDurationMs === 0 
      ? durationMs 
      : (data.averageDurationMs * 0.9) + (durationMs * 0.1);
      
    data.averageMemoryUsageMB = data.averageMemoryUsageMB === 0 
      ? memoryMB 
      : (data.averageMemoryUsageMB * 0.9) + (memoryMB * 0.1);

    this.recalculateHealthScore(agentId);
  }

  private recalculateHealthScore(agentId: string) {
    const data = this.healthData.get(agentId);
    if (!data) return;

    let score = 100;
    
    // Penalize for high failure rate (e.g. > 10% is bad)
    if (data.failureRate > 0) {
      score -= (data.failureRate * 100); 
    }
    
    // Penalize for extreme memory usage or timeouts (omitted for brevity)
    data.healthScore = Math.max(0, Math.round(score));
  }

  public getHealth(agentId: string): AgentHealthStatus | undefined {
    return this.healthData.get(agentId);
  }

  public getAllHealth(): AgentHealthStatus[] {
    return Array.from(this.healthData.values());
  }
}
