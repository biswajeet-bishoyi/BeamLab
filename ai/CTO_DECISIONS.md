# 📜 BeamLab CTO Decisions Register

This document serves as the permanent register of all architectural decisions made for BeamLab. It establishes the core engineering rules and summarizes all Architectural Decision Records (ADRs) from ADR-006 through ADR-022.

---

## 🏛️ Fundamental Decisions

These decisions form the engineering foundation of BeamLab and govern all subsystems.

### Decision #001: Flat Package Hierarchy
*   **Context**: Monorepos can become deeply nested, making navigation and build configurations complex.
*   **Decision**: All packages must reside in a flat directory under `/packages/` (e.g. `packages/core-engine`, `packages/agent-structural-analysis`), rather than being nested (e.g. `packages/agents/structural-analysis`).
*   **Status**: Permanent

### Decision #002: Loose Coupling via Events
*   **Context**: Direct component/agent communication creates circular dependencies and rigid code.
*   **Decision**: Subsystems must interact asynchronously using the centralized event buses (e.g. `WorkspaceEventBus` or `AgentCommunicationBus`).
*   **Status**: Permanent

### Decision #003: Core Engine Isolation
*   **Context**: Coupling mathematical solver logic with the DOM or React makes it non-reusable.
*   **Decision**: The domain model and numerical solvers must remain in `packages/core-engine` with **zero dependency** on React or UI libraries.
*   **Status**: Permanent

### Decision #004: SI Units Discipline
*   **Context**: Floating-point conversions throughout the solver code lead to rounding errors and safety bugs.
*   **Decision**: All internal storage, database tables, API payloads, and calculations are strictly in SI base/derived units. Unit conversion only happens at the UI presentation boundary.
*   **Status**: Permanent

### Decision #005: Command-Based State Mutation
*   **Context**: Standard state mutations make undo/redo, timeline playback, and multi-user sync hard to implement.
*   **Decision**: State mutations in `modelSlice` are strictly handled by dispatching serializable `Command` objects with paired `invert()` handlers.
*   **Status**: Permanent

---

## 📑 Architectural Decision Records (ADR) Summary

This section maps the records ADR-006 through ADR-022 to their respective context and decisions.

### [ADR-006: Planning Engine Architecture](file:///c:/kanha/college/projects/BeamLab/docs/adr/ADR-006-Planning-Engine.md)
*   **Status**: Accepted
*   **Context**: Decoupling intent parsing and execution to prevent non-deterministic system behaviors.
*   **Decision**: Separated planning from execution. The Planning Engine outputs an immutable `ExecutionPlan` detailing "what should happen" and delegates "when/how it runs" to the Graph and Scheduler.

### [ADR-007: Execution Graph Engine](file:///c:/kanha/college/projects/BeamLab/docs/adr/ADR-007-Execution-Graph.md)
*   **Status**: Accepted
*   **Context**: Translating sequential planning steps into execution paths handling loops, conditionals, and approvals.
*   **Decision**: Introduced the Execution Graph Engine (EGE), converting plans into Directed Acyclic Graphs (DAGs) verified for cycles via DFS prior to scheduling.

### [ADR-008: Task Scheduler](file:///c:/kanha/college/projects/BeamLab/docs/adr/ADR-008-Task-Scheduler.md)
*   **Status**: Accepted
*   **Context**: Processing DAG nodes under strict performance and observability guidelines.
*   **Decision**: Designed `@beamlab/task-scheduler` with a decoupled State Machine Event Loop, `TracingEngine` context injection, and strict graph-security size validation.

### [ADR-009: Workspace Panel Architecture](file:///c:/kanha/college/projects/BeamLab/docs/adr/ADR-009-Workspace-Architecture.md)
*   **Status**: Accepted
*   **Context**: Arranging complex panels (Canvas, Property Explorer, AI Sidebar) into a responsive desktop-like layout.
*   **Decision**: Implemented a 3-panel architecture with `react-resizable-panels` persisted to `localStorage` via Zustand, plus global hotkeys to toggle panel views.

### [ADR-010: Archie Workspace & Client](file:///c:/kanha/college/projects/BeamLab/docs/adr/ADR-010-Archie-Workspace.md)
*   **Status**: Accepted
*   **Context**: Isolating UI elements from LLM API latency to support offline UI development.
*   **Decision**: Standardized interactions behind the `IArchieClient` interface consumed via `<ArchieProvider>`, backed by a mock client for offline development.

### [ADR-011: Runtime Gateway Integration](file:///c:/kanha/college/projects/BeamLab/docs/adr/ADR-011-Archie-Runtime-Integration.md)
*   **Status**: Accepted
*   **Context**: Connecting the web application directly to the backend `runtime-gateway`.
*   **Decision**: Implemented the `ITransport` abstraction with `LocalRuntimeTransport` running directly inside Vite for client-side evaluation of Server-Sent Events (SSE).

### [ADR-012: Engineering Intelligence Timeline](file:///c:/kanha/college/projects/BeamLab/docs/adr/ADR-012-Engineering-Intelligence-Timeline.md)
*   **Status**: Accepted
*   **Context**: Visualizing AI execution steps transparently without blocking active chat sessions.
*   **Decision**: Created a timeline panel docked beneath the AI Chat, mapping raw runtime events to distinct engineering lifecycle stages (Intent, Plan, Solve, Reasoning).

