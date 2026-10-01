/**
 * BeamLab Sprint B4.5 — Parallel Solver Client & Worker Pool
 * High-level orchestration client providing async/await APIs for offloaded
 * 3D space frame, P-Delta, Tension-Only, and Pushover analyses with live progress streaming.
 */

import type {
  SpaceFrameModel3D,
  SpaceFrameAnalysisResult3D,
  PDeltaOptions,
  PDeltaAnalysisResult3D,
  TensionOnlyOptions,
  TensionOnlyResult3D,
  PushoverOptions,
  PushoverAnalysisResult3D,
} from '@beamworks/core-engine';
import type {
  ParallelSolverRequest,
  ParallelSolverProgressMessage,
  ParallelSolverResponseMessage,
} from '../workers/spaceFrameParallel.worker';

export type ProgressCallback = (progress: {
  stage: string;
  percent: number;
  details?: ParallelSolverProgressMessage['details'];
}) => void;

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  onProgress?: ProgressCallback;
}

export class ParallelSolverClient {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private requestCounter = 0;
  private isAvailable: boolean;

  constructor() {
    this.isAvailable = typeof window !== 'undefined' && typeof Worker !== 'undefined';
    if (this.isAvailable) {
      this.initWorker();
    }
  }

  private initWorker() {
    try {
      this.worker = new Worker(
        new URL('../workers/spaceFrameParallel.worker.ts', import.meta.url),
        { type: 'module' },
      );

      this.worker.onmessage = (
        e: MessageEvent<ParallelSolverProgressMessage | ParallelSolverResponseMessage>,
      ) => {
        const msg = e.data;
        const pending = this.pendingRequests.get(msg.id);
        if (!pending) return;

        if (msg.kind === 'PROGRESS') {
          if (pending.onProgress) {
            pending.onProgress({
              stage: msg.stage,
              percent: msg.progressPercent,
              details: msg.details,
            });
          }
        } else if (msg.kind === 'RESULT') {
          this.pendingRequests.delete(msg.id);
          if (msg.success) {
            pending.resolve(msg.result);
          } else {
            pending.reject(new Error(msg.error || 'Parallel solver error'));
          }
        }
      };

      this.worker.onerror = (err) => {
        for (const [id, pending] of this.pendingRequests) {
          pending.reject(err);
          this.pendingRequests.delete(id);
        }
      };
    } catch {
      this.isAvailable = false;
      this.worker = null;
    }
  }

  /**
   * Solves 12-DOF 3D Space Frame via Web Worker.
   */
  public async solveSpaceFrame(
    model: SpaceFrameModel3D,
    onProgress?: ProgressCallback,
  ): Promise<SpaceFrameAnalysisResult3D> {
    return this.dispatch<SpaceFrameAnalysisResult3D>({
      type: 'SPACE_FRAME_3D',
      model,
    }, onProgress);
  }

  /**
   * Solves Second-Order P-Delta via Web Worker.
   */
  public async solvePDelta(
    model: SpaceFrameModel3D,
    options?: PDeltaOptions,
    onProgress?: ProgressCallback,
  ): Promise<PDeltaAnalysisResult3D> {
    return this.dispatch<PDeltaAnalysisResult3D>({
      type: 'PDELTA_3D',
      model,
      pDeltaOptions: options,
    }, onProgress);
  }

  /**
   * Solves Tension-Only & Compression-Only contact frame via Web Worker.
   */
  public async solveTensionOnly(
    model: SpaceFrameModel3D,
    options?: TensionOnlyOptions,
    onProgress?: ProgressCallback,
  ): Promise<TensionOnlyResult3D> {
    return this.dispatch<TensionOnlyResult3D>({
      type: 'TENSION_ONLY_3D',
      model,
      tensionOnlyOptions: options,
    }, onProgress);
  }

  /**
   * Solves ASCE 41-17 / FEMA 356 Non-Linear Static Pushover via Web Worker.
   */
  public async solvePushover(
    model: SpaceFrameModel3D,
    options: PushoverOptions,
    onProgress?: ProgressCallback,
  ): Promise<PushoverAnalysisResult3D> {
    return this.dispatch<PushoverAnalysisResult3D>({
      type: 'PUSHOVER_3D',
      model,
      pushoverOptions: options,
    }, onProgress);
  }

  private dispatch<T>(
    payload: Omit<ParallelSolverRequest, 'id'>,
    onProgress?: ProgressCallback,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = `par_req_${++this.requestCounter}_${Date.now()}`;

      if (!this.worker) {
        // Fallback to synchronous in-thread solving if Web Worker is unavailable (e.g. Node test environment)
        import('@beamworks/core-engine')
          .then((engine) => {
            switch (payload.type) {
              case 'SPACE_FRAME_3D':
                resolve(engine.SpaceFrameSolver3D.solve(payload.model) as any);
                break;
              case 'PDELTA_3D':
                resolve(engine.PDeltaSolver3D.solve(payload.model, payload.pDeltaOptions) as any);
                break;
              case 'TENSION_ONLY_3D':
                resolve(engine.TensionOnlySolver3D.solve(payload.model, payload.tensionOnlyOptions) as any);
                break;
              case 'PUSHOVER_3D':
                resolve(engine.PushoverSolver3D.solve(payload.model, payload.pushoverOptions!) as any);
                break;
              default:
                reject(new Error(`Unknown task type: ${payload.type}`));
            }
          })
          .catch(reject);
        return;
      }

      this.pendingRequests.set(id, { resolve, reject, onProgress });
      this.worker.postMessage({
        id,
        ...payload,
      } as ParallelSolverRequest);
    });
  }

  /**
   * Terminates background worker.
   */
  public terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingRequests.clear();
  }
}

export const parallelSolver = new ParallelSolverClient();
