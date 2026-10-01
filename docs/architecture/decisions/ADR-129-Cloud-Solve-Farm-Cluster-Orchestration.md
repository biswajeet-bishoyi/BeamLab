# ADR-129: Cloud Solve Farm Cluster Orchestration & Priority Scheduling

## Status
Accepted

## Context
Massive finite element models, non-linear cable dynamics, high-velocity blast time-integration, and slope stability search meshes exceed single-machine in-browser client compute and memory capacities. A distributed multi-tenant compute farm is required to coordinate worker clusters, manage priority job scheduling, track worker node heartbeats, and guarantee automatic task failover.

## Decision
We implemented `@beamlab/solve-farm` cluster orchestration architecture:
1. **Worker Topology & Registration**:
   - `WorkerNode` interface maintaining hardware attributes (vCPU count, total/used RAM in MB, GPU accelerators like NVIDIA H100/A100), geographic regions (`us-east-1`, `eu-west-1`, `ap-southeast-1`), supported solver algorithm capabilities, and active job tracking.
   - Dynamic worker registration, graceful draining, and offline removal.
2. **Heartbeat Pruning & Fault Tolerance**:
   - Periodic heartbeat telemetry (`heartbeatTimestamp`). Nodes exceeding the 30-second heartbeat timeout threshold are marked `offline`, and uncompleted jobs are re-queued into the pending queue.
3. **Multi-tier Priority Scheduler**:
   - Three-level priority queuing (`interactive` [P0], `standard` [P1], and `batch` [P2]).
   - Worker assignment dispatches highest-priority jobs to idle nodes matching solver requirements (e.g. GPU-accelerated explicit dynamics or sparse factorization).

## Consequences
- Enables high-throughput distributed parallel analysis for large structural assemblies.
- Protects interactive user responsiveness by giving real-time browser solves strict scheduling priority over background batch optimizations.
