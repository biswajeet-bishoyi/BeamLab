/**
 * Canonical result structures produced by the Solver Runtime and consumed by
 * Engineering Agents, Reporting, and Visualization.
 *
 * Results are read-only: they are produced by the solver and never mutated.
 */

// ─── Displacement ────────────────────────────────────────────────────────────

export interface NodeDisplacement {
  readonly nodeId: string;
  readonly dx: number;
  readonly dy: number;
  readonly dz: number;
  readonly rx: number;
  readonly ry: number;
  readonly rz: number;
}

// ─── Reaction ────────────────────────────────────────────────────────────────

export interface SupportReaction {
  readonly nodeId: string;
  readonly fx: number;
  readonly fy: number;
  readonly fz: number;
  readonly mx: number;
  readonly my: number;
  readonly mz: number;
}

// ─── Member internal forces ───────────────────────────────────────────────────

export interface MemberForceStation {
  /** Relative position along member [0, 1] */
  readonly position: number;
  readonly axial: number;
  readonly shearY: number;
  readonly shearZ: number;
  readonly torque: number;
  readonly momentY: number;
  readonly momentZ: number;
}

export interface MemberForceResult {
  readonly memberId: string;
  readonly stations: MemberForceStation[];
}

// ─── Analysis result container ────────────────────────────────────────────────

export interface AnalysisResult {
  readonly id: string;
  readonly loadCaseId: string;
  readonly timestamp: string;
  /** Solver identifier that produced this result */
  readonly solverId: string;
  readonly displacements: NodeDisplacement[];
  readonly reactions: SupportReaction[];
  readonly memberForces: MemberForceResult[];
  /** Whether the analysis converged successfully */
  readonly converged: boolean;
  /** Maximum displacement magnitude [length units] */
  readonly maxDisplacement?: number;
}
