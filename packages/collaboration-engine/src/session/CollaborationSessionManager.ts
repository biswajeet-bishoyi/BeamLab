import { VectorClock } from '../crdt/VectorClock';
import { ModelDeltaOperation } from '../crdt/ModelDeltaOperation';
import { CRDTModelReplicator, LWWEntry, CRDTConflict } from '../crdt/CRDTModelReplicator';

// ─── Session Peer ─────────────────────────────────────────────────────────────

export type PeerConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'away';

export interface SessionPeer {
  peerId: string;
  displayName: string;
  avatarUrl?: string;
  role: 'lead' | 'modeler' | 'checker' | 'viewer';
  color: string;
  status: PeerConnectionStatus;
  joinedAt: number;
  lastSeenAt: number;
  currentTool?: string;
  selectionSet: string[];
  /** 3D spatial cursor position (Z-up coordinate system) */
  cursor3D?: { x: number; y: number; z: number };
  /** Camera viewport state */
  cameraViewport?: {
    eye: { x: number; y: number; z: number };
    target: { x: number; y: number; z: number };
    up: { x: number; y: number; z: number };
  };
}

// ─── Session Events ───────────────────────────────────────────────────────────

export type CollaborationEventType =
  | 'peer_joined'
  | 'peer_left'
  | 'peer_presence_updated'
  | 'model_delta_applied'
  | 'model_delta_rejected'
  | 'conflict_resolved'
  | 'session_synced';

export interface CollaborationEvent {
  type: CollaborationEventType;
  peerId?: string;
  opIds?: string[];
  conflicts?: CRDTConflict[];
  affectedEntityIds?: string[];
  timestamp: number;
}

export type CollaborationEventHandler = (event: CollaborationEvent) => void;

// ─── Session Statistics ────────────────────────────────────────────────────────

export interface SessionStats {
  sessionId: string;
  localPeerId: string;
  connectedPeers: number;
  totalPeers: number;
  totalOpsApplied: number;
  pendingBufferSize: number;
  localEntityCount: number;
  conflictsResolved: number;
  startedAt: number;
  uptimeMs: number;
}

// ─── CollaborationSessionManager ──────────────────────────────────────────────

/**
 * CollaborationSessionManager
 *
 * Manages a multi-user real-time collaboration session for a structural engineering model.
 *
 * Responsibilities:
 * - Maintains the canonical CRDT model replica for the local peer.
 * - Tracks all session peers and their presence state.
 * - Dispatches local mutations into delta operations and routes remote deltas to the replicator.
 * - Manages optimistic local updates (mutations applied locally before acknowledgment).
 * - Emits typed collaboration events to registered listeners.
 * - Provides clean session statistics for monitoring.
 */
export class CollaborationSessionManager {
  private readonly sessionId: string;
  private readonly localPeerId: string;
  private readonly replicator: CRDTModelReplicator;
  private readonly peers: Map<string, SessionPeer>;
  private readonly eventHandlers: CollaborationEventHandler[];
  private totalOpsApplied: number;
  private conflictsResolved: number;
  private readonly startedAt: number;

  constructor(sessionId: string, localPeerId: string) {
    this.sessionId = sessionId;
    this.localPeerId = localPeerId;
    this.replicator = new CRDTModelReplicator(localPeerId);
    this.peers = new Map();
    this.eventHandlers = [];
    this.totalOpsApplied = 0;
    this.conflictsResolved = 0;
    this.startedAt = Date.now();
  }

  // ─── Peer management ───────────────────────────────────────────────────────

  /**
   * Register a peer joining this session.
   */
  public joinPeer(peer: SessionPeer): void {
    this.peers.set(peer.peerId, { ...peer, status: 'connected', joinedAt: Date.now(), lastSeenAt: Date.now() });
    this._emit({ type: 'peer_joined', peerId: peer.peerId, timestamp: Date.now() });
  }

