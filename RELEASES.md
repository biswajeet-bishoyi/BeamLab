# RELEASES

## v0.8.0-task-scheduler
**Date**: 2026-07-06

This release introduces the **Task Scheduler**, the core execution orchestrator for the Archie Kernel. It processes DAGs output by the Execution Graph Engine while adhering to extremely strict performance budgets.

### Key Features
- **High-Performance Event Loop**: Sub-10ms performance budgets for Graph execution.
- **Deep Observability**: TracingEngine injects Correlation IDs across the entire request lifecycle.
- **Robust Health Registry**: Exposes deep diagnostics for runtime monitoring and self-healing.
- **Strict Security Boundaries**: Rejects malformed or overly deep DAGs to prevent queue poisoning.

## v0.7.0-execution-graph
**Date**: 2026-07-06

This release introduces the **Execution Graph Engine (EGE)**, an essential bridging layer between planning and execution. EGE converts immutable plans into Directed Acyclic Graphs (DAGs), ensuring rigid dependency resolution, topological sorting, and cycle detection.

### Key Features
- **Immutable DAGs**: All `ExecutionGraph` outputs are highly encapsulated and non-mutable.
- **Dependency Resolution**: Depth-First Search (DFS) implementation completely guarantees safe topological ordering and prevents recursive execution cycles.
- **Strict Separation of Concerns**: The graph Engine answers *how* tasks are connected, but delegates *when* tasks run to the upcoming Scheduler.

## v0.6.0-planning-core
**Date**: 2026-07-06

This release introduces the **Planning Engine Core**, a highly decoupled intelligence orchestrator. It ensures that Archie can safely, immutably, and deterministically plan actions before execution. 

### Key Features
- **Immutable Plans**: Output plans cannot be modified, guaranteeing safety and reproducibility.
- **Rule Planners**: Strict determinism for standard engineering tasks.
- **Constraints & Approvals**: Evaluates risk profiles and prompts for Human-in-the-loop approvals before dangerous executions.
