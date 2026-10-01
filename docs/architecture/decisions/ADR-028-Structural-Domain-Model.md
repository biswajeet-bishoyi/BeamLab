# ADR-028: Structural Domain Model (SDM)

## Status
Accepted

## Context

BeamLab Beta Sprint B1.1 established the Canonical Engineering Model (CEM) — a framework-agnostic package that provides the identity, versioning, validation, serialization, and event infrastructure shared by all engineering objects.

B1.2 must build the actual structural engineering domain on top of that foundation. Every future solver, visualization engine, BIM importer, engineering agent, and reporting system must operate on a shared, strongly-typed representation of the physical structure.

## Decision

We will implement a `structural/` subdirectory inside `@beamlab/engineering-model` that contains the core structural domain objects, provider registries, and validation rules.

### Object Hierarchy

```
StructuralSystem
│
├── CoordinateRegistry
│   ├── GLOBAL_COORDINATE_SYSTEM     (cs-global, always present)
│   └── EngineeringCoordinateSystem* (Local, Construction, Survey, Custom)
│
├── MaterialRegistry
│   ├── Built-in presets (S275, S355, M25, M30, GL24h, Al-6061-T6)
│   ├── Registered providers (IS2062Provider, EC3Provider, ...)
│   └── Custom definitions
│
├── SectionRegistry
│   ├── Built-in presets (IPE 200, IPE 300, W12x26)
│   ├── Registered providers (IS808Provider, AISCProvider, EN10365Provider, ...)
│   └── Custom profiles
│
├── AssemblyRegistry
│   └── StructuralAssembly* (Frame, Truss, Floor, Roof, BracingSystem, ...)
│
├── StructuralNode*
│   ├── Global coordinates (Point3D)
│   ├── Local coordinates (optional, within CS)
│   ├── Coordinate system reference
│   ├── Connected member index (maintained by StructuralSystem)
│   └── Validation (finite coords, CS exists)
│
├── StructuralMember*
│   ├── Start/End Node references (IDs only — no circular refs)
│   ├── Material reference (ID)
│   ├── Section reference (ID)
│   ├── Member type (Beam, Column, Brace, Truss, ...)
│   ├── End releases (6-DOF each end)
│   ├── Rigid/semi-rigid offsets
│   ├── Local axis orientation (roll angle + optional explicit vector)
│   └── Validation (non-null refs, no zero-length)
│
├── StructuralMaterial*
│   ├── MaterialDefinition (grade, E, G, ν, ρ, αT, fy, fu)
│   └── Validation (positive mechanical properties)
│
├── StructuralSection*
│   ├── SectionProfile (designation, type, A, Iy, Iz, J, Cw, ry, rz, Sy, Sz, Zy, Zz)
│   └── Validation (positive geometric properties)
│
└── StructuralSupport*
    ├── Node reference
    ├── Restraint DOF (Tx, Ty, Tz, Rx, Ry, Rz)
    ├── Spring stiffness (kTx, kTy, kTz, kRx, kRy, kRz)
    ├── Preset (Fixed, Pinned, RollerX/Y/Z, Spring, Custom)
    ├── Coordinate system for restraint directions
    └── NonlinearSupportHook (reserved for future gap/friction elements)
```

### Key Design Decisions

#### 1. Geometry is Derived, Never Stored Redundantly
`StructuralMember` stores only `startNodeId` and `endNodeId`. Member length and direction vectors are always computed from node coordinates at read time by `StructuralSystem.memberLength()`. This prevents the node-member coordinate drift that has caused countless bugs in structural software.

#### 2. Provider-Driven Material and Section Libraries
`MaterialRegistry` and `SectionRegistry` follow the same pluggable provider pattern as `SerializationRegistry`. This allows IS, AISC, Eurocode, and custom material/section libraries to be registered at runtime without touching the core domain model.

#### 3. Connected Member Index
`StructuralNode.connectedMembers[]` is maintained by `StructuralSystem.addMember()`. This provides O(1) lookup of all members attached to a node — required for free-body diagram generation, local stiffness assembly, and topology-aware mesh refinement — without needing graph traversal.

#### 4. Coordinate Systems
All geometry is explicitly referenced to an `EngineeringCoordinateSystem`. The `CoordinateRegistry` always contains the global CS (`cs-global`) as the root. Additional construction and survey coordinate systems can be registered. `CoordinateRegistry.toGlobal()` transforms any point to global coordinates for cross-CS distance computation.

#### 5. Six-DOF End Releases
`MemberReleaseCondition` stores release flags independently for all six DOFs at each end. This fully captures pin-ended beams, moment releases, shear releases, and any combination required by the solver. `FIXED_FIXED_RELEASES` and `PIN_PIN_RELEASES` are built-in presets.

#### 6. Assemblies Are Organisational, Not Structural
`StructuralAssembly` does not own its members — `StructuralSystem` does. Assemblies are purely relational groupings for organisation, visualisation, reporting, and solver substructuring. They may be nested (e.g., a Floor assembly containing Frame sub-assemblies).

#### 7. Extension Points for Future Element Types
`SectionType` and `MemberType` enumerations include `'Custom'` variants. The `extensions` dictionary on every `IEngineeringObject` provides namespaced storage for shell element attributes, plate dimensions, tendon geometry, and similar non-beam data without schema changes.

### Validation Rules

| Rule ID | Scope | Description |
|---|---|---|
| SDM-N001 | Node | Global coordinates must be finite numbers |
| SDM-N002 | Node | Must reference an existing coordinate system |
| SDM-M001–5 | Member | Start/end/material/section must be present |
| SDM-M003 | Member | Start and end nodes must differ |
| SDM-M006 | Member | Roll angle outside ±360° |
| SDM-MAT001–5 | Material | Positive moduli, density; valid Poisson ratio |
| SDM-SEC001–4 | Section | Positive area, inertia, non-negative J |
| SDM-SUP001 | Support | Must reference a node |
| SDM-SUP002 | Support | Must have at least one active restraint or spring |
| SDM-SUP003 | Support | Spring stiffness must be non-negative |
| SDM-SYS001–4 | System | Non-empty nodes/members/supports; no zero-length members |
| SDM-XREF-N001 | Cross-object | No two nodes share identical coordinates |
| SDM-XREF-N002 | Cross-object | Node CS must exist in registry |
| SDM-XREF-M001 | Cross-object | Member node references must exist |

### Future BIM Compatibility

- Every `IEngineeringObject` carries `metadata.externalIds` for IFC GUID mapping
- `CoordinateSystem` origin + rotation provide the IFC `IfcLocalPlacement` equivalent
- `MaterialDefinition` maps naturally to `IfcMaterial` / `IfcMaterialProfileSet`
- `SectionProfile.dimensions` maps to `IfcProfileDef` subtypes
- `StructuralAssembly` hierarchy maps to `IfcGroup` / `IfcBuildingStorey`

## Consequences

### Positive
- Every solver, agent, and BIM importer now shares a common, validated structural language
- Provider architecture allows sectional databases to be added without core model changes
- Connected-member index enables O(1) node topology queries
- Coordinate system support enables multi-CS models from day one

### Negative
- All existing solver code using ad-hoc data structures must be migrated during Beta to consume `StructuralSystem` (migration work tracked separately)
- Adding shell/plate elements will require new domain object files (acceptable — the extension pattern is established)
