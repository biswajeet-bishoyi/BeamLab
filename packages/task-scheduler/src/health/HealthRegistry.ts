export type HealthStatus = 'Healthy' | 'Degraded' | 'Unhealthy' | 'Starting' | 'Stopping';

export interface DiagnosticsReport {
  status: HealthStatus;
  runtimeStatus: string;
  dependencyStatus: Record<string, HealthStatus>;
  configurationSummary: Record<string, any>;
  recentErrors: string[];
}

export class HealthRegistry {
  private status: HealthStatus = 'Starting';
  private recentErrors: string[] = [];
  private maxErrorsToKeep = 10;
  private dependencyStatus: Record<string, HealthStatus> = {};

  public setStatus(status: HealthStatus) {
    this.status = status;
  }

  public getStatus(): HealthStatus {
    return this.status;
  }

  public reportError(error: Error) {
    this.recentErrors.unshift(error.message);
    if (this.recentErrors.length > this.maxErrorsToKeep) {
      this.recentErrors.pop();
    }
    this.status = 'Degraded';
  }

  public updateDependency(name: string, status: HealthStatus) {
    this.dependencyStatus[name] = status;
  }

  public getDiagnostics(): DiagnosticsReport {
    return {
      status: this.status,
      runtimeStatus: this.status === 'Starting' ? 'Initializing' : 'Running',
      dependencyStatus: { ...this.dependencyStatus },
      configurationSummary: {
        maxErrorsTracked: this.maxErrorsToKeep
      },
      recentErrors: [...this.recentErrors]
    };
  }
}