  /**
   * Mark a peer as disconnected (e.g. network timeout or graceful leave).
   */
  public leavePeer(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.status = 'disconnected';
      peer.lastSeenAt = Date.now();
      this._emit({ type: 'peer_left', peerId, timestamp: Date.now() });
    }
  }

  /**
   * Update presence telemetry for a peer (cursor position, selection set, camera state).
   */
  public updatePeerPresence(
    peerId: string,
    presence: Partial<Pick<SessionPeer, 'cursor3D' | 'selectionSet' | 'cameraViewport' | 'currentTool' | 'status'>>
  ): void {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    Object.assign(peer, presence);
    peer.lastSeenAt = Date.now();
    this._emit({ type: 'peer_presence_updated', peerId, timestamp: Date.now() });
  }

  /**
   * Mark peers as 'away' if no heartbeat received within the timeout window.
   */
  public pruneInactivePeers(timeoutMs: number = 30_000): string[] {
    const now = Date.now();
    const timedOut: string[] = [];
    for (const [peerId, peer] of this.peers.entries()) {
      if (peer.status === 'connected' && now - peer.lastSeenAt > timeoutMs) {
        peer.status = 'away';
        timedOut.push(peerId);
        this._emit({ type: 'peer_presence_updated', peerId, timestamp: now });
      }
    }
    return timedOut;
  }

  // ─── Local mutations (optimistic, generates outbound delta ops) ───────────

  public localAddEntity(
    entityType: string,
    entityId: string,
    payload: Record<string, any>,
    dependsOn?: string[]
  ): ModelDeltaOperation {
    const op = this.replicator.localAdd(entityType, entityId, payload, dependsOn);
    this.totalOpsApplied++;
    this._emit({
      type: 'model_delta_applied',
      peerId: this.localPeerId,
      opIds: [op.opId],
      affectedEntityIds: [entityId],
      timestamp: Date.now(),
    });
    return op;
  }

  public localUpdateEntity(
    entityType: string,
    entityId: string,
    patch: Record<string, any>
  ): ModelDeltaOperation | null {
    const op = this.replicator.localUpdate(entityType, entityId, patch);
    if (!op) return null;
    this.totalOpsApplied++;
    this._emit({
      type: 'model_delta_applied',
      peerId: this.localPeerId,
      opIds: [op.opId],
      affectedEntityIds: [entityId],
      timestamp: Date.now(),
    });
    return op;
  }

  public localRemoveEntity(
    entityType: string,
    entityId: string
  ): ModelDeltaOperation | null {
    const op = this.replicator.localRemove(entityType, entityId);
    if (!op) return null;
    this.totalOpsApplied++;
    this._emit({
      type: 'model_delta_applied',
      peerId: this.localPeerId,
      opIds: [op.opId],
      affectedEntityIds: [entityId],
      timestamp: Date.now(),
    });
    return op;
  }

  // ─── Inbound remote delta application ────────────────────────────────────

  /**
   * Apply a remote delta operation from any peer.
   */
  public applyRemoteDelta(op: ModelDeltaOperation): void {
    const result = this.replicator.applyRemote(op);

    this.totalOpsApplied++;
    this.conflictsResolved += result.conflicts.length;

    if (result.applied) {
      this._emit({
        type: 'model_delta_applied',
        peerId: op.peerId,
        opIds: [op.opId],
        affectedEntityIds: result.affectedEntityIds,
        conflicts: result.conflicts,
        timestamp: Date.now(),
      });
    } else {
      this._emit({
        type: 'model_delta_rejected',
        peerId: op.peerId,
        opIds: [op.opId],
        conflicts: result.conflicts,
        timestamp: Date.now(),
      });
    }

    if (result.conflicts.length > 0) {
      this._emit({
        type: 'conflict_resolved',
        peerId: op.peerId,
        conflicts: result.conflicts,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Bulk-apply a set of remote delta operations (e.g. on session join / re-sync).
   */
  public applyRemoteDeltas(ops: ModelDeltaOperation[]): void {
    // Sort by logical clock to maximize in-order application
    const sorted = [...ops].sort((a, b) => a.logicalClock - b.logicalClock);
    for (const op of sorted) {
      this.applyRemoteDelta(op);
    }
    this._emit({ type: 'session_synced', timestamp: Date.now() });
  }

  // ─── Dependency registration ───────────────────────────────────────────────

  public registerStructuralDependency(entityId: string, dependsOn: string[]): void {
    this.replicator.registerDependency(entityId, dependsOn);
  }

  // ─── Event system ──────────────────────────────────────────────────────────

  public on(handler: CollaborationEventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      const idx = this.eventHandlers.indexOf(handler);
      if (idx !== -1) this.eventHandlers.splice(idx, 1);
    };
  }

  private _emit(event: CollaborationEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Silently swallow handler errors to preserve session stability
      }
    }
  }

  // ─── State queries ─────────────────────────────────────────────────────────

  public getEntity(entityId: string): LWWEntry | undefined {
    return this.replicator.getEntity(entityId);
  }

  public getAllEntities(): LWWEntry[] {
    return this.replicator.getAllEntities();
  }

  public getAllEntitiesByType(entityType: string): LWWEntry[] {
    return this.replicator.getAllByType(entityType);
  }

  public getPeer(peerId: string): SessionPeer | undefined {
    return this.peers.get(peerId);
  }

  public getConnectedPeers(): SessionPeer[] {
    return Array.from(this.peers.values()).filter(p =>
      p.status === 'connected' || p.status === 'away'
    );
  }

  public getAllPeers(): SessionPeer[] {
    return Array.from(this.peers.values());
  }

  public getLocalClock(): VectorClock {
    return this.replicator.getLocalClock();
  }

  public getSessionStats(): SessionStats {
    return {
      sessionId: this.sessionId,
      localPeerId: this.localPeerId,
      connectedPeers: this.getConnectedPeers().length,
      totalPeers: this.peers.size,
      totalOpsApplied: this.totalOpsApplied,
      pendingBufferSize: this.replicator.getPendingBufferSize(),
      localEntityCount: this.replicator.getEntityCount(),
      conflictsResolved: this.conflictsResolved,
      startedAt: this.startedAt,
      uptimeMs: Date.now() - this.startedAt,
    };
  }
}
