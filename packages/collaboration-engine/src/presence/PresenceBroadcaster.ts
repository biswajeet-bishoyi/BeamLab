// ─── 3D Spatial Types ────────────────────────────────────────────────────────

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface CameraViewport {
  eye: Vec3;
  target: Vec3;
  up: Vec3;
  /** Field of view in degrees (perspective mode) */
  fovDeg?: number;
  /** Orthographic frustum half-width */
  orthoSize?: number;
  projectionMode: 'perspective' | 'orthographic';
}

// ─── Peer Presence ────────────────────────────────────────────────────────────

export type PeerRole = 'lead' | 'modeler' | 'checker' | 'viewer';
export type PresenceStatus = 'online' | 'away' | 'offline';

export interface PeerPresenceTelemetry {
  peerId: string;
  displayName: string;
  avatarUrl?: string;
  role: PeerRole;
  /** Hex color assigned to this peer for 3D cursor and UI identification */
  color: string;
  status: PresenceStatus;
  physicalTimestamp: number;
  /** Active tool name, e.g. 'select', 'draw_member', 'apply_load' */
  currentTool?: string;
  /** Currently selected entity IDs */
  selectionSet: string[];
  /** 3D spatial cursor position in Z-up global coordinates */
  cursor3D?: Vec3;
  /** Camera viewport state for "Follow Camera" feature */
  cameraViewport?: CameraViewport;
  /** Ephemeral laser pointer trail points (Z-up) */
  laserTrail?: Vec3[];
}

// ─── Presence Events ──────────────────────────────────────────────────────────

export type PresenceEventType =
  | 'presence_update'
  | 'peer_online'
  | 'peer_offline'
  | 'cursor_move'
  | 'selection_change'
  | 'camera_change'
  | 'laser_update';

export interface PresenceEvent {
  type: PresenceEventType;
  peerId: string;
  telemetry: Partial<PeerPresenceTelemetry>;
  timestamp: number;
}

// ─── PresenceBroadcaster ──────────────────────────────────────────────────────

export type PresenceEventHandler = (event: PresenceEvent) => void;

export interface BroadcasterOptions {
  /** How often (ms) the local heartbeat is emitted to signal liveness */
  heartbeatIntervalMs?: number;
  /** Minimum delta (meters) for cursor3D before broadcasting a move event */
  cursorMoveThresholdM?: number;
  /** Minimum time (ms) between cursor broadcasts (debounce) */
  cursorDebounceMs?: number;
  /** Peer timeout before marking them 'offline' */
  peerTimeoutMs?: number;
}

const DEFAULT_OPTIONS: Required<BroadcasterOptions> = {
  heartbeatIntervalMs: 5_000,
  cursorMoveThresholdM: 0.05,
  cursorDebounceMs: 50,
  peerTimeoutMs: 30_000,
};

/**
 * PresenceBroadcaster
 *
 * Manages local peer presence telemetry and synchronizes it with remote peers.
 *
 * Features:
 * - Periodic heartbeat emission for liveness signaling.
 * - Debounced, threshold-based 3D cursor position broadcasting.
 * - Peer timeout detection and automatic offline marking.
 * - Laser pointer trail management with configurable trail decay.
 * - Typed event emission for UI and 3D canvas consumers.
 */
export class PresenceBroadcaster {
  private readonly localPeerId: string;
  private readonly options: Required<BroadcasterOptions>;
  private readonly peerStore: Map<string, PeerPresenceTelemetry>;
  private readonly handlers: PresenceEventHandler[];
  private localTelemetry: PeerPresenceTelemetry;

  // Debounce state
  private lastCursorBroadcastTime: number = 0;
  private lastCursor3D: Vec3 | null = null;
  private pendingCursorTimer: ReturnType<typeof setTimeout> | null = null;

