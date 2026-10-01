# ADR-073: Interactive BIM & Structural Interoperability Studio UI

## Status
Accepted

## Context
Engineers collaborating across disciplines require a unified, intuitive visual cockpit to manage bi-directional OpenBIM IFC4 and SAF structural models. Importing raw external CAD/BIM models without instant visual feedback on centerline alignment, physical profile extrusions, and detected geometric near-misses leads to costly modeling errors and solver non-convergence.

## Decision
We implemented the **Interactive BIM & Structural Interoperability Studio UI** in `apps/web`:
1. **Interactive Dual-Mode Viewport**:
   - **Analytical Centerlines**: Visualizes 1D stick elements, 6-DOF support conditions (fixed bases, pinned joints), and applied distributed load arrows.
   - **Physical 3D Solids**: Renders extruded cross-sections with realistic flange/web thickness, metallic PBR gradients, and member section tags.
2. **Bi-Directional Exchange Cockpit**:
   - Drag-and-drop / file upload for `.ifc`, `.saf`, and `.json`.
   - Real-time client-side generation and downloading of standards-compliant ISO 10303-21 STEP physical files and SAF tabular workbooks.
3. **Interactive Reconciliation Console**:
   - Dynamic tolerance slider (1mm – 100mm).
   - One-click execution of `SpatialNodeSnapper` to automatically merge near-miss spatial gaps between analytical stick models and architectural framing.
4. **Cross-Platform Catalog Mapping Inspector**:
   - Live inspection table parsing vendor-specific strings (Revit families, Tekla profiles, SCIA aliases) into canonical standards (AISC, Eurocode).
   - Visual display of section depth, width, web thickness, and shape classifications.
5. **Pre-Analysis Integrity Diagnostic Auditor**:
   - Real-time health check reporting kinematic stability, orphaned nodes, zero-length members, and unassigned sections.
   - One-click auto-fix button restoring analytical solvability.

## Consequences
### Positive
- Unified, glassmorphic UI providing complete visibility into external model fidelity.
- Instant round-trip validation between Autodesk Revit, Trimble Tekla, and SCIA Engineer.
- Directly accessible from the main BeamLab navigation bar with zero context loss.

### Trade-offs
- Web canvas uses scalable vector graphics (SVG) with perspective projection for ultra-crisp responsive rendering; future iterations can bind directly to the WebGL Three.js canvas when loaded models exceed 50,000 members.
