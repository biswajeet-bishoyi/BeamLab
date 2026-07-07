export interface ISolverCapabilities {
  supportedAnalysisTypes: string[];
  supportedFeatures: string[];
  maxNodes: number;
  maxElements: number;
  supportsGPU: boolean;
  supportsDistributed: boolean;
}

export interface ISolverHealth {
  status: 'online' | 'offline' | 'degraded';
  lastCheck: number;
  latencyMs: number;
  message?: string;
}

export interface ISolverMetrics {
  jobCount: number;
  successRate: number;
  avgExecutionTimeMs: number;
}

export interface ISolver {
  id: string;
  name: string;
  version: string;
  capabilities: ISolverCapabilities;
  health: ISolverHealth;
}

export interface ISolverAdapter extends ISolver {
  initialize(): Promise<void>;
  checkHealth(): Promise<ISolverHealth>;
  submitJob(jobId: string, payload: any): Promise<void>;
  cancelJob(jobId: string): Promise<void>;
  shutdown(): Promise<void>;
}
