# ADR-038: 3D Deformed Shape & Modal Dynamic Animation Pipeline

## Status
Accepted

## Context
Engineering validation of structural behavior requires 3D visual inspection of deformed shapes and dynamic modal vibrations:
1. **Static Deflection Visualization**: Under serviceability and ultimate limit state combinations ($1.0 D + 1.0 L$, etc.), engineers must inspect structural deflections. Displacements are typically small fractions of span length ($L/360 \sim L/500$, millimeters on meter spans); an exaggeration scaling factor ($10\times$ to $200\times$) is required to make deformation modes visible.
2. **Smooth Elastic Member Curvature**: Linear point-to-point interpolation between displaced joint nodes creates artificial kinks and misrepresents beam curvature. Member deflections must be interpolated using cubic Hermite polynomials incorporating nodal rotations ($\theta_1, \theta_2$) and distributed loads.
3. **Continuous Rainbow Deflection Heatmaps**: Deflection magnitudes ($\delta = \sqrt{u_x^2 + u_y^2 + u_z^2}$) must be mapped onto a continuous color gradient (Blue $\to$ Cyan $\to$ Green $\to$ Yellow $\to$ Red) with vertex-colored Three.js geometries and a floating HUD legend bar displaying numerical values in millimeters.
4. **Modal Dynamic Harmonic Vibration**: Dynamic mode shapes ($\{\phi_n\}$) and natural frequencies ($\omega_n = 2\pi f_n$) must be animatable as harmonic oscillations $\mathbf{u}(t) = \lambda \cdot \{\phi_n\} \sin(\omega_n t)$. The animation loop must execute at 60–120 FPS without garbage collection stutter from geometry allocations.
5. **Undeformed Ghost Reference Geometry**: An overlaid translucent ghost wireframe (`opacity: 0.35`) of the undeformed structure is necessary to visually communicate relative displacement against original datum geometry.

## Decision
We implement a procedural 3D deformation and harmonic animation pipeline in `apps/web/src/features/canvas/deformation/` managed by `ModalAnimationController.ts`.

### Architecture

```
                       Analysis Results (Displacements / Eigenvectors)
                                       │
                                       ▼
                            DeformationEngine
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
Cubic Hermite Interpolator                             Rainbow Heatmap Mapper
(Smooth elastic curvature)                             (Vertex Color Buffer)
            │                                                     │
            └──────────────────────────┬──────────────────────────┘
                                       │
                                       ▼
                            ModalAnimationController
                   (In-Place Vertex Position / Color Mutation)
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
Deformed Mesh Group          Undeformed Ghost Overlay       Heatmap Legend HUD
(Dynamic 60-120 FPS)         (Translucent Slate Wireframe)  (Gradient Bar + mm Ticks)
```

### Key Technical Decisions

#### 1. In-Place Buffer Mutation for 60–120 FPS Harmonic Animation
Rebuilding Three.js geometries or allocating new arrays inside `requestAnimationFrame` creates heavy GC pressure and frame drops. `ModalAnimationController` binds the `BufferAttribute` arrays (`position`, `color`) upon mode initialization and mutates float buffers in place each frame:
$$\mathbf{x}_i(t) = \mathbf{x}_{i,0} + \lambda \cdot \mathbf{\phi}_{i,n} \cdot \sin(\omega_n t)$$
Setting `positionAttribute.needsUpdate = true` enables sustained 60–120 FPS rendering on WebGL2.

#### 2. Cubic Hermite Elastic Beam Interpolation
Each beam member is subdivided into $N=16$ segments. Rather than straight-line interpolation between end nodes, the transverse displacement along the member axis is interpolated using cubic Hermite shape functions:
$$N_1(\xi) = 1 - 3\xi^2 + 2\xi^3, \quad N_2(\xi) = L(\xi - 2\xi^2 + \xi^3)$$
$$N_3(\xi) = 3\xi^2 - 2\xi^3, \quad N_4(\xi) = L(-\xi^2 + \xi^3)$$
This guarantees $C^1$ continuity at joints and accurately portrays beam sagging, hogging, and inflection points.

#### 3. Continuous Turbo/Rainbow Gradient Mapping
Displacement magnitude $\delta \in [0, \delta_{max}]$ is normalized and mapped to an RGB gradient across four continuous color intervals:
- $0.00 \to 0.25$: Deep Blue $(0, 0, 1)$ to Cyan $(0, 1, 1)$
- $0.25 \to 0.50$: Cyan $(0, 1, 1)$ to Green $(0, 1, 0)$
- $0.50 \to 0.75$: Green $(0, 1, 0)$ to Yellow $(1, 1, 0)$
- $0.75 \to 1.00$: Yellow $(1, 1, 0)$ to Red $(1, 0, 0)$
Colors are written to per-vertex float attributes (`colorAttribute`), enabling smooth interpolation across member surfaces.

#### 4. Interactive Deformation HUD & Modal Controls
The canvas toolbar provides:
- Mode selection: `Undeformed`, `Static Deflected`, `Modal Vibration`.
- Modal case selector: Mode 1 (Lateral Sway, $f_1 = 1.25\text{ Hz}$), Mode 2 (Torsional Twisting, $f_2 = 2.40\text{ Hz}$), Mode 3 (Vertical Floor Bounce, $f_3 = 4.80\text{ Hz}$).
- Controls: Play/Pause, Playback Speed ($0.25\times \dots 2.0\times$), Deflection Scale Multiplier ($10\times \dots 200\times$), and Undeformed Ghost toggle.
- Floating gradient legend HUD showing exact numerical deflection ranges in millimeters.

## Consequences
- Engineers can immediately verify load-deflection patterns and dynamic modal shapes in real-time 3D.
- Zero-allocation rendering loop guarantees smooth 60–120 FPS performance even on large frame models.
- Provides direct foundation for Phase B3 (Results Studio & Interactive Diagnostics).
