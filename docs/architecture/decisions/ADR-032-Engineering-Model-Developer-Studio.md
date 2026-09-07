# ADR-032: Engineering Model Developer Studio & CEM Diagnostics

## Status
Accepted

## Context
As structural models scale to thousands of nodes, members, load cases, and results, developers and structural engineers require first-class observability into model integrity, kinematic stability, memory consumption, and dependency graphs.

Previously:
1. **Kinematic instability and rigid body mechanisms** were only detectable when a numerical equation solver failed with a singular matrix or divide-by-zero error.
2. **Memory footprints and stiffness matrix bandwidths** were unmonitored, risking browser tab crashes or excessive worker transfer overhead.
3. **Model dependency cycles and orphan objects** (such as floating disconnected nodes or unused catalog sections) lacked automated detection.
4. **CEM Event Streams** had no historical audit buffer for real-time diagnostics, UI state synchronization debugging, or AI agent rationale review.

## Decision
We implement the **Engineering Model Developer Studio Diagnostics Suite** in `@beamlab/engineering-model/src/diagnostics/` and integrate it into the web developer inspection UI.

### Architecture

```
                       Canonical Engineering Model (CEM)
               ┌───────────────────────┬───────────────────────┐
               │                       │                       │
               ▼                       ▼                       ▼
    ┌──────────────────────┐┌──────────────────────┐┌──────────────────────┐
    │    ModelProfiler     ││ DependencyGraphEngine││  EventStreamAuditor  │
    ├──────────────────────┤├──────────────────────┤├──────────────────────┤
    │ • DoF Analysis       ││ • Directed Graph/DAG ││ • Circular Buffer    │
    │   (Total, Free, Rest)││ • Cycle Detection    ││ • Live CEM Event     │
    │ • Matrix Bandwidth   ││ • Orphan Detection   ││   Subscription       │
    │ • Matrix Sparsity %  ││ • Topological Sort   ││ • Type/ID Filtering  │
    │ • Memory Footprint   ││ • Forward/Reverse    ││ • Replay Simulator   │
    │ • Model Health Score ││   Dependency Lookup  ││ • Payload Inspector  │
    │   (0 - 100%)         ││ • Cytoscape/DOT Expr ││                      │
    └──────────────────────┘└──────────────────────┘└──────────────────────┘
               │                       │                       │
               └───────────────────────┼───────────────────────┘
                                       ▼
                   ┌──────────────────────────────────────┐
                   │    Developer Studio UI Component     │
                   │      (ModelExplorer.tsx)             │
                   └──────────────────────────────────────┘
```

### Core Diagnostic Modules

#### 1. ModelProfiler (`ModelProfiler.ts`)
* **Degree-of-Freedom Matrix Auditor**:
  $$\text{Total DoFs} = 6 \times N_{\text{nodes}}$$
  $$\text{Free DoFs} = \text{Total DoFs} - N_{\text{restraints}}$$
* **Kinematic Stability Pre-Check**: Flags models with fewer than 6 restrained degrees of freedom before numerical solver invocation.
* **Matrix Bandwidth & Sparsity Estimator**: Estimates half-bandwidth $B = (\max(\Delta \text{NodeID}) + 1) \times 6$ and sparsity percentage for sparse solver optimization.
* **Model Health Scoring (0–100%)**: Evaluates model quality based on validation diagnostics, stability, orphan count, and disconnected elements, categorizing models as `Excellent`, `Good`, `Needs Review`, or `Critical`.

#### 2. DependencyGraphEngine (`DependencyGraphEngine.ts`)
* **Bidirectional Relationship Graph**: Maintains forward dependencies (`getDependenciesOf(id)`) and reverse dependents (`getDependentsOf(id)`).
* **Cycle Detection**: Depth-first search (DFS) with 3-color node classification to identify circular dependencies.
* **Orphan Detection**: Pinpoints disconnected nodes and unassigned section/material profiles.
* **Topological Ordering**: Computes build-order sequences where dependencies precede dependent entities.
* **Export Formats**: Outputs JSON for graph visualizers and GraphViz DOT syntax.

#### 3. EventStreamAuditor (`EventStreamAuditor.ts`)
* **Bounded Ring Buffer**: Stores recent CEM events with monotonic sequence numbers (`seq`).
* **Multi-Criteria Filtering**: Filter by event type (`EngineeringObjectCreated`, `AnalysisResultCreated`, etc.), affected object ID, or sequence number.
* **Zero Performance Impact**: Passive listeners that can be attached or detached on-demand.

#### 4. EngineeringModel Integration
Exposes ergonomic methods:
* `model.profile()` -> returns complete `ModelProfile`.
* `model.getDependencyGraph()` -> returns `DependencyGraphEngine`.
* `model.createEventAuditor(maxSize)` -> returns attached `EventStreamAuditor`.

## Consequences

### Positive
* **Pre-Solver Verification**: Instabilities and rigid body mechanisms are caught before expensive finite-element matrix assembly.
* **Developer Productivity**: Immediate visual feedback on model dependencies, memory usage, and health score.
* **AI & Agent Compatibility**: Archie AI reasoning agents can directly inspect `model.profile()` and `model.getDependencyGraph()` to explain structural issues in natural language.

### Considerations
* Matrix bandwidth calculation is an upper-bound estimate based on node indexing; full Cuthill-McKee bandwidth reordering will be integrated in Phase B3 solver integration.
