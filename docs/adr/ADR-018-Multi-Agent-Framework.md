# ADR 018: Multi-Agent Framework & Sandbox Architecture

## Context
BeamLab aims to support a highly extensible and orchestrated multi-agent architecture where the core AI (Archie) acts as a kernel that can spawn, coordinate, and delegate to specialized engineering agents (e.g., Structural Analyzer, Code Compliance Checker). 

Before an agent participates in an execution, it must declare its capabilities (supported domains, inputs/outputs, confidence) so that the `NegotiationPipeline` can select the best candidate. Once selected, agents must run in a controlled environment to ensure reliability and predictability.

## Decision
We have introduced a dedicated `@beamlab/agent-framework` to act as the primary interface for defining agents and orchestrating their execution.

### Key Architectural Decisions:
1. **Agent Capability Negotiation**: Agents declare strongly typed `AgentCapability` manifests. A `NegotiationPipeline` handles discovery, matching, policy validation, and selection prior to any execution.
2. **Sandbox Abstraction (`IAgentSandbox`)**: To prevent vendor lock-in and enable future remote/cloud execution, we introduced a strict abstraction layer for sandboxes. The A8 implementation uses `LocalSandboxProvider` which simulates execution bounds (timeout tracking, memory estimation) without relying on heavy native V8 isolation (`worker_threads` / `vm`).
3. **Sandbox Capability Model**: Each sandbox provider advertises what it supports (e.g., `timeout: true`, `memoryIsolation: false`), allowing Archie to pick a compatible runtime for the agent.
4. **Communication Protocol**: Inter-agent messaging is fully typed (`AgentMessage`) and routed through a central `AgentCommunicationBus`.
5. **Shared Memory Adapters**: Private memory, workspace memory, and shared execution memory are abstracted behind `IMemoryProvider`.
6. **Diagnostics & Health**: We implemented `AgentHealthMonitor` and `ExecutionTraceTracker` which automatically capture performance metrics, error rates, and lifecycle events, surfaced in the Developer Studio.

## Consequences
**Positive:**
- Complete decoupling of agent orchestration logic from the core Archie kernel.
- Future-proofed sandboxing: We can seamlessly swap `LocalSandboxProvider` with a `WorkerThreadSandbox` or `CloudSandbox` once enterprise isolation is needed.
- Deep observability via standard execution contexts.

**Negative:**
- `LocalSandboxProvider` relies on cooperative timeout simulation and estimated heap metrics, which does not provide hard security isolation out-of-the-box. This is an accepted trade-off for Sprint A8.
