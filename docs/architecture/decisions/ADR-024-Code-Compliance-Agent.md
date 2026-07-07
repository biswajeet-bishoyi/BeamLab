# ADR 024: Code Compliance Agent Architecture

## Status
Accepted

## Context
BeamLab aims to support professional engineering review workflows via an Engineering Code Compliance Agent (CCA). The challenge is that hardcoding engineering codes (IS 800, AISC, Eurocode) into an agent creates an unmaintainable monolith that cannot scale across regions or proprietary company standards. Furthermore, engineering reviews involve both literal clause checks and subjective engineering judgements.

## Decision
1. **Four-Layer Interpretation Model**: We split standard compliance into `Standard` -> `Clause` -> `Rule` -> `Evaluation`.
   - **Clause**: Textual requirement.
   - **Clause Interpreter**: Transforms clauses into machine-readable `Rule` models.
   - **Rule**: Executable condition mapping parameters to compliance states.
2. **Standard Registry & Providers**: Standards are injected dynamically. `IStandardProvider` implementations (Static, JSON, Cloud, Enterprise) serve the standards without modifying the engine.
3. **Compliance Session**: Ensures every evaluation sequence is tracked, replayable, and scoped.
4. **Engineering Review Engine**: Converts raw `Violations` into a structured `EngineeringReview`, outputting `Review Notes`, `Required Actions`, and an `Approval Recommendation` (Compliant, Conditionally Compliant, Non-Compliant).
5. **Evidence Graph**: Every violation is linked to the underlying `RuleEvaluation`, `Rule`, `Clause`, and `Standard`, preserving a strict chain of evidence.

## Consequences
- **Scalability**: By detaching the rule definitions from the execution engine, BeamLab can scale to support any global standard or proprietary organization rulebook.
- **AI-Readiness**: The `ClauseInterpreter` provides the perfect insertion point for future LLM-based parsing of unstructured standard texts.
- **Enterprise Appeal**: The `EngineeringReview` output bridges the gap between raw binary assertions and professional engineering sign-offs.
