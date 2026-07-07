# ADR 018A: Agent Memory System (AMS)

## Status
Accepted

## Context
BeamLab agents (and the Archie runtime) require structured memory to track state, conversations, and workspaces. Previously, memory was managed loosely within `agent-framework` using basic provider interfaces. This led to a lack of clear boundaries, making memory feel like a global mutable state, and complicating snapshots and determinism. Furthermore, as BeamLab grows, memory is required by more than just agents (e.g., Knowledge Platform, Replay Engine). 

## Decision
We will extract memory management from `agent-framework` into a standalone platform service layer:
1. **`@beamlab/memory-system`**: The core package defining `MemoryRecord`, `MemoryRegistry`, `SnapshotRegistry`, and providers.
2. **`@beamlab/memory-client`**: The SDK consumed by clients (agents, Archie) to interface with the memory system.

### Memory Scope Model
Memory is explicitly scoped to avoid global state. Supported scopes include:
- `session`
- `execution`
- `conversation`
- `workspace`
- `agent_private`
- `agent_shared`

### Storage and Namespacing
Instead of a generic `beamlab:memory` prefix, persistent storage (`LocalStorageProvider`) uses explicit namespaces to prevent collisions:
- `beamlab.memory.sessions`
- `beamlab.memory.snapshots`
- `beamlab.workspace.layout`

### Snapshot Architecture
Snapshots are treated as first-class entities with strict formatting to support deterministic replay and future compression/encryption:
```json
{
  "schemaVersion": 1,
  "snapshotVersion": 3,
  "createdAt": 1782390234,
  "checksum": "sha256-...",
  "payload": { ... }
}
```
A **Snapshot Registry** tracks metadata, restore strategies, and schema migrations. `ISnapshotMigrator` supports evolving schemas over time.

## Consequences
- **Positive**: Memory is isolated, explainable, and strongly typed.
- **Positive**: Snapshot architecture enables deterministic replay and robust state migrations.
- **Positive**: The dependency graph is inverted so that memory acts as a core platform service.
- **Negative**: Adds overhead for clients to use `MemoryClient` instead of direct object reference sharing.

## Migration
The existing interfaces in `agent-framework` are deprecated and exported as compatibility shims from `@beamlab/memory-client`. They will be removed in BeamLab v2.
