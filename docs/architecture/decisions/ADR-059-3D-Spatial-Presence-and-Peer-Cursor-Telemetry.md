# ADR-059: 3D Spatial Presence and Peer Cursor Telemetry

## Status
Accepted

## Context
In collaborative multi-user BIM and structural engineering platforms, collaborators need real-time situational awareness of what peers are inspecting, selecting, and designing. In traditional 2D document editors, cursors are 2D screen-space points $(x, y)$. In a 3D structural engineering canvas:
1. **3D Spatial Cursors**: Engineers point to 3D physical coordinates $(x, y, z)$ on members, joints, or spatial grids.
2. **Camera Viewport Telemetry**: Collaborators need to observe peers' viewing angles (eye, target, up vectors) to facilitate design reviews and "Follow Mode".
3. **High Frequency / Network Bandwidth**: Raw mouse motion in 3D produces 60–120 events/sec. Broadcasting raw updates overwhelms WebSockets and peers.
4. **Ephemerality & Laser Pointers**: During structural walkthroughs, engineers need temporary laser pointer trails to trace load paths or highlight member groups without polluting model state.
5. **Peer Liveness & Heartbeats**: Stale peers must gracefully transition from `online` to `away` and `offline` when network connections drop.

## Decision
We implemented `PresenceBroadcaster` inside `packages/collaboration-engine/src/presence/`:

### 1. Telemetry Data Model
- `PeerPresenceTelemetry`: Encompasses `peerId`, `displayName`, `role` (`lead` | `modeler` | `checker` | `viewer`), `color`, `status` (`online` | `away` | `offline`), `cursor3D` ($\text{Vec3}$ in meters), `cameraViewport` (`eye`, `target`, `up`), `selectionSet` (`string[]`), `currentTool`, and `laserTrail` ($\text{Vec3}[]$).

### 2. Debouncing and Spatial Distance Thresholding
- `updateCursor3D` applies a minimum physical distance threshold (`cursorMoveThresholdM = 0.05m`) and a time debounce window (`cursorDebounceMs = 50ms`).
- Minor sub-millimeter jitters are ignored, reducing peer network traffic by >85% while preserving buttery-smooth visual motion.

### 3. Ephemeral Laser Pointer
- `updateLaserTrail` records temporary polyline points (capped at `maxPoints = 20`) for tracing load paths across frame members in real-time.
- Cleared via `clearLaserTrail()`.

### 4. Heartbeat and Automatic Peer Timeout
- Regular heartbeat timer (`heartbeatIntervalMs = 5000ms`) broadcasts local presence and inspects peer ages.
- Peered connections exceeding `peerTimeoutMs = 15000ms` without updates are automatically marked `offline` with an emitted `peer_offline` event.

### 5. Multi-Peer Broadcast & Local Ingestion
- `ingestRemotePresence(event)` safely integrates remote telemetry patches with timestamp comparison, ignoring local broadcast echoes.

## Consequences

### Positive
- High-efficiency spatial awareness with minimal network overhead.
- Immediate visual collaboration: engineers can see where teammates are pointing in 3D space.
- Decoupled from rendering engine: Three.js or WebGL renderers consume pure typed telemetry events.

### Trade-offs
- Network latency causes slight visual lag for remote 3D cursors; client-side interpolation (lerp) is recommended in the 3D renderer.
