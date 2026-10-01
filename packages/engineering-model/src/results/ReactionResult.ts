/**
 * BeamLab B1.4 — Support Reaction Results
 */

import { Force3D, Moment3D } from './ResultTypes';

export interface SupportReactionResult {
  readonly nodeId: string;
  readonly supportId?: string;
  readonly force: Force3D;   // Newtons [N]
  readonly moment: Moment3D; // Newton-meters [N·m]
  /** Magnitude of resultant reaction force */
  readonly forceMagnitude: number;
  /** Magnitude of resultant reaction moment */
  readonly momentMagnitude: number;
}

export function createSupportReaction(
  nodeId: string,
  fx: number,
  fy: number,
  fz: number,
  mx: number = 0,
  my: number = 0,
  mz: number = 0,
  supportId?: string,
): SupportReactionResult {
  const forceMagnitude = Math.sqrt(fx * fx + fy * fy + fz * fz);
  const momentMagnitude = Math.sqrt(mx * mx + my * my + mz * mz);
  return {
    nodeId,
    supportId,
    force: { fx, fy, fz },
    moment: { mx, my, mz },
    forceMagnitude,
    momentMagnitude,
  };
}
