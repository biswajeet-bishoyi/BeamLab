# ADR-114: MITC4 Mindlin-Reissner Plate & Flat Shell Elements

## Status
Accepted

## Context
Structural floors, shear walls, bridge box girder webs, and elevator core walls in civil engineering are continuum surface structures that carry both in-plane membrane stresses ($N_{xx}, N_{yy}, N_{xy}$) and out-of-plane flexural bending and twisting moments ($M_{xx}, M_{yy}, M_{xy}$), plus out-of-plane transverse shear ($V_x, V_y$).

Traditional Kirchhoff thin plate elements require $C^1$ continuity, cannot account for transverse shear deformation in thick transfer slabs ($h/L > 0.05$), and suffer numerical issues. Meanwhile, standard 4-node isoparametric Reissner-Mindlin quad elements suffer from severe **shear locking** (spurious excessive stiffness) as plate thickness $h \to 0$.

In 1984, Dvorkin and Bathe introduced the **MITC4 (Mixed Interpolation of Tensorial Components)** formulation, which ties the covariant transverse shear strain field to edge midpoints, completely eliminating shear locking across both ultra-thin and thick continuum shells.

## Decision
We establish `@beamstudio/fem-engine` and implement the `MITC4ShellElement` kernel (`packages/fem-engine/src/element/`):

1. **6 DOFs Per Node Flat Shell (24 DOFs per Quad Element)**:
   - Order of local DOFs: $[u_i, v_i, w_i, \theta_{xi}, \theta_{yi}, \theta_{zi}]^T$.
   - **Membrane formulation**: 4-node bilinear isoparametric plane stress quad ($u, v$) with drilling rotation ($\theta_z$) fictitious stabilization ($k_{drill} = 10^{-4} G \cdot t \cdot A_{el}$) to prevent matrix singularity for coplanar assemblies.
   - **Bending formulation**: 4-node Mindlin-Reissner plate bending with $2 \times 2$ Gauss quadrature.

2. **MITC4 Tied Covariant Shear Field**:
   - Evaluates covariant shear strains $\gamma_{rz}, \gamma_{sz}$ from edge mid-side sampling points $A, B, C, D$:
     $$\gamma_{rz} = \frac{1}{2}(1 + s) \gamma_{rz}^{(C)} + \frac{1}{2}(1 - s) \gamma_{rz}^{(A)}$$
     $$\gamma_{sz} = \frac{1}{2}(1 + r) \gamma_{sz}^{(B)} + \frac{1}{2}(1 - r) \gamma_{sz}^{(D)}$$
   - Transforms into Cartesian transverse shear strains $\gamma_{xz}, \gamma_{yz}$, passing the patch test with zero shear locking.

3. **3D Spatial Coordinate Transformation ($[T_{24 \times 24}]$)**:
   - Evaluates surface normal $\hat{e}_z = \frac{v_{13} \times v_{24}}{|v_{13} \times v_{24}|}$ and in-plane orthogonal axes $\hat{e}_x, \hat{e}_y$.
   - Transforms local $[K_l]$ to global $[K_g] = [T]^T [K_l] [T]$.

4. **Internal Stress Resultants**:
   - Extracts membrane forces $N_{xx}, N_{yy}, N_{xy}$, bending moments $M_{xx}, M_{yy}, M_{xy}$, and transverse shears $V_x, V_y$.

## Consequences
- Forms the core structural continuum element for slabs, shear walls, cores, and bridge decks in BeamLab.
- Provides the stiffness matrix and force evaluator for automatic surface meshing (Sprint B19.2), Wood-Armer reinforcement design (Sprint B19.3), and 3D FE Shell Studio (Sprint B19.5).
