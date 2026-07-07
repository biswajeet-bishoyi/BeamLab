# ADR 023: Engineering Optimization Agent

## Status
Accepted

## Context
BeamLab requires an autonomous Engineering Optimization Agent (EOA) capable of evaluating structural design alternatives, balancing competing objectives (e.g., weight, cost, constructability), and producing explainable recommendations. Crucially, the agent must not embed rigid numerical optimization routines, but instead treat optimization algorithms as replaceable strategies.

Furthermore, we need a reusable mechanism for multi-criteria decision making that can benefit not only Optimization but also Design and Compliance. 

## Decision
1. **Agent Architecture**: Implement `OptimizationAgent` adhering to the `IAgent` contract and a standard lifecycle (Request -> Context -> Knowledge -> Policy -> Resources -> Planning -> Execution -> Reasoning -> Recommendations -> Narrative -> Response) identical to the Analysis and Design agents.
2. **Optimization Pipeline**: The pipeline will coordinate discrete managers:
   - `ObjectiveManager` (e.g., minimizing weight)
   - `ConstraintManager` (e.g., geometry, policy limits)
   - `CandidateGenerator` (generates architectural variations without numerical constraints)
   - `AlternativeEvaluator` (evaluates performance)
   - `TradeOffAnalyzer` (surfaces trade-offs across candidates)
3. **Engineering Decision Engine**: Introduced as a foundational platform capability in `@beamlab/engineering-reasoning` to score candidates and produce an `EvaluationMatrix` and `DecisionExplanation`.
4. **Events Model**: Established a base `EngineeringEvent` in `@beamlab/events`, from which `OptimizationEvent` inherits.
5. **UI Separation**: The agent generates a structured `TradeOffModel` only. Rendering happens externally via the `OptimizationExplorer` in Developer Studio (and later in the Workspace).

## Consequences
- **Extensibility**: Optimization strategies (genetic algorithms, gradient descent) can be swapped in via the Candidate Generator and Alternative Evaluator.
- **Explainability**: Every recommendation includes a `DecisionExplanation` backed by a `TradeOffModel`, highlighting what constraints were satisfied and what was sacrificed.
- **Reusability**: The Decision Engine can immediately be adopted by the Design Agent for selecting between distinct structural topologies.
