# ADR-133: Interactive Cloud Solve Farm Studio UI

## Status
Accepted

## Context
Engineers working on complex models require an integrated control plane within BeamLab to monitor cloud worker clusters, configure parallel domain decomposition, track real-time iterative convergence, and export native Python scientific automation scripts.

## Decision
We implemented `SolveFarmStudio` in `apps/web/src/features/farm/SolveFarmStudio.tsx`:
1. **Cluster Topology Tab**:
   - Live worker node metrics showing vCPU allocation, GPU accelerators (e.g. NVIDIA H100 / A100), RAM utilization bars, active job IDs, and node state tags (`idle`, `busy`).
   - One-click workload dispatch simulation.
2. **Domain Decomposition & FETI Tab**:
   - Subdomain count slider (2 to 16 partitions), solver selection (`schur-complement-feti`, `direct-sparse`, `pcg-iterative`, `explicit-dynamics`), priority selector (`interactive`, `standard`, `batch`), and residual target tolerance.
   - Subdomain statistics: Total DOFs, interface boundary DOFs, interior eliminated DOFs, and theoretical parallel speedup.
   - Real-time convergence residual trace chart displaying logarithmic residual decay $\log_{10}(\|r_k\|)$ per iteration.
3. **Python Scientific SDK Tab**:
   - Dynamic code generation producing executable Python scripts tailored to the active BeamLab workspace model.
   - One-click clipboard copy and syntax-highlighted editor view.

## Consequences
- Bridges desktop/browser modeling with high-performance distributed cloud computation and scientific Python automation.
