# ADR-037: 3D Structural Load Visualization Pipeline

## Status
Accepted

## Context
Structural engineers must verify and present all applied loads directly on the 3D model geometry:
1. **Nodal & Point Loads**: Concentrated forces ($F_x, F_y, F_z$) and moments ($M_x, M_y, M_z$) at joints or beam spans must display standard vector arrowheads with magnitude tags. Moments require curved circular arrows indicating axis of twisting.
2. **Distributed Member Loads (UDL & Trapezoidal)**: Line loads along beams, rafters, and columns ($w_1 \to w_2$) require an array of parallel arrows connected by a top boundary line and a translucent load curtain/envelope.
3. **Surface & Pressure Loads**: Floor slabs and shear walls require planar pressure arrows distributed across the slab face with area pressure labels ($q\text{ kN/m}^2$).
4. **Load Case Filtering & Scale Multipliers**: A realistic building contains many load patterns (`Dead`, `Live`, `Wind`, `Snow`, `Seismic`). Visualizing all loads simultaneously causes extreme clutter. Engineers require live pattern filtering (`All`, `Dead`, `Live`, `Wind`, `Snow`), customizable scale multipliers ($0.5\times, 1.0\times, 2.0\times$), and toggleable magnitude callouts.

## Decision
We implement a procedural 3D load rendering system in `apps/web/src/features/canvas/loads/` managed by `LoadVisualizationController.ts`.

### Architecture

```
                       StructuralSystem & Load Definitions
                                      │
                                      ▼
                        LoadVisualizationController
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
PointLoadMeshBuilder       DistributedLoadMeshBuilder    SurfaceLoadMeshBuilder
 ├───────────────────┤      ├──────────────────────────┤  ├──────────────────────┤
 │• Force 3D Arrow   │      │• Span Arrow Array        │  │• Planar Arrow Grid   │
 │• Curved Moment Arc│      │• Top Envelope Cable      │  │• Plate Surface Offset│
 │• Magnitude Sprite │      │• Translucent Mesh Curtain│  │• Pressure Callout    │
 │• Pattern Palette  │      │• Trapezoidal Lerp Height │  │                      │
 └───────────────────┘      └──────────────────────────┘  └──────────────────────┘
```

### Key Technical Decisions

#### 1. Color-Coded Load Pattern Standard
Standardized engineering color coding distinguishes load categories at a glance:
- **Dead Load (DL)**: Ochre / Amber (`#f59e0b`)
- **Live Load (LL)**: Crimson Red (`#ef4444`)
- **Wind Load (WL)**: Sky Blue (`#0ea5e9`)
- **Earthquake / Seismic (E)**: Purple (`#a855f7`)
- **Snow Load (S)**: Ice Cyan (`#38bdf8`)

#### 2. Translucent Polygonal Curtain for UDLs
`DistributedLoadMeshBuilder` generates a triangle-strip mesh curtain beneath the top rail connecting the arrow tails to the member axis. With `opacity: 0.18` and `DoubleSide`, engineers get an immediate volumetric sense of the load envelope (e.g. uniform vs trapezoidal) without obscuring the beam profile underneath.

#### 3. Logarithmic Scale Compression
Because load magnitudes span four orders of magnitude ($5\text{ kN}$ to $500\text{ kN}$), linear scaling creates either microscopic arrows or sky-scraping spikes. Arrow lengths use logarithmic compression:
$$L_{arrow} = \min\left(2.5, \log_{10}(F + 1) \cdot 0.9 + 0.5\right) \cdot \text{scale}$$

#### 4. Instant Load Case Switching
`LoadVisualizationController` disposes and re-renders only the load glyphs when switching load patterns, keeping the structural frame meshes intact at 60–120 FPS.

## Consequences
- Engineers can visually audit self-weight, roof live loads, lateral wind pressures, and crane loads in 3D.
- Full support for canonical `@beamlab/engineering-model` load definitions.
- Scalable, clear presentation graphics for design reports and peer review.
