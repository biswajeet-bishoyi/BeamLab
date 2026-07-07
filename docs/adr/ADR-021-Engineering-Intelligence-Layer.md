# ADR-021: Engineering Intelligence Layer & Pluggable Reasoning

## Status
Accepted

## Context
BeamLab needs to transform its solver outputs (raw numbers) into expert-level engineering reasoning (insights, behaviors, and justifications). Previously, reasoning was tightly coupled inside the Structural Analysis Agent, preventing reuse by future agents (e.g., Design Agent, Optimization Agent) and making cross-agent comparison difficult.

Furthermore, engineering recommendations require rigorous explainability. Presenting a recommendation without justifiable evidence, explicit assumptions, and a clear confidence metric is insufficient for professional engineers.

## Decision
1. **Generic Reasoning Framework**: We introduced `@beamlab/engineering-reasoning` as a standalone core platform service. It provides generic registries, narrative builders, and engines.
2. **Strategy Pattern**: Agents no longer embed massive reasoning engines. Instead, they implement the `IReasoningStrategy` interface (e.g., `StructuralReasoningStrategy`) which plugs into the generic reasoning framework.
3. **Pluggable Confidence Engine**: Confidence is calculated via independent `IConfidenceContributor` modules (Model Quality, Knowledge Match, etc.) aggregated through an `IAggregationStrategy`. Default is `WeightedAverageAggregationStrategy`. This allows future integration of Bayesian or LLM-based confidence scoring without changing the architecture.
4. **Engineering Justification Engine**: We introduced a unique mechanism that synthesizes Evidence, Reasoning, Confidence, and Assumptions into an `EngineeringJustification`. It explicitly answers: "Would a senior engineer sign off on this?"
5. **Top-Level Reasoning UI**: Developer Studio now surfaces "Reasoning" as a top-level tab rather than nesting it under specific agents. This provides a unified view for reviewing confidence breakdowns, narratives, and justifications across all agents.

## Consequences
- **Positive**: We have established a foundational, explainable AI reasoning layer that is highly scalable across new engineering domains.
- **Positive**: High traceability. Engineers can click into a recommendation and see exactly which policies and evidence support it, along with the confidence score breakdown.
- **Negative**: Increases the complexity of agent development; new agents must map their specific domain outputs to the generic `IReasoningStrategy` interfaces.
