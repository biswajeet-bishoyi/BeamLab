# ADR-060: Structural Engineering Version Control and Semantic Diffing

## Status
Accepted

## Context
Standard software version control (such as Git) operates line-by-line on textual source code. Applying text-based version control to structural engineering models has critical drawbacks:
1. **Topological Relationships**: Structural members depend on node coordinates. Moving a joint affects member lengths, orientations, and stiffness matrices. Text diffs cannot recognize spatial displacement ($\Delta x, \Delta y, \Delta z$) or connectivity shifts.
2. **Engineering Metrics**: Engineers evaluating design revisions (e.g. baseline vs value-engineered option) need to quantify physical consequences, notably total structural steel tonnage delta ($\Delta \text{kg}$, $\Delta \%$), member count adjustments, and load alterations.
3. **Visual 3D Diffing**: Engineers inspect structural changes visually in a 3D canvas. Added members must be highlighted, modified members color-coded, and deleted entities presented as dashed wireframe ghosts.
4. **3-Way Merging & Domain Conflicts**: Merging two branches (e.g., Engineer A adds roof bracing while Engineer B applies wind loads) requires a common ancestor. When concurrent edits conflict (e.g. conflicting cross-section upgrades, or one branch deletes a column while another branch attaches a beam to it), the engine must detect topological orphan hazards and offer clear domain resolution strategies (`ours`, `theirs`, `manual`).

## Decision
We implemented the versioning subsystem in `packages/collaboration-engine/src/versioning/`:

### 1. ModelSnapshot (`ModelSnapshot.ts`)
- Canonical, immutable serialized snapshot (`EngineeringModelSnapshot`) containing nodes (with restraints), members (with releases, beta angles, types), cross-sections, materials, and loads.
- Provides `calculateMemberLengthM`, `calculateTotalMassKg` (derives member steel mass from length and section `weightPerM` or area $\times$ density), and `computeSnapshotHash`.

### 2. ModelBranchManager (`ModelBranchManager.ts`)
- Manages named branches (`main`, design options), head commit tracking, and branch switching.
- Generates immutable `EngineeringCommit` records with parent pointers (`parentCommitIds`), author metadata, timestamp, and snapshot hashes. Supports merge commits with dual parentage.
- Tracks milestone releases and engineering issue revisions via tags (`createTag`).
- Lowest Common Ancestor (LCA) search via BFS traversal (`findCommonAncestor`) and divergence analysis (`getBranchDivergence`).

### 3. StructuralModelDiffer (`StructuralModelDiffer.ts`)
- Semantic diff engine producing a structured `StructuralDiffReport`:
  - **Nodes**: Added, removed, modified coordinates (with Euclidean distance $\Delta d$ and vector $\Delta x, \Delta y, \Delta z$), restraint modifications.
  - **Members**: Added, removed, modified cross-sections, materials, connectivity, or lengths ($\Delta L$).
  - **Loads**: Added, removed, modified magnitudes or directions.
  - **Global Engineering Metrics**: Baseline steel mass vs target steel mass, $\Delta \text{kg}$, $\Delta \%$, and human-readable summary string (e.g. "+3 members, 1 modified section, +200 kg steel (+15.6%)").

### 4. Visual3DDiffMap (`Visual3DDiffMap.ts`)
- Generates 3D viewport rendering directives (`VisualEntityDiff`):
  - Added: Emerald green (`#10b981`), full opacity.
  - Removed: Crimson red (`#ef4444`), ghosted wireframe, dashed styling, with original coordinate preservation (`GhostGeometry3D`).
  - Modified geometry: Amber orange (`#f59e0b`).
  - Modified section / material: Violet purple (`#8b5cf6`).
  - Modified load: Cyan (`#06b6d4`).
  - Unchanged: Muted slate gray (`#64748b`), reduced opacity ($0.25$) for background context.
- Provides automated legend generation with category counts for UI panels.

### 5. ModelMergeResolver (`ModelMergeResolver.ts`)
- Implements structural 3-way merge between `sourceBranch` and `targetBranch`:
  - Recognizes fast-forward and up-to-date conditions.
  - Resolves disjoint edits cleanly (e.g. concurrent load additions and frame modifications).
  - Classifies conflicts: `property_conflict`, `geometry_conflict`, `delete_modify_conflict`, `topological_orphan_conflict`, and `load_conflict`.
  - Enforces topological dependency checks: if a node is deleted, dependent orphan members are safely dropped or flagged.
  - Supports resolution strategies: `'ours'`, `'theirs'`, and per-entity `'manual'`.
  - Emits validated merge commits with dual parentage.

## Consequences

### Positive
- Fully semantic version control aware of finite element geometry, sections, and loads.
- Engineers can branch design options (e.g. truss roof vs portal rafter), compare mass and cost deltas, and merge non-conflicting revisions.
- Seamless 3D visualization: Three.js canvas can render diff overlays and ghosted deleted elements directly from `Visual3DDiffMap`.
- Topological safety: Eliminates invalid orphan members or broken structural nodes upon merge.

### Trade-offs
- Model snapshots store full entity maps; for exceptionally large structures with >100,000 members, structural commit storage can be optimized in future sprints using delta compression (storing commit deltas rather than full snapshots).
