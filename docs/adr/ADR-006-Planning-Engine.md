# ADR-006: Planning Engine Architecture

## Status
Accepted

## Context
BeamLab must have a robust AI orchestrator capable of planning complex structural engineering tasks. Planning is computationally expensive and requires deep contextual awareness. 
Previously, there was a risk of coupling execution logic with planning logic, leading to fragile, non-deterministic system behaviors. 
We need a standard model for separating the "planning phase" from the "execution phase" and standardizing how those phases interact.

## Decision
1. **Separation of Planning and Execution**: The Planning Engine will only answer "what should happen". It will never execute tools or agents itself. Execution is delegated strictly to the Kernel and Agent Orchestrator.
2. **Immutable Execution Plans**: The output of the Planning Engine is an immutable `ExecutionPlan` object. Once generated and frozen, it cannot be tampered with. This ensures auditing, debugging, and rollback predictability.
3. **Strategy Pattern for Planners**: The Planning Engine supports a provider-based `IPlanningStrategy` interface. We implemented the deterministic `RulePlanner` first to handle exact engineering operations. Future planners (like `AIPlanner`) can be injected seamlessly.
4. **Subsystems for Determinism**: By modularizing Tool Resolution, Constraint Evaluation, Approval Planning, and Cost Estimation into dedicated subsystems, we guarantee that all plans are validated for safety and compliance before reaching execution.

## Consequences
- **Positive**: Complete predictability. Explanations for every plan step are generated proactively, aiding debugging.
- **Positive**: Safe tool integration. Tools are validated before execution begins, avoiding mid-flight crashes.
- **Negative**: Increased latency for initial request processing, as the system must resolve tools, evaluate constraints, and estimate costs synchronously before generating a plan.
