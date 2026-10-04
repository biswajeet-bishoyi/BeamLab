# ADR-034: 3D Structural Entity Representation and Profile Extrusion

## Status
Accepted

## Context
A professional structural engineering operating system must provide high-fidelity visual representations of structural elements:
1. **Volumetric Cross-Section Geometry**: Structural frames are composed of standard steel shapes (I-beams, hollow tubes, channels, angles, tees) and reinforced concrete shapes (rectangular, circular) defined in catalogs (AISC, EN, IS). Displaying bare lines is insufficient for visualizing member orientations, clearance, torsional behavior, and realistic architectural presentations.
2. **Local Coordinate Systems (LCS)**: Every structural member has an orientation defined by its longitudinal axis $\mathbf{x}_{local}$ and a roll angle $\beta$ (`rollAngleDeg`). The cross-section's strong axis $\mathbf{y}_{local}$ and weak axis $\mathbf{z}_{local}$ dictate bending resistance ($I_y$ vs $I_z$). The 3D canvas must correctly align 3D profile meshes with these local axes.
3. **Boundary Condition & Support Glyphs**: Supports (Fixed, Pinned, Roller, Spring) must be represented with unambiguous, physically intuitive 3D engineering symbols at foundation joints.
4. **Plate & Shell 3D Extrusion**: Floor slabs, shear walls, and foundation mats require 3D volumetric extrusion with realistic physical thickness $t$.
5. **Performance Scalability (Dual Representation)**: While 3D extruded rendering is crucial for inspection, large-scale structures (1,000+ members) require instant switching to high-speed **Centerline Wireframe** mode to maintain 60–120 FPS.

## Decision
We implement a procedural 3D structural geometry engine in `apps/web/src/features/canvas/geometry/` orchestrated by `StructuralSceneController.ts`.

### Architecture

```
                 @beamstudio/engineering-model (StructuralSystem)
                                      │
                                      ▼
                        StructuralSceneController
                                      │
        ┌──────────────┬──────────────┼──────────────┬──────────────┐
        ▼              ▼              ▼              ▼              ▼
 ┌─────────────┐┌─────────────┐┌─────────────┐┌─────────────┐┌─────────────┐
 │ProfileGeom- ││ MemberMesh- ││ SupportMesh-││  NodeMesh-  ││ PlateMesh-  │
 │   Builder   ││   Builder   ││   Builder   ││   Builder   ││   Builder   │
 ├─────────────┤├─────────────┤├─────────────┤├─────────────┤├─────────────┤
 │• I/H Flange ││• LCS 4x4 Mat││• Fixed Base ││• Spheres    ││• Slab Normal│
 │• RHS/Box    ││• Roll Angle ││• Pinned Cone││• Supported  ││• Physical t │
 │• CHS Tube   ││• PBR Steel  ││• Roller Shoe││• Text Sprite││• Outlines   │
 │• L / C / T  ││• PBR Concr. ││• 3D Spring  ││  Node IDs   │              │
 │• Solid R/C  ││• Centerline ││• Custom DOF │              │              │
 └─────────────┘└─────────────┘└─────────────┘└─────────────┘└─────────────┘
```

### Key Technical Decisions

#### 1. Procedural 2D Cross-Section Shapes & Extrusion
`ProfileGeometryBuilder` constructs exact 2D planar shapes (`THREE.Shape`) for standard profiles:
- **I-Profile**: Flanges ($b_f, t_f$) and web ($d, t_w$) with watertight polygon contours.
- **RHS / Box**: Outer rectangular path with interior counter-clockwise hole.
- **CHS / Pipe**: Cylindrical tubular geometry with inner wall radius.
- **C-Channel, L-Angle, T-Section, Solid Rectangular, Solid Circular**.
Geometries are extruded along the member longitudinal axis from $x = 0$ to $x = L$.

#### 2. Robust Member Local Coordinate Transformation
For two arbitrary nodes $\mathbf{P}_1$ and $\mathbf{P}_2$:
- Longitudinal axis: $\vec{x}_{local} = (\mathbf{P}_2 - \mathbf{P}_1) / L$.
- When non-vertical ($|\vec{x}_{local} \cdot \hat{Z}| < 0.9999$):
  - $\vec{z}_{local} = (\vec{x}_{local} \times \hat{Z}) / \|\dots\|$
  - $\vec{y}_{local} = \vec{z}_{local} \times \vec{x}_{local}$
- When vertical ($|\vec{x}_{local} \cdot \hat{Z}| \ge 0.9999$):
  - $\vec{y}_{local} = (0, \text{sign}, 0)$
  - $\vec{z}_{local} = \vec{x}_{local} \times \vec{y}_{local}$
- Roll angle $\beta$ (`rollAngleDeg`) is applied via axis-angle rotation around $\vec{x}_{local}$.
- A 4x4 basis matrix $\mathbf{M} = [\vec{x}_{local}, \vec{y}_{local}, \vec{z}_{local}, \mathbf{P}_1]$ transforms the extruded mesh directly into global 3D space in a single WebGL transform operation.

#### 3. 3D Support Glyphs
- **Fixed**: Heavy steel base plate with 4 corner anchor studs and concrete foundation footing bed with diagonal cross hatching.
- **Pinned**: Tetrahedral pyramid with apex spherical hinge at the node vertex.
- **Roller**: Triangular pivot shoe resting on dual cylindrical steel rollers atop a ground rail plate.
- **Spring**: 3D helical coil spring wire with ground anchoring.

#### 4. Physically Accurate Slabs & Plates
`PlateMeshBuilder` takes coplanar polygon vertices $\mathbf{P}_0 \dots \mathbf{P}_n$ and thickness $t$, calculates the element normal $\hat{n}$, and generates a volumetric prism with top/bottom polygon faces and perimeter quad walls, coupled with semi-transparent PBR concrete material and edge outlines.

#### 5. Dual Representation Toggle
Users can toggle between **3D Extruded Profile** and **Centerline Wireframe** instantly. Centerline mode renders color-coded lines by member classification (Beams in blue, Columns in green, Braces in amber, Trusses in purple) with moment release hinge symbols.

## Consequences
- Engineers can visually inspect structural connections, member orientations, and boundary conditions directly in WebGL.
- Full compatibility with `@beamstudio/engineering-model` entity definitions.
- Smooth 60–120 FPS performance maintained via shared PBR material instances and optional centerline mode.
