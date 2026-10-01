/**
 * High-Performance Cloud Solve Farm - Types & Interfaces
 * @packageDocumentation
 */

export type SolverAlgorithm =
  | 'direct-sparse'
  | 'pcg-iterative'
  | 'newton-raphson-nonlinear'
  | 'eigen-lanczos-modal'
  | 'explicit-dynamics-central-diff'
  | 'schur-complement-feti';

export type WorkerStatus = 'idle' | 'busy' | 'draining' | 'offline';

export interface WorkerNode {
  id: string;
  hostname: string;
  region: string;
  status: WorkerStatus;
  cpuCores: number;
  gpuType?: string;
  totalMemoryMB: number;
  usedMemoryMB: number;
  supportedSolvers: SolverAlgorithm[];
  activeJobId?: string;
  heartbeatTimestamp: number;
}

export type JobPriority = 'interactive' | 'standard' | 'batch';
export type JobStatus = 'queued' | 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface SolveJobRequest {
  id: string;
  name: string;
  solver: SolverAlgorithm;
  priority: JobPriority;
  numDofs: number;
  numElements: number;
  modelPayload: Record<string, unknown>;
  targetTolerance?: number; // e.g. 1e-6
  maxIterations?: number;
  requireGpu?: boolean;
}

export interface ConvergenceIterationMetric {
  step: number;
  iteration: number;
  residualNorm: number;
  displacementNorm: number;
  energyNorm: number;
  isConverged: boolean;
  timestampMs: number;
}

export interface SolveJobResult {
  jobId: string;
  status: JobStatus;
  workerId: string;
  executionTimeMs: number;
  peakMemoryMB: number;
  numIterations: number;
  converged: boolean;
  convergenceHistory: ConvergenceIterationMetric[];
  resultsPayload?: Record<string, unknown>;
  errorMessage?: string;
}

export interface ClusterStatusMetrics {
  totalWorkers: number;
  idleWorkers: number;
  busyWorkers: number;
  queueLength: number;
  averageExecutionTimeMs: number;
  clusterThroughputJobsPerMin: number;
}

export interface SubdomainChunk {
  subdomainId: number;
  interiorDofs: number[];
  boundaryInterfaceDofs: number[];
  stiffnessMatrix: number[][]; // condensed or sparse representation
  loadVector: number[];
}
