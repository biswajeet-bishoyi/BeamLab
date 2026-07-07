import { IAgentSandbox, SandboxBudget, SandboxCapabilityModel, SandboxMetrics } from './IAgentSandbox';
import { ExecutionContext } from './ExecutionContext';

export class LocalSandboxProvider implements IAgentSandbox {
  public capabilities: SandboxCapabilityModel = {
    cancellation: true,
    timeout: true,
    metrics: true,
    telemetry: true,
    memoryIsolation: false, // Simulated
    cpuIsolation: false,    // Simulated
    securityIsolation: false,
    distributed: false,
    gpu: false,
    crashRecovery: false,
  };

  private executionId: string | null = null;
  private budget: SandboxBudget | null = null;
  private startTime: number = 0;
  private isCancelled = false;
  private cancelReason?: string;
  private metrics: SandboxMetrics = this.createEmptyMetrics();

  public prepare(executionId: string, budget: SandboxBudget): void {
    this.executionId = executionId;
    this.budget = budget;
    this.startTime = Date.now();
    this.isCancelled = false;
    this.metrics = this.createEmptyMetrics();
  }

  public async execute<TResult>(payload: (context: ExecutionContext) => Promise<TResult>): Promise<TResult> {
    if (!this.executionId || !this.budget) {
      throw new Error("Sandbox not prepared");
    }

    const context: ExecutionContext = this.buildContext();

    return new Promise<TResult>((resolve, reject) => {
      // Setup timeout
      const timer = setTimeout(() => {
        this.cancel('Execution timeout exceeded');
        reject(new Error('Sandbox Timeout'));
      }, this.budget!.executionTimeoutMs);

      // Execute payload
      payload(context)
        .then((result) => {
          clearTimeout(timer);
          if (this.isCancelled) {
            reject(new Error(`Execution cancelled: ${this.cancelReason}`));
          } else {
            this.metrics.executionDurationMs = Date.now() - this.startTime;
            this.metrics.peakMemoryMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024); // Estimated
            resolve(result);
          }
        })
        .catch((err) => {
          clearTimeout(timer);
          this.metrics.executionDurationMs = Date.now() - this.startTime;
          this.metrics.failures++;
          reject(err);
        });
    });
  }

  public cancel(reason: string): void {
    this.isCancelled = true;
    this.cancelReason = reason;
  }

  public getMetrics(): SandboxMetrics {
    return this.metrics;
  }

  private buildContext(): ExecutionContext {
    const provider = this;
    return {
      executionId: this.executionId!,
      agentId: 'unknown', // Typically injected via wrapper
      startTime: this.startTime,
      timeoutMs: this.budget!.executionTimeoutMs,
      cancellationToken: {
        get isCancelled() { return provider.isCancelled; },
        get reason() { return provider.cancelReason; }
      },
      memoryBudgetMB: this.budget!.memoryBudgetMB,
      permissions: [],
      metrics: {
        recordToolInvocation: () => this.metrics.toolInvocations++,
        recordKnowledgeQuery: () => this.metrics.knowledgeQueries++,
        recordPolicyEvaluation: () => this.metrics.policyEvaluations++,
        recordResourceRequest: () => this.metrics.resourceRequests++,
        recordWarning: () => this.metrics.warnings++,
        recordFailure: () => this.metrics.failures++,
      },
      logger: {
        info: (msg) => console.log(`[${this.executionId}] INFO: ${msg}`),
        warn: (msg) => {
          console.warn(`[${this.executionId}] WARN: ${msg}`);
          this.metrics.warnings++;
        },
        error: (msg, err) => {
          console.error(`[${this.executionId}] ERROR: ${msg}`, err);
          this.metrics.failures++;
        }
      }
    };
  }

  private createEmptyMetrics(): SandboxMetrics {
    return {
      executionDurationMs: 0,
      peakMemoryMB: 0,
      estimatedCpuUsage: 0,
      toolInvocations: 0,
      knowledgeQueries: 0,
      policyEvaluations: 0,
      resourceRequests: 0,
      warnings: 0,
      failures: 0
    };
  }
}
