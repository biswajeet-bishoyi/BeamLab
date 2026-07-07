# ADR 009: Workspace Architecture

## Status
Accepted

## Context
BeamLab requires a robust, scalable, and responsive application layout that can accommodate a highly complex engineering environment (3D canvases, 2D diagrams) simultaneously alongside a conversational AI agent (Archie) and structural property explorers. The layout must feel like a premium desktop IDE rather than a static webpage.

## Decision
We have decided to implement a persistent, resizable 3-panel architecture utilizing `react-resizable-panels`:
1. **Left Panel (Project Explorer)**: Dedicated to structural hierarchies, members, loads, and material properties.
2. **Center Panel (Engineering Workspace)**: The primary WebGL/Canvas viewport.
3. **Right Panel (Archie Workspace)**: The persistent AI assistant with tabs for Chat, Planning, Execution, and Context.

### Key Architectural Choices:
- **`react-resizable-panels`**: Chosen for its robust drag-to-resize behavior, panel collapse support, and accessibility features (ARIA).
- **Zustand Persistence**: Panel widths, collapsed states, and active tabs are persisted to `localStorage` via Zustand middleware, ensuring the workspace remembers the user's layout preferences perfectly upon reload.
- **Keyboard-First**: Global keyboard shortcuts (Ctrl+B, Ctrl+J) immediately toggle sidebar visibility without mouse interaction.

## Consequences
- **Positive**: The workspace feels deeply integrated and professional. Users with ultra-wide monitors can leverage all panels simultaneously, while laptop users can quickly collapse sidebars via keyboard shortcuts.
- **Positive**: The architecture is highly decoupled. The Center panel does not need to know about the Archie panel; they communicate purely via the Runtime Gateway and shared state.
- **Negative**: Adds DOM complexity with resize handles and flexbox constraints. We must carefully test responsive behavior on smaller viewports where 3 columns cannot fit.

## Future Evolution
The Center Workspace is currently a placeholder. In upcoming sprints, this will be replaced by the primary `canvas-engine`. The Archie Workspace will be wired to the `runtime-gateway` to stream real-time conversational intelligence.
