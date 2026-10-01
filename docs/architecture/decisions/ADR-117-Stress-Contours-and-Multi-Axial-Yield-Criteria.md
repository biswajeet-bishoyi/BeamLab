# ADR-117: Stress Contours & Multi-Axial Yield Criteria Engine

## Status
Accepted

## Context
Finite element analysis of continuum surface structures (plates, shells, shear walls, cores) computes the stress tensor:
$$[\sigma] = \begin{bmatrix} \sigma_{xx} & \tau_{xy} \\ \tau_{xy} & \sigma_{yy} \end{bmatrix}$$
To evaluate structural safety, prevent plastic deformation, and generate insightful color contour heatmaps for structural engineers, the continuum stress tensor must be converted into:
1. **Principal Stresses ($\sigma_1, \sigma_2$) & Max Shear ($\tau_{max}$)**: Maximum tensile and compressive stresses independent of element orientation.
2. **Ductile Metal Yielding ($J_2$ / von Mises)**: Distortion energy yield criterion for structural steel plates, bridge girders, and connection components.
3. **Maximum Shear ($Tresca$)**: Conservative shear yield boundary for ductile materials.
4. **Nodal Averaging & Gradient Smoothing**: Translating discontinuous element Gauss point stresses into smooth continuous nodal fields for 3D WebGL contour rendering.

## Decision
We implement `StressCriteriaEngine` in `@beamlab/fem-engine/src/stress/`:

1. **Exact 2D Mohr's Circle Principal Stresses**:
   - $\sigma_{1,2} = \frac{\sigma_{xx} + \sigma_{yy}}{2} \pm \sqrt{\left(\frac{\sigma_{xx} - \sigma_{yy}}{2}\right)^2 + \tau_{xy}^2}$
   - Max in-plane shear $\tau_{max} = \frac{\sigma_1 - \sigma_2}{2}$
   - Principal stress angle $\theta_p = \frac{1}{2} \operatorname{atan2}(2\tau_{xy}, \sigma_{xx} - \sigma_{yy})$

2. **Multi-Axial Yield Evaluation**:
   - **Huber-von Mises equivalent stress**:
     $$\sigma_{vm} = \sqrt{\sigma_{xx}^2 - \sigma_{xx}\sigma_{yy} + \sigma_{yy}^2 + 3(\tau_{xy}^2 + \tau_{xz}^2 + \tau_{yz}^2)}$$
   - **Tresca stress intensity**: $\sigma_{tresca} = \max(|\sigma_1 - \sigma_2|, |\sigma_1|, |\sigma_2|)$
   - **Capacity utilization ratios**: $UR_{vm} = \sigma_{vm} / f_y$ and $UR_{tresca} = \sigma_{tresca} / f_y$ with plastic yield detection flags.

3. **Continuous Nodal Stress Smoothing**:
   - Area-weighted inverse distance accumulation mapping element stresses onto shared nodes.
   - Provides continuous color maps across the entire 3D mesh in the Studio UI.

## Consequences
- Powers the 3D contour gradient shader in the Plate & Shell Studio (Sprint B19.5).
- Completes the core continuum stress evaluation engine for all 2D/3D surface finite elements in BeamLab.
