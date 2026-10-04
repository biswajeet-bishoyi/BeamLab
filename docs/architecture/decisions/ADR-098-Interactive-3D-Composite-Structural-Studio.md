# ADR-098: Interactive 3D Composite Structural Studio UI

## Status
Accepted

## Context
Following the completion of the `@beamstudio/composite-engine` calculation domain across Sprints B15.1 through B15.4, BeamLab requires a flagship user interface to allow structural engineers to interactively configure, inspect, and verify composite floor and column systems. Key interactive capabilities required:
1. Cross-section configuration (steel shapes, deck profile, stud diameter, rib orientation).
2. Live interaction degree slider ($\eta \in [0.25, 1.0]$) with instant PNA calculation and continuous $M_p(\eta)$ curve plot.
3. Concrete-Filled Steel Tube (CFT) & Encased Column geometry selectors with real-time 4-point plastic P-M envelope rendering and applied load check.
4. Deflection auditing and AISC Design Guide 11 human comfort walking vibration assessment with dynamic corrective recommendations.
5. Dual-standard engineering report generation with one-click Markdown export.

## Decision
We implemented `apps/web/src/features/composite/CompositeStudio.tsx` and integrated it with BeamLab's global navigation:
1. **5-Tab Suite**:
   - **Tab 1: Profiled Deck & Shear Studs**: Steel wide-flange library selector (`W18x50`, `W21x62`, `IPE360`), slab thickness, deck rib depth/width/pitch, stud diameter/count. Live SVG cross-section diagram showing concrete topping, profiled metal deck ribs, headed studs, and steel I-beam. Computes single stud $Q_n$, $P_{Rd}$, total studs for full composite action, and unshored construction stage verification.
   - **Tab 2: Composite Beam & PNA**: Live interactive slider for degree of composite action $\eta$. Computes PNA location case (In Slab, In Top Flange, or In Web), neutral axis depth, plastic moment $M_p$, AISC $\phi_b M_p$, EC4 $M_{Rd}$, and renders the continuous $M_p(\eta)$ interaction curve.
   - **Tab 3: CFT & Encased Columns**: Supports Rectangular CFT, Circular CFT (with $C_2 = 0.95$ confinement factor), and Encased Wide-Flange columns. Evaluates squash load $P_{p0}$, flexural stiffness $(EI)_{eff}$, Euler buckling load $P_e$, AISC $\phi_c P_n$, EC4 $N_{b,Rd}$, and displays an interactive 4-point plastic P-M envelope with applied factored load point ($P_u, M_{ux}$).
   - **Tab 4: Deflection & Floor Vibration**: Computes effective moment of inertia $I_{eff}$ short/long, transient live load deflection ($L/360$), post-composite total deflection ($L/240$), concrete shrinkage, and camber recommendation. Evaluates AISC DG11 walking vibration ($f_n, B, W, a_p/g$), human comfort verdict, and dynamic mitigation recommendations.
   - **Tab 5: Calculation Sheet**: Comprehensive dual-standard calculation sheet with governing AISC 360-22, Eurocode 4, and AISC DG11 formulas, demand/capacity utilization matrix, and one-click clipboard export.
2. **Global Integration**:
   - Added `compositeStudioOpen` and `setCompositeStudioOpen` to `apps/web/src/store/index.ts`.
   - Added "Composite" studio button with `Building2` icon in `apps/web/src/layouts/TopNav.tsx`.
   - Mounted `CompositeStudio` with `<AnimatePresence>` modal in `apps/web/src/layouts/WorkspaceLayout.tsx`.

## Consequences
- Engineers can interactively optimize shear stud layouts, partial composite interaction, and column geometries.
- Seamless end-to-end integration from numerical engine to web presentation.
- 100% monorepo build and test compliance.
