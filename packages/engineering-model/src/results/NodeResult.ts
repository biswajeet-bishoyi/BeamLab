/**
 * BeamLab B1.4 — Comprehensive Node Result
 */

import { NodeDisplacementResult, createNodeDisplacement } from './DisplacementResult';
import { SupportReactionResult } from './ReactionResult';

export interface NodeResult {
  readonly nodeId: string;
  readonly displacement: NodeDisplacementResult;
  readonly reaction?: SupportReactionResult;
}

export function createNodeResult(
  nodeId: string,
  displacement: NodeDisplacementResult,
  reaction?: SupportReactionResult,
): NodeResult {
  return {
    nodeId,
    displacement,
    reaction,
  };
}
