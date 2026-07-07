import { WorkspaceEventBus } from '../events/WorkspaceEventBus';

export type HealthStatus = 'healthy' | 'degraded' | 'disconnected' | 'error';

export interface HealthState {
  status: HealthStatus;
  memoryUsage: number;
  lastSyncTimestamp: number;
  connectionLatency: number;
  contextFreshness: number;
  issues: string[];
}

export class WorkspaceHealthService {
  private state: HealthState = {
    status: 'healthy',
    memoryUsage: 0,
    lastSyncTimestamp: Date.now(),
    connectionLatency: 0,
    contextFreshness: 100,
    issues: []
  };

  private eventBus: WorkspaceEventBus;
  private monitorInterval: any;

  constructor(eventBus: WorkspaceEventBus) {
    this.eventBus = eventBus;
  }

  startMonitoring() {
    this.monitorInterval = setInterval(() => {
      this.checkHealth();
    }, 5000); // Check every 5s
  }

  stopMonitoring() {
    if (this.monitorInterval) clearInterval(this.monitorInterval);
  }

  private checkHealth() {
    // Mock memory usage
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      this.state.memoryUsage = (performance as any).memory.usedJSHeapSize / 1048576; // MB
    }

    // Determine overall status based on mocked metrics
    if (this.state.memoryUsage > 500) {
      this.state.status = 'degraded';
      if (!this.state.issues.includes('High Memory Usage')) this.state.issues.push('High Memory Usage');
    } else {
      this.state.status = 'healthy';
      this.state.issues = this.state.issues.filter(i => i !== 'High Memory Usage');
    }

    // Publish health update event
    this.eventBus.emit('HealthUpdated', this.state);
  }

  getState(): HealthState {
    return { ...this.state };
  }

  reportSync() {
    this.state.lastSyncTimestamp = Date.now();
  }
}
