# ADR-123: Interactive 3D Earth Retaining and Deep Excavation Studio UI

## Status
Accepted

## Context
Geotechnical and structural engineers require unified visual feedback when designing retaining walls, sheet pile shoring, braced excavations, and natural/cut slopes. Disconnected calculations prevent instant recognition of failure slip surfaces, water table interactions, and strut load distributions.

## Decision
We implemented `EarthStudio` in `apps/web/src/features/earth/EarthStudio.tsx`:
1. **Multi-Domain Geotechnical Modes**:
   - `retaining-wall`: Real-time interactive 3D cantilever/gravity wall modeling with sliding $FS$, overturning $FS$, kern limit $B/6$ bearing pressures, and base stem reinforcement demands.
   - `sheet-pile`: Cantilever & tieback-anchored sheet pile shoring with embedment depth $D$, max bending moments, section modulus $S_{req}$, and grouted tieback bond/free lengths.
   - `peck-cut`: Multi-tiered deep excavations with Peck (1969) apparent earth pressure envelopes across sands and soft/stiff clays, computing tributary strut axial demands.
   - `slope-stability`: 2D/3D slope geometry with phreatic surface, Bishop's simplified & Fellenius methods of slices, and automated grid-hunting for the critical failure circle ($x_c, y_c, R$).
2. **Interactive 3D Three.js Visualizer**:
   - Dynamic 3D extrusion of retaining wall geometry, stratified soil block, water table phreatic surface, shoring steel sheet piles, tieback anchors, struts, and circular slip arcs with slice wireframes.
   - Vector overlays displaying lateral active and hydrostatic pressure arrows.
3. **Responsive Glassmorphic UI**:
   - Parameter sidebar with live sliders for soil friction angle $\phi$, cohesion $c$, unit weight $\gamma$, water table depth $z_w$, surcharge $q$, wall dimensions, and excavation depths.
   - Scorecard HUD with real-time pass/fail badges against Eurocode 7 (EN 1997) and AASHTO LRFD criteria.

## Consequences
- Full interactive pairing between `@beamstudio/earth-engine` analytical engines and user-facing 3D visualization.
- Instant feedback allows rapid optimization of retaining wall geometry and deep excavation shoring.
