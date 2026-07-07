# CHANGELOG

## [Unreleased]
### Added
- **Task Scheduler (`@beamlab/task-scheduler`)**: Implemented the core execution orchestrator.
  - Implemented `SchedulerRuntime` with sub-10ms performance budgets for DAG execution.
  - Implemented `TracingEngine` for deep distributed tracing and structured logging.
  - Implemented `HealthRegistry` and `MetricsCollector` for runtime diagnostics.
  - Implemented `SchedulerEventPublisher` for lifecycle observability.
  - Created `ADR-008-Task-Scheduler.md` documenting the architecture.
- **Execution Graph Engine (`@beamlab/execution-graph`)**: Implemented the graph transformation layer to turn Execution Plans into DAGs.
  - Implemented immutable `ExecutionGraph` models.
  - Implemented `DependencyResolver` with DFS cycle detection and topological sorting.
  - Implemented subsystems: `GraphBuilder`, `GraphValidator`, `GraphOptimizer`, `GraphSerializer`, `GraphInspector`.
  - Created `ADR-007-Execution-Graph.md` documenting the DAG architecture.
- **Planning Engine Core (`@beamlab/planning-engine`)**: Implemented the foundational planning orchestration module.
  - Implemented immutable `ExecutionPlan` contract.
  - Implemented `IntentClassifier` for identifying conversational intent.
  - Implemented `RulePlanner` for deterministic engineering workflows.
  - Implemented subsystems: `ToolResolver`, `ConstraintEngine`, `ApprovalPlanner`, `CostEstimator`, `PlanValidator`, and `PlanExplainer`.
- Integrated Planning Engine with `archie-kernel` `IPlanner` interface.
- Created `ADR-006-Planning-Engine.md` documenting architecture.

### Changed
- Decoupled Planning from Execution at the architectural level.
