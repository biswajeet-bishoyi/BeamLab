export interface SolverRequest {
  strategyId: string;
  modelPayload: any;
  parameters: Record<string, any>;
}

export interface SolverResponse {
  success: boolean;
  results?: any;
  errors?: string[];
  warnings?: string[];
  executionTimeMs: number;
}

export interface SolverCapabilities {
  supportedStrategies: string[];
  maxNodes: number;
  maxElements: number;
}

export interface SolverHealth {
  status: 'online' | 'offline' | 'degraded';
  lastCheck: number;
  latencyMs: number;
}
