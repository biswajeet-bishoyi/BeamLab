# ADR 017: Engineering Resource Manager (ERM)

## Status
Accepted

## Context
BeamLab needs to decouple specific engineering data (e.g., standard steel sections, concrete grades, material properties) from the core logic. To ensure true enterprise scalability, we can no longer hardcode specific properties into a giant `Record<string, any>` or generic monolithic interfaces. Furthermore, resources must be strictly typed, contain metadata, and support multiple extension profiles (Geometry, Mechanical, Cost, Carbon) for downstream features.

## Decision
We decided to implement the **Engineering Resource Manager (ERM)** via `@beamlab/resource-manager` and `@beamlab/resource-client`. The architecture enforces the following principles:

### 1. Strongly Typed Schemas & Properties
Every resource category defines its own strongly typed properties interface (e.g., `SteelSectionProperties`, `ConcreteProperties`). These are coupled with a `ResourceSchema` containing rich metadata about each property (display name, engineering category, unit, validation limits).
This metadata will power automatic property panel rendering and forms.

### 2. Provider-Driven "Resource Packs"
Resources are supplied by `IResourceProvider` implementations. The baseline consists of "BeamLab Core Resource Pack" exposed via `StaticProvider`. Future plugins or enterprise versions can register additional providers to inject Manufacturer Catalogs, BIM Objects, or Company Standards without touching core platform code.

### 3. Resource Type Registry
A central `ResourceTypeRegistry` holds the available schemas. This separates the definition of *what* a resource is (the Schema) from the instances of the resources themselves. This registry is also prepared to hold renderer, validator, and importer logic supplied by plugins.

### 4. Developer Diagnostics
A `ResourceExplorer` tab has been added to the web Developer Studio, allowing engineers to visualize cached entities, track hits/misses, and inspect the properties of standard resources during development.

## Future Strategy
- **Resource Profiles**: The `ResourceModel` is prepared to support lazy-loaded `ResourceProfile` objects. This allows a base object to carry minimal geometry, while its Cost and Lifecycle profiles can be fetched lazily.
- **Engineering Quantities**: In a future update, literal numbers (`yieldStrength: 250`) will be migrated to `EngineeringValue` objects (`{ value: 250, unit: "MPa" }`) to enable dimensional analysis and auto-conversion.
