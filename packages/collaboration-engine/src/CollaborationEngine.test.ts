import { describe, it, expect, beforeEach } from 'vitest';
import { VectorClock } from '../src/crdt/VectorClock';
import {
  createEntityAddedOp,
  createEntityUpdatedOp,
  createEntityRemovedOp,
  invertAtomicOperation,
} from '../src/crdt/ModelDeltaOperation';
import { CRDTModelReplicator } from '../src/crdt/CRDTModelReplicator';
import { CollaborationSessionManager } from '../src/session/CollaborationSessionManager';

// ─── VectorClock tests ────────────────────────────────────────────────────────

describe('VectorClock', () => {
  it('initializes to zero counters and increments correctly', () => {
    const vc = new VectorClock();
    expect(vc.get('alice')).toBe(0);
    const next = vc.increment('alice');
    expect(next).toBe(1);
    expect(vc.get('alice')).toBe(1);
  });

  it('compares clocks: before, after, concurrent, equal', () => {
    const a = new VectorClock({ alice: 2, bob: 1 });
    const b = new VectorClock({ alice: 3, bob: 1 });
    expect(a.compare(b)).toBe('before');
    expect(b.compare(a)).toBe('after');

    // Genuine concurrent: alice advanced in X, bob advanced in Y — neither dominates
    const x = new VectorClock({ alice: 3, bob: 1 });
    const y = new VectorClock({ alice: 1, bob: 3 });
    expect(x.compare(y)).toBe('concurrent');
    expect(y.compare(x)).toBe('concurrent');

    const d = new VectorClock({ alice: 2, bob: 1 });
    expect(a.compare(d)).toBe('equal');
  });

  it('merges by taking max of each peer', () => {
    const a = new VectorClock({ alice: 3, bob: 1 });
    const b = new VectorClock({ alice: 1, bob: 5, carol: 2 });
    const merged = a.merge(b);
    expect(merged.get('alice')).toBe(3);
    expect(merged.get('bob')).toBe(5);
    expect(merged.get('carol')).toBe(2);
  });

  it('serializes to and deserializes from JSON', () => {
    const vc = new VectorClock({ alice: 5, bob: 3 });
    const json = vc.toJSON();
    const restored = VectorClock.fromJSON(json);
    expect(restored.get('alice')).toBe(5);
    expect(restored.get('bob')).toBe(3);
    expect(restored.compare(vc)).toBe('equal');
  });

  it('isBefore and isConcurrent convenience methods work correctly', () => {
    const a = new VectorClock({ peer1: 1 });
    const b = new VectorClock({ peer1: 2 });
    expect(a.isBefore(b)).toBe(true);
    expect(b.isBefore(a)).toBe(false);

    // Concurrent: peer1 advanced in X, peer2 advanced in Y
    const x = new VectorClock({ peer1: 2, peer2: 1 });
    const y = new VectorClock({ peer1: 1, peer2: 2 });
    expect(x.isConcurrent(y)).toBe(true);
  });

  it('clone produces independent copy', () => {
    const original = new VectorClock({ peer1: 5 });
    const clone = original.clone();
    clone.increment('peer1');
    expect(original.get('peer1')).toBe(5);
    expect(clone.get('peer1')).toBe(6);
  });
});

// ─── ModelDeltaOperation tests ────────────────────────────────────────────────

describe('ModelDeltaOperation', () => {
  it('creates EntityAddedOp with correct structure', () => {
    const vc = new VectorClock({ alice: 1 });
    const op = createEntityAddedOp('alice', 1, vc, 'Node', 'node-1', { x: 0, y: 0, z: 0 });
    expect(op.type).toBe('entity_added');
    expect(op.entityId).toBe('node-1');
    expect(op.entityType).toBe('Node');
    expect(op.payload).toEqual({ x: 0, y: 0, z: 0 });
    expect(op.peerId).toBe('alice');
    expect(op.logicalClock).toBe(1);
  });

  it('creates EntityUpdatedOp with patch and previousProperties', () => {
    const vc = new VectorClock({ alice: 2 });
    const op = createEntityUpdatedOp('alice', 2, vc, 'Node', 'node-1', { x: 5 }, { x: 0 });
    expect(op.type).toBe('entity_updated');
    expect(op.patch).toEqual({ x: 5 });
    expect(op.previousProperties).toEqual({ x: 0 });
  });

  it('creates EntityRemovedOp with previousPayload', () => {
    const vc = new VectorClock({ alice: 3 });
    const op = createEntityRemovedOp('alice', 3, vc, 'Node', 'node-1', { x: 0 });
    expect(op.type).toBe('entity_removed');
    expect(op.previousPayload).toEqual({ x: 0 });
  });

  it('invertAtomicOperation returns the correct inverse', () => {
    const vc = new VectorClock({ alice: 1 });
    const addOp = createEntityAddedOp('alice', 1, vc, 'Member', 'm-1', { section: 'W200x100' });

    const vc2 = new VectorClock({ alice: 2 });
    const inverse = invertAtomicOperation(addOp, 'alice', 2, vc2);
    expect(inverse).not.toBeNull();
    expect(inverse!.type).toBe('entity_removed');
    expect(inverse!.entityId).toBe('m-1');
  });
});

