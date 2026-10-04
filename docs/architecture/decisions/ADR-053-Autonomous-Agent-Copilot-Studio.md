# ADR-053: Autonomous Agent Copilot UI Studio

## Status
Accepted

## Context
Autonomous engineering agents (synthesis, lateral load generation, catalog cross-section optimization, structural compliance auditing, and reporting) require a centralized, interactive user interface. Professional structural engineers must have full visibility and control over autonomous workflows, including:
1. Formulation of high-level goals in natural language or curated engineering workflows.
2. Real-time visualization of Kahn's topological execution plan (DAG) with step status, assigned agent, and dependencies.
3. Live streaming of multi-agent engineering deductions, mathematical expressions (LaTeX / KaTeX), and calculation details.
4. Mandatory **Engineer-in-the-Loop** human approval gates for safety-critical structural modifications (e.g. cross-section down-sizing proposals) with interactive diffs and weight savings metrics.
5. In-situ review, PDF export, and markdown export of publication-quality calculation notes.

## Decision
We implemented `ArchieCopilotStudio` in `apps/web/src/features/copilot/`:
1. **Interactive Autonomous Console (`ArchieCopilotStudio.tsx`)**:
   - High-contrast, dark glassmorphic engineering interface with quick presets for full Eurocode 3 optimization, ASCE 7-16 lateral load generation, catalog sizing, and reporting.
   - Live metrics bar displaying structural mass delta ($W_{init} \to W_{opt}$ and $\% \Delta$), maximum stress utilization ($UC_{max}$), factored load combinations, and optimized profiles.
2. **Topological Plan DAG Viewer (`CopilotDAGViewer.tsx`)**:
   - Interactive visual DAG showing execution steps (`GENERATE_LOAD_COMBINATIONS`, `EXECUTE_FEA_SOLVER`, `AUDIT_CODE_COMPLIANCE`, `OPTIMIZE_CROSS_SECTIONS`, `VERIFY_OPTIMIZED_MODEL`, `GENERATE_CALCULATION_NOTE`), status pills (`Running`, `Done`, `Approval Gate`, `Queued`), and dependency chains.
3. **Real-Time Reasoning Stream (`ReasoningStream.tsx`)**:
   - Chronological event timeline streaming agent thoughts, domain calculations ($q_z$, $V_{base}$, $M_{c,Rd}$, $N_{b,Rd}$), and expandable calculation details.
4. **Engineer-in-the-Loop Human Approval Gate (`HumanApprovalModal.tsx`)**:
   - Modal triggered when agents propose structural cross-section changes. Displays side-by-side member modification schedules, weight reduction percentages, and engineer sign-off comments before execution continues.
5. **Calculation Note Studio (`CalculationNotePreview.tsx`)**:
   - Embedded preview for generated HTML/Markdown calculation packages with one-click print-to-PDF, markdown download, and copy actions.

## Consequences
- Bridges the backend multi-agent kernel (`@beamstudio/archie-kernel`, `@beamstudio/agent-optimization`, `@beamstudio/agent-structural-analysis`, `@beamstudio/agent-report`) to the frontend engineering operating system.
- Provides professional engineers with complete transparency and authoritative veto power over all automated decisions.
- Successfully completes **Phase B5 (Autonomous Engineering Reasoning Agents & Multi-Agent Orchestration)**.
