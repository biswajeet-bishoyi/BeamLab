# ADR-113: Interactive 3D Cable Structures & Tension Studio UI

## Status
Accepted

## Context
Cable structures—spanning cable-stayed bridges with fan/harp stays, long-span suspension bridges with main catenary cables and vertical suspenders, and prestressed cable roofs—require rich visual representation for structural engineers.

Engineers need to interactively:
1. Visualize the 3D bridge superstructure, towers/pylons, and cable arrangement in spatial WebGL.
2. Inspect the real-time cable stress distribution via colored heatmaps against codified PTI allowable limits ($0.15 \le \sigma / f_{pu} \le 0.45$).
3. Examine Ernst equivalent modulus degradation curves ($E_{tan} / E_0$ vs $\sigma$) to diagnose geometric non-linearity and sag flexibility.
4. Review suspender hanger tables detailing stressed in-situ lengths, unstressed shop cutting fabrication lengths ($L_0$), elastic elongations, and cable band clamping safety factors.
5. Verify tower saddle equilibrium, wrap angle ($\theta_{wrap}$), and Euler-Eytelwein friction slipping safety factors ($SF_{slip} > 1.0$).

## Decision
We implement `CableStudio` in `apps/web/src/features/cable/`:

1. **3D WebGL Spatial Viewport (`Three.js` & `OrbitControls`)**:
   - Renders 3D pylons/towers, bridge roadway deck with lane markings, cable anchor points, and 3D catenary cables.
   - Dynamic HSL color heatmap mapping cable stress ratios directly from calculations in `@beamlab/cable-engine`.

2. **Cable-Stayed Bridge & Initial Tension Tuning Tab**:
   - Topology selectors: Fan, Semi-Harp, Harp.
   - Real-time stay count, span length, tower height, and deck dead load sliders.
   - Instant calculation of required vertical lift forces and optimal stay pre-tensions using `StayCableTuningEngine`.

3. **Long-Span Suspension Bridge Tab**:
   - Main span, sag ratio ($f/L$), tower height, and suspender spacing controls.
   - Real-time calculation of horizontal tension $H$, maximum saddle tension, tower vertical thrust, saddle sliding safety factor, and suspender fabrication lengths using `SuspensionCableSystemEngine`.

4. **Ernst Modulus & Exact Catenary Tab**:
   - Interactive degradation bar chart illustrating equivalent modulus retention ($\eta$) across stress levels from 50 MPa to 1000 MPa.
   - Exact hyperbolic catenary kinematics vs parabolic approximation.

5. **Codified Cable Catalog Tab**:
   - Bridge wire strand (Grade 1860), locked coil rope (Grade 1770), spiral strand (Grade 1570), and stainless steel stay strands with diameter, metallic area, unit weight, and breaking load.

6. **Global Shell & Studio Integration**:
   - Integrated into `TopNav.tsx` with dedicated Cable Studio launcher button.
   - Controlled via `useStore` (`cableStudioOpen`, `setCableStudioOpen`).
   - One-click CSV export of cable cutting and tuning schedules.

## Consequences
- Completes the entire 5-part Cable & Tension Structures Engineering Suite (Sprint B18: B18.1 – B18.5).
- Provides structural engineers with an intuitive web-based interface for complex geometric non-linear cable design and stay tuning.
