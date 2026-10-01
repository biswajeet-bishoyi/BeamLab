/**
 * BeamLab Sprint B4.5 — Multi-Threaded Parallel Solver Worker
 * Offloads heavy 3D Space Frame, P-Delta, Tension-Only, and Pushover non-linear
 * structural computations from the main UI thread to maintain 60 FPS responsiveness.
 */

import {
  SpaceFrameSolver3D,
  PDeltaSolver3D,
  TensionOnlySolver3D,
  PushoverSolver3D,
  type SpaceFrameModel3D,
  type SpaceFrameAnalysisResult3D,
  type PDeltaOptions,
  type PDeltaAnalysisResult3D,
  type TensionOnlyOptions,
  type TensionOnlyResult3D,
  type PushoverOptions,
  type PushoverAnalysisResult3D,
} from '@beamworks/core-engine';

export type ParallelSolverTaskType =
  | 'SPACE_FRAME_3D'
  | 'PDELTA_3D'
  | 'TENSION_ONLY_3D'
  | 'PUSHOVER_3D';

export interface ParallelSolverRequest {
  id: string;
  type: ParallelSolverTaskType;
  model: SpaceFrameModel3D;
  pDeltaOptions?: PDeltaOptions;
  tensionOnlyOptions?: TensionOnlyOptions;
  pushoverOptions?: PushoverOptions;
}

export interface ParallelSolverProgressMessage {
  id: string;
  kind: 'PROGRESS';
  stage: string;
  progressPercent: number; // 0 to 100
  details?: {
    iteration?: number;
    step?: number;
    baseShear?: number;
    displacement?: number;
    residualNorm?: number;
  };
}

export interface ParallelSolverResponseMessage {
  id: string;
  kind: 'RESULT';
  type: ParallelSolverTaskType;
  success: boolean;
  result?:
    | SpaceFrameAnalysisResult3D
    | PDeltaAnalysisResult3D
    | TensionOnlyResult3D
    | PushoverAnalysisResult3D;
  error?: string;
  solveTimeMs: number;
}

self.onmessage = (e: MessageEvent<ParallelSolverRequest>) => {
  const req = e.data;
  const start = performance.now();

  try {
    switch (req.type) {
      case 'SPACE_FRAME_3D': {
        postProgress(req.id, 'Assembling 12-DOF space frame stiffness...', 20);
        const result = SpaceFrameSolver3D.solve(req.model);
        postProgress(req.id, 'Recovering member forces and equilibrium...', 90);
        const solveTimeMs = performance.now() - start;

        self.postMessage({
          id: req.id,
          kind: 'RESULT',
          type: req.type,
          success: true,
          result,
          solveTimeMs,
        } as ParallelSolverResponseMessage);
        break;
      }

      case 'PDELTA_3D': {
        postProgress(req.id, 'Initiating Newton-Raphson P-Delta equilibrium iterations...', 15);
        const result = PDeltaSolver3D.solve(req.model, req.pDeltaOptions);
        postProgress(req.id, 'Evaluating AISC 360 DAM stability coefficients...', 95);
        const solveTimeMs = performance.now() - start;

        self.postMessage({
          id: req.id,
          kind: 'RESULT',
          type: req.type,
          success: true,
          result,
          solveTimeMs,
        } as ParallelSolverResponseMessage);
        break;
      }

      case 'TENSION_ONLY_3D': {
        postProgress(req.id, 'Evaluating state-switching for slender tension-only bracing...', 15);
        const result = TensionOnlySolver3D.solve(req.model, req.tensionOnlyOptions);
        postProgress(req.id, 'Verifying kinematic contact equilibrium...', 95);
        const solveTimeMs = performance.now() - start;

        self.postMessage({
          id: req.id,
          kind: 'RESULT',
          type: req.type,
          success: true,
          result,
          solveTimeMs,
        } as ParallelSolverResponseMessage);
        break;
      }

      case 'PUSHOVER_3D': {
        if (!req.pushoverOptions) {
          throw new Error('Pushover analysis requires pushoverOptions.');
        }

        postProgress(req.id, 'Initializing FEMA 356 plastic hinge backbones...', 10);
        const result = PushoverSolver3D.solve(req.model, req.pushoverOptions);
        postProgress(req.id, 'Bilinearizing ASCE 41-17 capacity curve & ductility...', 95);
        const solveTimeMs = performance.now() - start;

        self.postMessage({
          id: req.id,
          kind: 'RESULT',
          type: req.type,
          success: true,
          result,
          solveTimeMs,
        } as ParallelSolverResponseMessage);
        break;
      }

      default:
        throw new Error(`Unknown parallel solver task type: ${(req as any).type}`);
    }
  } catch (err: any) {
    const solveTimeMs = performance.now() - start;
    self.postMessage({
      id: req.id,
      kind: 'RESULT',
      type: req.type,
      success: false,
      error: err?.message || 'An unknown error occurred during parallel solving.',
      solveTimeMs,
    } as ParallelSolverResponseMessage);
  }
};

function postProgress(
  id: string,
  stage: string,
  progressPercent: number,
  details?: ParallelSolverProgressMessage['details'],
) {
  self.postMessage({
    id,
    kind: 'PROGRESS',
    stage,
    progressPercent,
    details,
  } as ParallelSolverProgressMessage);
}
