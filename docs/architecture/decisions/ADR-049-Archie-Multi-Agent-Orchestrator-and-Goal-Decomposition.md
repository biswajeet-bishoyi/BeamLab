# ADR-049: Archie Multi-Agent Coordinator & Goal Decomposition Engine

## Status
Accepted

## Context
High-level structural engineering tasks (such as structural weight minimization, code compliance audits, and seismic performance evaluations) involve complex multi-step workflows. These workflows require coordinating disparate subsystems: 3D finite element solvers, code verification modules, cross-section catalog optimizers, and calculation report generators.

Prior to Sprint B5.1, BeamLab contained standalone solvers and agent abstractions, but lacked:
1. An intelligent goal decomposition engine that transforms natural language or high-level engineering objectives into structured task DAGs.
2. A centralized, thread-safe engineering blackboard state for inter-agent data sharing.
3. An autonomous multi-agent orchestrator with human-in-the-loop approval gates.

## Decision
We implemented the Archie Multi-Agent Coordination Engine in `@beamlab/archie-kernel`:

### 1. Goal Decomposition Engine (`GoalDecompositionEngine.ts`)
- Evaluates natural language engineering prompts and identifies intent (`WEIGHT_OPTIMIZATION`, `CODE_COMPLIANCE`, `SECOND_ORDER_ANALYSIS`, `PUSHOVER_ASSESSMENT`, `LOAD_GENERATION`, `CALCULATION_REPORT`).
- Synthesizes an `ExecutionPlan` containing an ordered Directed Acyclic Graph (DAG) of typed plan steps (`PlanStep`).
- Implements Kahn's topological sorting algorithm to validate that all task dependencies are cycle-free and satisfy execution prerequisites.

### 2. Shared Engineering Blackboard (`EngineeringBlackboard.ts`)
- Serves as the single source of truth during multi-agent workflows:
  - `canonicalModel`: The 3D spatial space frame geometry, section assignments, and boundary restraints.
  - `loadCombinations`: Factored ULS and SLS load combinations (Eurocode 3, AISC 360, IS 800).
  - `complianceAudits`: Member-by-member utilization checks ($UC = \text{Demand} / \text{Capacity} \le 1.0$), governing clauses, and limit state classifications.
  - `optimizationProposals`: Recommended profile substitutions with weight deltas and post-substitution utilization ratios.
  - `calculationNote`: Markdown/LaTeX calculation note sections with explicit equations.
  - `approvals`: Human-in-the-loop pending/granted decision gates.
  - `auditTrail`: Chronological timeline of agent actions and modifications.

### 3. Multi-Agent Orchestrator (`MultiAgentOrchestrator.ts`)
- Manages DAG step dispatching, dependency resolution, and specialized agent handlers (`StructuralAnalysisAgent`, `CodeComplianceAgent`, `OptimizationAgent`, `ReportAgent`).
- Implements **Human-in-the-Loop Approval Gates** (`REQUEST_APPROVAL_GATE`): when sensitive modifications (such as changing beam sections or material specifications) are proposed, the orchestrator automatically pauses in state `PAUSED_FOR_APPROVAL` and emits `APPROVAL_REQUESTED`.
- Resumes execution seamlessly once an authorized engineer issues `resolveApproval(gateId, 'APPROVED', engineerName)`.
- Emits real-time event notifications (`ORCHESTRATION_STARTED`, `STEP_STARTED`, `STEP_COMPLETED`, `APPROVAL_REQUESTED`, `ORCHESTRATION_COMPLETED`) for UI streaming.

## Consequences
- **Positive**: Engineers can specify high-level goals in natural language; Archie automatically creates the execution plan and manages agent workflows.
- **Positive**: Complete transparency and governance via the shared blackboard, audit trail, and human approval gates before writing changes to the canonical model.
- **Positive**: Clean separation of agent responsibilities enables independent scaling of optimization, code compliance, and report generation agents in Sprints B5.2–B5.5.
