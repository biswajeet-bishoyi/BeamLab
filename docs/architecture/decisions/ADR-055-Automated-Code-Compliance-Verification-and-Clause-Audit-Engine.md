# ADR-055: Automated Code Compliance Verification & Clause Audit Engine

## Status
Accepted

## Context
Licensed structural engineers must demonstrate verifiable, step-by-step code compliance under governing international standards (Eurocode 3 EN 1993-1-1, AISC 360-16, and IS 800:2007). Generic "unity check" scores are unacceptable for municipal plan checks and peer review; every audited limit state must identify:
1. The governing codified clause and clause title.
2. The exact design equation in LaTeX notation.
3. Explicit numerical substitutions with physical units.
4. The demand, capacity, and utilization ratio ($UC = \text{Demand} / \text{Capacity}$).
5. Explicit member classification, Euler flexural column buckling reductions ($\chi$), and lateral-torsional buckling (LTB) critical moments ($M_{cr}, \chi_{LT}$).

## Decision
We implemented `CodeComplianceAuditor` in `@beamstudio/agent-code-compliance`:
1. **Multi-Standard Clause Evaluation**:
   - **Eurocode 3 (EN 1993-1-1)**: §6.2.3 (Tension), §6.2.4 (Compression), §6.2.5 (Bending), §6.2.6 (Shear), §6.3.1 (Column Buckling with $\chi$), §6.3.2 (LTB with $\chi_{LT}$), and §6.3.3 (Combined $N-M$ interaction).
   - **AISC 360-16**: Chapter D (Tension), Chapter E (Column Buckling with $F_{cr}$), Chapter F (Beam Flexure), Chapter G (Shear), and Chapter H (Bilinear $P-M$ interaction).
   - **IS 800:2007**: Section 6 (Tension), Section 7 (Compression), Section 8 (Bending), Section 8.4 (Shear), and Section 9.3 (Combined $P-M$).
2. **Transparent Mathematical Substitution**:
   - Generates formatted LaTeX substitution strings for every checked limit state (e.g. `$M_{c,Rd} = \frac{366.6 \times 10^{-6} \times 355}{1.0} = 130.1\text{ kNm}$`).
3. **Batch Structural Audit (`auditStructure`)**:
   - Iterates through multi-element frame models, identifies governing elements, and reports global worst-case utilization ratios ($UC_{max}$) and overall compliance status (`PASS`, `WARNING`, `FAIL`).

## Consequences
- Every compliance check is auditable, repeatable, and directly printable in formal calculation notes.
- Eliminates discrepancy between analysis results and code checking.
- Directly powers Sprint B6.3 (Cross-Standard Comparative Benchmark Engine) and Sprint B6.4 (Code Intelligence Studio).
