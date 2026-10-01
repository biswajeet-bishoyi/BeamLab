# ADR-069: Interactive 3D Rebar Cage Studio and Detailing UI

## Status
Accepted

## Context
Reinforced concrete (RC) member design and detailing require synthesizing intricate code limits with 3D spatial visualization:
- Engineers need to understand the interaction between concrete cross-sections, clear concrete covers, primary longitudinal reinforcement, and transverse confinement ties/stirrups.
- Column biaxial interaction surfaces $(P_n, M_{nx}, M_{ny})$ are inherently 3D. Inspecting capacity requires 3D failure envelopes, live demand probes $(P_u, M_{ux}, M_{uy})$, and section cuts along principal or skew axes.
- Fabricators require exact Bar Bending Schedules (BBS), including bar designations, standard shape codes, cut lengths with bend deductions, quantities, unit masses, and total steel tonnage.

## Decision
We implement `ConcreteDesignStudio` within `apps/web/src/features/concrete/`:

1. **Multi-Mode RC Engineering Interface**:
   - **RC Beam Studio**: Singly & doubly reinforced rectangular and flanged T-beams, Whitney compression block, shear size effect ($\lambda_s$), stirrup design ($s_{req}, s_{max}$), Bischoff effective moment of inertia $I_e$, and crack control spacing limits.
   - **Column 3D P-M-M Surface**: Interactive 3D/2D failure envelopes, real-time demand coordinate probe $(P_u, M_{ux}, M_{uy})$, radial utilization gauge, second-order slenderness moment magnification $\delta_{ns}$, and seismic confinement checks.
   - **Bar Bending Schedule (BBS)**: Tabulated bar marks, bar sizes, shape codes, cut lengths, bend deductions, weights, and export to CSV/print.

2. **Interactive Parametric CAD SVG Canvas**:
   - High-fidelity vector rendering showing translucent concrete section, longitudinal rebar fibers color-coded by role (top, bottom, side face, corner), and closed ties with $135^\circ$ seismic hooks.
   - **3D Exploded View Slider** ($0\%$ assembled to $100\%$ exploded): Expands outer concrete shell outwards along vector axes to reveal the internal 3D rebar cage.
   - **3D P-M-M Surface Canvas**: Visualizes major-axis ($M_x$) and minor-axis ($M_y$) interaction curves, pure compression cap, and factored load demand vector with safety indicator.

3. **Transparent Mathematical Proofs & Auditability**:
   - KaTeX/LaTeX step-by-step mathematical derivations with code clause citations (ACI 318-19 Chapters 6, 9, 10, 18, 22, 24, 25; EN 1992-1-1).
   - Dynamic circular SVG utilization gauge ($< 85\%$ green, $85-100\%$ amber, $> 100\%$ crimson).

## Consequences
### Positive
- Fully cohesive reinforced concrete design studio bridging non-linear material mechanics with spatial CAD detailing.
- Eliminates "black-box" design via transparent step-by-step mathematical proofs.
- One-click access via the top navigation bar with full keyboard and workspace overlay support.

### Negative / Trade-offs
- SVG rendering provides ultra-crisp vector line work and instant responsiveness without WebGL context overhead, while full 3D orbital mesh inspection is available via the P-M-M surface plot.
