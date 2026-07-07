export type JobState = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';

export interface ISolverRequest {
  id: string;
  projectId: string;
  analysisType: string;
  units: string;
  geometryReference?: string;
  materialReference?: string;
  loadReference?: string;
  boundaryConditions?: any;
  analysisParameters: Record<string, any>;
  requestedOutputs: string[];
  executionMetadata: Record<string, any>;
}

export interface ISolverResult {
  id: string;
  solverId: string;
  executionId: string;
  status: JobState;
  warnings: string[];
  errors: string[];
  metadata: Record<string, any>;
  results: any; // Placeholder for numerical results
  executionMetrics: {
    durationMs: number;
    queuedMs: number;
  };
}

export interface ISolverJob {
  id: string;
  request: ISolverRequest;
  state: JobState;
  progress: number;
  result?: ISolverResult;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface ISolverSession {
  id: string;
  solverId: string;
  status: 'active' | 'closed';
  createdAt: number;
}
