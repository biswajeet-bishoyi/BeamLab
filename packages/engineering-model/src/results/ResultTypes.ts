/**
 * BeamLab B1.4 — Canonical Result Types & Lifecycle States
 *
 * Core enumerations, discriminated unions, and shared interfaces
 * for all analysis results and their operational lifecycles.
 */

// ─── Result Lifecycle States ─────────────────────────────────────────────────

export type ResultState =
  | 'Pending'       // Queued or created but calculation not yet initiated
  | 'Running'       // Currently solving in solver runtime
  | 'Completed'     // Successfully converged and stored
  | 'Failed'        // Solver error, singularity, or divergence
  | 'Cancelled'     // Terminated by user or timeout
  | 'Superseded'    // Replaced by a newer analysis run
  | 'Invalidated';  // Model, loads, or boundary conditions changed since solution

// ─── Result Category / Analysis Category ─────────────────────────────────────

export type ResultAnalysisCategory =
  | 'LinearStatic'
  | 'NonlinearStatic'
  | 'Modal'
  | 'Buckling'
  | 'ResponseSpectrum'
  | 'TimeHistory'
  | 'MovingLoad'
  | 'ConstructionStage'
  | 'Envelope';

// ─── Extreme Value Direction ──────────────────────────────────────────────────

export type ExtremeType = 'Maximum' | 'Minimum' | 'AbsoluteMaximum';

// ─── Convergence Metrics ──────────────────────────────────────────────────────

export interface ConvergenceMetrics {
  readonly converged: boolean;
  readonly iterations: number;
  readonly toleranceAchieved?: number;
  readonly targetTolerance?: number;
  readonly residualNorm?: number;
  readonly terminationReason?: string;
  readonly executionTimeMs: number;
}

// ─── 3D Vector & Tensor Primitives for Results ────────────────────────────────

export interface Vector3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface Rotation3D {
  readonly rx: number; // radians
  readonly ry: number; // radians
  readonly rz: number; // radians
}

export interface Force3D {
  readonly fx: number; // Newtons [N]
  readonly fy: number; // Newtons [N]
  readonly fz: number; // Newtons [N]
}

export interface Moment3D {
  readonly mx: number; // Newton-meters [N·m]
  readonly my: number; // Newton-meters [N·m]
  readonly mz: number; // Newton-meters [N·m]
}
