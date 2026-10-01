# ADR-052: Automated Engineering Calculation Note & Report Agent

## Status
Accepted

## Context
Structural engineering practice mandates transparent, auditable, and reproducible calculation notes. Professional engineers (PEs) and checking authorities reject opaque "black-box" outputs; every code compliance check must display the governing design formula (Eurocode 3 / AISC 360), substitute numerical parameters, and state the governing limit state with physical engineering units.

Additionally, multi-agent workflows require automated generation of publication-grade reports summarizing geometry schedules, load combination matrices, governing member utilization audits ($UC \le 1.0$), and foundation reaction envelopes.

## Decision
We implemented `EngineeringCalculationNoteGenerator` in `@beamlab/agent-report`:
1. **Auditable LaTeX Engineering Expressions**: Emits transparent design checks with LaTeX notation for bending resistance ($M_{c,Rd}$), shear resistance ($V_{c,Rd}$), axial buckling reduction ($\chi N_{b,Rd}$), and combined interaction utilization ratios ($UC = \frac{N_{Ed}}{\chi_{min} N_{Rk}/\gamma_{M1}} + \dots$).
2. **Tabular Schedules**: Formats structural geometry (nodes, members, materials, cross sections), load combination envelopes, member utilization audits, and reaction schedules.
3. **Multi-Format Export**: Generates GitHub-flavored markdown with KaTeX math and standalone, print-ready HTML with embedded CSS styling (`@media print`), visual pass/fail badges, and engineering typography.
4. **Integration with Archie Blackboard**: Pulls directly from canonical model state and compliance audit records produced by `agent-optimization` and `agent-structural-analysis`.

## Consequences
- Calculation packages can be reviewed instantly by licensed engineers or exported to PDF via standard browser print.
- Eliminates manual transcription errors in structural calculation reporting.
- All formulas match Eurocode 3 (EN 1993-1-1) and AISC 360-16 specifications.
