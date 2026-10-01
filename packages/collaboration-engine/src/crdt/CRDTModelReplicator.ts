import { VectorClock } from './VectorClock';
import {
  ModelDeltaOperation,
  AtomicDeltaOperation,
  EntityAddedOp,
  EntityUpdatedOp,
  EntityRemovedOp,
  BatchDeltaOp,
  createEntityAddedOp,
  createEntityUpdatedOp,
  createEntityRemovedOp,
} from './ModelDeltaOperation';

// ─── LWW (Last-Write-Wins) Entity Store ─────────────────────────────────────

/**
 * Tracks a single replicated entity with Last-Write-Wins field-level merging.
 */
export interface LWWEntry {
  entityId: string;
  entityType: string;
  /** Current merged field values */
  fields: Record<string, any>;
  /** Per-field logical timestamps (peerId_counter) for LWW resolution */
  fieldTimestamps: Record<string, { logicalClock: number; peerId: string }>;
  /** Whether the entity has been logically deleted */
  isDeleted: boolean;
  /** Tombstone details if deleted */
  deletedAt?: { logicalClock: number; peerId: string };
}

// ─── Structural Dependency Graph ─────────────────────────────────────────────

/**
 * Tracks structural dependencies between entities to prevent orphan references.
 * e.g. a Member depends on start/end Nodes; a Load depends on its Member.
 */
export interface StructuralDependency {
  entityId: string;
  dependsOn: string[];
}

// ─── CRDT Replicator ─────────────────────────────────────────────────────────

export interface CRDTConflict {
  opId: string;
  entityId: string;
  entityType: string;
  conflictType: 'concurrent_update' | 'orphan_dependency' | 'delete_modify_conflict';
  resolution: 'lww_applied' | 'dependency_blocked' | 'delete_wins';
  description: string;
}

export interface ApplyResult {
  applied: boolean;
  conflicts: CRDTConflict[];
  affectedEntityIds: string[];
}

/**
 * CRDTModelReplicator
 *
 * Conflict-Free Replicated Data Type engine for BeamLab structural engineering models.
 * Implements:
 * - Last-Write-Wins (LWW) field-level merge semantics for EntityUpdated operations.
 * - Causal ordering via vector clocks.
 * - Structural dependency preservation: prevents orphan members when parent nodes
 *   are concurrently deleted by a remote peer.
 * - Delete-wins semantics: when a concurrent update and delete exist for the same
 *   entity, the delete takes precedence after conflict reporting.
 * - Out-of-order operation buffering for causal gap resolution.
 */
export class CRDTModelReplicator {
  private readonly peerId: string;
  private readonly store: Map<string, LWWEntry>;
  private readonly dependencies: Map<string, StructuralDependency>;
  private readonly appliedOpIds: Set<string>;
  private readonly pendingBuffer: AtomicDeltaOperation[];
  private localClock: VectorClock;
  private localLogicalCounter: number;

  constructor(peerId: string) {
    this.peerId = peerId;
    this.store = new Map();
    this.dependencies = new Map();
    this.appliedOpIds = new Set();
    this.pendingBuffer = [];
    this.localClock = new VectorClock();
    this.localLogicalCounter = 0;
  }

  // ─── Local mutations ────────────────────────────────────────────────────────

  /**
   * Locally create an entity and produce a delta operation.
   */
  public localAdd(
    entityType: string,
    entityId: string,
    payload: Record<string, any>,
    dependsOn?: string[]
  ): EntityAddedOp {
    this.localLogicalCounter++;
    this.localClock.increment(this.peerId);

    const op = createEntityAddedOp(
      this.peerId,
      this.localLogicalCounter,
      this.localClock,
      entityType,
      entityId,
      payload
    );

    // Apply locally
    this._applyAdded(op);
    if (dependsOn?.length) {
      this.dependencies.set(entityId, { entityId, dependsOn });
    }

    this.appliedOpIds.add(op.opId);
    return op;
  }

  /**
   * Locally update entity fields and produce a delta operation.
   */
  public localUpdate(
    entityType: string,
    entityId: string,
    patch: Record<string, any>
  ): EntityUpdatedOp | null {
    const entry = this.store.get(entityId);
    if (!entry || entry.isDeleted) return null;

    this.localLogicalCounter++;
    this.localClock.increment(this.peerId);

    const op = createEntityUpdatedOp(
      this.peerId,
      this.localLogicalCounter,
      this.localClock,
      entityType,
      entityId,
      patch,
      { ...entry.fields }
    );

    this._applyUpdated(op);
    this.appliedOpIds.add(op.opId);
    return op;
  }

