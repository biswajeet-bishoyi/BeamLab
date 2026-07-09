# 📊 BeamLab Current Status & Memory Index

This document tracks where BeamLab stands today, listing completed components, current sprint objectives, and an **AI Memory Index** to quickly route questions to the correct codebase files.

---

## 1. Project Metadata

*   **Current Version**: `0.8.0-task-scheduler` (Alpha)
*   **Architecture Status**: Stable
*   **Target Milestones Completed**: 1 through 9.1
*   **Current Focus**: Beta Preparation & Multi-Agent Collaboration (Phase 3)

---

## 2. Component Checklist

### 2.1 Core Infrastructure
*   **[x] Runtime Gateway**: Event streaming, SSE pipeline, REST handlers.
*   **[x] Archie Kernel**: Core system lifecycle and session bootstrapper.
*   **[x] Task Scheduler**: High-performance DAG event loop, health registry, TracingEngine.
*   **[x] Execution Graph Engine**: Immutable Directed Acyclic Graphs, DFS cycle detection.
*   **[x] Workspace Runtime**: Panel state synchronization, profiles, persistence.
*   **[x] Memory System**: Namespaced scopes (session, conversation, private, shared).

### 2.2 Domain & Intelligence
*   **[x] Knowledge Platform (EKP)**: Static provider, relation graph engine, explainable query interface.
*   **[x] Policy Engine (EPE)**: AST-based expression compiler and evaluator.
*   **[x] Resource Manager (ERM)**: Steel and Concrete properties and catalog indexing.
*   **[x] Solver Runtime (SIF)**: Execution sandbox, solver adapter registry.
*   **[x] Engineering Reasoning**: Pluggable strategies, confidence aggregator, justification engine.

### 2.3 Specialist Agents
*   **[x] Structural Analysis Agent**: Model validator, analysis planner, solver abstraction, result interpreter.
*   **[x] Structural Design Agent**: Framework for alternative evaluation and design code compliance checking.
*   **[ ] Optimization Agent**: (Upcoming) Automated section and material sizing.
*   **[ ] Code Compliance Agent**: (Upcoming) Deep check against design standards.
*   **[ ] Workflow Orchestrator**: (Upcoming) Multi-agent synchronization.

---

## 3. Sprint Focus & Roadmap

We are transitioning from **Phase 2 (Intelligence & Planning)** to **Phase 3 (Advanced Agents & Collaboration)**:

1.  **Solver Integration Framework (SIF) Cloud Extensions**: Integrating cloud solvers (OpenSees, CalculiX) into the solver runtime queue.
2.  **Structural Design Agent Refinement**: Activating the `DesignPipeline` to generate live steel member recommendations.
3.  **Multi-Agent Communication Loops**: Refining negotiation pipelines between the Analysis Agent and the Design Agent.

---

## 4. 🧠 AI Memory Index (FAQ Router)

Use this index to quickly resolve where specific topics, code rules, or architectures are implemented or documented.

| Question | Primary Reference File | Secondary Reference / ADR |
|---|---|---|
| **Where is the Solver Runtime documented?** | [PROJECT_CONTEXT.md](file:///c:/kanha/college/projects/BeamLab/ai/PROJECT_CONTEXT.md#37-solver-runtime--integration-framework-sif) | [ADR-020: Solver Framework](file:///c:/kanha/college/projects/BeamLab/docs/adr/ADR-020-Solver-Integration-Framework.md) |
| **How do agents communicate with each other?** | [PROJECT_CONTEXT.md](file:///c:/kanha/college/projects/BeamLab/ai/PROJECT_CONTEXT.md#4-multi-agent-framework) | [ADR-018: Multi-Agent Framework](file:///c:/kanha/college/projects/BeamLab/docs/adr/ADR-018-Multi-Agent-Framework.md) |
| **Where is the workspace panel layout defined?** | [apps/web/src/components/layout/](file:///c:/kanha/college/projects/BeamLab/apps/web) | [ADR-009: Workspace Architecture](file:///c:/kanha/college/projects/BeamLab/docs/adr/ADR-009-Workspace-Architecture.md) |
| **What are the mathematical sign conventions?** | [CLAUDE.md: §14.2](file:///c:/kanha/college/projects/BeamLab/CLAUDE.md#L400-L407) | [PROJECT_CONTEXT.md](file:///c:/kanha/college/projects/BeamLab/ai/PROJECT_CONTEXT.md) |
| **How is state mutation handled?** | [CLAUDE.md: §7.3](file:///c:/kanha/college/projects/BeamLab/CLAUDE.md#L269-L274) | [PROJECT_CONTEXT.md](file:///c:/kanha/college/projects/BeamLab/ai/PROJECT_CONTEXT.md#2-high-level-architecture) |
| **What is the coordinate system?** | [CLAUDE.md: §14.2](file:///c:/kanha/college/projects/BeamLab/CLAUDE.md#L400-L407) | [PRD.md: Domain Specification](file:///c:/kanha/college/projects/BeamLab/PRD.md) |
| **How does the AI timeline track tasks?** | [apps/web/src/store/useTimelineStore.ts](file:///c:/kanha/college/projects/BeamLab/apps/web) | [ADR-012: Intelligence Timeline](file:///c:/kanha/college/projects/BeamLab/docs/adr/ADR-012-Engineering-Intelligence-Timeline.md) |
| **Where do I add design codes or materials?** | [packages/knowledge-platform/](file:///c:/kanha/college/projects/BeamLab/packages/knowledge-platform) | [ADR-015: Knowledge Platform](file:///c:/kanha/college/projects/BeamLab/docs/adr/ADR-015-Engineering-Knowledge-Platform.md) |
| **How is policy logic checked?** | [packages/policy-engine/](file:///c:/kanha/college/projects/BeamLab/packages/policy-engine) | [ADR-016: Policy Engine](file:///c:/kanha/college/projects/BeamLab/docs/adr/ADR-016-Engineering-Policy-Engine.md) |
| **What are the rules for adding a new module?** | [CLAUDE.md: §51](file:///c:/kanha/college/projects/BeamLab/CLAUDE.md#L800) | [ADR-022: Independent Pipelines](file:///c:/kanha/college/projects/BeamLab/docs/adr/ADR-022-Structural-Design-Agent.md) |
