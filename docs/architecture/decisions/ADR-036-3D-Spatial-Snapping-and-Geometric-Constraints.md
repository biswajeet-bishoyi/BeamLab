# ADR-036: 3D Spatial Snapping & Geometric Constraints

## Status
Accepted

## Context
CAD and structural modeling require sub-millimeter precision when querying, modeling, or measuring geometry in a 3D environment:
1. **Screen-Space vs World-Space Tolerance**: Snapping in 3D perspective projection cannot rely strictly on 3D Euclidean distances, because an object far from the camera occupies only a few screen pixels, whereas a nearby object occupies hundreds. To feel natural and responsive to human motor input, snapping must evaluate proximity in **2D screen space** (pixel radius threshold, e.g. 18px).
2. **Multi-Constraint Snapping Hierarchy**: Engineers need multiple simultaneous snap targets with clear prioritization:
   - **Node / Endpoint Snap (□)**: Highest priority. Snaps exactly to structural joints.
   - **Member Midpoint Snap (△)**: High priority. Snaps to $L/2$ along beam/column centroids.
   - **Along Member / Perpendicular Snap (⊾)**: Medium priority. Projects the cursor orthogonally onto the member longitudinal vector.
   - **Metric Grid Snap (+)**: Fallback. Snaps to user-defined metric increments ($0.5\text{ m}, 1.0\text{ m}$) on the active ground or work plane.
3. **Visual Feedback**: Engineers must see instantaneous visual glyphs indicating what geometric feature is snapped (amber square for node, cyan triangle for midpoint, blue cross for grid) alongside exact numerical 3D coordinates.

## Decision
We implement `SpatialSnappingEngine` and `SnapGlyphOverlay` in `apps/web/src/features/canvas/snapping/`.

### Architecture

```
                    Cursor Movement (e.clientX, e.clientY)
                                     │
                                     ▼
                           SpatialSnappingEngine
                    ┌────────────────┴────────────────┐
                    ▼                                 ▼
         Candidate 3D Points                Active Grid Plane
       (Nodes, Mids, Member Line3)          (XY Elevation / Z=0)
                    │                                 │
                    └────────────────┬────────────────┘
                                     ▼
                        2D Screen Projection (NDC)
                        Euclidean Distance < 18px
                                     │
                                     ▼
                            Prioritized SnapResult
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
         SnapGlyphOverlay                       Cursor Spatial HUD
      (Square, Triangle, Cross)                  (Snaps to World XYZ)
```

### Key Technical Decisions

#### 1. Screen-Space Projection with Frustum Culling
`SpatialSnappingEngine` projects candidate 3D vectors to 2D screen coordinates using `camera.project(v)`. Any points behind the camera (`p.z >= 1.0`) are immediately discarded before distance evaluation.

#### 2. Closest Point along 3D Line Segments
For perpendicular/along-member snapping, `THREE.Line3.distanceSqToSegment` computes the shortest vector between the camera ray and member 3D axes, calculating the exact orthogonal projection parameter $t \in [0.1, 0.9]$.

#### 3. Metric Coordinate Snapping
When snapping to grid, the ground intersection $(x, y, 0)$ is discretized to the configured `gridIncrement` ($0.5\text{ m}$ or $1.0\text{ m}$):
$$x_{snap} = \mathrm{round}\left(\frac{x}{\Delta}\right) \cdot \Delta$$
The cursor coordinate readout HUD snaps directly to this exact point, guaranteeing zero numerical drift.

#### 4. SVG Snap Glyphs with Neon Glow
`SnapGlyphOverlay` renders industry-standard CAD glyphs (square, triangle, right angle, crosshair) with drop-shadow glows aligned to screen pixels using CSS transforms.

## Consequences
- Engineers can precisely locate nodes, member centers, and grid intersections in 3D.
- Prepares the canvas for interactive drawing tools (Add Member, Measure Distance, Add Load at Span).
- Zero performance impact on the Three.js render loop.
