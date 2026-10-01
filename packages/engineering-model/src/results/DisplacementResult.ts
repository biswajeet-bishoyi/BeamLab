/**
 * BeamLab B1.4 — Displacement & Rotation Results
 */

import { Vector3D, Rotation3D } from './ResultTypes';

export interface NodeDisplacementResult {
  readonly nodeId: string;
  readonly translation: Vector3D; // meters [m]
  readonly rotation: Rotation3D;   // radians [rad]
  /** Magnitude of translational displacement: sqrt(dx^2 + dy^2 + dz^2) */
  readonly translationMagnitude: number;
  /** Magnitude of rotational displacement: sqrt(rx^2 + ry^2 + rz^2) */
  readonly rotationMagnitude: number;
}

export function createNodeDisplacement(
  nodeId: string,
  dx: number,
  dy: number,
  dz: number,
  rx: number = 0,
  ry: number = 0,
  rz: number = 0,
): NodeDisplacementResult {
  const translationMagnitude = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const rotationMagnitude = Math.sqrt(rx * rx + ry * ry + rz * rz);
  return {
    nodeId,
    translation: { x: dx, y: dy, z: dz },
    rotation: { rx, ry, rz },
    translationMagnitude,
    rotationMagnitude,
  };
}
