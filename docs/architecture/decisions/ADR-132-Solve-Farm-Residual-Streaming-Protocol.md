# ADR-132: Solve Farm Real-Time Convergence Residual Streaming Protocol

## Status
Accepted

## Context
Long-running non-linear iterations (e.g. geometric non-linearity in cable stay tuning, plastic hinging under blast dynamics, or FETI interface conjugate gradient steps) must not be a black box to the user. Engineers need continuous streaming visibility into convergence residuals, energy norms, and iteration timings to detect divergence early.

## Decision
We established the Solve Farm streaming protocol:
1. **Convergence Metric Payload (`ConvergenceIterationMetric`)**:
   - `step`: Load step or time step index.
   - `iteration`: Sub-iteration counter within the current step.
   - `residualNorm`: Relative Euclidean residual norm $\frac{\|r_k\|}{\|r_0\|}$.
   - `displacementNorm`: Incremental displacement norm $\Delta u_k$.
   - `energyNorm`: Incremental energy norm $\Delta u_k^T r_k$.
   - `isConverged`: Boolean flag indicating when residual meets target tolerance $\epsilon_{tol}$.
   - `timestampMs`: Elapsed wall-clock time in milliseconds.
2. **Streaming Interface**:
   - `ClusterManager` and `SolveFarmClient` expose an asynchronous generator yielding `ConvergenceIterationMetric` events in real-time.

## Consequences
- Guarantees immediate visual feedback and early cancellation for divergent solves, saving cloud compute costs.
