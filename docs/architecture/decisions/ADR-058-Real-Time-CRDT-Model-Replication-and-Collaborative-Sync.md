# ADR-058: Real-Time CRDT Model Replication & Collaborative Sync Engine

## Status
Accepted

## Context
BeamLab structural engineering models are complex, shared artifacts that multiple engineers (lead, modeler, checker) must be able to modify simultaneously without losing consistency or correctness. The central problem of distributed concurrency in structural models includes:

1. **Causal ordering**: Engineers in different network partitions issue operations in concurrent execution branches. Without causal tracking, remote operations arrive out of order and produce inconsistent replicas.
2. **Structural dependency integrity**: Deleting a node that supports multiple members would produce orphaned, physically impossible structures. The system must detect and cascade such deletions safely.
3. **Field-level conflict merging**: Two engineers editing different properties of the same member (e.g. one changes the cross-section while another changes the length) must not overwrite each other's work blindly.
4. **Delete-modify safety**: A concurrent remote update to an entity being deleted locally must not resurrect a logically dead structural element.
5. **Offline & reconnect resilience**: Engineers working offline must be able to produce valid operations that, when synced, converge deterministically to the same model state regardless of application order.

## Decision
We implemented `packages/collaboration-engine` as the standalone, dependency-light BeamLab Collaboration Engine:

### 1. VectorClock
Logical vector clock implementation (`VectorClock`) tracking per-peer integer counters for full causal ordering. Supports:
- `increment(peerId)`, `merge(other)`, `compare(other)` → `'before' | 'after' | 'concurrent' | 'equal'`
- `isBefore()`, `isConcurrent()` convenience predicates
- Bidirectional JSON serialization / deserialization

### 2. ModelDeltaOperation
Typed discriminated union of structural mutation deltas:
- `EntityAddedOp`, `EntityUpdatedOp`, `EntityRemovedOp`, `BatchDeltaOp`
- Each carries: `opId`, `peerId`, `physicalTimestamp`, `logicalClock`, `vectorClock`, optional `causalDependencies`, `description`
- Factory functions: `createEntityAddedOp`, `createEntityUpdatedOp`, `createEntityRemovedOp`
- `invertAtomicOperation` for undo/redo stack integration

### 3. CRDTModelReplicator
Core conflict-free replicated data type engine for structural entity stores:
- **LWW field-level merge**: Field-level Last-Write-Wins with per-field `{logicalClock, peerId}` timestamps. Higher logical clock wins; on tie, larger `peerId` (lexicographic) wins. Preserves concurrent modifications to disjoint fields.
- **Structural dependency graph**: Tracks `entityId → dependsOn[]` relationships (member→nodes, load→member). On remote node deletion, automatically cascades tombstoning to all dependent members — preventing orphan structural elements.
- **Delete-modify conflict**: When an update targets an already-tombstoned entity, the delete wins and the update is rejected with a reported `delete_modify_conflict`.
- **Idempotency**: `Set<appliedOpIds>` prevents duplicate application of the same operation.
- **Causal buffering**: Out-of-order remote operations are held in a pending buffer and re-attempted on each clock advance, enabling eventual causal convergence.
- **Clock advancement**: On every remote op, the local vector clock is merged with the incoming clock.

### 4. CollaborationSessionManager
High-level session façade:
- **Peer management**: `joinPeer`, `leavePeer`, `updatePeerPresence`, `pruneInactivePeers` for full peer lifecycle.
- **SessionPeer**: Typed presence record with `role` (lead/modeler/checker/viewer), `color`, `cursor3D`, `cameraViewport`, `selectionSet`, `currentTool`, `status`.
- **Optimistic local mutations**: `localAddEntity`, `localUpdateEntity`, `localRemoveEntity` → applies locally and returns outbound delta for broadcast.
- **Remote delta ingestion**: `applyRemoteDelta`, `applyRemoteDeltas` (bulk, logically-sorted for reconnect/re-sync).
- **Typed event emission**: `CollaborationEventType` → `peer_joined | peer_left | peer_presence_updated | model_delta_applied | model_delta_rejected | conflict_resolved | session_synced`
- **Session statistics**: `getSessionStats()` → connected peers, total ops, pending buffer size, entity count, conflicts resolved, uptime.

## Consequences

### Positive
- **Deterministic convergence**: Any two replicas that receive the same set of delta operations, in any order, will converge to the same structural model state.
- **No central coordinator required**: The CRDT engine is fully peer-to-peer; it can operate over any transport (WebSocket, WebRTC, HTTP polling).
- **Structural integrity preservation**: Orphan dependency cascading prevents structurally impossible states (free-floating members with no nodes).
- **Field-level granularity**: Engineers editing different fields of the same entity never block each other.
- **Offline-first**: Engineers can produce local mutations offline and sync on reconnect without manual conflict resolution.

### Trade-offs
- LWW semantics mean that the "winning" concurrent edit on the same field may not always be the most desirable from an engineering standpoint — this is documented in the UI for engineers to be aware of.
- Causal buffering may temporarily hold unresolvable operations if a prerequisite add operation is permanently lost (network loss). Reconnect/re-sync via `applyRemoteDeltas` resolves this.
