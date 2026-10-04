# ADR-103: Interactive 3D Post-Tensioned Tendon Studio UI

## Status
Accepted

## Context
Following the completion of Sprints B16.1 through B16.4, the algorithmic foundation of `@beamstudio/prestressed-engine` is complete:
1. `StrandCatalog.ts` & `TendonProfileEngine.ts` (Prestress strand properties, parabolic/harped/reverse continuous trajectories).
2. `PrestressLossAuditor.ts` (Curvature friction, wobble, wedge draw-in, elastic shortening, and time-dependent creep/shrinkage/relaxation losses).
3. `LoadBalancingEngine.ts` & `HyperstaticPrestressEngine.ts` (Equivalent load balancing $w_{bal} = 8 P e / L^2$, anchor moments, secondary hyperstatic moments $M_2$).
4. `FiberStressAuditor.ts` & `UltimateFlexuralCapacityEngine.ts` (Initial transfer and service fiber stress checks, ACI 318 Class U/T/C crack classification, decompression moment, and ultimate $\phi M_n$).

To deliver a world-class structural computer-aided engineering experience, `apps/web` requires an interactive studio interface:
- **Spatial 3D Tendon Inspection**: Real-time rendering of a 3D translucent concrete beam with the 3D draped tendon wireframe inside.
- **Parametric Sliders**: Real-time manipulation of drape, strand count, jacking force, and friction coefficients with instantaneous recalculation.
- **Interactive Force & Stress Envelopes**: Clear visualization of force drops ($P_{jack} \to P_{seat} \to P_{transfer} \to P_{eff}$) and extreme fiber stresses vs allowable limit thresholds.
- **Professional Engineering Documentation**: Formal dual-code (ACI 318-19 / Eurocode 2) calculation notes exportable to Markdown.

## Decision
1. Create `PrestressedStudio.tsx` in `apps/web/src/features/prestressed/` structured into 5 tabbed views:
   - **Tab 1: Section & Strands**: Concrete geometry (rectangular, T-beam, I-girder), strand catalog, tendon assembly, and jacking stress compliance.
   - **Tab 2: 3D Tendon Profile**: Three.js WebGL spatial canvas with translucent beam extrusion and 3D spline tendon, drape $d(x)$ sliders, and angular change diagnostics.
   - **Tab 3: Losses Ledger**: Interactive force distribution plot ($P(x)$) and breakdown of friction, seating, elastic shortening, creep, shrinkage, and steel relaxation losses.
   - **Tab 4: Fiber Stresses**: Top/bottom stress diagrams at initial transfer and service stages with ACI 318-19 Class U/T/C classification badge and decompression moment.
   - **Tab 5: Load Balancing & Report**: Upward balanced load $w_{bal}$, balanced dead load percentage $\beta_{bal}$, secondary moment $M_2$, ultimate flexural capacity $\phi M_n$ vs $M_u$, and one-click calculation sheet export.
2. Add `prestressedStudioOpen` and `setPrestressedStudioOpen` to the central Zustand store (`apps/web/src/store/index.ts`).
3. Add a dedicated "PT Studio" button with `Disc` icon to `TopNav.tsx` and integrate the modal into `WorkspaceLayout.tsx`.
4. Add `@beamstudio/prestressed-engine: workspace:*` dependency to `apps/web/package.json`.

## Consequences
- Successfully completes **Phase B16: Prestressed & Post-Tensioned Concrete Structural Systems Engine & Interactive 3D Tendon Studio UI**.
- Fully restores and extends BeamLab's flagship studio suite across 16 major structural engineering disciplines.
