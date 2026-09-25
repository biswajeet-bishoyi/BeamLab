# ADR-108: Interactive 3D Bridge Superstructure & Moving Vehicle Studio UI

## Status
Accepted

## Context
Bridge structural engineers and students need an intuitive, visually stunning 3D platform to interactively simulate transient live load vehicular moving trains crossing multi-girder bridge superstructures. Traditional desktop software presents static envelopes or rigid tables, obscuring the physical relationship between moving axle contact patches, influence line shapes, and the resulting dynamic internal force envelopes.

BeamLab requires a full-featured, responsive, 3D WebGL Bridge Studio UI integrated into the web client (`apps/web`):
1. **Interactive 3D WebGL Simulation Canvas**:
   - High-fidelity Three.js 3D rendering of concrete bridge decks, road striping, parallel I-girders/box sections, concrete safety barriers, pier caps, and bearings.
   - Dynamic 3D vehicle model with cab, chassis, multi-axle wheel assemblies, and downward contact force arrows.
   - Animation controls (Play/Pause, speed slider, scrub bar) and real-time HUD telemetry.
2. **Vehicular Load Model Catalog Explorer**:
   - Visual truck and axle configuration inspector supporting AASHTO LRFD (HL-93 Truck, Tandem, Fatigue), Eurocode 1 (LM1, LM2), and IRC 6 (Class 70R, Class A).
3. **Interactive Müller-Breslau Influence Lines**:
   - Dynamic station scrubber ($x_0 / L$) displaying exact influence curves for moment, shear (with unit jump $\Delta V = 1.0$), and reactions.
4. **AASHTO LRFD Girder Distribution & Skew**:
   - Live distribution factors ($g_{m1}, g_{m2}, g_{v1}, g_{v2}$) with real-time skew angle ($\theta$) sliders.
5. **Envelopes, Fatigue & Dynamic Forces**:
   - Critical shear and moment envelopes, dynamic allowance ($IM$), centrifugal lateral forces, braking longitudinal forces, and single-click Markdown calculation note export.

## Decision
We implement `BridgeStudio` in `apps/web/src/features/bridge/`:
1. **State & Store Integration**:
   - `bridgeStudioOpen` boolean state and `setBridgeStudioOpen` action in `apps/web/src/store/index.ts`.
   - Global navigation button with `Truck` icon in `TopNav.tsx`.
   - Smooth animated overlay in `WorkspaceLayout.tsx` using Framer Motion `<AnimatePresence>`.
2. **WebGL Scene Graph**:
   - Autonomous Three.js rendering loop with `OrbitControls`, ambient, directional, and atmospheric rim lighting.
   - Real-time mapping from 1D bridge station coordinates ($x \in [0, L]$) to 3D world space.
3. **Modular 5-Tab Architecture**:
   - Tab 1: `simulation` (3D moving vehicle, scrub bar, HUD).
   - Tab 2: `vehicles` (standard axle diagrams & tables).
   - Tab 3: `influence` (Müller-Breslau curves).
   - Tab 4: `distribution` (AASHTO LLDF & skew angle sliders).
   - Tab 5: `envelopes` (moment/shear envelopes, dynamic forces, Markdown export).

## Consequences
- Elevates BeamLab into a premier computational bridge engineering platform.
- Bridges the gap between codified mathematical formulations and intuitive 3D spatial engineering physics.
