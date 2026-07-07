import { ISolverJob, ISolverRequest, ISolverResult } from '@beamlab/solver-client';
import { SolverAdapterRegistry } from '../registry/SolverAdapterRegistry';

export class SolverJobManager {
  private jobs: Map<string, ISolverJob> = new Map();

  constructor(private adapterRegistry: SolverAdapterRegistry) {}

  public async submitJob(request: ISolverRequest): Promise<ISolverJob> {
    const jobId = request.id || crypto.randomUUID();
    const job: ISolverJob = {
      id: jobId,
      request,
      state: 'queued',
      progress: 0,
      createdAt: Date.now()
    };
    
    this.jobs.set(jobId, job);
    
    // In a real implementation, this would push to a queue mechanism.
    // For now, we simulate execution immediately.
    this.executeJob(jobId).catch(err => console.error(err));

    return job;
  }

  public getJob(jobId: string): ISolverJob | undefined {
    return this.jobs.get(jobId);
  }

  public async cancelJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    if (job.state === 'running' || job.state === 'queued') {
      const adapter = this.adapterRegistry.getAdapter(job.request.analysisParameters?.solverId || 'mock-solver-01');
      if (adapter) {
        await adapter.cancelJob(jobId);
      }
      job.state = 'cancelled';
      job.completedAt = Date.now();
      this.jobs.set(jobId, job);
    }
  }

  private async executeJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.state = 'running';
    job.startedAt = Date.now();
    this.jobs.set(jobId, job);

    try {
      // Typically, the Planner defines the solver to use. We simulate it here.
      const solverId = job.request.analysisParameters?.solverId || 'mock-solver-01';
      const adapter = this.adapterRegistry.getAdapter(solverId);
      
      if (!adapter) throw new Error(`Solver ${solverId} not found or inactive`);

      await adapter.submitJob(jobId, job.request);
      
      // In a real scenario, adapter.submitJob might resolve when finished or we wait for events.
      // Mocking successful completion.
      
      job.state = 'completed';
      job.completedAt = Date.now();
      job.progress = 100;
      job.result = {
        id: `res-${jobId}`,
        solverId: solverId,
        executionId: jobId,
        status: 'completed',
        warnings: [],
        errors: [],
        metadata: {},
        results: { simulatedResult: true },
        executionMetrics: {
          durationMs: job.completedAt - job.startedAt!,
          queuedMs: job.startedAt! - job.createdAt
        }
      };

    } catch (err: any) {
      job.state = 'failed';
      job.completedAt = Date.now();
      job.result = {
        id: `res-${jobId}`,
        solverId: 'unknown',
        executionId: jobId,
        status: 'failed',
        warnings: [],
        errors: [err.message],
        metadata: {},
        results: null,
        executionMetrics: {
          durationMs: job.completedAt - job.startedAt!,
          queuedMs: job.startedAt! - job.createdAt
        }
      };
    }
    this.jobs.set(jobId, job);
  }
}
