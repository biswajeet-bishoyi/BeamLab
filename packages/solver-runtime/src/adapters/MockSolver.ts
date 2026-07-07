import { ISolverAdapter, ISolverHealth } from '@beamlab/solver-client';

export class MockSolver implements ISolverAdapter {
  public id = 'mock-solver-01';
  public name = 'BeamLab Mock Solver (SIF)';
  public version = '1.0.0';
  public capabilities = {
    supportedAnalysisTypes: ['linear-static', 'modal', 'buckling'],
    supportedFeatures: ['basic-materials', 'point-loads'],
    maxNodes: 10000,
    maxElements: 10000,
    supportsGPU: false,
    supportsDistributed: false
  };
  
  public health: ISolverHealth = {
    status: 'online',
    lastCheck: Date.now(),
    latencyMs: 15
  };

  private activeJobs: Set<string> = new Set();

  public async initialize(): Promise<void> {
    console.log('[MockSolver] Initialized');
  }

  public async checkHealth(): Promise<ISolverHealth> {
    this.health.lastCheck = Date.now();
    return this.health;
  }

  public async submitJob(jobId: string, payload: any): Promise<void> {
    this.activeJobs.add(jobId);
    console.log(`[MockSolver] Starting job ${jobId}`);
    
    return new Promise((resolve, reject) => {
      // Simulate analysis duration
      setTimeout(() => {
        if (this.activeJobs.has(jobId)) {
          this.activeJobs.delete(jobId);
          console.log(`[MockSolver] Completed job ${jobId}`);
          resolve();
        } else {
          // Job was cancelled
          reject(new Error('Job cancelled'));
        }
      }, 1500);
    });
  }

  public async cancelJob(jobId: string): Promise<void> {
    if (this.activeJobs.has(jobId)) {
      this.activeJobs.delete(jobId);
      console.log(`[MockSolver] Cancelled job ${jobId}`);
    }
  }

  public async shutdown(): Promise<void> {
    this.activeJobs.clear();
    console.log('[MockSolver] Shut down');
  }
}