// ─── CRDTModelReplicator tests ────────────────────────────────────────────────

describe('CRDTModelReplicator', () => {
  let alice: CRDTModelReplicator;
  let bob: CRDTModelReplicator;

  beforeEach(() => {
    alice = new CRDTModelReplicator('alice');
    bob = new CRDTModelReplicator('bob');
  });

  it('localAdd creates and stores an entity correctly', () => {
    alice.localAdd('Node', 'n-1', { x: 0, y: 0, z: 0 });
    const entity = alice.getEntity('n-1');
    expect(entity).toBeDefined();
    expect(entity!.entityType).toBe('Node');
    expect(entity!.fields.x).toBe(0);
    expect(entity!.isDeleted).toBe(false);
  });

  it('localRemove tombstones an entity', () => {
    alice.localAdd('Node', 'n-1', { x: 0, y: 0, z: 0 });
    alice.localRemove('Node', 'n-1');
    const entity = alice.getEntity('n-1');
    expect(entity!.isDeleted).toBe(true);
  });

  it('replicates add operation from alice to bob without conflict', () => {
    const op = alice.localAdd('Node', 'n-1', { x: 10, y: 5, z: 0 });
    const result = bob.applyRemote(op);
    expect(result.applied).toBe(true);
    expect(result.conflicts).toHaveLength(0);

    const entity = bob.getEntity('n-1');
    expect(entity).toBeDefined();
    expect(entity!.fields.x).toBe(10);
  });

  it('LWW field-level merge: higher logical clock wins on concurrent updates', () => {
    alice.localAdd('Member', 'm-1', { section: 'W150x24', length: 5.0 });
    const aliceOp = alice.localUpdate('Member', 'm-1', { section: 'W200x46' });

    bob.applyRemote(alice.localAdd('Member', 'm-1', { section: 'W150x24', length: 5.0 }));
    const bobOp = bob.localUpdate('Member', 'm-1', { section: 'W250x89' });

    // Bob's update has a higher logical clock (2 vs alice's 1 after the add)
    // Apply both to a fresh replicator
    const carol = new CRDTModelReplicator('carol');
    carol.applyRemote(alice.localAdd('Member', 'm-1', { section: 'W150x24', length: 5.0 }));
    carol.applyRemote(aliceOp!);
    carol.applyRemote(bobOp!);

    const entity = carol.getEntity('m-1');
    expect(entity).toBeDefined();
    // Bob's clock is higher, so bob's section should win
    expect(entity!.fields.section).toBe('W250x89');
  });

  it('idempotency: applying same op twice does not duplicate', () => {
    const op = alice.localAdd('Node', 'n-1', { x: 0, y: 0, z: 0 });
    bob.applyRemote(op);
    bob.applyRemote(op); // second application must be a no-op
    expect(bob.getEntityCount()).toBe(1);
  });

  it('detects and reports orphan dependency conflict on node deletion', () => {
    // alice creates node n-1
    const addNode = alice.localAdd('Node', 'n-1', { x: 0, y: 0, z: 0 });
    // alice creates member m-1 that depends on n-1
    const addMember = alice.localAdd('Member', 'm-1', { startNodeId: 'n-1', endNodeId: 'n-2' }, ['n-1', 'n-2']);

    bob.applyRemote(addNode);
    bob.applyRemote(addMember);
    bob.registerDependency('m-1', ['n-1', 'n-2']);

    // alice removes n-1 concurrently
    const removeNode = alice.localRemove('Node', 'n-1');

    const result = bob.applyRemote(removeNode!);
    // Should detect orphan dependency conflict
    expect(result.conflicts.length).toBeGreaterThan(0);
    expect(result.conflicts[0]!.conflictType).toBe('orphan_dependency');
    // Cascade: member m-1 should also be tombstoned
    const member = bob.getEntity('m-1');
    expect(member!.isDeleted).toBe(true);
  });

  it('delete-modify conflict: delete wins over concurrent update', () => {
    alice.localAdd('Node', 'n-1', { x: 0, y: 0, z: 0 });
    bob.applyRemote(alice.localAdd('Node', 'n-1', { x: 0, y: 0, z: 0 }));

    // Alice deletes n-1
    const deleteOp = alice.localRemove('Node', 'n-1');

    // Bob updates n-1 concurrently
    const updateOp = bob.localUpdate('Node', 'n-1', { x: 99 });

    // Apply alice's delete to bob's replica first
    bob.applyRemote(deleteOp!);
    // Now apply bob's own update back to alice: should be rejected (delete-wins)
    const result = alice.applyRemote(updateOp!);
    expect(result.conflicts.some(c => c.conflictType === 'delete_modify_conflict')).toBe(true);
  });

  it('getAllByType filters correctly and excludes tombstones', () => {
    alice.localAdd('Node', 'n-1', { x: 0, y: 0, z: 0 });
    alice.localAdd('Node', 'n-2', { x: 5, y: 0, z: 0 });
    alice.localAdd('Member', 'm-1', { startNodeId: 'n-1', endNodeId: 'n-2' });
    alice.localRemove('Node', 'n-2');

    const nodes = alice.getAllByType('Node');
    expect(nodes).toHaveLength(1);
    expect(nodes[0]!.entityId).toBe('n-1');

    const members = alice.getAllByType('Member');
    expect(members).toHaveLength(1);
  });
});

