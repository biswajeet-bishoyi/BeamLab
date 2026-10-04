# ADR-120: Cantilever and Gravity Retaining Wall Sliding, Overturning & Bearing Stability

## Status
Accepted

## Context
Retaining wall design requires simultaneous verification of geotechnical limit states (overturning, sliding, and bearing capacity eccentricity) as well as structural limit states (stem shear and bending moments at the base). Traditional approaches require separate geotechnical spreadsheets and structural design tools.

## Decision
We implemented `RetainingWallStabilityEngine` in `@beamstudio/earth-engine`:
1. **Geometric Profile Modeling**:
   - Parameterized cantilever geometry including stem height $H$, top width $b_{top}$, bottom width $b_{bot}$, toe width $B_{toe}$, heel width $B_{heel}$, base slab thickness $t_{base}$, and shear key ($D_k, B_k$).
2. **Limit State Verifications**:
   - **Overturning**: $FS_{ot} = \frac{\sum M_R}{\sum M_{OT}} \ge 2.0$ about toe.
   - **Sliding**: $FS_{slide} = \frac{V \tan\delta_{base} + c_a B + P_p / 1.5}{F_{drive}} \ge 1.5$.
   - **Eccentricity & Bearing**: $e = \frac{B}{2} - \frac{M_{net}}{V}$. If $|e| \le B/6$, trapezoidal bearing pressures $q_{toe, heel} = \frac{V}{B}(1 \pm \frac{6e}{B})$; if $|e| > B/6$, triangular Meyerhof distribution $q_{toe} = \frac{2V}{3\bar{x}}$, verifying against allowable bearing capacity $q_{all}$.
3. **Structural Demand Extraction**:
   - Computes base stem moment $M_{stem}$ and base stem shear $V_{stem}$ for immediate reinforced concrete flexural design.

## Consequences
- Single unified pass evaluates both geotechnical stability and structural demands.
- Shear key contribution provides a direct mechanism to resolve sliding deficiencies in low-friction soils.
