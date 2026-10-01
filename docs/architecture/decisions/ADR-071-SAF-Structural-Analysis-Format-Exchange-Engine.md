# ADR-071: SAF (Structural Analysis Format) Bi-Directional Exchange Engine

## Status
Accepted

## Context
While buildingSMART IFC4 provides an ISO-standardized BIM data repository, the international structural engineering community (including SCIA, Graphisoft, Dlubal, Nemetschek, and AxisVM) developed the **Structural Analysis Format (SAF)**. SAF is based on structured Excel workbooks (`.xlsx`) and JSON schemas specifically tuned for finite element structural modeling.

SAF directly models:
- Project units (`m`, `kN`, `kNm`, `deg`).
- `StructuralMaterial` ($E, \nu, \rho, f_y$).
- `StructuralCrossSection` (parametric geometries, standard profile catalogs like IPE, HEB, RHS).
- `StructuralPointConnection` with 6-DOF support constraints (`Rigid`, `Free`, or numeric spring stiffnesses).
- `StructuralCurveMember` with member types (`Beam`, `Column`, `Truss`), end releases, and local coordinate system (LCS) rotation $\beta$.
- `StructuralSurfaceMember` with plate/wall/shell thickness and polygon boundary nodes.
- `StructuralLoadCase`, `StructuralPointAction`, `StructuralCurveAction`, and `StructuralLoadCombination`.

To enable friction-free interoperability between BeamLab and major commercial analysis solvers (SCIA Engineer, RFEM, Allplan, Archicad), BeamLab requires a robust, bi-directional SAF translation engine that bridges SAF and IFC4.

## Decision
We implemented the SAF Bi-Directional Exchange Engine in `@beamlab/interop-pipeline`:
1. **Strongly Typed SAF Domain Schema** (`SafSchema.ts`):
   - Formal TypeScript definitions for `SafModel`, `SafProjectInfo`, `SafMaterial`, `SafCrossSection`, `SafPointConnection`, `SafCurveMember`, `SafSurfaceMember`, `SafLoadCase`, `SafPointLoad`, `SafCurveLoad`, and `SafLoadCombination`.
2. **Tabular Workbook Exporter** (`SafExporter.ts`):
   - Converts `SafModel` into standard multi-sheet tables (`Project`, `StructuralMaterial`, `StructuralCrossSection`, `StructuralPointConnection`, `StructuralCurveMember`, `StructuralSurfaceMember`, `StructuralLoadCase`, `StructuralPointAction`, `StructuralCurveAction`, `StructuralLoadCombination`).
   - Converts `IfcStructuralAnalysisModel` into standard `SafModel` with automated material and section inference.
3. **SAF Workbook Importer** (`SafImporter.ts`):
   - Reads SAF table records into validated `SafModel`.
   - Transforms `SafModel` into `IfcStructuralAnalysisModel`, translating 6-DOF boundary conditions (`Rigid` -> `FIXED`, numeric springs -> N/m), releases (`Rx, Ry, Rz`), and member topologies.

## Consequences
### Positive
- Bi-directional compatibility with the broader European and global SAF structural ecosystem.
- Cross-standard interoperability: BeamLab can import an IFC4 file from Revit and export it as SAF for SCIA/RFEM, or vice-versa, with zero data loss.
- Fully typed tabular abstraction that serializes to JSON or spreadsheet workbooks.

### Trade-offs
- Tabular column structures require strict header and coordinate unit consistency; `SafImporter` provides fallback defaults when columns or units are partially omitted.
