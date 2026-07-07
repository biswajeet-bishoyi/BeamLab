# ADR 019: Structural Analysis Agent Core

## Status
Accepted

## Context
BeamLab needs its first engineering specialist: the **Structural Analysis Agent**. This agent does not calculate finite elements directly but orchestrates an engineering reasoning pipeline to prepare, validate, interpret, and explain structural analyses using external solvers. As the first domain-specific agent, its architecture must set the pattern for future agents (Design Agent, Optimization Agent, etc.).

## Decision
We decided to implement the **Engineering Reasoning Pipeline** within the new `@beamlab/agent-structural-analysis` package. This pipeline is composed of distinct, replaceable stages:
1. **Model Validation**: `ValidationRuleRegistry` handles model rule validation.
2. **Analysis Planning**: `AnalysisPlanner` computes the execution strategy and resource requirements.
3. **Solver Abstraction**: `ISolverAdapter` abstracts interactions with various solvers (e.g., `MockSolverAdapter` initially, later OpenSees, CalculiX).
4. **Interpretation & Reasoning**: `ResultInterpreter` parses raw results into engineering metrics, which the `EngineeringReasoner` evaluates for insights.
5. **Recommendations & Explanations**: The agent concludes by generating actionable recommendations via `RecommendationGenerator` and building a user-facing explanation payload via `ExplanationBuilder`.

We also extended `@beamlab/agent-framework` to include an `AgentRegistry` and `AgentManifest` model. This allows the system to auto-discover capabilities from the `agent.manifest.json` file.

### CTO Override Applied
The CTO decided to maintain a flat package structure (`packages/agent-structural-analysis`) rather than a nested one (`packages/agents/structural-analysis-agent`). Furthermore, the agent is registered directly in the `AgentRegistry`, not the `ToolRegistry`. Agents *use* tools; they *are not* tools.

## Consequences
- **Positive**: The pipeline steps are heavily decoupled, allowing plugins to inject new validation rules or strategies.
- **Positive**: Solvers are completely abstracted, meaning BeamLab can swap structural engines without rewriting agent logic.
- **Positive**: The registry approach creates an ecosystem where third-party Extension Agents can be loaded exactly like built-in System Agents.
- **Negative**: Adds overhead with many registries (`AnalysisStrategyRegistry`, `ValidationRuleRegistry`, `ReasoningRegistry`) that must be maintained.
