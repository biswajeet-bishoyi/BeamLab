# ADR-056: Cross-Standard Design Code Benchmark & Comparative Engine

## Status
Accepted

## Context
Global structural engineering practice routinely requires evaluating designs across jurisdictional boundaries (e.g. European Eurocode 3 vs North American AISC 360-16 LRFD vs Indian Standard IS 800:2007). Engineers, fabricators, and multinational checking authorities frequently debate:
1. Which code is more conservative for a given member geometry and loading state?
2. Why do allowable capacities differ between EU ($M_{c,Rd}$ with $\gamma_{M0} = 1.0$), US ($\phi_b M_n$ with $\phi_b = 0.90$), and Indian codes ($M_d$ with $\gamma_{m0} = 1.10$)?
3. How do column flexural buckling reductions compare across slenderness ratios ($L/r = 20 \dots 180$)?

## Decision
We implemented `CrossCodeBenchmarkEngine` in `@beamstudio/agent-code-compliance`:
1. **Simultaneous Multi-Code Member Evaluation (`compareMember`)**:
   - Executes identical structural demands and geometric properties simultaneously against Eurocode 3, AISC 360-16, and IS 800:2007.
   - Computes utilization ratios ($UC_{EC3}, UC_{AISC}, UC_{IS800}$), identifies most and least conservative standards, and computes the maximum capacity disparity percentage.
2. **Safety Factor & Formulation Disparity Rationale**:
   - Explicitly explains safety factor origins: e.g., AISC's $\phi_b = 0.90$ imposes an explicit 10% capacity reduction on compact flexure compared to Eurocode 3's $\gamma_{M0} = 1.0$; AISC uses the Tresca shear yield approximation ($0.60 F_y A_w$) whereas Eurocode 3 and IS 800 apply von Mises yield ($f_y / \sqrt{3} = 0.577 f_y$).
3. **Comparative Buckling Curves (`generateBucklingCurveComparison`)**:
   - Generates normalized column buckling reduction factors $\chi(\lambda)$ across the slenderness spectrum ($L/r \in [20, 180]$) comparing Eurocode 3 curve b, AISC 360 Chapter E exponential buckling, and IS 800 Table 7 curve b.

## Consequences
- Enables instant cross-code comparative checks directly in BeamLab.
- Provides multinational project teams with defensible justification for section sizing differences across international standards.
