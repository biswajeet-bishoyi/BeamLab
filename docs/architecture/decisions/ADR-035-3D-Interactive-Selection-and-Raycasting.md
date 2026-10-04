# ADR-035: 3D Interactive Selection, Hover Feedback & Spatial Raycasting

## Status
Accepted

## Context
Interactive 3D structural exploration requires seamless entity picking and instant visual feedback:
1. **Raycasting Precision**: Structural models feature thin lines (centerlines), small joints (nodes), and volumetric members (beams, columns, slabs). Raycasting must be responsive without precision errors (e.g. failing to hit a 1-pixel wide line) or false positives.
2. **Entity Resolution**: In WebGL, raycast hits return low-level meshes or line segments. These must be resolved upward through scene graph hierarchies into their canonical domain entities (`StructuralMember`, `StructuralNode`, `StructuralSupport`, `PlateDefinition`).
3. **Hover & Selection Highlights**: Users need clear visual affordances:
   - Hovering an entity gives immediate cyan glow feedback and displays engineering telemetry.
   - Selecting an entity applies a persistent electric cyan outline/emissive highlight, supporting single-select, Shift+click multi-selection, and Escape/background deselect.
4. **Engineering Tooltip Telemetry**: Hovering over an entity must immediately surface rich engineering data (coordinates, profile designation, length, material, boundary conditions, slab thickness).
5. **Frame Rate Protection**: Continuous raycasting on `pointermove` across thousands of geometric primitives must not drop WebGL frame rates below 60 FPS.

## Decision
We implement a dedicated interaction pipeline comprising `SpatialRaycaster`, `SelectionManager`, and `FloatingEngineeringTooltip` in `apps/web/src/features/canvas/interaction/`.

### Architecture

```
                                Pointer Events (Move / Click)
                                             │
                                             ▼
                                  SpatialRaycaster
                                 (Candidate Groups)
                                             │
                                             ▼
                                   RaycastHit Entity
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
               SelectionManager                        FloatingEngineeringTooltip
        (Single & Multi-Select State)                   (Cursor-Tracking Telemetry)
                       │                                           │
                       ▼                                           ▼
             Non-Destructive Material                    DOM Overlay HUD
                Visual Highlights                       (Node, Member, Slab Details)
```

### Key Technical Decisions

#### 1. Hierarchical Entity Traversal
`SpatialRaycaster` intercepts raw Three.js geometry intersections and walks up `obj.parent` until finding valid `userData.entityType` and `userData.entityId`. It attaches complete metadata resolved against `@beamstudio/engineering-model` (`StructuralSystem`).

#### 2. Drag Discrimination for CAD Gestures
To prevent accidental selections when an engineer orbits or pans the camera, the pointer event handler records `pointerDownPos`. Only if the mouse movement distance is less than $4\text{ px}$ upon `pointerup` is the event processed as an interactive click selection.

#### 3. Non-Destructive Material Caching
`SelectionManager` caches original materials in a `Map<string, Material>` keyed by object UUID before applying hover (`0x67e8f9`) or selection (`0x38bdf8`) emissive materials. Deselecting or unhovering instantly restores the pristine original PBR steel/concrete/timber shader without geometry re-creation.

#### 4. Shift+Click Multi-Selection & Escape Cancellation
Supports additive selection when `e.shiftKey` is active. A bottom HUD badge indicates the current selection count (e.g., `2 Members, 1 Node Selected`) with a one-click clear button and `Escape` key listener.

## Consequences
- Engineers can hover and click any structural node, beam, column, support, or floor slab to inspect its engineering properties in real time.
- Smooth 60–120 FPS frame rates maintained during active orbit, pan, and hover interaction.
- Dispatches selection events cleanly to BeamLab Inspector panels and external listeners.
