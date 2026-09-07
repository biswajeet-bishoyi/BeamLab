# ADR-044: 3D Space Frame Direct Stiffness Kernel (12-DOF)

## Status
Accepted

## Context
Standard plane frame solvers are limited to 2D in-plane actions ($u_x, u_y, \theta_z$) and cannot represent complex 3D spatial structures such as pitched roof portal frames with purlins, double-layer space trusses, transmission towers, curved bridges, or multi-story buildings subjected to biaxial lateral and torsional ground excitations.

A complete 3D spatial beam-column element requires 6 degrees of freedom per node (12 DOFs per element):
$$\mathbf{d}_e = [u_{x1}, u_{y1}, u_{z1}, \theta_{x1}, \theta_{y1}, \theta_{z1}, u_{x2}, u_{y2}, u_{z2}, \theta_{x2}, \theta_{y2}, \theta_{z2}]^T$$

Prior to Sprint B4.1, BeamLab had a 2D 2-DOF/node beam matrix solver in `core-engine` and mock adapters in `solver-runtime`, but lacked a native 3D 12-DOF space frame stiffness kernel.

## Decisions

### 1. 12-DOF Spatial Element Formulation (`SpaceFrameSolver3D`)
- **Stiffness Matrix $\mathbf{k}_e \in \mathbb{R}^{12 \times 12}$**:
  - Axial deformation: $\frac{EA}{L}$
  - Saint-Venant uniform torsion: $\frac{GJ}{L}$
  - Biaxial bending with Timoshenko shear deformation parameters:
    $$\Phi_y = \frac{12EI_{zz}}{G A_{sy} L^2}, \quad \Phi_z = \frac{12EI_{yy}}{G A_{sz} L^2}$$
    capturing both flexural and shear deflections accurately.
- **3D Coordinate Transformation $\mathbf{T}_{12 \times 12}$**:
  - Constructed from 3 orthogonal unit vectors $(\vec{e}_x, \vec{e}_y, \vec{e}_z)$:
    - Longitudinal axis $\vec{e}_x = \frac{\vec{p}_2 - \vec{p}_1}{L}$.
    - Reference vertical plane projection for non-vertical members: $\vec{e}_z = \frac{\vec{e}_x \times \vec{k}}{\|\vec{e}_x \times \vec{k}\|}$ and $\vec{e}_y = \vec{e}_z \times \vec{e}_x$.
    - Standard convention for vertical columns: $\vec{v}_{ref} = (0, 1, 0)$.
    - Arbitrary cross-sectional orientation: Supports roll angle $\beta$ and explicit user web vectors.
  - Block diagonal transformation: $\mathbf{T} = \operatorname{diag}(\mathbf{R}, \mathbf{R}, \mathbf{R}, \mathbf{R})$.
  - Global element stiffness: $\mathbf{K}_e = \mathbf{T}^T \mathbf{k}_e \mathbf{T}$.
- **Member End Releases**:
  - Supports arbitrary moment hinges ($M_y, M_z, M_x$) at start and end nodes via static condensation.
- **Equivalent Fixed-End Actions**:
  - Transforms global distributed line loads $(w_x, w_y, w_z)$ into consistent local fixed-end reactions $\mathbf{f}_{fem}$ and equivalent nodal forces.

### 2. Native Solver Runtime Integration (`DirectSpaceFrame3DAdapter`)
- Implements `ISolverAdapter` in `@beamlab/solver-runtime`.
- Allows the BeamLab client and background workers to run native 3D finite element space frame analyses with sub-millisecond solve latency.

### 3. Verification & Benchmarking
- Closed-form Euler-Bernoulli cantilever tip deflection $\delta = \frac{PL^3}{3EI}$ verified to $< 10^{-6}\text{ m}$.
- Saint-Venant torsional twist $\theta = \frac{TL}{GJ}$ verified to $< 10^{-6}\text{ rad}$.
- Spatial L-frame with out-of-plane coupling and global equilibrium verification $\sum \vec{F} = \vec{0}, \sum \vec{M} = \vec{0}$.

## Consequences
- **Positive**:
  - BeamLab now natively solves general 3D structures with full 12-DOF kinematic fidelity.
  - Zero external dependencies: pure analytical TypeScript linear algebra with sub-millisecond execution.
- **Next Steps**:
  - Advance to **Sprint B4.2: Geometric Non-Linearity & Second-Order P-Delta Solver** ($\mathbf{K}_T = \mathbf{K}_E + \mathbf{K}_G(P)$, Newton-Raphson iterations, AISC 360 Direct Analysis Method $B_1/B_2$ factors).
