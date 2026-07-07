export interface SandboxCapabilityModel {
  cancellation: boolean;
  timeout: boolean;
  metrics: boolean;
  telemetry: boolean;
  memoryIsolation: boolean;
  cpuIsolation: boolean;
  securityIsolation: boolean;
  distributed: boolean;
  gpu: boolean;
  crashRecovery: boolean;
}

export interface SandboxBudget {
  executionTimeoutMs: number;
  memoryBudgetMB: number;
  cpuBudgetPercentage: number;
  networkAccess: boolean;
  filesystemAccess: boolean;
  toolAccess: string[];
}

export interface SandboxMetrics {
  executionDurationMs: number;
  peakMemoryMB: number;
  estimatedCpuUsage: number;
  toolInvocations: number;
  knowledgeQueries: number;
  policyEvaluations: number;
  resourceRequests: number;
  warnings: number;
  failures: number;
}

export interface IAgentSandbox {
  capabilities: SandboxCapabilityModel;
  
  /** Initialize the sandbox context */
  prepare(executionId: string, budget: SandboxBudget): void;
  
  /** Execute an agent payload within the sandbox */
  execute<TResult>(payload: () => Promise<TResult>): Promise<TResult>;
  
  /** Terminate execution */
  cancel(reason: string): void;
  
  /** Retrieve execution metrics */
  getMetrics(): SandboxMetrics;
}
