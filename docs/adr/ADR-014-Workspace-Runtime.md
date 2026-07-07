# ADR 014: Workspace Runtime as the OS Layer

## Status
Accepted

## Context
BeamLab aims to become an Engineering Operating System, meaning its UI cannot function as a set of isolated React components holding local state. Instead, it requires a unified system where every interaction is deeply understood, observed, and synchronized—specifically so Archie, the AI copilot, can interpret the exact engineering context the user is working within.

Previously, state like panel sizes, active tabs, and canvas selections were scattered. If a user selected a steel beam on the canvas, the Property Inspector might update, but Archie remained completely unaware unless the user manually prompted: "I am looking at Beam 12".

## Decision
We have established `@beamlab/workspace-runtime` as the single source of truth for all UI session state, replacing localized component states with an event-driven operating layer.

### 1. Centralized Workspace API
All interactions now flow through the `workspace` singleton:
```typescript
workspace.select(['beam-12'])
workspace.focus('analysis-node-1')
workspace.notifications.notify(...)
workspace.commands.executeCommand('optimize')
```

### 2. Session Persistence Abstraction
We introduced the `WorkspacePersistence` interface. Instead of hardcoding `localStorage.setItem`, we use `LocalStorageAdapter`. 
This allows:
- **Session Migration**: Migrating from v1 schema to v2 automatically.
- **Future Flexibility**: Swapping to Cloud Persistence or Enterprise Persistence without touching any UI code.

### 3. Workspace Profiles Architecture
We designed `WorkspaceProfiles` to support context switching. An engineer can switch from "Structural Analysis" to "Reporting", and the Workspace Runtime will automatically restore panel layouts, toolbars, and Archie configurations specific to that task.

### 4. Cross-Synchronization & Event Bus
Components no longer pass props directly. The Canvas, Timeline, Property Inspector, and Archie Sidebar all listen to `WorkspaceEventBus`. If Archie requests highlighting, it emits `HighlightRequested`, and the Canvas visually pulses the object—all fully decoupled.

## Consequences
- **Positive**: Archie can now continuously ingest the state of the workspace without user prompting. The UI behaves like a cohesive operating system.
- **Positive**: We can support multi-monitor docking and floating windows later because panel state is strictly decoupled from the DOM.
- **Negative**: Adds overhead to simple UI features; a new button must register its action through the `CommandRegistry` rather than simply attaching an `onClick` handler.
