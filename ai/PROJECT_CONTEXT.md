# 📖 BeamLab Project Context (The Wiki)

This document is the master context and "Wikipedia" for BeamLab. It explains why the project exists, how it is organized, the exact request-to-execution pipeline, and the inner workings of every engine and package in the codebase.

---

## 1. What is BeamLab?

BeamLab is a browser-first, next-generation structural engineering platform. Unlike legacy desktop engineering software which relies on static form inputs, offline batch analysis, and outdated interfaces, BeamLab is built on the premise that **structural mechanics should feel alive**.

### Core Pillars
1.  **Live-First**: Analysis runs continuously in the background. Moving a support or dragging a load recomputes and animates force diagrams, deflection curves, and reactions at 60 FPS.
2.  **Rigor & Correctness**: All structural calculations are verified against hand-calculated references in [docs/verification/](file:///c:/kanha/college/projects/BeamLab/docs/verification) before merging. Correctness is non-negotiable.
3.  **Explainability**: Every number displayed can be clicked to reveal its governing formula, derivation steps, and standard building code citations.
4.  **AI Collaboration (Archie)**: Archie is a persistent AI assistant built directly into the workspace shell with full read/write access to the model, capable of planning, executing, and justifying design decisions.

---

## 2. Monorepo Organization

BeamLab is managed as a **pnpm monorepo** with **Turborepo** configurations.

### 2.1 Applications (`/apps`)
*   **`apps/web`**: The React + Vite frontend SPA. It implements the main IDE interface, 3D WebGL Canvas, 2D charts, and the Archie workspace.
*   **`apps/api-gateway`** (or `services/api`): The Express server backend that handles user authentication, serves projects, and routes requests to the solver and AI microservices.

### 2.2 Shared Utilities (`/packages`)
*   **`@beamlab/types`**: Shared TypeScript definitions, types, DTOs, and interface boundaries.
*   **`@beamlab/validation`**: Central Zod schemas used to validate inputs at all API and import boundaries.
*   **`@beamlab/utils`**: Pure helper utilities, common error wrappers, and the global Pino logger.
*   **`@beamlab/events`**: Structured event contracts used for communication between platform engines and event buses.

---

## 3. Core Architectural Layers

The codebase separates math and engineering logic from UI rendering:

```
┌─────────────────────────────────────────────────────────┐
│  Presentation Layer  (React web components, WebGL/SVG)  │
├─────────────────────────────────────────────────────────┤
│  Interaction Layer    (Draggable canvas, keyboard sync) │
├─────────────────────────────────────────────────────────┤
│  Application State    (Zustand store, command history)  │
├─────────────────────────────────────────────────────────┤
│  Domain / Core Engine  (Pure structural model & solvers) │
├─────────────────────────────────────────────────────────┤
│  Services / OS Layer   (Kernel, EKP, EPE, ERM, Solvers) │
└─────────────────────────────────────────────────────────┘
```

*   **Domain / Core Engine (`packages/core-engine`)**: Independent TypeScript library containing structural models (Nodes, Elements, Supports, Loads) and mathematical solvers. It has **zero dependencies** on React or the DOM, allowing it to run headlessly in workers or node environments.
*   **Presentation Layer (`apps/web` and `packages/renderer`)**: Listens to state selectors and draws the screen. It is mathematically passive.
*   **Interaction Layer**: Intercepts gestures (dragging nodes/loads) and dispatches commands.
*   **Application State**: Single source of truth. Mutations in the model slice are strictly managed via serializable `Command` objects, which support infinite undo/redo, timeline playback, and multi-user sync.

---

## 4. The Compilation & Execution Pipeline

When a user prompts Archie or invokes a workflow, the request flows through a decoupled planning and execution pipeline:

```
User Request ──► [Planning Engine] ──► Immutable Execution Plan
                                                │
                                                ▼
User Feedback/◀─ [Execution Graph Engine] ◄─────┘
Approval Gate                                   │
                                                ▼
             [Task Scheduler] ◄──────── Immutable DAG (DFS Checked)
                    │
                    ▼
             Node Execution ──► [Solver Runtime] ──► Result
```

### 4.1 Planning Engine Core (`@beamlab/planning-engine`)
Translates natural-language intent into an immutable `ExecutionPlan` detailing "what should happen". It classifications intent, resolves required tools, estimates execution cost, evaluates safety constraints, and schedules human-in-the-loop approval steps.

### 4.2 Execution Graph Engine (`@beamlab/execution-graph`)
Converts the sequential `ExecutionPlan` into a strongly typed Directed Acyclic Graph (DAG). The EGE answers "how tasks are connected," performing topological sorting and Depth-First Search (DFS) cycle detection to guarantee that dependencies resolve safely before scheduling.

### 4.3 Task Scheduler (`@beamlab/task-scheduler`)
The execution orchestrator. It processes DAG nodes according to their topological order within a sub-10ms scheduling latency budget. It tracks execution paths via a centralized `TracingEngine` (which injects correlation IDs into all logs) and emits standardized event hooks (e.g. `NodeStarted`, `NodeCompleted`).

---

## 5. Platform Subsystems (The OS Layer)

Archie runs a series of core services representing the "Engineering Operating System":

### 5.1 Workspace Runtime (`@beamlab/workspace-runtime`)
Handles synchronization across the multi-panel workspace. If a user selects a beam on the WebGL canvas, the Workspace Runtime publishes a selection event over the `WorkspaceEventBus`. The property panel updates, and Archie adjusts its active conversational context in real time.

### 5.2 Engineering Knowledge Platform (EKP) (`@beamlab/knowledge-platform`)
Provides Archie and other services with read-only access to standard design codes (AISC, Eurocode), material constants, and mathematical derivations. EKP maps items as a connected graph, enabling explainable keyword and vector search (RAG) with strict source citation constraints.

### 5.3 Engineering Policy Engine (EPE) (`@beamlab/policy-engine`)
The governance layer. It compiles validation rules into a strongly typed Abstract Syntax Tree (AST) to evaluate structural modifications and agent executions, returning formal `Allow`, `Deny`, or `RequireApproval` decisions.

### 5.4 Engineering Resource Manager (ERM) (`@beamlab/resource-manager`)
Manages standard catalogs of steel profiles (W-shapes, I-beams) and concrete grades, separating concrete properties and geometric shapes into strongly typed schemas loaded by providers.

### 5.5 Solver Integration Framework (SIF) (`@beamlab/solver-runtime`)
Handles the lifecycle, queueing, and execution of numerical solver engines. Specialized solver adapters (e.g. `OpenSeesAdapter`, `CalculiXAdapter`) plug into SIF to execute heavy linear/nonlinear analysis tasks off the main thread.

### 5.6 Engineering Reasoning Engine (`@beamlab/engineering-reasoning`)
Extracts raw numbers from solver results and compiles them into logical, written justifications. It aggregates confidence metrics from multiple independent contributors (Model Quality, Knowledge Match) to compile senior-engineer sign-off reports.

---

## 6. Multi-Agent Framework (`@beamlab/agent-framework`)

Heavy engineering tasks are delegated to a team of specialized agents:

*   **Sandboxing**: Agents execute in isolated sandbox environments (`IAgentSandbox`) that manage execution timeouts and track memory footprints.
*   **Negotiation**: Agents advertise their expertise using capability manifests. The Kernel selects the agent matching the task with the highest confidence.
*   **Memory Scopes**: Decoupled memory scopes partition data into `session`, `conversation`, `agent_private`, and `agent_shared` to guarantee determinism.
*   **Structural Analysis Agent (`@beamlab/agent-structural-analysis`)**: Coordinates model parsing, solver execution, result interpretation, and explanation generation.
*   **Structural Design Agent (`@beamlab/agent-design`)**: Runs a separate `DesignPipeline` to evaluate constructability, check limits, and generate sizing recommendations.

---

## 7. Developer Studio & UI Features

The main web application features a **Developer Studio** designed for testing and observability:
*   **Interactive Engineering Canvas**: Direct WebGL/SVG viewport for dragging elements.
*   **Timeline Explorer**: Tracks intent classifications, planning steps, and streamed responses.
*   **Execution Graph Viewer**: Uses **React Flow** and **dagre** to render the scheduler's DAG live as tasks execute.
*   **Reasoning Inspector**: Evaluates agent confidence graphs, justifications, and active policies.
