# ADR 008: Task Scheduler Architecture

## Context
Following the creation of the Execution Graph Engine (ADR-007), Archie requires an orchestration layer that takes an immutable DAG and executes its nodes in the correct topological order. This Scheduler must meet stringent performance budgets (<5ms queue insertion, <10ms scheduling latency) and expose robust health, metrics, and observability endpoints.

## Decision
We implement a highly decoupled, provider-agnostic **Task Scheduler (`@beamlab/task-scheduler`)**.

1. **State Machine Event Loop**: The Scheduler operates its own internal event loop decoupled from request routing, polling an internal queue to schedule graphs.
2. **First-Class Observability**: We mandate the use of a `TracingEngine` injecting `TraceContext` (Correlation ID, Request ID, Graph ID, Node ID) into every log statement.
3. **Event-Driven Lifecycle**: Execution transitions emit standardized lifecycle events (`GraphQueued`, `NodeStarted`, `NodeCompleted`, etc.) via `SchedulerEventPublisher`.
4. **Graph Security Validation**: To prevent queue poisoning or out-of-memory crashes, incoming graphs must pass a strict node count validation and dependency integrity check before enqueueing.

## Consequences
- **Pros**: The scheduler is completely agnostic of the compute provider, meaning we can seamlessly swap the simulated internal event loop with a Kubernetes or Cloud execution engine in the future without changing the architecture.
- **Cons**: The event loop introduces minor queue wait times, which must be constantly benchmarked against the strict 10ms budget.

## Future Extension Points
- **Distributed Scheduler**: Transitioning the event loop to pull from a distributed queue (e.g., Redis).
- **Edge Execution**: Compiling the DAG into a standalone web worker.
