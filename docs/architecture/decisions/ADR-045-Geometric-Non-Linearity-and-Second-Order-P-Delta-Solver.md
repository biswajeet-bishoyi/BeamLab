# ADR-045: Geometric Non-Linearity & Second-Order P-Delta Solver

## Status
Accepted

## Context
In structural engineering design codes (AISC 360-16 Chapter C, Eurocode 3 EN 1993-1-1 §5.2.2, ASCE 7-22), linear first-order elastic analysis is insufficient for slender or sway-sensitive structures. When a structure undergoes lateral deflection under vertical gravity and axial thrust, secondary moments and amplifications develop:
1. **$P\text{-}\Delta$ (Sway Effect)**: Caused by relative displacement between member ends (inter-story drift).
2. **$P\text{-}\delta$ (Member Effect)**: Caused by curvature deflection along the member span relative to the chord connecting its ends.

Standard codes require accounting for these second-order effects using either the **Direct Analysis Method (DAM)** with modified stiffness ($0.8E, 0.8A$) and iterative equilibrium, or the $B_1 / B_2$ moment magnification factors.

Prior to Sprint B4.2, BeamLab only solved linear elastic first-order equations $\mathbf{K}_E \mathbf{U} = \mathbf{F}$.

## Decisions

### 1. Geometric Stiffness Formulation ($\mathbf{k}_g$)
- Implemented the full $12 \times 12$ geometric stiffness matrix for 3D spatial beam-columns subjected to axial force $P$:
  - Transverse $y$ and $z$ terms:
    $$g_1 = \frac{6P}{5L}, \quad g_2 = \frac{P}{10}, \quad g_3 = \frac{2PL}{15}, \quad g_4 = -\frac{PL}{30}$$
  - Torsional geometric stiffness:
    $$g_{tors} = \frac{P \cdot r_0^2}{L}, \quad r_0^2 = \frac{I_{yy} + I_{zz}}{A}$$
- Under compression ($P < 0$), geometric stiffness subtracts from elastic stiffness, causing destabilizing amplification.
- Under tension ($P > 0$), geometric stiffness adds to elastic stiffness, causing stabilizing tension stiffening.

### 2. Iterative Non-Linear Equilibrium Solver (`PDeltaSolver3D`)
- Solves second-order equilibrium iteratively:
  1. Solve 1st-order displacement field: $\mathbf{K}_E \mathbf{U}^{(0)} = \mathbf{F}$.
  2. Compute axial force in each member: $P_e = \frac{EA}{L}(u_{x2} - u_{x1})$.
  3. Form tangent stiffness: $\mathbf{K}_T^{(i)} = \mathbf{K}_E + \sum \mathbf{T}^T \mathbf{k}_g(P_e^{(i)}) \mathbf{T}$.
  4. Solve updated displacements until convergence ratio $\frac{\|\Delta \mathbf{U}\|}{\|\mathbf{U}\|} < 10^{-4}$.
- Supports optional AISC 360 Direct Analysis Method stiffness reduction ($0.8E, 0.8A$).

### 3. Stability Diagnostics & Code Compliance
- Calculates the maximum lateral drift amplification factor $B_2 = \frac{\Delta_{2nd}}{\Delta_{1st}}$.
- Evaluates the stability coefficient $\theta = \frac{B_2 - 1}{B_2}$:
  - $\theta \le 0.10 \to$ `ACCEPTABLE_MODEST` (first-order analysis acceptable).
  - $0.10 < \theta \le 0.25 \to$ `SECOND_ORDER_MANDATORY` (second-order analysis required).
  - $\theta > 0.25 \to$ `POTENTIALLY_UNSTABLE` (structure exceeds stability limits).
- Tracks critical Euler load ratio $\frac{|P|}{P_{cr}}$ per element ($P_{cr} = \frac{\pi^2 EI}{L^2}$).

## Consequences
- **Positive**:
  - Direct calculation of second-order sway and member P-Delta effects in full 3D space frames.
  - Transparent validation against classical analytical Euler column amplification ($B_2 \approx \frac{1}{1 - P/P_{cr}}$) verified within $0.5\%$.
- **Next Steps**:
  - Advance to **Sprint B4.3: Tension-Only & Compression-Only Non-Linear Element Solver** (Iterative member state switching for bracing systems, cable stays, and foundation gap contacts).
