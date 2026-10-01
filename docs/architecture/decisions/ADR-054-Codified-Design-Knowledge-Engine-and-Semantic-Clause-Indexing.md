# ADR-054: Codified Design Knowledge Engine & Semantic Clause Indexing

## Status
Accepted

## Context
Automated engineering systems require structured, machine-interpretable access to international structural building codes (Eurocode 3 EN 1993-1-1, Eurocode 8 EN 1998-1, AISC 360-16, ASCE 7-16, IS 800:2007). In standard software, design codes are either hardcoded into proprietary solvers or treated as opaque black boxes without citations, mathematical parameter definitions, or cross-code equivalence mappings.

Engineers and autonomous agents need:
1. Formal schema representing design clauses with section numbers, equations (LaTeX), variable definitions, physical units, and partial safety factors.
2. Fast semantic and parameterized retrieval mapping internal action demands ($N, V_y, V_z, M_y, M_z$) to applicable codified clauses.
3. Cross-standard clause mapping enabling direct comparison between EU, US, and Indian structural standards.

## Decision
We implemented the Codified Design Knowledge Engine in `@beamlab/knowledge-platform`:
1. **Clause Data Model (`DesignCodeClause.ts`)**:
   - `CodeClause` schema capturing `clauseId`, `standard`, `sectionNumber`, `title`, `limitState` (Ultimate, Serviceability, Stability, Seismic), `applicableActions`, `equations`, `variables`, and `safetyFactors`.
2. **International Standard Knowledge Bases**:
   - `Eurocode3KnowledgeBase.ts`: Tension (§6.2.3), Compression (§6.2.4), Bending (§6.2.5), Shear (§6.2.6), Flexural Buckling (§6.3.1), Lateral-Torsional Buckling (§6.3.2), and Combined Stress Interaction (§6.3.3).
   - `AISC360KnowledgeBase.ts`: Tensile strength (Chapter D), Compressive buckling (Chapter E), Flexure (Chapter F), Shear (Chapter G), and Combined forces (Chapter H).
   - `IS800KnowledgeBase.ts`: Tension yielding (Section 6), Compression (Section 7), Bending (Section 8), Shear (Section 8.4), and Combined axial & flexure (Section 9.3).
3. **Retrieval Engine (`CodeClauseRetriever.ts`)**:
   - Indexed retrieval by clause ID, design standard, and structural actions.
   - Fuzzy semantic keyword search over titles, descriptions, and LaTeX equations.
   - Cross-standard equivalence mapping (`getEquivalentClauses`).

## Consequences
- Enables autonomous agents and interactive UI studios to retrieve and cite governing design clauses dynamically.
- Eliminates manual clause lookup and sets up the foundation for Sprint B6.2 (Automated Code Compliance Verification & Clause Audit Engine).
