# ADR-020: Solver Integration Framework (SIF)

## Status
Accepted

## Context
BeamLab needs to perform extensive numerical analysis (linear static, modal, buckling, nonlinear) on structural models. Currently, engineering agents like the Structural Analysis Agent interact with minimal, locally defined mock solvers. As we scale, we must support multiple robust solvers (e.g., OpenSees, CalculiX, Cloud solvers, GPU-accelerated solvers). 

If every agent directly manages solver lifecycle, dependencies, and queueing, the system will become heavily coupled, non-deterministic, and fragile.

## Decision
We will introduce the **Solver Integration Framework (SIF)** as a universal abstraction layer and core platform service.

1. **Separation of Concerns**: Agents interact with numerical solvers strictly through a universal `ISolverService` API provided by `@beamlab/solver-client`.
2. **Dedicated Runtime**: The `@beamlab/solver-runtime` package handles solver execution, lifecycle, health monitoring, queueing, and metrics.
3. **Platform Service Registry**: The `SolverRuntime` will be initialized and managed by the `ArchieKernel` as a core platform service alongside the Memory System, Context Engine, and Policy Engine.
4. **Adapter Architecture**: Specific solver engines (OpenSees, Abaqus, Cloud) will implement the `ISolverAdapter` interface and register with the `SolverRegistry` within the `SolverRuntime`.
5. **Initialization Order**: The `SolverRuntime` must be initialized *before* the `AgentRuntime` so that agents can discover available solver capabilities upon startup.

## Consequences
- **Positive**: Engineering agents are fully decoupled from numerical infrastructure.
- **Positive**: We can hot-swap solver engines or route jobs to the cloud without modifying agent logic.
- **Positive**: Centralized job queueing, diagnostics, and metrics via Developer Studio.
- **Negative**: Increases the complexity of the core kernel boot sequence and adds a new required service abstraction to the platform.
