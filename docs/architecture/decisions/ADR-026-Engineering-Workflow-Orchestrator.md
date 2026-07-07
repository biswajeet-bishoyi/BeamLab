# ADR 026: Engineering Workflow Orchestrator

## Status
Accepted

## Context
BeamLab has developed several independent engineering agents (Analysis, Design, Optimization, Compliance, Report). Currently, these agents operate in isolation. To function as a cohesive engineering platform, BeamLab requires a mechanism to orchestrate these agents into a collaborative workflow. However, we must strictly maintain architectural boundaries—agents must never invoke one another directly.

## Decision
We will implement an **Engineering Workflow Orchestrator (EWO)** as the central coordination layer for multi-agent engineering workflows.

### 1. Engineering Dependency Graph (DAG)
Workflows will be represented as a Directed Acyclic Graph (DAG) by the `WorkflowPlanner`.
- Nodes represent tasks (`Agent`, `Decision`, `Synchronization`, etc.).
- Edges represent logical dependencies (`Requires`, `Produces`, `Consumes`).
- The DAG handles control flow only; large engineering payloads are strictly decoupled and stored in the **Engineering Blackboard**.

### 2. Engineering Blackboard & Workflow Context
All shared context (evidence, recommendations, models) will reside in the `EngineeringBlackboard`. Agents publish outputs to the Blackboard, and downstream agents consume those outputs. This pattern prevents tight coupling and ensures scalability.

### 3. Decision Policy Engine
Instead of a hardcoded priority hierarchy (e.g., Compliance > Design > Optimization), conflict resolution will be handled by a pluggable `DecisionPolicyEngine`.
- Agents produce `RecommendationMetadata` containing standardized fields (confidence, engineering risk, severity, constructability impact, etc.).
- The policy engine evaluates these recommendations using a `DecisionMatrix` based on active policies (e.g., "Safety First", "Cost First").
- The outcome is derived dynamically and explainably.

### 4. Engineering Negotiation Engine
When conflicts arise, the `EngineeringNegotiationEngine` facilitates an iterative negotiation loop where agents generate counter-proposals or adjust confidences. If consensus cannot be reached within maximum rounds, or if safety/confidence thresholds trigger an escalation, the system requests Human Review.

## Consequences

### Positive
- Agents remain entirely independent and decoupled.
- Workflows can execute parallel branches (e.g., Optimization and Compliance running concurrently).
- Decision-making is transparent, configurable, and closely mirrors real-world multidisciplinary engineering practices.
- The platform is positioned to incorporate external models, cloud execution, and human-in-the-loop workflows effortlessly.

### Negative
- Introduces additional state management complexity via the Blackboard.
- Requires careful handling of asynchronous events and edge cases during agent negotiation.
