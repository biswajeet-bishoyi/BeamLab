/**
 * Cloud Solve Farm - Worker Cluster & Priority Job Dispatcher
 * @packageDocumentation
 */

import {
  WorkerNode,
  SolveJobRequest,
  SolveJobResult,
  ClusterStatusMetrics,
  ConvergenceIterationMetric,
} from '../types';

export class ClusterManager {
  private workers: Map<string, WorkerNode> = new Map();
  private jobQueue: SolveJobRequest[] = [];
  private activeJobs: Map<string, { job: SolveJobRequest; workerId: string; startTime: number }> = new Map();
  private completedJobs: SolveJobResult[] = [];
  private maxQueueCapacity: number;

  constructor(maxQueueCapacity: number = 200) {
    this.maxQueueCapacity = maxQueueCapacity;
  }

  /**
   * Register or update a worker node
   */
  public registerWorker(worker: WorkerNode): void {
    this.workers.set(worker.id, {
      ...worker,
      heartbeatTimestamp: worker.heartbeatTimestamp ?? Date.now(),
    });
  }

  /**
   * Update heartbeat timestamp for an active worker
   */
  public recordHeartbeat(workerId: string, usedMemoryMB?: number): boolean {
    const worker = this.workers.get(workerId);
    if (!worker) return false;

    worker.heartbeatTimestamp = Date.now();
    if (usedMemoryMB !== undefined) {
      worker.usedMemoryMB = usedMemoryMB;
    }
    if (worker.status === 'offline') {
      worker.status = 'idle';
    }
    return true;
  }

  /**
   * Audit worker pool and mark inactive nodes offline
   */
  public pruneStaleWorkers(timeoutMs: number = 30000): string[] {
    const now = Date.now();
    const staleIds: string[] = [];

    for (const [id, worker] of this.workers.entries()) {
      if (now - worker.heartbeatTimestamp > timeoutMs && worker.status !== 'offline') {
        worker.status = 'offline';
        staleIds.push(id);

        // If worker had an active job, re-queue it
        if (worker.activeJobId) {
          const activeEntry = this.activeJobs.get(worker.activeJobId);
          if (activeEntry) {
            this.activeJobs.delete(worker.activeJobId);
            this.jobQueue.unshift(activeEntry.job); // High priority re-insertion
          }
          worker.activeJobId = undefined;
        }
      }
    }
    return staleIds;
  }

  /**
   * Submit a solve job to the cluster
   */
  public submitJob(job: SolveJobRequest): { success: boolean; queuePosition?: number; error?: string } {
    if (this.jobQueue.length >= this.maxQueueCapacity) {
      return { success: false, error: 'Cluster job queue capacity exceeded (backpressure limit)' };
    }

    // Insert sorted by priority: interactive (0) > standard (1) > batch (2)
    const priorityWeight: Record<SolveJobRequest['priority'], number> = {
      interactive: 0,
      standard: 1,
      batch: 2,
    };

    let insertIndex = this.jobQueue.length;
    for (let i = 0; i < this.jobQueue.length; i++) {
      if (priorityWeight[job.priority] < priorityWeight[this.jobQueue[i]!.priority]) {
        insertIndex = i;
        break;
      }
    }

    this.jobQueue.splice(insertIndex, 0, job);
    return { success: true, queuePosition: insertIndex + 1 };
  }

  /**
   * Dispatch next eligible job to an available matching worker
   */
  public dispatchNextJob(): { job: SolveJobRequest; worker: WorkerNode } | null {
    if (this.jobQueue.length === 0) return null;

    // Find first idle worker that matches job requirements
    for (let qIdx = 0; qIdx < this.jobQueue.length; qIdx++) {
      const job = this.jobQueue[qIdx]!;

      for (const worker of this.workers.values()) {
        if (worker.status === 'idle') {
          // Verify capabilities
          if (job.requireGpu && !worker.gpuType) continue;
          if (!worker.supportedSolvers.includes(job.solver)) continue;

          // Match found!
          this.jobQueue.splice(qIdx, 1);
          worker.status = 'busy';
          worker.activeJobId = job.id;

          this.activeJobs.set(job.id, {
            job,
            workerId: worker.id,
            startTime: Date.now(),
          });

          return { job, worker };
        }
      }
    }

    return null;
  }

  /**
   * Execute solve job with real-time convergence residual streaming
   */
  public executeJob(
    job: SolveJobRequest,
    worker: WorkerNode,
    onIteration?: (metric: ConvergenceIterationMetric) => void
  ): SolveJobResult {
    const startTime = Date.now();
    const maxIter = job.maxIterations ?? 25;
    const targetTol = job.targetTolerance ?? 1e-6;

    let residual = 1.0;
    const history: ConvergenceIterationMetric[] = [];
    let converged = false;

    // Simulate iterative solution (e.g. Newton-Raphson or PCG)
    for (let iter = 1; iter <= maxIter; iter++) {
      // Quadratic/superlinear convergence simulation: residual decays ~ 0.35x each step
      residual = residual * (0.25 + 0.15 * Math.random());

      const metric: ConvergenceIterationMetric = {
        step: 1,
        iteration: iter,
        residualNorm: residual,
        displacementNorm: residual * 1.5,
        energyNorm: residual * residual,
        isConverged: residual <= targetTol,
        timestampMs: Date.now() - startTime,
      };

      history.push(metric);
      if (onIteration) {
        onIteration(metric);
      }

      if (metric.isConverged) {
        converged = true;
        break;
      }
    }

    const executionTimeMs = Date.now() - startTime;
    const peakMem = Math.min(
      worker.totalMemoryMB,
      worker.usedMemoryMB + Math.round((job.numDofs * 8) / (1024 * 1024) + 120)
    );

    // Release worker
    worker.status = 'idle';
    worker.activeJobId = undefined;
    this.activeJobs.delete(job.id);

    const result: SolveJobResult = {
      jobId: job.id,
      status: converged ? 'completed' : 'failed',
      workerId: worker.id,
      executionTimeMs,
      peakMemoryMB: peakMem,
      numIterations: history.length,
      converged,
      convergenceHistory: history,
      resultsPayload: {
        displacementsComputed: job.numDofs,
        reactionsComputed: Math.round(job.numDofs * 0.1),
      },
      errorMessage: converged ? undefined : 'Maximum iterations reached without meeting convergence tolerance',
    };

    this.completedJobs.push(result);
    return result;
  }

  /**
   * Aggregate real-time cluster telemetry metrics
   */
  public getMetrics(): ClusterStatusMetrics {
    let idle = 0;
    let busy = 0;

    for (const w of this.workers.values()) {
      if (w.status === 'idle') idle++;
      else if (w.status === 'busy') busy++;
    }

    const totalExecTime = this.completedJobs.reduce((acc, j) => acc + j.executionTimeMs, 0);
    const avgTime = this.completedJobs.length > 0 ? totalExecTime / this.completedJobs.length : 0;

    return {
      totalWorkers: this.workers.size,
      idleWorkers: idle,
      busyWorkers: busy,
      queueLength: this.jobQueue.length,
      averageExecutionTimeMs: avgTime,
      clusterThroughputJobsPerMin: this.completedJobs.length * 2,
    };
  }

  public getWorkers(): WorkerNode[] {
    return Array.from(this.workers.values());
  }

  public getQueue(): SolveJobRequest[] {
    return [...this.jobQueue];
  }
}
