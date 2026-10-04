# ADR-111: Stay Cable Initial Tension Optimization & Tuning Engine

## Status
Accepted

## Context
In cable-stayed bridges (fan, harp, and semi-fan topologies), stay cables serve as intermediate elastic supports for the deck superstructure. Determining initial pre-tension forces in each stay is an essential step:
- Without pre-stressing, deck deflections and bending moments under dead load are unacceptable.
- Over-tensioning stays causes excessive deck hogging moments, foundation uplift, or tower buckling.
- Codified specifications (PTI Recommendations for Stay Cable Design and Testing, fib Bulletin 89) enforce strict allowable stress envelopes:
  $$0.15 \le \frac{\sigma_{DL}}{f_{pu}} \le 0.45$$
  to prevent both cable slackening / fatigue at the lower bound and strand rupture / creep relaxation at the upper bound.

## Decision
We implement `StayCableTuningEngine` in `@beamstudio/cable-engine/src/tuning/`:

1. **Rigid Support Zero-Displacement Method (`solveZeroDisplacementTensions`)**:
   - Treats the deck as a continuous beam on unyielding supports at stay anchor locations.
   - Computes required vertical support lift:
     $$R_{v,i} = q_{DL} \cdot L_{trib,i}$$
   - Solves required axial cable tension from inclination angle $\theta_i$:
     $$T_i = \frac{R_{v,i}}{\sin\theta_i}$$
   - Projects tensions onto the allowable PTI stress envelope $[0.15 f_{pu}, 0.45 f_{pu}]$ and computes tower horizontal resultant forces for tower balance assessment.

2. **Influence Matrix Least-Squares Optimization (`optimizeStayTensions`)**:
   - Formulates the global girder bending moment and deflection minimization as a constrained quadratic program:
     $$\min_{\{T\}} \left\| [C_M] \{T\} + \{M_0\} \right\|^2 + \alpha \|T\|^2 \quad \text{subject to} \quad T_{min,i} \le T_i \le T_{max,i}$$
   - Solves via projected gradient iteration with adaptive step sizing.
   - Computes compensated deck bending moment profiles $M(x)$, residual deflections $d(x)$, and safety factors against breaking loads ($F_u / T_i$).

## Consequences
- Enables structural engineers to automatically tune stay cables to achieve zero dead load girder deflections and smooth moment profiles.
- Provides input stay pre-tensions for geometric non-linear 3D finite element frame models.
- Directly feeds the interactive 3D Cable Structures Studio UI (Sprint B18.5).
