# ADR-031: BIM & External Data Interoperability

## Status
Accepted

## Context
Structural engineering practice is characterized by a highly fragmented ecosystem of software tools:
1. **Architectural & Structural BIM**: Autodesk Revit, Trimble Tekla Structures, Graphisoft Archicad, OpenBIM (IFC4 / IFC2x3).
2. **CAD Draft & Detailing**: AutoCAD DXF, DWG wireframe entities.
3. **General Finite Element & Frame Analysis**: Bentley STAAD.Pro (`.std` command language), CSI SAP2000 & ETABS (`.s2k` / `.e2k` relational text tables).
4. **Data Science, Parametric & Spreadsheet Tools**: Tabular CSV, JSON, Grasshopper/Rhino schemas.

Historically, structural software solutions attempt to create proprietary binary plugins tied to specific Windows COM APIs or vendor DLLs. This approach causes severe vendor lock-in, breaks cross-platform browser execution, and hinders automated engineering workflows.

BeamLab requires a **pure TypeScript, zero-heavy-dependency, vendor-neutral interoperability architecture** that operates identically in web browser workers, serverless Node runtimes, and local CLI environments.

## Decision
We implement a pluggable, bidirectional interoperability architecture in `@beamstudio/engineering-model/src/interop/`.

### Architecture

```
                      External Model Sources
      [IFC4/IFC2x3]  [AutoCAD DXF]  [CSV / TXT]  [STAAD .std]  [SAP2000 .s2k]
            │              │             │            │               │
            └──────────────┼─────────────┼────────────┼───────────────┘
                           ▼             ▼            ▼
                   ┌──────────────────────────────────────┐
                   │    IInteropProvider<T> Interface     │
                   ├──────────────────────────────────────┤
                   │  - importModel(content, options)     │
                   │  - exportModel(model, options)       │
                   └──────────────────┬───────────────────┘
                                      │
                                      ▼
                   ┌──────────────────────────────────────┐
                   │     Universal Mapping Pipeline       │
                   ├──────────────────────────────────────┤
                   │  1. CoordinateMapper                 │
                   │     - SI scale factors (mm/in/ft->m) │
                   │     - Y-up ↔ Z-up transposition      │
                   │     - Origin offsets & rotation      │
                   │  2. MaterialMapper                   │
                   │     - Regex alias resolution         │
                   │     - Steel / Concrete / Timber / Al │
                   │  3. SectionMapper                    │
                   │     - AISC / European / Indian lookup│
                   │     - Parametric dimension parser    │
                   │  4. RelationshipMapper               │
                   │     - Bidirectional GUID ↔ ID table  │
                   └──────────────────┬───────────────────┘
                                      │
                                      ▼
                   ┌──────────────────────────────────────┐
                   │      BeamLab Engineering Model       │
                   │   (Nodes, Members, Supports, Loads)  │
                   └──────────────────────────────────────┘
```

### Core Components

#### 1. Universal Interoperability Contract (`InteropTypes.ts`)
Defines `IInteropProvider<TContent>` with explicit `format`, `direction` (`ImportOnly` | `ExportOnly` | `BiDirectional`), `fileExtensions`, and typed `ImportOptions`/`ExportOptions` (unit conversions, coordinate up-axes, precision tolerances).

#### 2. Multi-Tier Mapping Engine (`mapping/`)
* **`CoordinateMapper`**: Handles coordinate frame transformations between CAD/STAAD (Y-up elevation) and BeamLab canonical (Z-up elevation), applying scaling factors (e.g. mm to meters) and rigid body rotations.
* **`MaterialMapper`**: Resolves arbitrary vendor strings (`"S355 JR"`, `"M30 Concrete"`, `"ASTM A992"`, `"Fe410"`, `"6061-T6"`) to canonical `StructuralMaterial` entities with validated mechanical moduli ($E$, $G$, $\nu$, $\rho$).
* **`SectionMapper`**: Maps standard cross-section designations (IPE, ISMB, W-shapes) or extracts parametric dimensions from geometric strings (e.g., `RECT_300x500` -> $b=0.3\text{ m}, h=0.5\text{ m}$) into canonical `StructuralSection` entities with computed geometric moments of inertia.
* **`RelationshipMapper`**: Maintains persistent, bidirectional external GUID $\leftrightarrow$ canonical BeamLab ID translation maps for round-trip synchronization.

#### 3. Standard Interoperability Providers (`providers/`)
* **`IfcInteropProvider`**: STEP Physical File (ISO 10303-21) interchange supporting `IFCSTRUCTURALPOINTCONNECTION`, `IFCSTRUCTURALCURVEMEMBER`, and `IFCRELCONNECTSSTRUCTURALMEMBER` (IFC4/IFC2X3).
* **`DxfInteropProvider`**: Standard ASCII AutoCAD DXF parser and generator mapping `LINE` and `POINT` entities with vertex merge tolerance.
* **`CsvInteropProvider`**: Tabular structural topology and restraint representation for spreadsheet and automated script exchange.
* **`StaadInteropProvider`**: Bentley STAAD.Pro command file format (`JOINT COORDINATES`, `MEMBER INCIDENCES`, `SUPPORTS FIXED/PINNED`).
* **`Sap2000InteropProvider`**: CSI SAP2000 / ETABS relational text format (`.s2k` / `.e2k` tabular blocks).

#### 4. Model Integration (`EngineeringModel.interop`)
`EngineeringModel` exposes a first-class `interop` property backed by `InteropRegistry`, allowing direct invocation:
```ts
const dxf = await model.interop.exportModel('dxf', model);
const importedModel = await model.interop.importModel('staad', staadFileText);
```

## Consequences

### Positive
* **Broadest Compatibility**: Engineers can import legacy models from STAAD, SAP2000, AutoCAD, and IFC, then export canonical models back into their BIM/FEM ecosystems.
* **Zero Native Binaries**: Runs entirely in modern JavaScript engines (browser Web Workers, Edge runtimes, Node.js).
* **Deterministic Unit Discipline**: All external length and force representations are converted into canonical SI units ($m$, $N$, $Pa$) upon entry.
* **Audit & Provenance Friendly**: External source IDs and provenance metadata are recorded in the engineering history log upon import.

### Considerations
* Complex advanced IFC solid representations (`IfcAdvancedBrep`, CSG) require geometric meshing to wireframe axes, which will be expanded in Phase B2.
