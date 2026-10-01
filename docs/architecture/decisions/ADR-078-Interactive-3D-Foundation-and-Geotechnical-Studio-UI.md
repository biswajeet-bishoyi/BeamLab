# ADR-078: Interactive 3D Foundation & Geotechnical Soil-Structure Interaction Studio UI

## Status
Accepted

## Context
Structural engineers designing foundations must seamlessly navigate between geotechnical soil stratigraphy data (boreholes, water table, shear strength parameters), shallow spread footings, mat/raft foundations with subgrade spring interaction, and deep pile group load distribution and cap structural detailing.

Previously, structural analysis, geotechnics, and foundation detailing operated in disconnected silos or third-party spreadsheet calculators. Providing an interactive, high-fidelity studio directly inside BeamLab enables structural engineers to visually inspect and design:
1. Multi-layer soil borehole logs with dynamic groundwater table adjustments and effective overburden stress profiles.
2. 3D isolated spread pad footings with contact pressure trapezoids/triangles, base uplift kern checks, one-way beam shear at $d$, two-way punching shear on $d/2$, and bottom flexural rebar meshes.
3. 2D/3D mat foundations with Winkler subgrade reaction ($k_s$) contour heatmaps, non-linear tension cut-off separation callouts, and angular distortion serviceability verifications.
4. 3D deep pile caps and pile groups with Converse-Labarre group efficiency, individual pile reaction cylinders with utilization color coding, column punching shear, and strut-and-tie flexure detailing.
5. Exportable, codified calculation dossiers complying with ACI 318-19, Eurocode 2/7, and IS 456/2911.

## Decision
We implemented `FoundationStudio` in `apps/web/src/features/foundation`:
1. **Interactive Architecture**:
   - Integrated with `@beamlab/foundation-engine` for real-time recalculations upon parameter changes.
   - 5 dedicated tabs:
     - `'isolated'`: Spread & Eccentric Isolated Pad Footing.
     - `'mat_ssi'`: Mat Foundation & Winkler Subgrade SSI.
     - `'pile_group'`: Deep Foundations & Pile Group.
     - `'stratigraphy'`: Geotechnical Soil Borehole Log & Stress Profiles.
     - `'report'`: Codified Calculation Notes & Global Audit.
2. **High-Fidelity Visualizer**:
   - Interactive SVG-based true-metric 3D perspective representations of foundation slabs, column pedestals, force vectors, and soil reaction fields.
   - Dynamic 2D contour grid for mat contact pressures highlighting uplift/separation zones under overturning.
   - 3D pile group visualization with pile capacity utilization colors and critical punching perimeters.
3. **Workspace Integration**:
   - Added "Foundations" button with `Layers` icon to `TopNav.tsx`.
   - Mounted `FoundationStudio` with smooth `framer-motion` modal overlay transitions in `WorkspaceLayout.tsx`.
   - Added `foundationStudioOpen` and `setFoundationStudioOpen` state in `store/index.ts`.

## Consequences
### Positive
- Unified geotechnical-structural workflow inside the BeamLab browser environment.
- Instant visual feedback on soil-structure separation, punching perimeters, and rebar arrangements.
- Complete type-safety and 100% build compatibility with Vite and rolldown.

### Trade-offs
- The studio utilizes high-resolution 2D/3D vector rendering; WebGL/Three.js mesh extrusions for large 100+ pile groups can be incorporated in future iterations.