  // Heartbeat
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  // Peer timeout watchdog
  private timeoutWatchdogTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    localPeerId: string,
    initialTelemetry: Omit<PeerPresenceTelemetry, 'peerId' | 'physicalTimestamp'>,
    options: BroadcasterOptions = {}
  ) {
    this.localPeerId = localPeerId;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.handlers = [];
    this.peerStore = new Map();

    this.localTelemetry = {
      ...initialTelemetry,
      peerId: localPeerId,
      physicalTimestamp: Date.now(),
    };
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Start the heartbeat and peer-timeout watchdog timers.
   * Returns a cleanup function that stops all timers.
   */
  public start(): () => void {
    this.heartbeatTimer = setInterval(() => {
      this._emitLocal('presence_update', {
        status: this.localTelemetry.status,
        physicalTimestamp: Date.now(),
      });
    }, this.options.heartbeatIntervalMs);

    this.timeoutWatchdogTimer = setInterval(() => {
      this._checkPeerTimeouts();
    }, Math.floor(this.options.peerTimeoutMs / 3));

    return () => this.stop();
  }

  /** Stop all timers. Call on component unmount / session leave. */
  public stop(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.timeoutWatchdogTimer !== null) {
      clearInterval(this.timeoutWatchdogTimer);
      this.timeoutWatchdogTimer = null;
    }
    if (this.pendingCursorTimer !== null) {
      clearTimeout(this.pendingCursorTimer);
      this.pendingCursorTimer = null;
    }
  }

  // ─── Local telemetry updates ───────────────────────────────────────────────

  /**
   * Update the local peer's 3D cursor position.
   * Applies debounce and minimum-distance threshold before broadcasting.
   */
  public updateCursor3D(position: Vec3): void {
    const now = Date.now();
    const elapsed = now - this.lastCursorBroadcastTime;

    // Threshold check: only broadcast if moved meaningfully
    if (this.lastCursor3D !== null) {
      const dist = this._dist3(position, this.lastCursor3D);
      if (dist < this.options.cursorMoveThresholdM) {
        this.localTelemetry.cursor3D = position;
        this.lastCursor3D = position;
        return;
      }
    }

    this.localTelemetry.cursor3D = position;
    this.lastCursor3D = position;

    if (elapsed >= this.options.cursorDebounceMs) {
      this.lastCursorBroadcastTime = now;
      this._emitLocal('cursor_move', { cursor3D: position });
    } else {
      // Debounce: schedule a deferred broadcast
      if (this.pendingCursorTimer !== null) {
        clearTimeout(this.pendingCursorTimer);
      }
      this.pendingCursorTimer = setTimeout(() => {
        this.lastCursorBroadcastTime = Date.now();
        this._emitLocal('cursor_move', { cursor3D: this.localTelemetry.cursor3D });
        this.pendingCursorTimer = null;
      }, this.options.cursorDebounceMs - elapsed);
    }
  }

  /**
   * Update the local peer's active selection set.
   */
  public updateSelection(selectedIds: string[]): void {
    this.localTelemetry.selectionSet = selectedIds;
    this._emitLocal('selection_change', { selectionSet: selectedIds });
  }

  /**
   * Update the local peer's camera viewport.
   */
  public updateCamera(viewport: CameraViewport): void {
    this.localTelemetry.cameraViewport = viewport;
    this._emitLocal('camera_change', { cameraViewport: viewport });
  }

  /**
   * Update the local peer's active tool.
   */
  public updateActiveTool(tool: string): void {
    this.localTelemetry.currentTool = tool;
    this._emitLocal('presence_update', { currentTool: tool });
  }

  /**
   * Append a point to the local laser pointer trail and broadcast.
   * The trail is capped at `maxPoints` for performance.
   */
  public updateLaserTrail(point: Vec3, maxPoints: number = 20): void {
    const trail = this.localTelemetry.laserTrail ?? [];
    trail.push(point);
    if (trail.length > maxPoints) trail.shift();
    this.localTelemetry.laserTrail = trail;
    this._emitLocal('laser_update', { laserTrail: [...trail] });
  }

  /**
   * Clear the local peer's laser trail.
   */
  public clearLaserTrail(): void {
    this.localTelemetry.laserTrail = [];
    this._emitLocal('laser_update', { laserTrail: [] });
  }

  // ─── Remote presence ingestion ────────────────────────────────────────────

  /**
   * Ingest a remote presence event received over the network transport.
   * Merges the partial telemetry patch into the peer store.
   */
  public ingestRemotePresence(event: PresenceEvent): void {
    const { peerId, telemetry, type } = event;

    // Don't ingest our own echoed broadcasts
    if (peerId === this.localPeerId) return;

    const existing = this.peerStore.get(peerId);
    const merged: PeerPresenceTelemetry = {
      ...(existing ?? {
        peerId,
        displayName: telemetry.displayName ?? peerId,
        role: telemetry.role ?? 'viewer',
        color: telemetry.color ?? '#94a3b8',
        status: 'online',
        selectionSet: [],
        physicalTimestamp: 0,
      }),
      ...telemetry,
      peerId,
      physicalTimestamp: event.timestamp,
    } as PeerPresenceTelemetry;

    this.peerStore.set(peerId, merged);

    // Determine refined event type based on previous state
    const eventType = existing?.status === 'offline' && merged.status !== 'offline'
      ? 'peer_online'
      : type;

    this._emitToHandlers({ type: eventType, peerId, telemetry, timestamp: event.timestamp });
  }

  // ─── Peer queries ──────────────────────────────────────────────────────────

  public getLocalTelemetry(): PeerPresenceTelemetry {
    return { ...this.localTelemetry };
  }

  public getRemotePeer(peerId: string): PeerPresenceTelemetry | undefined {
    return this.peerStore.get(peerId);
  }

  public getOnlinePeers(): PeerPresenceTelemetry[] {
    return Array.from(this.peerStore.values()).filter(p => p.status !== 'offline');
  }

  public getAllKnownPeers(): PeerPresenceTelemetry[] {
    return Array.from(this.peerStore.values());
  }

  // ─── Event system ──────────────────────────────────────────────────────────

  public on(handler: PresenceEventHandler): () => void {
    this.handlers.push(handler);
    return () => {
      const i = this.handlers.indexOf(handler);
      if (i !== -1) this.handlers.splice(i, 1);
    };
  }

  // ─── Internals ─────────────────────────────────────────────────────────────

  private _emitLocal(type: PresenceEventType, patch: Partial<PeerPresenceTelemetry>): void {
    const event: PresenceEvent = {
      type,
      peerId: this.localPeerId,
      telemetry: { ...patch, peerId: this.localPeerId },
      timestamp: Date.now(),
    };
    this._emitToHandlers(event);
  }

  private _emitToHandlers(event: PresenceEvent): void {
    for (const handler of this.handlers) {
      try { handler(event); } catch { /* preserve broadcaster stability */ }
    }
  }

  private _checkPeerTimeouts(): void {
    const now = Date.now();
    for (const [peerId, peer] of this.peerStore.entries()) {
      if (peer.status === 'offline') continue;
      const age = now - peer.physicalTimestamp;
      if (age > this.options.peerTimeoutMs) {
        peer.status = 'offline';
        this._emitToHandlers({
          type: 'peer_offline',
          peerId,
          telemetry: { status: 'offline' },
          timestamp: now,
        });
      }
    }
  }

  private _dist3(a: Vec3, b: Vec3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}
