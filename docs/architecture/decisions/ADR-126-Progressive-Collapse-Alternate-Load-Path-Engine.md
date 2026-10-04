# ADR-126: Alternate Load Path Method for Progressive Collapse Mitigation per DoD UFC 4-023-03

## Status
Accepted

## Context
When extreme blast or vehicular impact destroys a primary vertical support, the building must have sufficient redundancy and alternative load paths to arrest disproportionate progressive collapse. The Department of Defense (DoD) UFC 4-023-03 and GSA guidelines prescribe specific alternate path methodologies.

## Decision
We implemented `ProgressiveCollapseEngine` in `@beamstudio/blast-engine`:
1. **Critical Column Removal Scenarios**:
   - Supports corner column, exterior middle column, and interior column instantaneous removal.
2. **Dynamic Amplification Factor (DAF)**:
   - Evaluates dynamic amplified gravity load $G_{dynamic} = DAF \times (1.2 D + 0.5 L)$, with DAF ranging from 1.5 to 2.0 depending on framing ductility.
3. **Double-Span Moment Demand & Catenary Check**:
   - Evaluates demand-capacity ratios (DCR) over the doubled span.
   - Calculates secondary catenary tension demand $T_{cat} = \frac{w L_{eff}^2}{8 \delta}$ at large plastic sag rotations.
   - Identifies failure mechanisms: adequate redistribution, flexural hinging, shear failure, or catenary tensile rupture.

## Consequences
- Directly identifies vulnerable frame bays requiring structural tie reinforcement or transfer girders.
