# ADR-039: Interactive Internal Force Diagram Engine (3D Viewport & 2D Station Studio)

## Status
Accepted

## Context
Structural engineers evaluate safety and serviceability by inspecting internal forces along frame members, trusses, and continuous beams:
1. **3D Spatial Force Visualization**: Viewing 2D plots in isolation disconnects engineers from spatial 3D load paths. Bending Moment Diagrams (BMD $M_z, M_y$), Shear Force Diagrams (SFD $V_y, V_z$), and Axial Force Diagrams (AFD $N$) must be extruded directly along members in the 3D viewport aligned with their Local Coordinate Systems (LCS).
2. **Dual 3D/2D Synchronized Representation**: While 3D spatial ribbons provide global behavioral context across the structural frame, detailed design verification requires sub-millimeter station accuracy in a dedicated 2D multi-curve studio.
3. **Synchronized Multi-Station Inspection**: Hovering a cursor along a member must drive a synchronized vertical hairline across SFD, BMD, AFD, and deflection curves simultaneously, with exact numerical readouts ($x, N, V, M, \delta$).
4. **Critical Station Detection**: Peak bending moments ($M_{max}$), zero shear crossings ($V=0$), points of inflection ($M=0$), and governing shears ($V_{max}$) must be automatically identified with callout markers.
5. **Configurable Sign Conventions**: Structural engineers universally plot bending moments on the tension fiber side of members, while mechanics and textbooks frequently plot Cartesian positive upward. The engine must support toggleable sign conventions.

## Decision
We implement a unified internal force evaluation and visualization system divided into:
1. **Evaluation Engine**: `apps/web/src/features/results/MemberForceEvaluator.ts` — discretizes members into $N=51$ continuous stations, solves differential beam equilibrium equations, and locates critical extrema.
2. **3D Diagram Extrusions**: `apps/web/src/features/canvas/diagrams/` (`DiagramMeshBuilder.ts`, `DiagramController.ts`) — procedurally generates 3D triangle-strip ribbons, peak boundary lines, transverse hatch lines, and billboarded callout sprites in Three.js.
3. **2D Station Diagram Studio**: `apps/web/src/features/results/MemberDiagramStudio.tsx` — interactive SVG multi-diagram inspector with synchronized crosshairs, CSV export, and member selection synchronization with 3D canvas selection.

### Architecture

```
                       Structural Model & Load Conditions
                                       │
                                       ▼
                             MemberForceEvaluator
               (Continuous $s \in [0, L]$, $N, V_y, V_z, M_y, M_z, \delta$)
                                       │
             ┌─────────────────────────┴─────────────────────────┐
             ▼                                                   ▼
     DiagramController                                  MemberDiagramStudio
 (3D Extrusion along LCS)                             (2D Multi-Curve SVG)
   ├───────────────────────┤                            ├────────────────────────┤
   │• Triangle Ribbon Mesh │                            │• Synchronized Crosshair│
   │• Translucent Fill     │                            │• Station Readout Card  │
   │• Peak Boundary Line   │                            │• V=0 / M=0 Critical Pts│
   │• Transverse Hatches   │                            │• Tension-Face Toggle   │
   │• 3D Billboard Sprites │                            │• CSV Station Table     │
   └───────────────────────┘                            └────────────────────────┘
```

### Key Technical Decisions

#### 1. Procedural 3D Ribbon Extrusion Along Member Local Axes
For a member with start node $\mathbf{p}_1$, end node $\mathbf{p}_2$, and local axes $(\hat{\mathbf{x}}, \hat{\mathbf{y}}, \hat{\mathbf{z}})$ computed via `MemberMeshBuilder.computeLocalFrame`:
- For $M_z$ and $V_y$, the diagram extrudes along the local major depth vector $\pm \hat{\mathbf{y}}$.
- For $M_y$ and $V_z$, the diagram extrudes along the local minor width vector $\pm \hat{\mathbf{z}}$.
- For each station $i$, baseline vertex $\mathbf{b}_i = \mathbf{p}_1 + s_i \hat{\mathbf{x}}$ and peak vertex $\mathbf{q}_i = \mathbf{b}_i + (f(s_i) \cdot \lambda) \hat{\mathbf{n}}$ are assembled into a triangle strip mesh with vertex colors mapping positive values to Sky Blue (`#0ea5e9`) and negative values to Rose/Crimson (`#f43f5e`).

#### 2. Synchronized Crosshair Tracking
In `MemberDiagramStudio`, all SVG sub-plots (BMD, SFD, AFD, Deflection) share a unified normalized horizontal span coordinate $x \in [0, L]$. Pointer movements on any diagram dispatch `onHoverX(x)`, updating the vertical indicator across all 4 curves and computing interpolated station forces in real time.

#### 3. Automatic Extrema & Zero-Crossing Search
`MemberForceEvaluator` runs linear and root-finding passes across station intervals:
- Sign flips in $V_y(s_i) \cdot V_y(s_{i+1}) \le 0$ identify exact zero shear stations $x_0 = s_i + \frac{|V_i|}{|V_i| + |V_{i+1}|}(s_{i+1} - s_i)$, pinpointing maximum positive and negative bending moments.
- Sign flips in $M_z(s_i) \cdot M_z(s_{i+1}) \le 0$ identify inflection points where curvature flips from sagging to hogging.

#### 4. Bi-Directional Selection Binding
Selecting any structural member in the 3D canvas (via click or hover) automatically switches the active member in `MemberDiagramStudio`, and changing the member dropdown in `MemberDiagramStudio` centers and highlights the member in 3D.

## Consequences
- Engineers have full visibility into internal force distributions in both 3D spatial frames and 2D station curves.
- Fully compatible with canonical `@beamstudio/engineering-model` and sets up Sprint B3.2 (Multi-Case Result Enveloping).
