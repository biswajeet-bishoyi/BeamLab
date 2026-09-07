import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PresenceBroadcaster,
  PresenceEvent,
  Vec3,
  CameraViewport,
} from '../src/presence/PresenceBroadcaster';

function makeBroadcaster(peerId: string): PresenceBroadcaster {
  return new PresenceBroadcaster(
    peerId,
    {
      displayName: `Peer ${peerId}`,
      role: 'modeler',
      color: '#3b82f6',
      status: 'online',
      selectionSet: [],
    },
    {
      heartbeatIntervalMs: 100,
      cursorMoveThresholdM: 0.01,
      cursorDebounceMs: 10,
      peerTimeoutMs: 500,
    }
  );
}

describe('PresenceBroadcaster', () => {
  let broadcaster: PresenceBroadcaster;
  const events: PresenceEvent[] = [];

  beforeEach(() => {
    events.length = 0;
    broadcaster = makeBroadcaster('alice');
    broadcaster.on(e => events.push(e));
  });

  it('returns correct local telemetry after initialization', () => {
    const telemetry = broadcaster.getLocalTelemetry();
    expect(telemetry.peerId).toBe('alice');
    expect(telemetry.displayName).toBe('Peer alice');
    expect(telemetry.role).toBe('modeler');
    expect(telemetry.status).toBe('online');
  });

  it('emits cursor_move event on updateCursor3D', () => {
    const pos: Vec3 = { x: 5, y: 0, z: 3 };
    broadcaster.updateCursor3D(pos);
    expect(events.some(e => e.type === 'cursor_move')).toBe(true);
    expect(broadcaster.getLocalTelemetry().cursor3D).toEqual(pos);
  });

  it('suppresses cursor broadcast when movement is below threshold', () => {
    const base: Vec3 = { x: 0, y: 0, z: 0 };
    broadcaster.updateCursor3D(base);
    events.length = 0;

    // Move by only 0.005 m — below the 0.01 m threshold
    const tiny: Vec3 = { x: 0.005, y: 0, z: 0 };
    broadcaster.updateCursor3D(tiny);
    // The last broadcast was just done, and the delta is below threshold
    // Since elapsed >= debounce time (first call sets lastBroadcastTime) and dist < threshold
    // it should NOT emit a new event
    const cursorEvents = events.filter(e => e.type === 'cursor_move');
    expect(cursorEvents.length).toBe(0);
  });

  it('emits selection_change event on updateSelection', () => {
    broadcaster.updateSelection(['node-1', 'node-2']);
    const event = events.find(e => e.type === 'selection_change');
    expect(event).toBeDefined();
    expect(event!.telemetry.selectionSet).toEqual(['node-1', 'node-2']);
    expect(broadcaster.getLocalTelemetry().selectionSet).toEqual(['node-1', 'node-2']);
  });

  it('emits camera_change event on updateCamera', () => {
    const viewport: CameraViewport = {
      eye: { x: 10, y: 10, z: 10 },
      target: { x: 0, y: 0, z: 0 },
      up: { x: 0, y: 0, z: 1 },
      projectionMode: 'perspective',
      fovDeg: 60,
    };
    broadcaster.updateCamera(viewport);
    const event = events.find(e => e.type === 'camera_change');
    expect(event).toBeDefined();
    expect(event!.telemetry.cameraViewport?.projectionMode).toBe('perspective');
  });

  it('updates active tool and emits presence_update event', () => {
    broadcaster.updateActiveTool('draw_member');
    const event = events.find(e => e.type === 'presence_update');
    expect(event).toBeDefined();
    expect(broadcaster.getLocalTelemetry().currentTool).toBe('draw_member');
  });

  it('manages laser trail and caps at maxPoints', () => {
    for (let i = 0; i < 25; i++) {
      broadcaster.updateLaserTrail({ x: i, y: 0, z: 0 }, 20);
    }
    const telemetry = broadcaster.getLocalTelemetry();
    expect(telemetry.laserTrail!.length).toBeLessThanOrEqual(20);
    const lastEvent = events.filter(e => e.type === 'laser_update').pop();
    expect(lastEvent).toBeDefined();
  });

  it('clears laser trail and emits laser_update with empty trail', () => {
    broadcaster.updateLaserTrail({ x: 1, y: 0, z: 0 });
    broadcaster.clearLaserTrail();
    const lastEvent = events.filter(e => e.type === 'laser_update').pop();
    expect(lastEvent!.telemetry.laserTrail).toEqual([]);
    expect(broadcaster.getLocalTelemetry().laserTrail).toEqual([]);
  });

  it('ingests remote presence and stores it in peer store', () => {
    broadcaster.ingestRemotePresence({
      type: 'presence_update',
      peerId: 'bob',
      telemetry: {
        displayName: 'Bob',
        role: 'checker',
        color: '#10b981',
        status: 'online',
        selectionSet: [],
        cursor3D: { x: 3, y: 1, z: 0 },
      },
      timestamp: Date.now(),
    });

    const bob = broadcaster.getRemotePeer('bob');
    expect(bob).toBeDefined();
    expect(bob!.displayName).toBe('Bob');
    expect(bob!.cursor3D).toEqual({ x: 3, y: 1, z: 0 });
    expect(bob!.status).toBe('online');
  });

  it('does not ingest own echoed presence', () => {
    const beforeCount = events.length;
    broadcaster.ingestRemotePresence({
      type: 'presence_update',
      peerId: 'alice',
      telemetry: { cursor3D: { x: 99, y: 99, z: 99 } },
      timestamp: Date.now(),
    });
    // Own presence echo should be ignored
    expect(broadcaster.getRemotePeer('alice')).toBeUndefined();
  });

  it('getOnlinePeers returns only non-offline peers', () => {
    broadcaster.ingestRemotePresence({
      type: 'presence_update',
      peerId: 'carol',
      telemetry: { displayName: 'Carol', role: 'lead', color: '#f59e0b', status: 'online', selectionSet: [] },
      timestamp: Date.now(),
    });
    broadcaster.ingestRemotePresence({
      type: 'peer_offline',
      peerId: 'dave',
      telemetry: { displayName: 'Dave', role: 'viewer', color: '#94a3b8', status: 'offline', selectionSet: [] },
      timestamp: Date.now(),
    });

    const online = broadcaster.getOnlinePeers();
    expect(online.some(p => p.peerId === 'carol')).toBe(true);
    expect(online.some(p => p.peerId === 'dave')).toBe(false);
  });

  it('emits peer_offline when a peer exceeds timeout', async () => {
    broadcaster.ingestRemotePresence({
      type: 'presence_update',
      peerId: 'eve',
      telemetry: {
        displayName: 'Eve',
        role: 'viewer',
        color: '#8b5cf6',
        status: 'online',
        selectionSet: [],
      },
      timestamp: Date.now() - 600, // already 600 ms old, beyond 500 ms timeout
    });

    const offlineEvents: PresenceEvent[] = [];
    broadcaster.on(e => { if (e.type === 'peer_offline') offlineEvents.push(e); });

    // Manually force the timeout check
    const anyBroadcaster = broadcaster as any;
    anyBroadcaster._checkPeerTimeouts();

    expect(offlineEvents.length).toBe(1);
    expect(offlineEvents[0]!.peerId).toBe('eve');
    expect(broadcaster.getRemotePeer('eve')!.status).toBe('offline');
  });

  it('unsubscribe removes event handler', () => {
    const handler = vi.fn();
    const unsubscribe = broadcaster.on(handler);
    broadcaster.updateActiveTool('select');
    expect(handler).toHaveBeenCalled();

    handler.mockClear();
    unsubscribe();
    broadcaster.updateActiveTool('pan');
    expect(handler).not.toHaveBeenCalled();
  });
});
