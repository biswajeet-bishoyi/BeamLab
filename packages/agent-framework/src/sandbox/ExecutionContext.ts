export interface ExecutionContext {
  executionId: string;
  agentId: string;
  startTime: number;
  timeoutMs: number;
  
  // Abstraction for cancellation, to be checked during execution
  cancellationToken: {
    isCancelled: boolean;
    reason?: string;
  };
  
  memoryBudgetMB: number;
  permissions: string[];
  
  // Exposes metrics for the agent to increment (e.g. tracking tool calls)
  metrics: {
    recordToolInvocation(toolId: string): void;
    recordKnowledgeQuery(queryId: string): void;
    recordPolicyEvaluation(policyId: string): void;
    recordResourceRequest(resourceId: string): void;
    recordWarning(message: string): void;
    recordFailure(error: Error): void;
  };
  
  logger: {
    info(msg: string): void;
    warn(msg: string): void;
    error(msg: string, err?: any): void;
  };
}
