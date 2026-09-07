import { VectorClock } from './VectorClock';

export type DeltaOperationType = 'entity_added' | 'entity_updated' | 'entity_removed' | 'batch';

export interface BaseDeltaOperation {
  opId: string;
  peerId: string;
  physicalTimestamp: number;
  logicalClock: number;
  vectorClock: Record<string, number>;
  causalDependencies?: string[];
  description?: string;
}

export interface EntityAddedOp extends BaseDeltaOperation {
  type: 'entity_added';
  entityType: string;
  entityId: string;
  payload: Record<string, any>;
}

export interface EntityUpdatedOp extends BaseDeltaOperation {
  type: 'entity_updated';
  entityType: string;
  entityId: string;
  patch: Record<string, any>;
  previousProperties?: Record<string, any>;
}

export interface EntityRemovedOp extends BaseDeltaOperation {
  type: 'entity_removed';
  entityType: string;
  entityId: string;
  previousPayload?: Record<string, any>;
}

export interface BatchDeltaOp extends BaseDeltaOperation {
  type: 'batch';
  operations: AtomicDeltaOperation[];
}

export type AtomicDeltaOperation = EntityAddedOp | EntityUpdatedOp | EntityRemovedOp;
export type ModelDeltaOperation = AtomicDeltaOperation | BatchDeltaOp;

/**
 * Generate a unique operation ID.
 */
export function generateOpId(peerId: string, counter: number): string {
  return `${peerId}_op_${counter}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Creates an EntityAdded delta operation.
 */
export function createEntityAddedOp(
  peerId: string,
  logicalClock: number,
  vectorClock: VectorClock,
  entityType: string,
  entityId: string,
  payload: Record<string, any>,
  description?: string
): EntityAddedOp {
  return {
    opId: generateOpId(peerId, logicalClock),
    peerId,
    physicalTimestamp: Date.now(),
    logicalClock,
    vectorClock: vectorClock.toJSON(),
    type: 'entity_added',
    entityType,
    entityId,
    payload: JSON.parse(JSON.stringify(payload)),
    description: description ?? `Added ${entityType} ${entityId}`,
  };
}

/**
 * Creates an EntityUpdated delta operation.
 */
export function createEntityUpdatedOp(
  peerId: string,
  logicalClock: number,
  vectorClock: VectorClock,
  entityType: string,
  entityId: string,
  patch: Record<string, any>,
  previousProperties?: Record<string, any>,
  description?: string
): EntityUpdatedOp {
  return {
    opId: generateOpId(peerId, logicalClock),
    peerId,
    physicalTimestamp: Date.now(),
    logicalClock,
    vectorClock: vectorClock.toJSON(),
    type: 'entity_updated',
    entityType,
    entityId,
    patch: JSON.parse(JSON.stringify(patch)),
    previousProperties: previousProperties ? JSON.parse(JSON.stringify(previousProperties)) : undefined,
    description: description ?? `Updated ${entityType} ${entityId}`,
  };
}

/**
 * Creates an EntityRemoved delta operation.
 */
export function createEntityRemovedOp(
  peerId: string,
  logicalClock: number,
  vectorClock: VectorClock,
  entityType: string,
  entityId: string,
  previousPayload?: Record<string, any>,
  description?: string
): EntityRemovedOp {
  return {
    opId: generateOpId(peerId, logicalClock),
    peerId,
    physicalTimestamp: Date.now(),
    logicalClock,
    vectorClock: vectorClock.toJSON(),
    type: 'entity_removed',
    entityType,
    entityId,
    previousPayload: previousPayload ? JSON.parse(JSON.stringify(previousPayload)) : undefined,
    description: description ?? `Removed ${entityType} ${entityId}`,
  };
}

/**
 * Computes the inverse operation for an atomic delta operation to power undo/redo.
 */
export function invertAtomicOperation(
  op: AtomicDeltaOperation,
  currentPeerId: string,
  newClock: number,
  newVectorClock: VectorClock
): AtomicDeltaOperation | null {
  if (op.type === 'entity_added') {
    return createEntityRemovedOp(
      currentPeerId,
      newClock,
      newVectorClock,
      op.entityType,
      op.entityId,
      op.payload,
      `Undo: Removed ${op.entityType} ${op.entityId}`
    );
  }

  if (op.type === 'entity_removed') {
    if (!op.previousPayload) return null;
    return createEntityAddedOp(
      currentPeerId,
      newClock,
      newVectorClock,
      op.entityType,
      op.entityId,
      op.previousPayload,
      `Undo: Restored ${op.entityType} ${op.entityId}`
    );
  }

  if (op.type === 'entity_updated') {
    if (!op.previousProperties) return null;
    return createEntityUpdatedOp(
      currentPeerId,
      newClock,
      newVectorClock,
      op.entityType,
      op.entityId,
      op.previousProperties,
      op.patch,
      `Undo: Reverted ${op.entityType} ${op.entityId}`
    );
  }

  return null;
}
