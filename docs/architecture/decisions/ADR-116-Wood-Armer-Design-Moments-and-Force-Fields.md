# ADR-116: Plate & Shell Internal Force Fields & Wood-Armer Design Moments

## Status
Accepted

## Context
When analyzing 2D/3D continuum plate and flat shell structures (such as elevated floor slabs, raft foundations, and bridge decks), finite element formulations produce triaxial bending moment tensors:
$$[M] = \begin{bmatrix} M_{xx} & M_{xy} \\ M_{xy} & M_{yy} \end{bmatrix}$$
accompanied by transverse out-of-plane shear vectors $\vec{V} = [V_x, V_y]^T$.

However, reinforcement bars in reinforced concrete slabs are placed in orthogonal coordinate directions ($X$ and $Y$), on top and bottom faces. Supplying steel based only on $M_{xx}$ and $M_{yy}$ is dangerous because the twisting moment $M_{xy}$ can induce diagonal tension cracks leading to catastrophic shear or flexural failure.

In 1968, R.H. Wood and A. Armer derived the mathematically rigorous yield-line and lower-bound equilibrium equations that transform arbitrary moment fields into safe orthogonal design moments $(M_{xd}, M_{yd})$ for top and bottom reinforcement layers.

## Decision
We implement `WoodArmerEngine` in `@beamstudio/fem-engine/src/forces/`:

1. **Bottom Face (Sagging / Positive Reinforcement)**:
   - Primary case:
     $$M_{xd} = M_{xx} + |M_{xy}|, \quad M_{yd} = M_{yy} + |M_{xy}|$$
   - Compensated cases (when one orthogonal moment is negative):
     - If $M_{xd} < 0 \implies M_{xd} = 0, \quad M_{yd} = M_{yy} + \frac{M_{xy}^2}{|M_{xx}|}$
     - If $M_{yd} < 0 \implies M_{yd} = 0, \quad M_{xd} = M_{xx} + \frac{M_{xy}^2}{|M_{yy}|}$

2. **Top Face (Hogging / Negative Reinforcement)**:
   - Primary case:
     $$M_{xd} = M_{xx} - |M_{xy}|, \quad M_{yd} = M_{yy} - |M_{xy}|$$
   - Compensated cases (when one orthogonal moment is positive):
     - If $M_{xd} > 0 \implies M_{xd} = 0, \quad M_{yd} = M_{yy} - \frac{M_{xy}^2}{|M_{xx}|}$
     - If $M_{yd} > 0 \implies M_{yd} = 0, \quad M_{xd} = M_{xx} - \frac{M_{xy}^2}{|M_{yy}|}$

3. **Transverse Out-of-Plane Shear Capacity**:
   - Resultant one-way shear: $V_{res} = \sqrt{V_x^2 + V_y^2}$.
   - Evaluates nominal shear stress $\tau = \frac{V_{res}}{b \cdot d}$ against Eurocode 2 / ACI 318 concrete shear capacity $v_{Rd,c}$, identifying regions requiring shear link studs or drop panels.

## Consequences
- Guarantees code-compliant rebar area calculations ($A_{sx}, A_{sy}$) in the concrete design pipeline.
- Feeds interactive moment field contouring into the 3D Plate & Shell Studio (Sprint B19.5).
