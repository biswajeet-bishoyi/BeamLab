# ADR-070: OpenBIM IFC4 Structural Analysis Domain Pipeline

## Status
Accepted

## Context
Structural engineering software historically relies on fragmented, proprietary file formats (e.g. `.sdb`, `.std`, `.e2k`), hindering seamless interoperability between analytical platforms and physical BIM modeling tools (Autodesk Revit, Trimble Tekla, Bentley OpenBuildings). 

buildingSMART International standardized the **IFC4 Structural Analysis Domain** (ISO 16739-1:2018), specifically establishing:
1. `IfcStructuralAnalysisModel`: The top-level assembly aggregating idealized structural models, boundary conditions, and load cases.
2. `IfcStructuralPointConnection` & `IfcBoundaryNodeCondition`: 6-DOF elastic and fixed boundary supports.
3. `IfcStructuralCurveMember` & `IfcStructuralSurfaceMember`: 1D beam/column/truss and 2D slab/wall analytical elements.
4. `IfcStructuralLoadGroup`, `IfcStructuralPointAction` & `IfcStructuralCurveAction`: Load combinations, load cases, nodal point loads, and distributed line actions.

BeamLab requires a zero-dependency, ultra-fast ISO 10303-21 STEP physical file serializer and parser to enable standards-compliant OpenBIM structural exchange.

## Decision
We implemented `@beamlab/interop-pipeline` featuring:
1. **Strongly Typed IFC4 Structural Schema** (`IfcStructuralSchema.ts`):
   - Strict adherence to ISO 16739-1 entity definitions.
   - Comprehensive 6-DOF boundary support conditions (`BoundaryStiffness`: `'FIXED'`, `'FREE'`, or numeric stiffness in N/m and N*m/rad).
   - Curve and surface member types (`RIGID_JOINED_MEMBER`, `PIN_JOINED_MEMBER`, `SHELL`, `BENDING_ELEMENT`).
   - Structural actions (`IfcStructuralPointAction`, `IfcStructuralCurveAction`) with force and moment vectors in standard SI units (kN, kNm, kN/m).
2. **Deterministic STEP Physical Serializer** (`StepSerializer.ts`):
   - Generates buildingSMART compliant ISO 10303-21 STEP-SPF syntax with official `FILE_SCHEMA(('IFC4'))` headers.
   - Full SI unit definitions (`.METRE.`, `.KILO.NEWTON.`, `.RADIAN.`).
   - RelConnects structural member topological associations (`IfcRelConnectsStructuralMember`).
   - Member profile and material annotations.
3. **Resilient STEP Physical Parser** (`StepParser.ts`):
   - Fast tokenizer parsing `#id=ENTITY(...)` structures.
   - Extracts 3D coordinates, 6-DOF boundary conditions, 1D/2D members, load cases/groups, and point/curve actions.
   - Fault-tolerant against missing optional attributes and malformed external STEP streams.

## Consequences
### Positive
- Native round-trip IFC4 Structural Analysis View exchange without third-party heavy binary dependencies.
- Dual CJS/ESM library bundle exported for both Node.js services and browser client execution.
- Enables bi-directional collaboration with Autodesk Revit Structural Analytical Model and Tekla Structures.

### Trade-offs
- STEP physical formatting requires manual string serialization and regex-based tokenization rather than full EXPRESS compiled parsers; however, this results in orders of magnitude lower bundle size and higher execution speed in browser environments.
