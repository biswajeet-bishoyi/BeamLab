# ADR-061: Collaborative Multi-User Session Studio and Team Hub UI

## Status
Accepted

## Context
Structural engineering projects are inherently multidisciplinary and collaborative, involving lead structural engineers, peer reviewers, BIM coordinators, and engineering interns working concurrently on complex finite element models. Sprints B7.1 through B7.3 implemented the core headless primitives within `@beamstudio/collaboration-engine`:
1. CRDT model replication and operational synchronization (`Y.Doc` state vectors, structural node/member CRDT maps).
2. Spatial presence, peer cursors, raycast selections, camera viewpoints, and telemetry streams.
3. Git-like structural version control, commit trees, 3D semantic diffs, steel mass comparisons, and 3-way merge conflict resolution.

To empower practicing structural engineers, these underlying capabilities must be surfaced in an intuitive, glassmorphic, real-time UI hub within `apps/web`. The engineering studio must provide:
- Instant visibility into active peer engineers, their roles (Lead Engineer, Structural Engineer, Reviewer, BIM Coordinator, Intern), coordinates, active member selections, and camera synchronization.
- A visual branching and commit history timeline showing who made changes, commit messages, parentage, steel mass shifts ($\Delta\text{kg}$), and formal engineering milestone tags (e.g. `v1.0-schematic`, `v1.2-signoff`).
- Side-by-side and 3D visual diff inspections between any two commits or branches, breaking down node/member/load modifications and CAD color-coded legend items.
- An interactive 3-way merge resolver allowing engineers to choose branch targets, preview conflicts with property-level diffs (ancestor, ours, theirs), select resolution strategies (`ours`, `theirs`, `manual`), and commit the unified model.

## Decision
We implemented the collaborative user experience across `apps/web`:

### 1. Global Navigation & Workspace Integration
- **TopNav (`apps/web/src/layouts/TopNav.tsx`)**:
  - Added a dedicated "Team Hub" trigger button in the main header.
  - Displays real-time collaborator counter badge and dynamic emerald pulse indicator when a session is active.
  - Managed via global Zustand UI state: `collaborationStudioOpen` and `setCollaborationStudioOpen`.
- **Workspace Layout (`apps/web/src/layouts/WorkspaceLayout.tsx`)**:
  - Integrated `<CollaborationSessionStudio />` rendered conditionally with smooth `<AnimatePresence>` glassmorphism backdrop transitions.

### 2. Multi-Tab Session Studio (`CollaborationSessionStudio.tsx`)
Located in `apps/web/src/features/collaboration/`:
- **Peers & Presence Tab**:
  - Live session header with room code, connectivity status (`connected`, `reconnecting`, `disconnected`), copyable invitation link, and session statistics.
  - Interactive peer cards showing role badges, spatial coordinates $(x, y, z)$, active node/member selections, and direct "Follow Camera" controls.
  - Broadcast controls for spatial cursor telemetry, pinging, and viewport camera sharing.
- **Branches & History Tab**:
  - Branch selector and inline branch creation modal (`New Branch`).
  - Interactive commit timeline graph displaying commit hashes, authors, timestamps, commit messages, and tags.
  - Commit creation form with structural message notes and milestone tagging (`Milestone Tag`).
  - Steel tonnage indicators displaying mass shifts ($\Delta\text{kg}$) across commits.
- **3D Model Diff Tab**:
  - Target branch/commit comparison selectors.
  - Summary KPI cards: Steel mass delta ($\Delta\text{kg}$, $\Delta\%$), added entities, modified geometry/nodes, and modified sections/loads.
  - 3D CAD viewport color-coded legend (added emerald `#10b981`, removed crimson `#ef4444`, modified geometry amber `#f59e0b`, modified section violet `#8b5cf6`, modified load cyan `#06b6d4`, unchanged slate `#64748b`).
  - Detailed entity diff breakdown list with spatial and property delta badges.
- **Merge & Conflicts Tab**:
  - Source branch and target branch merge configuration.
  - Merge strategy selector: `ours`, `theirs`, `manual`.
  - Conflict inspector showing conflicting entity IDs, classification (`property_conflict`, `geometry_conflict`, `topological_orphan_conflict`), and ancestor vs. ours vs. theirs side-by-side values.
  - Resolution committer with custom commit message and execution.

## Consequences

### Positive
- Fully cohesive collaboration studio bridging real-time CRDT presence with finite element version control.
- Professional UI tailored to structural engineering workflows, offering steel mass visibility and branch-level safety checks.
- Clean integration with existing `apps/web` layout and state management.

### Trade-offs
- The 3D viewport CAD diff rendering connects via `Visual3DDiffMap` metadata; active canvas layer toggles are coordinated through store events.
