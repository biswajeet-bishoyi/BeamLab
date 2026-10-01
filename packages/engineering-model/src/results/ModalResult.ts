/**
 * BeamLab B1.4 — Modal Analysis Results
 */

import { Vector3D } from './ResultTypes';

export interface ModeShapeNode {
  readonly nodeId: string;
  readonly eigenvector: Vector3D;
  readonly rotationEigenvector?: Vector3D;
}

export interface ModalMode {
  readonly modeNumber: number;
  readonly frequencyHz: number; // Cycles per second [Hz]
  readonly frequencyRadPerSec: number; // Angular frequency [rad/s]
  readonly periodSec: number; // Natural period [s]
  readonly modalMassKg: number; // Generalized mass [kg]
  readonly participationFactorX: number;
  readonly participationFactorY: number;
  readonly participationFactorZ: number;
  readonly cumulativeMassRatioX: number; // [0.0, 1.0]
  readonly cumulativeMassRatioY: number;
  readonly cumulativeMassRatioZ: number;
  readonly modeShape: ModeShapeNode[];
}

export interface ModalResult {
  readonly analysisCaseId: string;
  readonly totalMassKg: number;
  readonly modes: ModalMode[];
  readonly governingMode: number;
  readonly fundamentalPeriodSec: number;
}
