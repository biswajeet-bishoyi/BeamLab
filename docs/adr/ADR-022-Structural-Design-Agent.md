# ADR-022: Structural Design Agent & Independent Engineering Pipelines

## Status
Accepted

## Context
BeamLab is expanding from pure analysis to active structural design. The Structural Design Agent needs to assist engineers by understanding design intent, generating alternatives (section sizes, materials), and reviewing constructability, without running actual structural solver code.

We initially considered reusing the `AnalysisPipeline` from `agent-structural-analysis`, but recognized that each engineering discipline (Analysis, Design, Optimization, Compliance) thinks differently and requires its own workflow. Tangling them into a single massive pipeline or having agents call each other directly would create significant technical debt.

## Decision
1. **Independent Pipelines**: We established that `agent-design` has its own execution pipeline (`DesignPipeline`), separate from `AnalysisPipeline`.
2. **Standardized Lifecycle Interface**: We introduced `IEngineeringPipeline` in `@beamlab/agent-framework`. This standardizes the pipeline structure for *all* future agents:
   - Request -> Context -> Knowledge -> Policy -> Resources -> Planning -> Execution -> Reasoning -> Recommendations -> Narrative -> Response.
3. **Engineering Workflow Coordinator**: We defined `IEngineeringWorkflowCoordinator` as a placeholder interface for future orchestration across agents (e.g., in Sprint A14).
4. **Developer Studio Top-Level Tabs**: The Developer Studio is organized by platform capability, not implementation details. The Design Agent now has its own top-level tab (`DesignExplorer`) containing Intent, Alternatives, Constructability, and Narrative viewers.
5. **No Direct Agent-to-Agent Calls**: Agents coordinate via the Workspace Runtime and Platform Event Bus, not by directly invoking each other's pipelines.

## Consequences
- **Positive**: High separation of concerns. `agent-design` can be modified entirely independently of `agent-structural-analysis`.
- **Positive**: Preparing the framework now makes the eventual addition of the Optimization and Compliance agents trivial.
- **Negative**: Increases boilerplate, as each agent must implement the full `IEngineeringPipeline` lifecycle even if some steps are simple pass-throughs today.