// ─── CollaborationSessionManager tests ───────────────────────────────────────

describe('CollaborationSessionManager', () => {
  let session: CollaborationSessionManager;

  beforeEach(() => {
    session = new CollaborationSessionManager('session-test', 'alice');
  });

  it('joins and tracks peers with correct initial status', () => {
    session.joinPeer({
      peerId: 'bob',
      displayName: 'Bob',
      role: 'modeler',
      color: '#3b82f6',
      status: 'connecting',
      joinedAt: Date.now(),
      lastSeenAt: Date.now(),
      selectionSet: [],
    });

    const peer = session.getPeer('bob');
    expect(peer).toBeDefined();
    expect(peer!.status).toBe('connected');
    expect(peer!.displayName).toBe('Bob');
  });

  it('marks peer as disconnected on leave', () => {
    session.joinPeer({
      peerId: 'carol',
      displayName: 'Carol',
      role: 'checker',
      color: '#10b981',
      status: 'connected',
      joinedAt: Date.now(),
      lastSeenAt: Date.now(),
      selectionSet: [],
    });

    session.leavePeer('carol');
    expect(session.getPeer('carol')!.status).toBe('disconnected');
    expect(session.getConnectedPeers()).toHaveLength(0);
  });

  it('localAddEntity creates entity and emits event', () => {
    const events: string[] = [];
    session.on(e => events.push(e.type));

    session.localAddEntity('Node', 'n-1', { x: 0, y: 0, z: 0 });

    expect(session.getEntity('n-1')).toBeDefined();
    expect(events).toContain('model_delta_applied');
  });

  it('applyRemoteDelta replicates remote ops correctly', () => {
    const remote = new CollaborationSessionManager('session-test', 'bob');
    const op = remote.localAddEntity('Node', 'n-remote', { x: 10, y: 5, z: 0 });

    const events: string[] = [];
    session.on(e => events.push(e.type));
    session.applyRemoteDelta(op);

    expect(session.getEntity('n-remote')).toBeDefined();
    expect(events).toContain('model_delta_applied');
  });

  it('applyRemoteDeltas bulk-applies in logical clock order', () => {
    const remote = new CollaborationSessionManager('session-test', 'dave');
    const op1 = remote.localAddEntity('Node', 'n-1', { x: 0 });
    const op2 = remote.localAddEntity('Node', 'n-2', { x: 5 });
    const op3 = remote.localUpdateEntity('Node', 'n-1', { x: 99 });

    // Apply out of order
    session.applyRemoteDeltas([op3!, op1, op2]);

    expect(session.getEntity('n-1')).toBeDefined();
    expect(session.getEntity('n-2')).toBeDefined();
  });

  it('pruneInactivePeers marks stale peers as away', () => {
    session.joinPeer({
      peerId: 'eve',
      displayName: 'Eve',
      role: 'viewer',
      color: '#f59e0b',
      status: 'connected',
      joinedAt: Date.now(),
      lastSeenAt: Date.now(),
      selectionSet: [],
    });

    // Manually set lastSeenAt to simulate inactivity
    const evePeer = session.getPeer('eve')!;
    (evePeer as any).lastSeenAt = Date.now() - 60_000;

    const pruned = session.pruneInactivePeers(30_000);
    expect(pruned).toContain('eve');
    expect(session.getPeer('eve')!.status).toBe('away');
  });

  it('getSessionStats returns accurate statistics', () => {
    session.joinPeer({
      peerId: 'frank',
      displayName: 'Frank',
      role: 'lead',
      color: '#8b5cf6',
      status: 'connected',
      joinedAt: Date.now(),
      lastSeenAt: Date.now(),
      selectionSet: [],
    });
    session.localAddEntity('Node', 'n-1', { x: 0 });
    session.localAddEntity('Node', 'n-2', { x: 5 });

    const stats = session.getSessionStats();
    expect(stats.sessionId).toBe('session-test');
    expect(stats.localPeerId).toBe('alice');
    expect(stats.connectedPeers).toBe(1);
    expect(stats.totalOpsApplied).toBe(2);
    expect(stats.localEntityCount).toBe(2);
    expect(stats.uptimeMs).toBeGreaterThanOrEqual(0);
  });
});
