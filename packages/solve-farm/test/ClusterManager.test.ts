import { describe, it, expect } from 'vitest';
import { ClusterManager } from '../src/orchestration/ClusterManager';
import { WorkerNode, SolveJobRequest } from '../src/types';

describe('ClusterManager', () => {
  it('registers workers and updates heartbeats', () => {
    const cluster = new ClusterManager();

    const worker1: WorkerNode = {
      id: 'worker-us-east-1',
      hostname: 'node-compute-01.beamlab.internal',
      region: 'us-east',
      status: 'idle',
      cpuCores: 64,
      totalMemoryMB: 262144, // 256 GB
      usedMemoryMB: 12000,
      supportedSolvers: ['direct-sparse', 'pcg-iterative', 'newton-raphson-nonlinear'],
      heartbeatTimestamp: Date.now(),
    };

    cluster.registerWorker(worker1);
    expect(cluster.getWorkers()).toHaveLength(1);
    expect(cluster.getMetrics().totalWorkers).toBe(1);
    expect(cluster.getMetrics().idleWorkers).toBe(1);

    // Heartbeat update
    const updated = cluster.recordHeartbeat('worker-us-east-1', 14000);
    expect(updated).toBe(true);
  });

  it('prunes stale workers exceeding heartbeat timeout', () => {
    const cluster = new ClusterManager();

    const staleWorker: WorkerNode = {
      id: 'worker-stale',
      hostname: 'node-stale.beamlab.internal',
      region: 'eu-west',
      status: 'idle',
      cpuCores: 32,
      totalMemoryMB: 65536,
      usedMemoryMB: 4000,
      supportedSolvers: ['direct-sparse'],
      heartbeatTimestamp: Date.now() - 60000, // 60s ago
    };

    cluster.registerWorker(staleWorker);
    const pruned = cluster.pruneStaleWorkers(30000);

    expect(pruned).toContain('worker-stale');
    const worker = cluster.getWorkers().find((w) => w.id === 'worker-stale');
    expect(worker?.status).toBe('offline');
  });

  it('maintains priority queue order: interactive > standard > batch', () => {
    const cluster = new ClusterManager();

    const batchJob: SolveJobRequest = {
      id: 'job-batch',
      name: 'Monte Carlo Sensitivity',
      solver: 'direct-sparse',
      priority: 'batch',
      numDofs: 50000,
      numElements: 12000,
      modelPayload: {},
    };

    const standardJob: SolveJobRequest = {
      id: 'job-std',
      name: 'Design Spectrum Check',
      solver: 'direct-sparse',
      priority: 'standard',
      numDofs: 20000,
      numElements: 5000,
      modelPayload: {},
    };

    const interactiveJob: SolveJobRequest = {
      id: 'job-interactive',
      name: 'Viewport Interactive Preview',
      solver: 'direct-sparse',
      priority: 'interactive',
      numDofs: 1500,
      numElements: 400,
      modelPayload: {},
    };

    cluster.submitJob(batchJob);
    cluster.submitJob(standardJob);
    cluster.submitJob(interactiveJob);

    const queue = cluster.getQueue();
    expect(queue[0]?.id).toBe('job-interactive');
    expect(queue[1]?.id).toBe('job-std');
    expect(queue[2]?.id).toBe('job-batch');
  });

  it('dispatches and executes solve job with iteration residual telemetry', () => {
    const cluster = new ClusterManager();

    const worker: WorkerNode = {
      id: 'node-gpu-01',
      hostname: 'gpu-node.internal',
      region: 'us-west',
      status: 'idle',
      cpuCores: 128,
      gpuType: 'NVIDIA H100 80GB',
      totalMemoryMB: 524288,
      usedMemoryMB: 32000,
      supportedSolvers: ['direct-sparse', 'newton-raphson-nonlinear'],
      heartbeatTimestamp: Date.now(),
    };
    cluster.registerWorker(worker);

    const job: SolveJobRequest = {
      id: 'job-nonlinear-plate',
      name: 'MITC4 Shell Pushdown',
      solver: 'newton-raphson-nonlinear',
      priority: 'interactive',
      numDofs: 120000,
      numElements: 25000,
      modelPayload: {},
      requireGpu: true,
      targetTolerance: 1e-4,
    };
    cluster.submitJob(job);

    const dispatch = cluster.dispatchNextJob();
    expect(dispatch).not.toBeNull();
    expect(dispatch?.job.id).toBe('job-nonlinear-plate');
    expect(dispatch?.worker.id).toBe('node-gpu-01');

    const streamedIterations: number[] = [];
    const result = cluster.executeJob(dispatch!.job, dispatch!.worker, (metric) => {
      streamedIterations.push(metric.iteration);
    });

    expect(result.status).toBe('completed');
    expect(result.converged).toBe(true);
    expect(result.numIterations).toBeGreaterThan(0);
    expect(streamedIterations.length).toBe(result.numIterations);
    expect(dispatch!.worker.status).toBe('idle');
  });

  it('enforces backpressure queue limits', () => {
    const cluster = new ClusterManager(2); // limit 2

    const job = (id: string): SolveJobRequest => ({
      id,
      name: id,
      solver: 'direct-sparse',
      priority: 'standard',
      numDofs: 100,
      numElements: 10,
      modelPayload: {},
    });

    expect(cluster.submitJob(job('j1')).success).toBe(true);
    expect(cluster.submitJob(job('j2')).success).toBe(true);

    const overflow = cluster.submitJob(job('j3'));
    expect(overflow.success).toBe(false);
    expect(overflow.error).toMatch(/backpressure/);
  });
});
