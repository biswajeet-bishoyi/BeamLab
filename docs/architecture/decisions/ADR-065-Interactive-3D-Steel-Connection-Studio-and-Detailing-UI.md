# ADR-065: Interactive 3D Steel Connection Studio and Detailing UI

## Status
Accepted

## Context
Structural steel connection design requires rigorous limit-state verification and intuitive spatial comprehension. Fabricators, detailers, and structural engineers must coordinate complex geometries:
- Spatial layout of bolts, edge distances, pitches, gauges, weld fillets, and plate dimensions.
- Limit state verification breakdown across AISC 360-16 / AISC Manual 15th Ed. / Eurocode 3 EN 1993-1-8.
- Step-by-step mathematical derivations with formula citations, variable substitutions, and code references for auditability.
- Multi-perspective visualization: orthographic projection (side elevation, front elevation, plan), exploded 3D component view, and real-time interactive parameter adjustments.
- Instant fabrication deliverables: complete Bill of Materials (BOM) including steel profiles, plates, bolt assemblies, and shop/field weld schedules.

## Decision
We implement the `SteelConnectionStudio` feature module within `apps/web/src/features/connections/`:

1. **Interactive Parametric CAD SVG Canvas**:
   - Real-time scalable vector rendering of support columns, primary beams, connection plates, clip angles, base plates, anchors, stiffeners, and bolt patterns.
   - 3D exploded projection mode controlled via an interactive slider ($0\%$ assembled to $100\%$ exploded), showing component separation along spatial axes with alignment guide dashed lines.
   - High-fidelity visual styling with metallic gradients, hatch patterns, dimensional annotation markers (gauges, pitches, edge distances), weld symbols, and bolt heads.

2. **Multi-Connection Type Architecture**:
   - **Shear Tab (Fin Plate)**: Web plate welded to column flange/web, bolted to beam web, with AISC Part 10 eccentricity check.
   - **Double Web Angle**: Clip angles shop bolted/welded to beam web and field bolted to column.
   - **Extended End-Plate Moment (4E / 4ES / 8ES / Flush)**: Tension bolt rows, unstiffened and stiffened plates, prying action, column panel zone shear.
   - **Column Base Plate**: Axial load and moment equilibrium, anchor rods, DG 1 cantilever bending ($m, n, \lambda n'$), bearing on concrete foundation.

3. **Governing Utilization & Limit State Verification**:
   - Circular SVG utilization dial with color-coded safety states (Safe $< 0.85$, Near Limit $0.85 - 1.00$, Exceeded $> 1.00$).
   - Comprehensive tabular breakdown of all limit states: Capacity ($R_n$), Design Strength ($\phi R_n$ or $R_d$), Demand ($R_u$ or $V_{Ed}$), and Utilization ratio.
   - Status indicators identifying the governing critical failure mechanism.

4. **Transparent Mathematical Proofs & Derivations**:
   - Interactive calculation step viewer displaying LaTeX/KaTeX rendered mathematical formulations.
   - Step-by-step equation expansions with substituted variables, units, and code clause citations (AISC 360-16 J3, J4, J10, DG 1, DG 4, DG 16; EN 1993-1-8).

5. **Fabrication Bill of Materials (BOM) & Export**:
   - Detailed component schedule: member designations, plate dimensions ($t \times b \times L$), grades, weights, bolt counts/grades, and weld lengths/throat sizes.
   - Print/export capability and one-click JSON/CAD data exchange.

## Consequences
### Positive
- Engineers can interactively tweak bolt diameter, spacing, edge distances, plate thicknesses, and weld sizes, observing instant recalculations and graphical updates.
- Complete parity between analytical connection engine calculations (`@beamstudio/connection-engine`) and UI visualization.
- Eliminates "black-box" connection design by exposing transparent step-by-step mathematical derivations.
- Seamlessly integrated into BeamLab's main workspace overlay system with full keyboard shortcut and TopNav navigation support.

### Negative / Trade-offs
- Pure SVG CAD projection requires custom mathematical projection routines for the exploded 3D view rather than an off-the-shelf 3D modeler, but ensures instant rendering performance, zero WebGL context overhead, and razor-sharp print exports.
