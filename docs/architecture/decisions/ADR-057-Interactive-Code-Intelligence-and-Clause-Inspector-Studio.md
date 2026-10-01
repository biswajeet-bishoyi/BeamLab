# ADR-057: Interactive Code Intelligence & Clause Inspector Studio

## Status
Accepted

## Context
In structural engineering practice, verifying member compliance against modern design codes (such as Eurocode 3 EN 1993-1-1, AISC 360-16, and IS 800:2007) is historically performed via opaque black-box software or tedious manual spreadsheets. When engineers audit a member design, they require:
1. Complete transparency into governing equations, step-by-step intermediate variables (such as non-dimensional slenderness $\bar{\lambda}$, column imperfection $\alpha$, reduction factor $\chi$, and elastic critical moment $M_{cr}$), and precise LaTeX mathematical formulas.
2. Direct traceability to official code sections, clause numbers, and limit states (ULS Tension, Compression, Flexure, Shear, and Combined Axial & Flexure).
3. Cross-code benchmarking to evaluate the relative conservatism, safety philosophy disparities ($\phi$ vs $\gamma_M$), and column buckling curves across European, American, and Indian standards for identical cross-sections and loading scenarios.
4. Seamless integration within the reactive BeamLab desktop workspace with instant parameter re-evaluation and physical unit consistency.

## Decision
We implemented the **Interactive Code Intelligence & Clause Inspector Studio** (`DesignCodeInspectorStudio.tsx`) within `apps/web/src/features/knowledge/`, integrated directly into the workspace layout and global navigation:

1. **Architecture & Subsystems**:
   - **Clause Index Navigator**: Provides instant search, standard filtering (Eurocode 3, AISC 360-16, IS 800:2007), limit state filtering (ULS/SLS), and action category filtering. Presents detailed clause cards displaying official citations, descriptions, variable definitions, and safety factors.
   - **Interactive Step-by-Step Clause Verifier**: Allows structural engineers to select a design standard and limit state, configure member parameters (cross-section $A, W_{pl}$, yield strength $f_y$, buckling length $L_{cr}$, lateral restraint $L_{LT}$, axial force $N_{Ed}$, and moment $M_{y,Ed}$), and view immediate compliance calculations. Renders step-by-step intermediate parameters, utilization progress bars, pass/fail status pills, and KaTeX-rendered mathematical equation steps.
   - **Cross-Standard Comparative Benchmark**: Evaluates identical cross-sections and loading conditions simultaneously across Eurocode 3, AISC 360, and IS 800. Summarizes relative utilization ratios, identifies the governing conservative standard, explains safety factor disparities, and renders a normalized column buckling comparison table across the full slenderness spectrum ($L/r \in [20, 180]$).
   - **Calculations Note Export**: Formatted markdown/LaTeX generation for direct inclusion in design authority submission dossiers and engineering calculation books.

2. **Integration**:
   - Registered `codeStudioOpen` and `setCodeStudioOpen` state in `apps/web/src/store/index.ts`.
   - Added top-level "Design Codes" launch action in `TopNav.tsx` with `BookOpen` icon.
   - Mounted `DesignCodeInspectorStudio` in `apps/web/src/layouts/WorkspaceLayout.tsx` with smooth `framer-motion` modal overlay transitions.

## Consequences

### Positive
- **No Black Box Calculations**: Every compliance calculation displays its intermediate derivations, code citation, and formula, fostering engineer trust.
- **Immediate Multi-Standard Comparison**: Structural engineers can immediately compare how a beam or column behaves under Eurocode, AISC, and IS standards.
- **Zero-Latency Reactive UI**: Calculation updates happen instantaneously in the browser using the pure TypeScript compliance engine without requiring round-trip server calls.

### Negative / Trade-offs
- Additional bundle size due to inclusion of code compliance rulesets and KaTeX rendering styles in the client bundle; mitigated via tree-shaking and efficient client caching.
