# ADR 013: Interactive Execution Intelligence

## Status
Accepted

## Context
BeamLab must provide a fully transparent view of Archie's execution graph. This means replacing the simple sequential list of actions with a visual directed acyclic graph (DAG) representing the plan, dependencies, and execution states. We must do this without reinventing graph primitives (pan, zoom, layout), but we must ensure BeamLab's core logic is not tightly coupled to a 3rd party UI library.

## Decisions

### 1. The Execution Graph Rendering
We adopt **React Flow (`@xyflow/react`)** and **`dagre`** for the Interactive Execution Graph. However, they are abstracted behind the `IGraphRenderer` interface inside the new `@beamlab/execution-graph` package.
This decoupling ensures that if we later require a WebGL/Three.js renderer for massive 100k+ node graphs, the core execution engine remains unchanged.

### 2. Workspace Runtime Architecture
Instead of scattering selection, focus, viewport, and events across multiple isolated stores, we introduced the **Workspace Runtime** (`@beamlab/workspace-runtime`). 
This package serves as the single source of truth for UI state, exposing a unified `WorkspaceAPI` (e.g., `workspace.select()`, `workspace.highlight()`). It communicates purely via the `WorkspaceEventBus`.

### 3. Canvas ↔ Archie Synchronization
With the introduction of the Workspace Runtime, bidirectional sync is established. When a user clicks a node in the 3D Canvas, a `SelectionChanged` event is emitted. The `FocusEngine` automatically shifts engineering focus, which the `Engineering Context Engine` intercepts to prepare the LLM context.

### 4. Replay System
The `useTimelineStore` has been augmented with a Replay Engine. It can now iterate sequentially over stored events, publishing them at controlled intervals. Because both the Timeline Panel and Execution Graph listen to the same event stream, they perfectly animate in sync during replay.

## Consequences
- The separation of `workspace-runtime` sets a scalable foundation for future Proactive Intelligence (Recommendations) and Multi-Agent Collaboration without UI spaghettification.
- We get a professional-grade execution visualizer out of the box using React Flow while protecting our domain logic.