  /**
   * Locally delete an entity and produce a delta operation.
   */
  public localRemove(entityType: string, entityId: string): EntityRemovedOp | null {
    const entry = this.store.get(entityId);
    if (!entry || entry.isDeleted) return null;

    this.localLogicalCounter++;
    this.localClock.increment(this.peerId);

    const op = createEntityRemovedOp(
      this.peerId,
      this.localLogicalCounter,
      this.localClock,
      entityType,
      entityId,
      { ...entry.fields }
    );

    this._applyRemoved(op);
    this.appliedOpIds.add(op.opId);
    return op;
  }

  // ─── Remote operation application ─────────────────────────────────────────

  /**
   * Apply a remote delta operation received from a peer.
   * Handles idempotency, causal buffering, and conflict resolution.
   */
  public applyRemote(op: ModelDeltaOperation): ApplyResult {
    const conflicts: CRDTConflict[] = [];
    const affectedEntityIds: string[] = [];

    if (op.type === 'batch') {
      let allApplied = true;
      for (const subOp of op.operations) {
        const result = this.applyRemote(subOp);
        if (!result.applied) allApplied = false;
        conflicts.push(...result.conflicts);
        affectedEntityIds.push(...result.affectedEntityIds);
      }
      return { applied: allApplied, conflicts, affectedEntityIds };
    }

    // Idempotency: skip already-applied operations
    if (this.appliedOpIds.has(op.opId)) {
      return { applied: true, conflicts: [], affectedEntityIds: [] };
    }

    // Advance local clock by merging with the remote operation's vector clock
    const remoteClock = VectorClock.fromJSON(op.vectorClock);
    this.localClock = this.localClock.merge(remoteClock);
    this.localLogicalCounter = Math.max(this.localLogicalCounter, op.logicalClock);

    const result = this._applyAtomicRemote(op as AtomicDeltaOperation, conflicts);
    if (result) affectedEntityIds.push(op.entityId);

    // Try to drain the pending buffer now that clocks have advanced
    this._drainPendingBuffer(conflicts, affectedEntityIds);

    return { applied: result, conflicts, affectedEntityIds };
  }

  private _applyAtomicRemote(
    op: AtomicDeltaOperation,
    conflicts: CRDTConflict[]
  ): boolean {
    if (op.type === 'entity_added') {
      return this._applyAddedRemote(op, conflicts);
    }
    if (op.type === 'entity_updated') {
      return this._applyUpdatedRemote(op, conflicts);
    }
    if (op.type === 'entity_removed') {
      return this._applyRemovedRemote(op, conflicts);
    }
    return false;
  }

  private _applyAddedRemote(
    op: EntityAddedOp,
    conflicts: CRDTConflict[]
  ): boolean {
    const existing = this.store.get(op.entityId);

    if (existing && !existing.isDeleted) {
      // Concurrent add of same entity — LWW by peerId lexicographic ordering
      if (op.peerId > this.peerId) {
        // Remote wins: overwrite
        this._applyAdded(op);
        conflicts.push({
          opId: op.opId,
          entityId: op.entityId,
          entityType: op.entityType,
          conflictType: 'concurrent_update',
          resolution: 'lww_applied',
          description: `Concurrent EntityAdded for ${op.entityId}: remote peer ${op.peerId} wins by LWW.`,
        });
      }
      // else local wins: ignore remote
      this.appliedOpIds.add(op.opId);
      return true;
    }

    this._applyAdded(op);
    this.appliedOpIds.add(op.opId);
    return true;
  }

  private _applyUpdatedRemote(
    op: EntityUpdatedOp,
    conflicts: CRDTConflict[]
  ): boolean {
    const existing = this.store.get(op.entityId);

    if (!existing) {
      // Entity doesn't exist yet — buffer for causal resolution
      this.pendingBuffer.push(op);
      return false;
    }

    if (existing.isDeleted) {
      // Delete-modify conflict: delete wins
      conflicts.push({
        opId: op.opId,
        entityId: op.entityId,
        entityType: op.entityType,
        conflictType: 'delete_modify_conflict',
        resolution: 'delete_wins',
        description: `EntityUpdated for ${op.entityId} rejected: entity was already deleted (delete-wins).`,
      });
      this.appliedOpIds.add(op.opId);
      return true;
    }

    // LWW field-level merge
    this._applyUpdated(op);
    this.appliedOpIds.add(op.opId);
    return true;
  }

