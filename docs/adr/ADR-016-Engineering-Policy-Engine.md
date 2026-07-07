# ADR 016: Engineering Policy Engine (EPE)

## Status
Accepted

## Context
BeamLab requires a centralized governance layer to determine if certain engineering workflows or specific architectural mutations are permitted. If the Engineering Knowledge Platform (EKP) answers "What is it?", the Engineering Policy Engine (EPE) answers "Should it be allowed?".

Historically, logic restricting user interactions or requiring approvals was hardcoded in UI components or scattered across the runtime architecture. We need a unified approach that is highly typed, completely decoupled from the UI/Runtime, and prepares us for future enterprise scenarios (multi-user approval, custom organization workflows, legal compliance).

## Decision
We decided to implement a decoupled **Engineering Policy Engine (EPE)** (`@beamlab/policy-engine`) that evaluates declarative policies against action requests and returns a structured `PolicyDecision`.

### 1. Typed Policy Expression Tree
Instead of relying on a raw string-based DSL or generic JSON logic evaluation, the EPE utilizes a strongly typed AST (Abstract Syntax Tree) model (`PolicyExpression`).
- Expressions are typed logical and comparison nodes (`AND`, `OR`, `EQ`, `IN`, etc.).
- Future extensions are pre-modeled (`TimeExpression`, `GraphExpression`, `RoleExpression`).
- This design scales seamlessly to persistent databases and network transports without introducing parser overhead.

### 2. Structured Explainability
Rule evaluation does not simply return a boolean. Every evaluation passes through the `PolicyEvaluator` and produces a structured `PolicyDecision` object:
- `decision` (`Allow`, `AllowWithWarning`, `RequireApproval`, `Deny`, etc.)
- `explanation`
- `warnings` and `suggestedAlternatives`
- Performance metadata (`executionTimeMs`, `evaluatedRules`)

### 3. Developer Diagnostics
A `DeveloperStudio` has been introduced into the web app, encompassing both the `KnowledgeExplorer` and the new `PolicyExplorer`.
- **Policy Simulation**: Developers can select predefined `ActionRequest` scenarios (e.g., "Delete Structural Member") and execute them against the `PolicyEvaluator` to inspect the evaluation trace and latency.

## Consequences
- **Positive**: All access-control, safety rules, and validation logic are standardized into an explainable interface. The UI will naturally adapt to `RequireApproval` or `Deny` decisions without hardcoded conditional logic.
- **Positive**: Testing policy sets becomes trivially easy through mock `ActionRequests`.
- **Negative**: Adds evaluation latency to the critical path of the Runtime executing commands. We mitigate this using a configurable `PolicyCache` layer.
