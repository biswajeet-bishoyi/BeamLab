# ADR-029: Loading Domain Architecture

## Status
Accepted

## Context

BeamLab requires a canonical representation of engineering loading that is solver-independent, provider-driven, extensible, and fully compatible with future structural analysis disciplines.
Prior to Sprint B1.3, only minimal stubs existed for `LoadPattern`, `LoadCase`, and `LoadCombination`. These stubs were insufficient for representing complex loads (concentrated, distributed, thermal, settlement, pressure, cable pretension), assigning loads to target objects without redundant coordinate duplication, and validating load paths and combination formulations.

## Decision

We introduce a dedicated, highly robust `loading-domain/` package within `@beamlab/engineering-model`. The architecture decouples the load definition from its structural assignment, grouping, and analysis contexts.

### Architectural Component Diagram

```
LoadingSystem
 │
 ├── LoadRegistry
 │    └── StructuralLoad* (PointLoad, DistributedLoad, MomentLoad, TemperatureLoad, SettlementLoad, PretensionLoad, PressureLoad)
 │
 ├── AssignmentRegistry
 │    └── LoadAssignment* (Maps Load ID to target ID, e.g. Node, Member, Assembly, System, with scale factors)
 │
 ├── PatternRegistry
 │    └── LoadPattern* (Collects assignments of a specific type, e.g., Dead, Live, Wind, with self-weight factor)
 │
 ├── CaseRegistry
 │    └── LoadCase* (References load patterns with scale factors for a specific AnalysisType, e.g., LinearStatic, NonlinearStatic, Modal)
 │
 ├── CombinationRegistry
 │    └── LoadCombination* (Design combination referencing Cases/Combinations with factors, mapped to Eurocode, IS, AISC)
 │
 └── EnvelopeRegistry
      └── LoadEnvelope* (Minimum/maximum extreme values across Cases/Combinations)
```

### Key Technical Specs

#### 1. Reuse of Base Classes (Zero Coordinate/Geometry Duplication)
`StructuralLoad` represents a pure mechanical action. It is solver-agnostic and carries no direct structural attachment.
Instead, a separate `LoadAssignment` references `loadId`, `targetType` ('Node' | 'Member' | 'Assembly' | 'Structure'), and `targetId` by ID. This allows a single distributed load profile to be applied to dozens of members without replicating vectors.

#### 2. Fully Decoupled Load Patterns & Load Cases
A `LoadPattern` represents the physical nature of the load (e.g. Dead, Live, Wind). A `LoadCase` represents the mathematical boundary condition for the solver (e.g. Linear Static, Nonlinear Static, Pushover). A `LoadCase` refers to one or more `LoadPattern`s with corresponding factors.

#### 3. Standard Design Combinations
`LoadCombination` represents code-level design combinations. It supports standards (IS800, Eurocode, AISC-LRFD, AISC-ASD, ACI318) and categories (ULS, SLS, LRFD, ASD) with linear or nested combinations of other cases/combinations.

#### 4. Design Envelopes
`LoadEnvelope` supports finding max, min, or absolute max values over multiple Cases or Combinations, preparing values directly for member capacity design checks.

#### 5. Coordinate System Explicit References
Every load vector/value references a Coordinate System (Global, Local, or User-defined), allowing correct translation during solver matrix assembly.

### Validation Rules

We implement the following automated engineering validation checks:

| Rule ID | Name | Description |
|---|---|---|
| LDM-XREF-A001 | Duplicate Load Assignment | Flags if same load is assigned twice to the same target in the same pattern |
| LDM-XREF-C001 | Missing Case Reference | Flags combinations referencing non-existent load cases or sub-combinations |
| LDM-XREF-C002 | Circular Combo Reference | Flags combinations involved in a circular dependency chain |
| LDM-XREF-E001 | Missing Envelope Source | Flags envelopes referencing non-existent combinations/cases |
| LDM-XREF-LC001| Missing Pattern Reference | Flags load cases referencing non-existent patterns |

## Consequences

### Positive
- Fully extensible for advanced load types (dynamic wind, blast, offshore wave kinetics, moving train wheel sequences) without schema changes.
- Pure engineering logic, completely independent of Three.js, React, or specific solver formats.
- High-fidelity validation protects users from circular combination definitions and duplicate load applications.

### Negative
- Deprecates B1.1 stubs (`LoadPattern`, `LoadCase`, `LoadCombination` are now prefixed with `Cem*` for backward compatibility or imported from `loading-domain`).