  private _applyRemovedRemote(
    op: EntityRemovedOp,
    conflicts: CRDTConflict[]
  ): boolean {
    // Check for orphan dependencies: other entities may depend on this entity
    const orphanedDependents = this._findDependents(op.entityId);

    if (orphanedDependents.length > 0) {
      conflicts.push({
        opId: op.opId,
        entityId: op.entityId,
        entityType: op.entityType,
        conflictType: 'orphan_dependency',
        resolution: 'dependency_blocked',
        description: `EntityRemoved for ${op.entityId} would orphan dependents: [${orphanedDependents.join(', ')}]. Cascading tombstone applied.`,
      });
      // Cascade delete to all dependents
      for (const depId of orphanedDependents) {
        const dep = this.store.get(depId);
        if (dep && !dep.isDeleted) {
          dep.isDeleted = true;
          dep.deletedAt = { logicalClock: op.logicalClock, peerId: op.peerId };
        }
      }
    }

    this._applyRemoved(op);
    this.appliedOpIds.add(op.opId);
    return true;
  }

  // ─── Internal apply helpers ───────────────────────────────────────────────

  private _applyAdded(op: EntityAddedOp): void {
    const fieldTimestamps: Record<string, { logicalClock: number; peerId: string }> = {};
    for (const key of Object.keys(op.payload)) {
      fieldTimestamps[key] = { logicalClock: op.logicalClock, peerId: op.peerId };
    }
    this.store.set(op.entityId, {
      entityId: op.entityId,
      entityType: op.entityType,
      fields: { ...op.payload },
      fieldTimestamps,
      isDeleted: false,
    });
  }

  private _applyUpdated(op: EntityUpdatedOp): void {
    const entry = this.store.get(op.entityId);
    if (!entry) return;

    for (const [key, value] of Object.entries(op.patch)) {
      const existing = entry.fieldTimestamps[key];
      const incomingWins = !existing ||
        op.logicalClock > existing.logicalClock ||
        (op.logicalClock === existing.logicalClock && op.peerId > existing.peerId);

      if (incomingWins) {
        entry.fields[key] = value;
        entry.fieldTimestamps[key] = { logicalClock: op.logicalClock, peerId: op.peerId };
      }
    }
  }

  private _applyRemoved(op: EntityRemovedOp): void {
    const entry = this.store.get(op.entityId);
    if (entry) {
      entry.isDeleted = true;
      entry.deletedAt = { logicalClock: op.logicalClock, peerId: op.peerId };
    }
  }

  // ─── Causal buffer drain ───────────────────────────────────────────────────

  private _drainPendingBuffer(
    conflicts: CRDTConflict[],
    affectedEntityIds: string[]
  ): void {
    let progress = true;
    while (progress && this.pendingBuffer.length > 0) {
      progress = false;
      const remaining: AtomicDeltaOperation[] = [];
      for (const op of this.pendingBuffer) {
        if (this.appliedOpIds.has(op.opId)) {
          progress = true;
          continue;
        }
        const result = this._applyAtomicRemote(op, conflicts);
        if (result) {
          affectedEntityIds.push(op.entityId);
          this.appliedOpIds.add(op.opId);
          progress = true;
        } else {
          remaining.push(op);
        }
      }
      this.pendingBuffer.splice(0, this.pendingBuffer.length, ...remaining);
    }
  }

  // ─── Dependency graph ──────────────────────────────────────────────────────

  /**
   * Register a structural dependency: entityId depends on all dependsOnIds.
   * Used to track member-to-node, load-to-member references.
   */
  public registerDependency(entityId: string, dependsOn: string[]): void {
    this.dependencies.set(entityId, { entityId, dependsOn });
  }

  private _findDependents(entityId: string): string[] {
    const dependents: string[] = [];
    for (const [depId, dep] of this.dependencies.entries()) {
      if (dep.dependsOn.includes(entityId)) {
        const entry = this.store.get(depId);
        if (entry && !entry.isDeleted) {
          dependents.push(depId);
        }
      }
    }
    return dependents;
  }

  // ─── State queries ─────────────────────────────────────────────────────────

  public getEntity(entityId: string): LWWEntry | undefined {
    return this.store.get(entityId);
  }

  public getAllEntities(): LWWEntry[] {
    return Array.from(this.store.values()).filter(e => !e.isDeleted);
  }

  public getAllByType(entityType: string): LWWEntry[] {
    return this.getAllEntities().filter(e => e.entityType === entityType);
  }

  public getLocalClock(): VectorClock {
    return this.localClock.clone();
  }

  public getPeerId(): string {
    return this.peerId;
  }

  public getEntityCount(): number {
    return this.getAllEntities().length;
  }

  public getPendingBufferSize(): number {
    return this.pendingBuffer.length;
  }
}
