# ADR-030: Canonical Analysis Results & Engineering Provenance

## Status
Accepted

## Context

In BeamLab, analysis results were previously represented by minimal stubs (`AnalysisResult`, `NodeDisplacement`, `SupportReaction`, `MemberForceResult`). These stubs lacked:
1. **Lifecycle states** (`Pending`, `Running`, `Completed`, `Failed`, `Cancelled`, `Superseded`, `Invalidated`).
2. **First-class dynamic and stability results** (Modal natural frequencies, mode shapes, mass participation, and eigenvalue buckling load factors $\lambda_{cr}$).
3. **Comprehensive member internal forces and stresses** (axial $P$, shear $V_y, V_z$, torsion $T$, bending $M_y, M_z$, and von Mises equivalent stresses $\sigma_v$).
4. **Design envelope representations** (Max, Min, and Absolute-Max extreme values across multiple load cases/combinations).
5. **Rigorous engineering provenance & auditability**: Every result must be traceable via:
   $$\text{Result} \longrightarrow \text{Analysis} \longrightarrow \text{Model Revision} \longrightarrow \text{Inputs Hash} \longrightarrow \text{Solver} \longrightarrow \text{Agent} \longrightarrow \text{Evidence}$$

## Decision

We implement a comprehensive canonical result model and engineering history system in `@beamstudio/engineering-model` across `src/results/` and `src/history/`.

### Architecture

```
CanonicalAnalysisResult (IEngineeringObject)
 │
 ├── ResultState ('Pending' | 'Running' | 'Completed' | 'Failed' | 'Cancelled' | 'Superseded' | 'Invalidated')
 ├── ConvergenceMetrics (converged, iterations, tolerance, residual, executionTimeMs)
 ├── EngineeringProvenance (Analysis -> Revision -> Input Hash -> Solver -> Agent -> Evidence)
 │
 ├── AnalysisCaseResult[] (Per LoadCase / LoadCombination)
 │    ├── NodeResult[] (Displacements, Rotations, Support Reactions)
 │    ├── MemberResult[] (Station forces P, Vy, Vz, T, My, Mz, Deflections, Stresses, Strains)
 │    └── GlobalEquilibriumCheck (Sum F_ext + Sum R ≈ 0)
 │
 ├── ModalResult (Frequencies Hz, Periods, Mass Participation, Eigenvectors)
 ├── BucklingResult (Eigenvalue load factor λ_cr, Buckling mode shapes)
 └── EnvelopeResult[] (Max, Min, AbsoluteMax across cases)
```

And the chronological audit history:

```
EngineeringHistoryRegistry
 └── EngineeringHistoryEntry[]
      ├── Type: 'ModelChange' | 'LoadChange' | 'AnalysisRun' | 'DesignRun' | 'Optimization'
      │         | 'ComplianceCheck' | 'UserDecision' | 'AgentDecision' | 'Approval' | 'Revision'
      ├── Revision Number
      ├── Author (User / Agent / System)
      ├── Affected Object IDs
      ├── Diff details
      └── Approval signature (if reviewed)
```

### Key Technical Specs

#### 1. Decoupled Result Architecture & Universal Interfaces
`CanonicalAnalysisResult` extends `BaseEngineeringObject`, providing stable UUID identity, versioning, extension dictionaries, and relationship maps. Results are solver-agnostic and read-only.

#### 2. Result Lifecycle State Machine
Results begin as `Pending`, transition to `Running`, and upon successful solver convergence become `Completed`. If structural geometry or loads are modified in `EngineeringModel`, `invalidateResults(reason)` transitions active results to `Invalidated`.

#### 3. Station Sampling Along Member Span
`MemberResult` records internal actions at discrete stations $\xi \in [0.0, 1.0]$. The `StationContinuityRule` validates monotonicity and interval containment.

#### 4. Engineering Traceability (Provenance Chain)
Every analysis run produces an `EngineeringProvenance` record linking the result ID, analysis run ID, model revision number, input snapshot hash, solver signature (ID, version, config), authoring agent (or user), and evidence references in the Archie/Compliance registry.

#### 5. Verification Rules
- `RES-VAL-CONV001`: Result Convergence Rule (flags completed results with convergence failure).
- `RES-VAL-STA001`: Station Continuity Rule (verifies normalized station order and domain $[0, 1]$).
- `RES-VAL-EQ001`: Statics Equilibrium Rule (verifies $\sum F_{ext} + \sum R \approx 0$).

## Consequences

### Positive
- Solvers, AI agents, reporting engines, and visualization modules share a unified result contract.
- Complete auditability and provenance satisfies strict engineering compliance requirements.
- Full support for modal vibration, eigenvalue buckling, and design envelopes out-of-the-box.
- Backwards compatible with legacy B1.1 result interfaces.

### Negative
- Result sets for very large 3D structures with thousands of members require memory virtualization (planned for B4 rendering optimizations).
