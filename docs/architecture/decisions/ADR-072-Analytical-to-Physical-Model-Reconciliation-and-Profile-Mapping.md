# ADR-072: Analytical-to-Physical Model Reconciliation & Profile Mapping

## Status
Accepted

## Context
When importing BIM models from architectural and fabrication tools (Autodesk Revit, Trimble Tekla, Nemetschek Allplan), raw imported geometries almost always suffer from analytical defects:
1. **Near-Miss Gaps & Offsets**: Beams terminating at physical column faces rather than centerline analytical nodes create minute spatial gaps (5mm–50mm) that corrupt numerical stiffness matrices.
2. **Catalog String Heterogeneity**: Vendors use disparate naming conventions for the identical standard section (e.g. `W-Wide Flange-Column: W14X90`, `W14*90`, `W 14/90`).
3. **Kinematic & Modeling Defects**: Dangling/orphaned nodes, zero-length degenerate members, unassigned materials, and unconstrained boundary mechanisms cause singularities during direct stiffness matrix inversion.

## Decision
We implemented the Analytical-to-Physical Reconciliation & Profile Mapping module in `@beamstudio/interop-pipeline`:
1. **Spatial Node Snapper** (`SpatialNodeSnapper.ts`):
   - Geometric clustering engine with configurable Euclidean tolerance (default $\varepsilon = 25\text{ mm}$).
   - Merges near-miss nodes, collapsing clusters to boundary-supported nodes to guarantee support condition inheritance.
   - Updates member connectivity and nodal action references across the entire model.
2. **Cross-Platform Catalog Mapper** (`CrossPlatformCatalogMapper.ts`):
   - Regex-driven tokenizer normalizing Revit, Tekla, SCIA, and SAF profile strings into canonical BeamLab catalog IDs (`W14X90`, `IPE300`, `HE200B`, `RHS200x100x6`).
   - Material standardizer resolving structural steel (`S235`, `S275`, `S355`, `A992`) and concrete (`C25/30`, `C30/37`, `4000psi`) classes with elastic moduli and yield strengths.
   - User-defined alias registration registry (`registerAlias`).
3. **Model Integrity Auditor** (`ModelIntegrityAuditor.ts`):
   - Pre-analysis validator inspecting topology, geometry, boundary conditions, and sections.
   - Emits structured diagnostic reports (`status: 'PASS' | 'WARNING' | 'FAIL'`) categorizing issues.
   - Provides deterministic `autoFix` routine to prune orphaned nodes, discard degenerate zero-length elements, and assign fallback profiles.

## Consequences
### Positive
- Prevents numerical singularity in downstream FEA solvers due to disconnects or unconstrained mechanisms.
- Transparent diagnostic reporting in the UI with one-click automated model healing.
- Robust cross-platform catalog translation without manual re-tagging of sections.

### Trade-offs
- Node snapping uses pairwise distance clustering; for models with $> 100,000$ nodes, spatial octree partitioning can be introduced in a future sprint.
