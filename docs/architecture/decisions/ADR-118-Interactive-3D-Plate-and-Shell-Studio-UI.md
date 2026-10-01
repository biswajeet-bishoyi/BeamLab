# ADR-118: Interactive 3D Plate & Shell Finite Element Continuum Studio UI

## Status
Accepted

## Context
Reinforced concrete floor plates, two-way flat slabs, raft foundations, and shear core walls are complex 2D/3D continuum structures. Structural engineers need an intuitive, high-performance visual studio to:
1. Generate and inspect structured quadrilateral and boundary-conforming polygonal meshes with interior openings.
2. View 3D out-of-plane deformed surfaces with variable displacement magnification.
3. Toggle between critical stress/moment field heatmaps:
   - von Mises equivalent stress $\sigma_{vm}$ (critical for steel plates and extreme fiber flexure).
   - Wood-Armer orthogonal design moments $M_{xd}$ for sagging and hogging rebar layout.
   - Out-of-plane vertical deflections $w(x, y)$ against deflection limits ($L / 250$, $L / 500$).
   - Transverse one-way shear vectors $V_{res}$ against concrete shear strength $v_{Rd,c}$.
4. Quantify matrix bandwidth minimization through Reverse Cuthill-McKee (RCM) optimization.

## Decision
We implement `PlateShellStudio` in `apps/web/src/features/fem/`:

1. **3D WebGL Spatial Viewport (`Three.js` & `OrbitControls`)**:
   - Renders 3D deformed finite element quad mesh surfaces with smooth vertex color contour gradients.
   - Color mapping uses continuous HSL blue-cyan-emerald-amber-red gradients dynamically scaled to peak field values.
   - Includes wireframe overlay toggle and real-time displacement amplification slider ($10\times$ to $500\times$).

2. **Parametric Slab Domain & Geometry**:
   - Boundary topologies: Rectangular, L-shaped, and Slab with central elevator core opening.
   - Live width $L_x$, length $L_y$, thickness $t$ (150mm – 800mm), and uniform gravity load $q$ ($kN/m^2$) controls.
   - Concrete grades (C30/37, C40/50) and structural steel (S355).

3. **Analytical Metrics & KPI Bar**:
   - Real-time display of peak deflection $w_{max}$, span ratio $L / w_{max}$, maximum von Mises stress, peak Wood-Armer moment $M_{xd}$, and RCM bandwidth comparison ($\beta_{before} \to \beta_{after}$).
   - Detailed element schedule table.
   - One-click CSV export of element coordinates, moments, and stresses.

4. **Global Shell & TopNav Integration**:
   - Integrated into `TopNav.tsx` with dedicated `Shell / FEM` launcher button.
   - Controlled via `useStore` (`plateShellStudioOpen`, `setPlateShellStudioOpen`).
   - Mounted inside `WorkspaceLayout.tsx` within animated `<AnimatePresence>` modal overlays.

## Consequences
- Completes the entire 5-part Plate, Shell & Generalized 2D/3D Finite Element Continuum Suite (Sprint B19: B19.1 – B19.5).
- Bridges analytical continuum mechanics with code-compliant reinforced concrete and steel design.
