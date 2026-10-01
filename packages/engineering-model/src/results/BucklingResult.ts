/**
 * BeamLab B1.4 — Buckling Analysis Results
 */

import { Vector3D } from './ResultTypes';

export interface BucklingModeShapeNode {
  readonly nodeId: string;
  readonly eigenvector: Vector3D;
}

export interface BucklingMode {
  readonly modeNumber: number;
  /** Critical buckling load multiplier (eigenvalue lambda) */
  readonly loadFactor: number;
  readonly modeShape: BucklingModeShapeNode[];
}

export interface BucklingResult {
  readonly analysisCaseId: string;
  readonly modes: BucklingMode[];
  /** Lowest positive eigenvalue */
  readonly criticalLoadFactor: number;
  readonly governingMode: number;
}