### [ADR-013: Interactive Execution Graph](file:///c:/kanha/college/projects/BeamLab/docs/adr/ADR-013-Interactive-Execution-Intelligence.md)
*   **Status**: Accepted
*   **Context**: Rendering the active execution DAG with zoom, pan, focus, and state tracking.
*   **Decision**: Adopted React Flow and dagre under a decoupled `IGraphRenderer` contract, linking execution node states directly to the timeline.

### [ADR-014: Workspace Runtime OS Layer](file:///c:/kanha/college/projects/BeamLab/docs/adr/ADR-014-Workspace-Runtime.md)
*   **Status**: Accepted
*   **Context**: Coordinating canvas selection, property inspectors, and AI context without nested states.
*   **Decision**: Established `@beamlab/workspace-runtime` as the UI OS layer with a global event bus (`WorkspaceEventBus`), session persistence, and task profiles.

### [ADR-015: Engineering Knowledge Platform (EKP)](file:///c:/kanha/college/projects/BeamLab/docs/adr/ADR-015-Engineering-Knowledge-Platform.md)
*   **Status**: Accepted
*   **Context**: Providing Archie with a structured, queryable citation database of structural codes and formulas.
*   **Decision**: Developed `@beamlab/knowledge-platform` to manage design codes as a graph of related items retrieved via explainable keyword/vector engines.

### [ADR-016: Engineering Policy Engine (EPE)](file:///c:/kanha/college/projects/BeamLab/docs/adr/ADR-016-Engineering-Policy-Engine.md)
*   **Status**: Accepted
*   **Context**: Implementing a central validation and approval layer for design decisions.
*   **Decision**: Built `@beamlab/policy-engine` utilizing strongly typed AST expressions to evaluate structural mutations and return formal `Allow`/`Deny`/`Warning` decisions.

### [ADR-017: Engineering Resource Manager (ERM)](file:///c:/kanha/college/projects/BeamLab/docs/adr/ADR-017-Engineering-Resource-Manager.md)
*   **Status**: Accepted
*   **Context**: Structuring standard steel profiles and concrete material catalog definitions.
*   **Decision**: Created `@beamlab/resource-manager` to declare strongly typed schemas (Steel, Concrete) loaded through static and dynamic providers.

### [ADR-018: Multi-Agent Framework](file:///c:/kanha/college/projects/BeamLab/docs/adr/ADR-018-Multi-Agent-Framework.md)
*   **Status**: Accepted
*   **Context**: Sandboxing and coordinating specialist AI agents (Analyzer, Designer).
*   **Decision**: Formulated `@beamlab/agent-framework` handling agent capability negotiation, sandbox environment isolation, and communication bus routing.

### [ADR-018A: Agent Memory System (AMS)](file:///c:/kanha/college/projects/BeamLab/docs/adr/ADR-018A-Agent-Memory-System.md)
*   **Status**: Accepted
*   **Context**: Standardizing memory lifetimes and snapshot capabilities for replay support.
*   **Decision**: Decoupled memory from the framework into `@beamlab/memory-system`, scoping storage to `session`, `conversation`, `agent_private`, and `agent_shared`.

### [ADR-019: Structural Analysis Agent Core](file:///c:/kanha/college/projects/BeamLab/docs/adr/ADR-019-Structural-Analysis-Agent-Core.md)
*   **Status**: Accepted
*   **Context**: Structuring the first specialist agent for solving and explaining engineering models.
*   **Decision**: Built `@beamlab/agent-structural-analysis` wrapping validation, planning, solver abstraction, and reasoning into a dedicated sequential pipeline.

### [ADR-020: Solver Integration Framework (SIF)](file:///c:/kanha/college/projects/BeamLab/docs/adr/ADR-020-Solver-Integration-Framework.md)
*   **Status**: Accepted
*   **Context**: Standardizing how agents execute external numerical solvers (OpenSees, CalculiX).
*   **Decision**: Created the Solver Integration Framework (`@beamlab/solver-runtime`) to register adapters and run calculation jobs off the main UI/Agent threads.

### [ADR-021: Engineering Intelligence Layer](file:///c:/kanha/college/projects/BeamLab/docs/adr/ADR-021-Engineering-Intelligence-Layer.md)
*   **Status**: Accepted
*   **Context**: Reusing reasoning structures across multiple design and analysis agents.
*   **Decision**: Extracted reasoning into `@beamlab/engineering-reasoning`, defining pluggable strategies, confidence aggregators, and senior-engineer sign-off justifications.

### [ADR-022: Structural Design Agent](file:///c:/kanha/college/projects/BeamLab/docs/adr/ADR-022-Structural-Design-Agent.md)
*   **Status**: Accepted
*   **Context**: Extending BeamLab to generate structural alternative recommendations without tangling analysis code.
*   **Decision**: Created the independent Design Agent (`@beamlab/agent-design`) running its own `DesignPipeline`, standardizing agent lifecycles via `IEngineeringPipeline`.
