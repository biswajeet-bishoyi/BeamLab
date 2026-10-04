# ADR-033: 3D Engineering Canvas & Viewport Kernel

## Status
Accepted

## Context
Structural engineering software requires an interactive 3D spatial viewport that supports:
1. **Canonical Structural Coordinate System**: In civil and structural engineering, the elevation axis is vertical $+Z$, while the ground plane is $XY$. Standard computer graphics libraries default to $+Y$ vertical, requiring rigorous camera up-vector alignment (`camera.up.set(0, 0, 1)`).
2. **Dual Projection Modalities**: Engineers frequently toggle between **Perspective** (realistic spatial exploration and depth perception) and **Orthographic** (plan, elevation, and cross-section drawings where parallel lines must not converge).
3. **High Framerate (60–120 FPS) Performance**: Structural models contain thousands of members, nodes, loads, and stress heatmaps. Re-rendering through React's virtual DOM reconciliation on every mouse move causes unacceptable frame drops and input lag.
4. **CAD Navigation Ergonomics**: Engineers expect industry-standard navigation gestures: middle-click or left-drag orbit, right-drag or shift-middle-drag pan, cursor-centered zoom, and instant view snapping (Top, Front, Side, Iso).

## Decision
We implement a dedicated, high-performance 3D viewport kernel in `apps/web/src/features/canvas/viewport/` using Three.js with an isolated imperative animation loop wrapped by `EngineeringCanvas3D.tsx`.

### Architecture

```
                    EngineeringCanvas3D (React Component)
                                     │
                 ┌───────────────────┼───────────────────┐
                 ▼                   ▼                   ▼
      ┌────────────────────┐┌────────────────────┐┌────────────────────┐
      │   ViewportKernel   ││   CameraManager    ││ NavigationControls │
      ├────────────────────┤├────────────────────┤├────────────────────┤
      │ • WebGL2 Renderer  ││ • Perspective Cam  ││ • CAD Orbit (L/M)  │
      │ • Antialias / DPR  ││ • Orthographic Cam ││ • CAD Pan (R/Shift)│
      │ • Scene & Lighting ││ • Canonical Z-up   ││ • Wheel Zoom       │
      │ • Animation Loop   ││ • View Presets     ││ • Hotkeys 1,2,3,4,F│
      │ • Resource Dispose ││ • Smooth Sync      ││                    │
      └────────────────────┘└────────────────────┘└────────────────────┘
                 │                   │                   │
                 └───────────────────┼───────────────────┘
                                     ▼
                 ┌───────────────────┴───────────────────┐
                 │                                       │
                 ▼                                       ▼
      ┌────────────────────┐                  ┌────────────────────┐
      │  OrientationGizmo  │                  │ AdaptiveSpatialGrid│
      ├────────────────────┤                  ├────────────────────┤
      │ • Corner Cube View │                  │ • Metric Subdivs   │
      │ • Raycast Terminal │                  │ • Ground Plane XY  │
      │ • Instant View Snap│                  │ • Colored Axes X/Y │
      └────────────────────┘                  └────────────────────┘
```

### Key Technical Decisions

#### 1. Imperative Animation Loop Outside React Tree
To achieve consistent 60–120 FPS, the rendering loop runs via `requestAnimationFrame` inside `ViewportKernel`. Component state updates (e.g. cursor coordinates, HUD tooltips) are throttled and decoupled from the WebGL draw pipeline.

#### 2. Dual-Camera Synchronization
`CameraManager` maintains both a `THREE.PerspectiveCamera` (45° FOV) and a `THREE.OrthographicCamera`. When switching between projection modes, target focus distance and frustum bounds are mathematically mapped so that objects remain at identical visual scales without jarring position shifts.

#### 3. Canonical Z-Up Coordinate Enforcement
Both perspective and orthographic cameras explicitly set `.up.set(0, 0, 1)`, and the reference grid is oriented on the $XY$ ground plane ($Z=0$), preserving exact alignment with `@beamstudio/engineering-model` and international structural BIM formats (IFC4).

#### 4. Corner Orientation Gizmo with Raycast Snapping
A dedicated orthographic sub-scene renders the world axes ($X$ Red, $Y$ Green, $Z$ Blue) in the corner of the canvas. Clicking any terminal sphere executes raycasting and triggers camera re-alignment to the corresponding normal view plane.

## Consequences

### Positive
* **Fluid Navigation**: CAD engineers have familiar orbit, pan, zoom, and preset switching.
* **Extensibility**: The clean Three.js scene graph provides the foundation for extruded 3D beam cross sections (B2.2), raycasting selection (B2.3), and 3D deformation animations (B2.6).
* **Workspace Versatility**: The 2D schematic beam canvas and the new 3D spatial canvas coexist seamlessly in `CenterWorkspace.tsx`.
