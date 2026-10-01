# ADR-047: ASCE 41-17 / FEMA 356 Non-Linear Static Pushover & Plastic Hinge Engine

## Status
Accepted

## Context
Seismic assessment, performance-based design, and progressive collapse analysis of building structures require non-linear static pushover analysis. In accordance with ASCE 41-17 (*Seismic Evaluation and Retrofit of Existing Buildings*), FEMA 356, and ATC-40, structural resilience cannot be assessed solely from linear elastic behavior; it requires tracing the sequential degradation, plastic hinge formation, energy dissipation, and global ductility of the system up to target displacement limits.

Prior to Sprint B4.4, BeamLab provided:
1. 12-DOF 3D Space Frame Direct Stiffness analysis (`SpaceFrameSolver3D`)
2. Second-order geometric non-linearity ($P\text{-}\Delta$) (`PDeltaSolver3D`)
3. Slender tension/compression-only element switching (`TensionOnlySolver3D`)

BeamLab lacked an engine to model concentrated plastic hinges at member ends, incremental displacement-controlled lateral loading, capacity curve generation ($V_{base}$ vs $\Delta_{roof}$), and ASCE 41-17 acceptance criteria verification (Immediate Occupancy, Life Safety, Collapse Prevention).

## Decision
We implemented `PushoverSolver3D` in `packages/core-engine/solver/PushoverSolver3D.ts`:

### 1. Lumped Plastic Hinge Formulation with Exact Flexibility Inversion
Rather than using arbitrary discrete hinges or crude zero-stiffness penalties that introduce numerical ill-conditioning, each plastic hinge is formulated via its tangent rotational flexibility $f_h = 1 / k_t$ in the member flexural flexibility matrix:
$$
\mathbf{f}_{z}^{tangent} = \begin{bmatrix} \frac{L}{3EI_{zz}} + f_{h1,z} & -\frac{L}{6EI_{zz}} \\ -\frac{L}{6EI_{zz}} & \frac{L}{3EI_{zz}} + f_{h2,z} \end{bmatrix}
$$
Inverting $\mathbf{f}_z^{tangent}$ yields the exact softened member flexural stiffness $\mathbf{k}_{\theta z}^{2\times 2}$, with equilibrium-derived shear coupling terms. This guarantees positive-definiteness, symmetric stiffness, and unconditional numerical stability even in the presence of simultaneous plastic mechanisms.

### 2. FEMA 356 Backbone Force-Deformation Model
Each hinge tracks plastic rotation $\theta_{pl}$ and current capacity along the standard FEMA 356 piecewise linear backbone:
- **Point A to B**: Linear elastic response ($M < M_p$).
- **Point B to C**: Post-yield strain hardening ($M = M_p \cdot [1 + \alpha_{hard} \cdot (\theta_{pl}/\theta_y)]$, default $\alpha_{hard} = 0.02$).
- **Point C to D**: Post-peak strength degradation down to residual plateau $c \cdot M_p$ ($c = 0.20$).
- **Point D to E**: Residual strength plateau before total failure.

### 3. ASCE 41-17 Acceptance Criteria & Performance State Tracking
Plastic rotations are audited at every displacement step against performance levels:
- **Elastic**: $\theta_{pl} \le 0$
- **Yield**: $0 < \theta_{pl} \le \theta_{IO}$
- **Immediate Occupancy (IO)**: $\theta_{IO} < \theta_{pl} \le \theta_{LS}$
- **Life Safety (LS)**: $\theta_{LS} < \theta_{pl} \le \theta_{CP}$
- **Collapse Prevention (CP)**: $\theta_{CP} < \theta_{pl} \le \theta_{residual}$
- **Residual**: $\theta_{pl} > \theta_{residual}$

Global structural performance is synthesized across all hinges: `OPERATIONAL`, `IMMEDIATE_OCCUPANCY`, `LIFE_SAFETY`, `COLLAPSE_PREVENTION`, or `COLLAPSE_RISK`.

### 4. Incremental Displacement-Controlled Stepping
Analysis pushes a designated control node (e.g. roof) along a specified direction (X, Y, Z) in $N$ discrete steps. At each step:
1. Tangent stiffness $\mathbf{K}_T$ is assembled with active hinge flexibilities.
2. The unit incremental displacement pattern $\Delta \mathbf{u}_1$ under reference lateral loads is computed.
3. The load increment $\Delta \lambda = \frac{\Delta_{target, step} - \Delta_{ctrl}}{\Delta u_{ctrl, 1}}$ is scaled to meet the exact step target.
4. Member end actions and hinge states are updated.
5. Base shear $V_{base} = \sum R_{supports}$ is recorded.

### 5. Capacity Curve Bilinearization & Seismic Parameters
In accordance with ASCE 41-17 Section 7.4.3.2.4:
- Total hysteretic dissipated energy $E_{dissipated} = \int_0^{\Delta_{max}} V(\Delta) d\Delta$.
- Initial effective stiffness $K_e = \frac{V_{0.6}}{ \Delta_{0.6} }$.
- Equal-energy balance yields effective yield capacity $(V_y, \Delta_y)$.
- Ductility factor $\mu = \frac{\Delta_{max}}{\Delta_y}$.
- Overstrength factor $\Omega = \frac{V_{max}}{V_{first\_yield}}$.

## Consequences
- **Positive**: Engineers can perform seismic pushover analyses directly in BeamLab, obtaining non-linear capacity curves, ductility ratios, and ASCE 41 compliance metrics without third-party desktop FEA software.
- **Positive**: Flexibility inversion formulation avoids artificial singularity and guarantees monotonic convergence.
- **Architecture**: Sets the foundation for Sprint B4.5 (parallel Web Worker offloading) and Phase B5 autonomous structural optimization agents.
