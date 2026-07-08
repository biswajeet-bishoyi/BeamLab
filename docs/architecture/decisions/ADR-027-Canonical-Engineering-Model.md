# ADR-027: Canonical Engineering Model (CEM)

## Status
Accepted

## Context

BeamLab Alpha (A1–A14) delivered a complete AI-driven engineering platform with independent agents for Analysis, Design, Optimization, Compliance, Reporting, and Workflow Orchestration. Each subsystem invented its own ad-hoc data structures for engineering objects, creating implicit coupling and making cross-subsystem operations brittle.

To support Beta goals (including BIM integration, multi-structure projects, real-time collaboration, and cloud sync), BeamLab requires a canonical, agnostic engineering domain model that is spoken natively by every subsystem.

## Decision

We will implement `@beamlab/engineering-model` as the **Canonical Engineering Model (CEM)** — the single source of truth for all engineering data in BeamLab.

### Architecture

```
EngineeringModel
├── ObjectRegistry          — O(1) lookup by id/type
├── RelationshipRegistry    — Adjacency map for references
├── UnitRegistry            — Active UnitSystem + converters
├── SerializationRegistry   — Pluggable format providers
├── ValidationRegistry      — Pluggable validation rules
├── CEMEventEmitter         — Typed event bus for model changes
│
├── EngineeringProject      — Top-level project metadata
│
└── Structures[]
    └── EngineeringStructure
        ├── EngineeringNode        — 3D coordinates
        ├── EngineeringMember      — Connectivity, material, section
        ├── EngineeringMaterial    — E, G, ν, ρ
        ├── EngineeringSection     — A, Iy, Iz, J
        ├── EngineeringSupport     — Restraints, springs
        ├── LoadPattern            — Dead/Live/Wind/Seismic/Custom
        ├── LoadCase               — Linear/Nonlinear analysis setup
        ├── LoadCombination        — LRFD/ASD/Custom factor sets
        ├── NodeLoad               — Applied forces/moments at nodes
        ├── MemberLoad             — Distributed, point, thermal
        └── AnalysisResult         — Read-only solver output
```

### Key Design Decisions

#### 1. Stable Object Identity
Every entity receives a UUID at creation that never changes. Version counters increment monotonically on mutation. Array indexes are never used as identifiers.

#### 2. Extension Mechanism
Every `IEngineeringObject` carries an `extensions: Record<string, unknown>` dictionary. Subsystems write to namespaced keys (e.g., `extensions['com.beamlab.compliance']`). This prevents core schema bloat while supporting arbitrary enrichment by agents, plugins, and BIM adapters.

#### 3. Immutable-friendly Versioning
The CEM uses a builder/mutate-then-bump pattern. Each write increments `EngineeringVersion.number`. Full immutable snapshots are a future optimization (structural sharing via persistent data structures). The change history provides a lightweight audit trail.

#### 4. Relationship Model
References between objects are stored as ID strings, not direct object references. The `RelationshipRegistry` maintains an adjacency map for efficient traversal in both directions (outbound references and inbound dependents). This prevents circular reference issues and makes serialization trivial.

#### 5. Provider-driven Serialization
`SerializationRegistry` holds `ISerializationProvider` implementations. The default provider is JSON. Future providers will handle IFC, STEP, binary, and cloud sync formats without touching core model code.

#### 6. Pluggable Validation
`ValidationRegistry` holds `IValidationRule` instances. Each object self-validates (dimension checks, required references). The `OrphanReferenceRule` performs cross-reference checks at the model level. Additional rules (code-specific checks, geometry constraints) are registered by subsystems without core model changes.

#### 7. Event Bus
`CEMEventEmitter` decouples producers (model mutations) from consumers (Workspace Runtime, Visualization, Agents). No consumer needs to poll.

#### 8. No Framework Dependencies
The `@beamlab/engineering-model` package **must never import** React, Vue, Three.js, Zustand, or any solver library. It is a pure TypeScript domain model.

## Future Compatibility

Extension points are designed to support:
- **BIM / IFC**: External IDs on metadata; provider-driven IFC serializer
- **Digital Twins**: Result publishing + event bus enable real-time synchronization  
- **Cloud Collaboration**: Versioning + changesets enable merge/conflict workflows
- **Distributed Editing**: Relationship registry supports CRDT-style merge
- **Construction Monitoring**: Extension data on objects carries inspection/monitoring state

## Consequences

### Positive
- All BeamLab subsystems now speak a common engineering language
- Adding new object types requires only adding a class + registering in the ObjectRegistry
- Validation, serialization, and units are independently replaceable
- Complete audit trail for every model change

### Negative
- Existing solver and agent code must be updated to consume the CEM rather than their internal types (migration work for Beta)
- Immutable snapshots require additional memory investment when enabled
