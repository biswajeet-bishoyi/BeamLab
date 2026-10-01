import { ISolverAdapter, ISolverHealth } from '@beamlab/solver-client';
import {
  SpaceFrameSolver3D,
  type SpaceFrameModel3D,
  type SpaceFrameAnalysisResult3D,
} from '@beamworks/core-engine';

export class DirectSpaceFrame3DAdapter implements ISolverAdapter {
  public id = 'space-frame-3d-native';
  public name = 'BeamLab Native 3D Space Frame 12-DOF Solver';
  public version = '2.0.0';
  public capabilities = {
    supportedAnalysisTypes: ['linear-static-3d', 'timoshenko-bending', 'spatial-truss', 'space-frame'],
    supportedFeatures: ['12-dof-beams', 'shear-deformations', 'roll-angle', 'end-releases', 'boundary-springs', 'point-loads', 'distributed-loads'],
    maxNodes: 50000,
    maxElements: 50000,
    supportsGPU: false,
    supportsDistributed: false,
  };

  public health: ISolverHealth = {
    status: 'online',
    lastCheck: Date.now(),
    latencyMs: 1,
  };

  private activeJobs: Map<string, { model: SpaceFrameModel3D; result?: SpaceFrameAnalysisResult3D }> = new Map();

  public async initialize(): Promise<void> {
    console.log('[DirectSpaceFrame3DAdapter] Initialized native 12-DOF spatial frame solver.');
  }

  public async checkHealth(): Promise<ISolverHealth> {
    this.health.lastCheck = Date.now();
    return this.health;
  }

  public async submitJob(jobId: string, payload: { model: SpaceFrameModel3D }): Promise<void> {
    const start = performance.now();
    try {
      const result = SpaceFrameSolver3D.solve(payload.model);
      this.activeJobs.set(jobId, { model: payload.model, result });
      this.health.latencyMs = Number((performance.now() - start).toFixed(2));
    } catch (err) {
      throw new Error(`[DirectSpaceFrame3DAdapter] Solver error on job ${jobId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  public getJobResult(jobId: string): SpaceFrameAnalysisResult3D | undefined {
    return this.activeJobs.get(jobId)?.result;
  }

  public async cancelJob(jobId: string): Promise<void> {
    this.activeJobs.delete(jobId);
  }

  public async shutdown(): Promise<void> {
    this.activeJobs.clear();
  }
}
