# PRD.md — Structural Engineering Platform (Codename: "Beamworks")
### Product Requirements Document — Version 1.0 (Beam Analysis) → Vision Roadmap (Full Structural Ecosystem)

**Document owner:** Product & Engineering Leadership
**Status:** Draft for engineering kickoff
**Scope of this document:** Complete requirements for V1 (Beam Analysis Module) plus the architectural and product vision for all future modules (Frames, Trusses, Slabs, Columns, Footings, Retaining Walls, Steel/RC Design, Bridges, Dynamics, FEM, BIM, VR/AR).

---

## Table of Contents

1. Executive Summary
2. Product Vision
3. Mission Statement
4. Goals & Objectives
5. Success Metrics
6. Target Users
7. User Personas
8. User Stories
9. Functional Requirements
10. Non-Functional Requirements
11. Product Principles
12. Engineering Principles
13. UX Principles
14. UI Philosophy
15. Information Architecture
16. Navigation Structure
17. Screen Inventory
18. User Flows
19. Wireframe Descriptions
20. Component Library
21. Accessibility Requirements
22. Error States
23. Empty States
24. Notifications
25. Keyboard Shortcuts
26. Mouse Interactions
27. Touch Support
28. Performance Goals
29. Security Considerations
30. Scalability
31. Future Expansion
32. Risks
33. Assumptions
34. Milestones
35. Roadmap
36. Version Planning
37. Acceptance Criteria
38. Domain Specification — Beam Types
39. Domain Specification — Supports
40. Domain Specification — Load Types
41. Domain Specification — Materials
42. Domain Specification — Section Library
43. Interactive Canvas Specification
44. Live Structural Analysis Specification
45. Engineering Playback Mode
46. Interactive Animation System
47. Beam Visualization Modes
48. Stress Visualization
49. Educational Features
50. AI Features
51. Beam Inspector
52. Engineering Dashboard
53. Reports
54. Project Management
55. CAD/BIM Interop
56. Research Features
57. Optimization
58. Sustainability
59. Developer Features
60. Future Modules
61. Tech Stack Recommendations

---

## 1. Executive Summary

Beamworks is a next-generation, browser-first structural engineering platform that begins its life as a world-class **Beam Analysis** tool and is architected from day one to grow into a complete structural analysis ecosystem — spanning frames, trusses, slabs, columns, footings, retaining walls, steel and reinforced concrete design, bridges, and eventually finite element and structural dynamics workloads.

Unlike legacy desktop engineering software (SAP2000, STAAD.Pro, RISA, RFEM), which was designed in an era of static input forms and offline batch analysis, Beamworks is built around a single core belief: **structural engineering software should feel alive**. Every load you drag, every support you move, every material you swap should produce an instantaneous, animated, physically accurate response. The software should teach as it computes, and compute as it teaches.

Beamworks sits at the intersection of five product categories that have never been convincingly merged into one coherent experience:

- **Professional engineering software** — code-checked, numerically rigorous, exportable, auditable.
- **Educational platform** — a place where a sophomore civil engineering student can build genuine intuition for shear and moment diagrams.
- **AI engineering assistant** — a contextual copilot that understands the exact beam model on screen and can explain, critique, optimize, and generate it.
- **Research tool** — supporting variable EI, composite sections, elastic foundations, sensitivity analysis, and parametric studies for graduate-level and applied research work.
- **Visualization engine** — a rendering core capable of 2D, pseudo-3D, and full 3D representations of deformation, stress, and internal force fields, animated at 60 FPS.

Version 1 focuses entirely on **statically-determinate and indeterminate beam analysis** (simply supported, cantilever, fixed-fixed, propped cantilever, overhanging, continuous, and Gerber beams) under an open-ended set of load types, with full real-time recomputation, a signature "Engineering Playback Mode," professional reporting, and a foundation-level AI assistant. Every architectural decision in V1 — the solver abstraction, the canvas rendering pipeline, the plugin system, the report generator — is made with the explicit intent of supporting frames, trusses, and full 3D FEM in later versions without a rewrite.

This PRD defines the requirements for that V1 release in full technical and UX depth, and sets the roadmap and architectural guardrails for everything that follows.

---

## 2. Product Vision

**Beamworks will become the primary interface through which structural engineers, students, and researchers think about structures.**

Where today an engineer opens a desktop application, defines geometry through dialog boxes, presses "Analyze," and reads a static PDF report, Beamworks collapses that entire workflow into a single continuous, live canvas. The user does not "run an analysis" — the analysis is always running. Diagrams are not generated — they grow, in real time, as the model changes. Reports are not written after the fact — they are living documents that stay synchronized with the model.

The long-term vision extends the same interaction model — direct manipulation, live solving, animated feedback, contextual AI — across the entire structural analysis domain: 2D and 3D frames, trusses, slabs, columns, footings, retaining walls, bridges, and eventually full finite-element continuum problems, seismic and wind dynamics, and soil-structure interaction. Beamworks aims to be to structural engineering what Figma was to design software and what Desmos was to mathematical exploration: an environment so responsive and so visually legible that the software itself becomes a teaching tool, a design tool, and a communication tool simultaneously.

### Vision Pillars

1. **Live-first, not batch-first.** No "Analyze" button should ever be required for supported real-time cases. Analysis is a continuous background process synchronized to the render loop.
2. **Explainability by default.** Every number on screen can be clicked to reveal the equation, the derivation, and the physical reasoning behind it.
3. **One model, every visualization.** The same underlying structural model drives 2D diagrams, 3D deformation, stress heatmaps, and generated reports — there is never a second "reporting model" that can drift out of sync.
4. **AI as a structural collaborator, not a chatbot bolted on.** The AI assistant always has full read access to the current model state, and its explanations, critiques, and suggestions are always grounded in the actual geometry, loads, and material properties on screen.
5. **Progressive disclosure of complexity.** A first-time student sees a clean, guided canvas. A licensed PE sees full code-checking, optimization, and export tooling. The same underlying engine powers both.
6. **Extensible from the first commit.** The solver, canvas, and UI are built as composable modules so that Frame Analysis, Truss Analysis, and eventually full 3D FEM can be added as new "solver providers" and new "element types" without redesigning the platform.

---

## 3. Mission Statement

> **To make structural engineering visible, interactive, and joyful to learn — and to make professional structural analysis fast, trustworthy, and beautiful enough that engineers choose to work inside it every day.**

Beamworks exists to close the gap between the mathematical abstraction of structural mechanics and the physical intuition engineers need to design safely and efficiently. It exists because most engineering software optimizes for correctness and compliance at the total expense of comprehension, and most educational tools optimize for comprehension at the total expense of professional rigor. Beamworks refuses to trade one for the other.

---

## 4. Goals & Objectives

### 4.1 Business Goals

- Establish Beamworks as the reference beam-analysis tool for engineering curricula within 18 months of V1 launch.
- Convert a meaningful fraction of educational users into professional/paid users as they enter the workforce (education-to-professional funnel).
- Build a defensible, extensible solver + rendering core that lets the company ship Frame Analysis, Truss Analysis, and Slab Design within 12–24 months without re-architecting the platform.
- Establish an ecosystem (plugin marketplace, API, scripting) that creates switching costs and network effects comparable to CAD platforms.

### 4.2 Product Goals (V1 — Beam Analysis)

- G1: Support all common determinate and indeterminate beam configurations with correct, verifiable, code-referenced numerical results.
- G2: Deliver real-time recomputation of reactions, SFD, BMD, deflection, stress, slope, and safety factor on every model change, with no visible lag under normal model sizes.
- G3: Deliver the "Engineering Playback Mode" as a flagship, shareable, demoable feature that differentiates Beamworks from every competitor.
- G4: Ship a Learn Mode and Professional Mode that share 100% of the underlying solver and rendering code.
- G5: Ship a baseline AI assistant capable of explaining any number on screen, answering natural-language modeling requests ("add a 10 kN point load at 3m from the left support"), and reviewing a model for common errors.
- G6: Ship professional-grade report export (PDF, PNG, SVG, CSV, JSON) suitable for submission in real engineering workflows.
- G7: Architect the solver, canvas, and data model so that Frame Analysis (V2) requires no breaking changes to the V1 data schema.

### 4.3 Objectives & Key Results (OKRs), first two quarters post-launch

- **Objective: Prove the live-analysis interaction model resonates.**
  - KR: ≥70% of active users interact with at least 3 distinct load/support edits per session.
  - KR: Median time-to-first-correct-diagram (from blank canvas) under 90 seconds for new users.
- **Objective: Prove educational value.**
  - KR: ≥40% of student users complete at least one Guided Learning Path in the first week.
  - KR: Net Promoter Score ≥ 50 among university users.
- **Objective: Prove professional trust.**
  - KR: Numerical results validated against ≥25 independent hand-calculated and commercial-software benchmark cases with <0.1% deviation.
  - KR: ≥80% of professional beta users report they would use Beamworks for at least preliminary design.

---

## 5. Success Metrics

### 5.1 North Star Metric
**Weekly Active Analyzed Models (WAAM):** the count of unique beam models that received at least one live recomputation triggered by direct user interaction (drag, edit, add/remove) within a 7-day window. This captures genuine, interactive engagement rather than passive report viewing.

### 5.2 Supporting Metrics

| Category | Metric | Target (6 months post-launch) |
|---|---|---|
| Engagement | Median session length | ≥ 12 minutes |
| Engagement | Sessions with ≥1 Playback Mode run | ≥ 35% |
| Retention | 4-week retention (returning users) | ≥ 45% |
| Education | Learning Path completion rate | ≥ 30% |
| Education | Practice Mode problems solved / user / week | ≥ 5 |
| Professional trust | Reports exported / week | growing MoM |
| Professional trust | Numerical validation suite pass rate | 100% |
| AI | AI assistant queries answered without escalation/correction | ≥ 85% |
| Performance | P95 recompute latency for models ≤ 20 elements | < 50 ms |
| Performance | Playback animation frame rate | ≥ 60 FPS on target hardware |
| Quality | Crash-free session rate | ≥ 99.5% |
| Growth | Free-to-paid conversion (professional tier) | ≥ 4% |

---

## 6. Target Users

1. **University students** in civil, structural, mechanical, and architectural engineering programs studying statics and mechanics of materials.
2. **Practicing structural engineers** (EIT through licensed PE/SE) performing preliminary design, quick checks, and teaching-by-example within their own firms.
3. **Faculty and instructors** who need demonstrable, visual teaching tools for lecture and homework generation.
4. **Graduate students and researchers** requiring parametric studies, variable-EI beams, composite sections, and sensitivity analysis.
5. **Engineering firms** (small-to-mid size) looking for fast, collaborative, cloud-based preliminary analysis tools that don't require a full SAP2000/ETABS license for simple checks.
6. **Hobbyists / makers / self-taught engineers** building furniture, structures, or DIY projects who want physically grounded guidance without a full engineering education.
7. **Software developers / integrators** who want to embed structural analysis into their own tools via API/SDK.

---

## 7. User Personas

### Persona 1 — "Maya," the Sophomore Engineering Student
- Age 19, second-year Civil Engineering major.
- Currently uses hand calculations and a graphing calculator; has tried a competitor's static beam calculator once and found it "a form with boxes."
- Goal: build genuine intuition for how loads translate into shear/moment/deflection before the exam.
- Pain: Textbook diagrams are static; she cannot see *why* the moment diagram has the shape it does.
- Success looks like: dragging a point load along a simply supported beam and watching the moment diagram deform in real time, with the peak moment value updating live.

### Persona 2 — "Daniyar," the Early-Career Structural EIT
- Age 26, 2 years post-graduation, working at a mid-size structural firm.
- Uses STAAD.Pro and a lot of Excel spreadsheets for quick checks.
- Goal: verify a beam size in under 5 minutes during a client call without opening the "heavy" enterprise tool.
- Pain: Enterprise software is slow to start, requires full model setup even for a single beam check, and produces reports that are hard to customize quickly.
- Success looks like: pasting in span, loads, and section, getting an instant utilization ratio and a clean PDF to email within the call.

### Persona 3— "Dr. Osei," Structural Engineering Faculty
- Associate professor teaching Mechanics of Materials and Structural Analysis.
- Goal: generate visually rich lecture demonstrations and auto-generated homework problem sets with solutions.
- Pain: Existing tools are either too basic (static diagrams) or too complex (full commercial FEM suites) for classroom use.
- Success looks like: using Presentation Mode live in lecture, and using the Random Problem Generator to create a graded homework set with an answer key exported automatically.

### Persona 4 — "Priya," Senior PE Reviewing Junior Work
- 15 years experience, licensed PE, reviews calculation packages from junior engineers.
- Goal: quickly audit a beam design, check code compliance, and leave comments.
- Pain: PDF calc packages are hard to interrogate; she wants to click on a number and see its derivation immediately.
- Success looks like: opening a shared project, using the Beam Inspector to verify a critical section, leaving an annotation, and approving via the Approval Workflow.

### Persona 5 — "Tomás," Independent Researcher
- Graduate researcher studying beams on elastic foundations with sensor-validated experimental data.
- Goal: run parametric sweeps of foundation stiffness and compare to instrumented test data.
- Pain: General-purpose FEM tools are overkill and slow to set up for simple parametric 1D studies.
- Success looks like: defining a variable-stiffness elastic foundation, importing sensor CSV data, overlaying it against the analytical deflection curve, and running a sensitivity sweep across foundation modulus.

### Persona 6 — "Alex," Hobbyist Builder
- No formal engineering training, building a backyard deck/loft structure.
- Goal: get an approximate, safe sense of whether a beam span/size is reasonable.
- Pain: Doesn't know what "moment of inertia" means, intimidated by professional software.
- Success looks like: using Learn Mode's guided flow and plain-language explanations to get a confidence-inspiring green "safety factor: 2.4" result.

---

## 8. User Stories

Representative stories (full backlog maintained separately; format: *As a [persona], I want [capability], so that [outcome]*).

**Modeling**
- As Maya, I want to drag a support along the beam and see reactions update live, so I can understand how support position affects reactions.
- As Daniyar, I want to type "20 ft simply supported beam, W12x26, 2 kip/ft UDL" in natural language and have the model built automatically, so I can check a beam in seconds.
- As Tomás, I want to define a beam segment with continuously variable EI, so I can model a tapered member.

**Analysis**
- As Priya, I want to click any point on the bending moment diagram and see the exact value, formula, and governing load combination, so I can verify a critical section without redoing the calculation by hand.
- As Daniyar, I want the safety factor and utilization ratio to update instantly as I change section size, so I can converge on an adequate size quickly.

**Visualization**
- As Maya, I want to see the beam physically deflect and the stress distribution animate across the cross-section, so I understand tension/compression intuitively.
- As Dr. Osei, I want to switch between Moment Mode, Shear Mode, and Deflection Mode with one click during a live lecture.

**Education**
- As Alex, I want plain-language tooltips explaining every technical term I hover over, so I don't feel lost.
- As Dr. Osei, I want to generate 20 random beam problems with varying loads and supports and export an answer key, so I can create a homework set in minutes.

**AI**
- As Daniyar, I want to ask "why is my deflection so high?" and get an answer referencing my actual section and span, so I don't have to manually diagnose it.
- As Priya, I want the AI reviewer to flag an unusually low safety factor or an unsupported free end before I approve a submission.

**Reporting/Collaboration**
- As Priya, I want to leave a comment pinned to a specific location on the beam, so my junior engineer knows exactly what to revise.
- As Daniyar, I want to export a report with my company letterhead and my PE stamp block, so I can send it directly to a client.

**Research**
- As Tomás, I want to run a parametric sweep across 10 values of foundation modulus and see how peak deflection changes, plotted as a single chart, so I can characterize sensitivity.

**Developer**
- As an integrator, I want a REST API endpoint that accepts a JSON beam definition and returns reactions and diagrams, so I can embed Beamworks analysis in my own internal tool.

---

## 9. Functional Requirements

### 9.1 Modeling
- FR-1: Users can create a beam of any supported type (Section 38) with arbitrary span length (positive real number, configurable unit system).
- FR-2: Users can add, move, and delete any number of supports (Section 39) along the beam span, subject to type-specific validity rules (e.g., minimum 2 supports for static determinacy warnings, but the system must still solve statically indeterminate configurations).
- FR-3: Users can add, edit, move, and delete unlimited loads of any supported type (Section 40), each with editable magnitude, direction, position/extent, and color.
- FR-4: Users can assign a material (Section 41) to the whole beam or to per-segment ranges (for composite/variable-material research cases).
- FR-5: Users can assign a cross-section (Section 42) from the library or define a fully custom section via a parametric or point-based section editor.
- FR-6: The system supports Gerber beams with explicit internal hinge placement and multi-span continuous beams with arbitrary span counts.
- FR-7: All geometry, load, material, and section edits must be undoable/redoable (infinite undo stack for the session, persisted per project).

### 9.2 Analysis Engine
- FR-8: The solver must compute support reactions, internal shear force, internal bending moment, deflection, slope/rotation, bending stress, shear stress, and safety factor/utilization ratio for any valid model.
- FR-9: The solver must support both determinate solving (statics) and indeterminate solving (force method / stiffness method / three-moment equation, engine's choice, verified against textbook and commercial benchmarks).
- FR-10: Recomputation must be triggered automatically on every model mutation with no explicit "Analyze" action required, for models within the defined real-time performance envelope (Section 28).
- FR-11: The solver must expose intermediate derivation steps (equilibrium equations, moment-area steps, etc.) for the Step-by-Step Solver and Beam Inspector features.
- FR-12: The solver must support superposition of arbitrary combinations of the supported load types, including simultaneous loads of different types.
- FR-13: The solver must support temperature loads and support settlement as independent load cases combinable with mechanical loads.
- FR-14: The system must clearly flag statically unstable/mechanism configurations (insufficient supports) with a specific, human-readable diagnostic rather than a numerical error.

### 9.3 Visualization
- FR-15: The canvas must render the beam, supports, and loads in a 2D schematic view at all times, with pseudo-3D and full 3D toggles available (Section 47).
- FR-16: SFD, BMD, deflection, slope, and stress diagrams must render as animated, live-updating charts synchronized to the same time-axis as the beam geometry.
- FR-17: The system must support at least the visualization modes enumerated in Section 47 (Transparent, Wireframe, Stress, Deflection, Moment, Shear, Temperature, Buckling, Safety).
- FR-18: Engineering Playback Mode (Section 45) must be available for any valid, solved model, with play/pause/scrub/replay/speed/frame-step controls.

### 9.4 Education
- FR-19: Learn Mode must present the same model as Professional Mode with additional annotated formulas, hover explanations, and a persistent "Explain this" affordance.
- FR-20: The system must provide a Step-by-Step Solver that decomposes the full solution into discrete, navigable steps with narration text.
- FR-21: The system must provide a Random Problem Generator capable of producing beam problems constrained by difficulty, beam type, and load type, with an auto-generated worked solution.
- FR-22: The system must track user progress across Learning Paths and persist completion state per user account.

### 9.5 AI
- FR-23: The AI assistant must have read access to the full current model state (geometry, loads, materials, section, computed results) for every user query in the active session.
- FR-24: The AI assistant must support natural-language model creation and modification commands, subject to a confirmation step before mutating the model.
- FR-25: The AI Reviewer must run a defined rule set (Section 50) against any solved model and surface warnings inline on the canvas.
- FR-26: The AI Report Writer must generate a natural-language executive summary of a solved model suitable for inclusion in the exported report.

### 9.6 Reporting & Export
- FR-27: The system must generate a complete report (Section 53) from any solved model in PDF, PNG, SVG, CSV, and JSON formats.
- FR-28: Reports must support custom company branding, engineer details, and (where applicable) digital signature blocks.

### 9.7 Project Management
- FR-29: Users must be able to save, name, autosave, and reopen projects, with full revision history.
- FR-30: Projects must support template creation and instantiation.
- FR-31: Multi-user commenting/annotation must be supported per project, with an approval workflow state machine (Draft → In Review → Approved → Superseded).

### 9.8 Interop
- FR-32: The system must support import of DXF, DWG, SVG, PDF (geometry extraction where feasible), and IFC for future BIM modules; V1 ships DXF/SVG import/export at minimum, with DWG/IFC/PDF import behind a clearly labeled beta flag.
- FR-33: Export to DXF, IFC, SVG, and PDF must preserve dimensional accuracy of the beam schematic.

### 9.9 Developer Platform
- FR-34: The system must expose a REST API covering model CRUD, analysis execution, and report generation.
- FR-35: The system must support a Python scripting console for batch operations and custom parametric studies.
- FR-36: The system must support a plugin architecture allowing third parties to register new load types, section types, or export formats without modifying core code.

---

## 10. Non-Functional Requirements

- NFR-1 (Performance): Real-time recomputation for models with ≤ 20 discrete elements (loads + supports + segments) must complete in < 50ms P95 on reference hardware (mid-tier laptop, 2023+).
- NFR-2 (Performance): Canvas and diagram animations must sustain ≥ 60 FPS on reference hardware; degrade gracefully (reduced particle/animation fidelity, never dropped correctness) on lower-end hardware.
- NFR-3 (Reliability): Numerical solver results must match independently verified analytical/benchmark solutions to within 0.1% relative error across the validation suite (Section 37).
- NFR-4 (Availability): Cloud-synced project storage must target 99.9% monthly availability.
- NFR-5 (Security): All user project data must be encrypted at rest and in transit; see Section 29.
- NFR-6 (Accessibility): The application must meet WCAG 2.2 AA at minimum across all core workflows (Section 21).
- NFR-7 (Internationalization): All user-facing strings must be externalized for translation from V1, even if only English ships initially.
- NFR-8 (Compatibility): The application must run on evergreen Chrome, Firefox, Safari, and Edge (last 2 major versions), and on iPadOS Safari for tablet support.
- NFR-9 (Data portability): Users must be able to export their full project data (model + history + comments) in an open JSON schema at any time with no paywall.
- NFR-10 (Determinism): Given identical model input, the solver must produce byte-identical numerical output across sessions, machines, and platform versions (excluding intentional numerical-method upgrades, which must be versioned).
- NFR-11 (Extensibility): Adding a new beam/element type must not require modification of the canvas rendering core, only registration against defined interfaces (see CLAUDE.md, Plugin Architecture).
- NFR-12 (Observability): All solver executions must be logged (model hash, solver version, timing, outcome) for regression and analytics purposes, respecting privacy constraints.

---

## 11. Product Principles

1. **Direct manipulation over dialog boxes.** If a property can be dragged, it should be dragged. Modal forms are a last resort, not a default.
2. **Show the work.** Every result must be traceable to its derivation. A "black box" number is a product defect.
3. **One truth.** The canvas, the diagrams, the inspector, and the report are all views onto a single model. There is never a second copy that can silently diverge.
4. **Progressive complexity, not dumbed-down complexity.** Learn Mode simplifies presentation, never physics.
5. **Motion communicates meaning.** Animation is not decoration — every animation must map to a real physical or mathematical transition.
6. **Fast is a feature.** Sub-100ms feedback loops are a hard product requirement, not an aspiration.
7. **Extensible by design.** Every V1 decision must be evaluated against "does this block Frame Analysis in V2?"

## 12. Engineering Principles

1. **Solver correctness is non-negotiable.** No UI feature ships ahead of a validated, tested solver capability.
2. **Deterministic numerics.** Prefer closed-form and well-conditioned numerical methods over ad hoc approximations; document all numerical assumptions.
3. **Separation of concerns.** Solver core is UI-framework-agnostic and independently testable; rendering layer never contains structural logic.
4. **Everything is data.** Beams, loads, supports, materials, and sections are serializable data structures, not imperative code paths, enabling scripting, AI generation, and undo/redo uniformly.
5. **Fail loud, fail specific.** Numerical instability, unsupported configurations, or solver non-convergence must produce specific, actionable diagnostics, never silent wrong answers.

## 13. UX Principles

1. Clarity before density — even Professional Mode must never feel cluttered by default; advanced data is one interaction away, not always-on.
2. Feedback within 100ms for any direct manipulation, even if the full authoritative recompute takes longer (optimistic UI with reconciliation).
3. Reversibility — undo must always be available and must never be ambiguous about what it undoes.
4. Consistency — a drag interaction behaves identically whether dragging a support, a load, or a dimension handle.
5. Delight without distraction — playful animation in Playback Mode; restrained, information-dense presentation in Professional/Report contexts.

## 14. UI Philosophy

Beamworks' visual language draws from modern professional creative tools (Figma, Linear, Notion) rather than legacy engineering software (which tends toward dense, gray, Windows-95-era toolbars). The interface uses:

- A neutral, high-contrast base palette with a restrained accent palette reserved for semantic meaning (tension vs. compression, safe vs. over-utilized, active vs. inactive).
- Glassmorphism used sparingly — for floating panels, context menus, and the Inspector overlay — never for primary content surfaces where it would reduce legibility of technical data.
- Typography: a geometric sans-serif for UI chrome, and a monospaced or tabular-figure font for all numerical output to preserve column alignment in tables and inspectors.
- Motion as a first-class design material, governed by a strict animation token system (see CLAUDE.md → Animation Guidelines) so that timing and easing are consistent platform-wide.
- Dockable, rearrangeable panels for professional users; a simplified, fixed layout for Learn Mode to reduce cognitive load for first-time users.

---

## 15. Information Architecture

```
Beamworks
├── Home / Project Dashboard
│   ├── Recent Projects
│   ├── Templates
│   └── Learning Paths (if student account)
├── Workspace (per project)
│   ├── Canvas (primary surface)
│   ├── Properties Panel (context-sensitive: Beam / Support / Load / Material / Section)
│   ├── Diagram Panel (SFD / BMD / Deflection / Slope / Stress — tabbed or stacked)
│   ├── Engineering Dashboard (KPI cards)
│   ├── Beam Inspector (overlay, invoked by click/hover)
│   ├── AI Assistant Panel (dockable side panel or floating chat)
│   ├── Playback Mode (full-screen takeover, invoked from Analyze)
│   ├── Report Builder
│   └── Project Settings (units, code standard, branding)
├── Learn Mode (alternate top-level surface, shares Workspace internals)
│   ├── Guided Lessons
│   ├── Formula Explorer
│   ├── Practice Mode
│   ├── Challenge Mode
│   └── Exam Mode
├── Research Mode (advanced Workspace variant)
│   ├── Parametric Studies
│   ├── Sensitivity Analysis
│   └── Experimental Data Overlay
├── Account & Collaboration
│   ├── Team Management
│   ├── Comments & Annotations
│   ├── Approval Workflow
│   └── Revision History
└── Developer Platform
    ├── API Keys & Docs
    ├── Python Scripting Console
    └── Plugin Marketplace
```

---

## 16. Navigation Structure

- **Global top bar:** Project name (editable inline), Mode switch (Professional / Learn / Research), Undo/Redo, Save status indicator, Share, Account menu.
- **Left rail:** Tool palette (Select, Pan, Add Support, Add Load, Add Segment/Hinge, Measure, Comment).
- **Right dockable panel:** Properties Panel (context-sensitive) stacked above/tabbed with Diagram Panel; collapsible.
- **Bottom bar:** Engineering Dashboard KPI strip (collapsed by default in Learn Mode, expanded by default in Professional Mode); Analyze/Playback trigger sits here as a prominent primary action.
- **Floating overlay:** AI Assistant, invoked via a persistent corner affordance or keyboard shortcut, docks left/right or floats.
- **Breadcrumb (Learn Mode only):** Lesson > Section > Step, with Prev/Next navigation.

Navigation must never require more than 2 clicks to reach any core action (add load, switch visualization mode, export report, open inspector).

---

## 17. Screen Inventory

1. **Landing / Marketing site** (out of scope for this PRD except for conversion funnel notes).
2. **Sign-in / Sign-up** (email, SSO for institutional accounts).
3. **Project Dashboard / Home** — recent projects grid, "New Project" CTA, templates, learning path cards.
4. **New Project Wizard** — beam type selection, units, code standard (optional, skippable to land directly on blank canvas).
5. **Workspace — Professional Mode** — the primary analysis surface.
6. **Workspace — Learn Mode** — simplified layout with lesson sidebar and formula overlays.
7. **Engineering Playback Mode** — full-screen animated sequence with transport controls.
8. **Beam Inspector overlay** — invoked in-place, not a separate route, but treated as a distinct screen for design purposes.
9. **Report Builder / Preview** — full document preview with export controls.
10. **Project Settings** — units, code standard, branding, collaborators.
11. **Team / Collaboration Hub** — comments, approval workflow, revision history timeline.
12. **Formula Explorer** — searchable, categorized index of every formula used in the engine, each with derivation and interactive example.
13. **Practice / Challenge / Exam Mode** — problem presentation, timer (Exam Mode only), submission, scoring.
14. **Random Problem Generator config screen** — parameters for generating a batch of problems.
15. **Research Dashboard** — parametric study configuration, sensitivity results, benchmark validation table.
16. **Developer Console** — API keys, usage, scripting console, plugin management.
17. **Account Settings** — profile, subscription/billing, notification preferences, accessibility preferences (motion reduction, high contrast, colorblind palette).

---

## 18. User Flows

### Flow A — First-time student builds and understands a simply supported beam
1. Sign up → land on Project Dashboard → "Start Learning Path: Simply Supported Beams."
2. Guided lesson opens Workspace in Learn Mode with a pre-built beam and a single point load.
3. Lesson prompts: "Drag the load to the midpoint." Student drags; moment diagram morphs live; annotated peak-moment callout appears.
4. Lesson prompts: "What happens if we add a second support?" AI/lesson narration explains determinacy change.
5. Student completes lesson step set → progress marked complete → next lesson suggested.

### Flow B — Practicing engineer quick-checks a beam during a call
1. Open Beamworks → New Project → skip wizard, land on blank canvas in Professional Mode.
2. Use natural-language AI bar: "Simply supported, 20 ft, W12x26 steel, 2 kip/ft UDL over full span."
3. Model auto-populates; Engineering Dashboard shows max moment, max deflection, utilization ratio, safety factor within milliseconds of confirmation.
4. Engineer notices deflection is marginal, opens Beam Inspector at midspan, confirms number.
5. Engineer clicks Export → PDF with company branding pre-filled from account settings → shares link.

### Flow C — Senior PE reviews and comments
1. Opens shared project link → Workspace loads in read/comment mode per permissions.
2. Uses Beam Inspector to check a specific section's stress.
3. Adds a pinned comment at x = 12 ft: "Please re-check UDL magnitude against spec sheet."
4. Changes Approval Workflow state from "In Review" to "Changes Requested."
5. Junior engineer receives notification, opens project, addresses comment, resolves thread, resubmits.

### Flow D — Researcher runs a parametric study
1. Opens Research Mode → defines beam on elastic foundation.
2. Imports experimental sensor CSV via Project > Import.
3. Overlays sensor deflection curve against analytical curve in Deflection Mode.
4. Opens Research Dashboard → configures Sensitivity Analysis across foundation modulus (10 values) → runs sweep.
5. Reviews resulting chart of peak deflection vs. modulus; exports CSV + chart PNG.

### Flow E — Playback Mode demo (any persona)
1. Model is fully defined and valid.
2. User presses "Analyze" (prominent bottom-bar CTA).
3. Full-screen Playback Mode opens: loads fade/animate into position → supports react with subtle motion → reaction values count up with equations shown → SFD grows left-to-right → BMD forms → beam visibly deflects → stress heatmap spreads across the section → critical sections glow and pulse → summary card presents final KPIs.
4. User can pause, scrub back, replay, adjust speed, or step frame-by-frame at any point.
5. User exits Playback Mode back into the live Workspace with the same model.

---

## 19. Wireframe Descriptions

> Note: These are structural/textual wireframe descriptions (this document does not embed image assets); implementation should treat these as authoritative layout specifications pending visual design mockups.

### 19.1 Workspace — Professional Mode (desktop, ≥1440px)
- **Top bar (56px height):** left-aligned project name + mode switch pill (Professional/Learn/Research); center-aligned Undo/Redo icon buttons; right-aligned Save indicator (animated checkmark on save), Share button, Avatar/account menu.
- **Left rail (56px width, icon-only with tooltip labels):** Select (arrow icon), Pan (hand icon), Add Support (pin icon dropdown for support type), Add Load (arrow/dropdown for load type), Add Hinge/Segment, Measure/Dimension, Comment (speech bubble).
- **Center canvas (flexible width):** infinite pannable/zoomable surface; beam rendered horizontally centered by default; grid visible with snap indicators on drag; zoom/pan controls bottom-right corner (+/- buttons, fit-to-view icon, zoom percentage readout).
- **Right dock (360px default width, resizable, collapsible):** tabbed panel — "Properties" (context-sensitive to current selection), "Diagrams" (SFD/BMD/Deflection/Slope/Stress stacked mini-charts, each expandable to full view), "AI Assistant" (chat-style).
- **Bottom bar (120px height, collapsible to 32px):** Engineering Dashboard KPI cards in a horizontal scroll row (Max Moment, Max Shear, Max Deflection, Max Stress, Safety Factor, Utilization, Reactions summary); prominent "Analyze / Playback" button anchored bottom-right, visually distinct (filled, accent color, subtle pulsing glow when model has unsaved/unanalyzed changes — though live recompute means this is rarely "stale").

### 19.2 Workspace — Learn Mode
- Same canvas core, but: left rail replaced by a Lesson Sidebar (breadcrumb + step list + "Explain this" toggle that overlays formula callouts directly on canvas elements); right dock defaults to a single "Concept" panel instead of raw Properties; Engineering Dashboard cards include plain-language captions beneath each number (e.g., "This is the highest bending force in the beam").

### 19.3 Beam Inspector Overlay
- Invoked by click-and-hold or dedicated cursor mode; renders as a floating glass-panel card anchored near the clicked point with a connecting leader line to the exact coordinate.
- Card contents, top to bottom: coordinate (x = … , unit), Moment value + mini formula, Shear value + mini formula, Deflection, Slope/Rotation, Stress (top/bottom fiber), Safety Factor, small "View full derivation" expandable link.
- Card follows the point if the model changes while pinned; can be "pinned" (click a pin icon) to persist as a permanent annotation.

### 19.4 Playback Mode
- Full-screen, dark-canvas by default (to make animated stress/color mapping pop) with a lighter theme option.
- Bottom transport bar: Play/Pause, scrub timeline with labeled chapter markers (Loads Applied → Reactions Solved → SFD → BMD → Deflection → Stress → Summary), speed selector (0.5x/1x/2x/4x), frame-step buttons, Exit button top-right.
- Summary card appears at the end as an overlay: KPI recap + "Export Report" + "Replay" + "Exit to Workspace" actions.

### 19.5 Report Builder
- Left: scrollable live preview of the paginated report (accurate to export).
- Right: section toggle checklist (Project Info, Beam Drawing, Loads, Reactions, SFD, BMD, Stress, Deflection, Material, Section, Equations, Summary, Recommendations) + branding controls (logo upload, color accent, engineer/PE details, signature block).
- Top: format selector (PDF/PNG/SVG/CSV/JSON) + Export button.

---

## 20. Component Library

Core reusable components (see CLAUDE.md for implementation-level rules):

- `BeamCanvasSurface` — the infinite-canvas renderer host.
- `SupportGlyph` (variants: Pin, Roller, Fixed, Guided, Spring, ElasticFoundationSegment) — draggable, snapping, animatable.
- `LoadGlyph` (variants: PointLoad, DistributedLoad, PartialUDL, UVL, TriangularLoad, TrapezoidalLoad, AppliedMoment, TemperatureLoad, SettlementMarker, MovingLoadToken, DynamicLoadToken, CustomLoadGlyph) — draggable, editable inline, color-coded by type.
- `DiagramChart` (variants: SFD, BMD, DeflectionCurve, SlopeCurve, StressField) — live-morphing chart component with shared time/x-axis synchronization.
- `KPICard` — animated numeric readout with label, trend indicator, and safety-state color coding.
- `InspectorCard` — floating derivation/inspection panel.
- `PropertiesPanel` — context-sensitive form/editor, schema-driven from the selected entity type.
- `MaterialPicker`, `SectionPicker` — searchable, previewable pickers with live property computation.
- `PlaybackTransportBar` — shared transport control component reused across Playback Mode and any future animated timeline feature.
- `AIAssistantPanel` — chat-style panel with model-context awareness and inline "apply suggestion" actions.
- `CommentPin` / `AnnotationThread` — collaboration primitives anchored to canvas coordinates.
- `ReportSectionBlock` — composable report section renderer shared between in-app preview and export pipeline (same component tree renders to PDF via a headless render path).
- `CommandPalette` — global fuzzy-search action launcher (⌘K / Ctrl+K).
- `ToastNotification`, `InlineBanner`, `ModalDialog`, `ConfirmationSheet` — standard feedback primitives.

---

## 21. Accessibility Requirements

- WCAG 2.2 AA compliance minimum across all core (non-canvas) UI; canvas content must provide an accessible data-table alternative view for all diagrams (SFD/BMD/Deflection values at defined stations) for screen-reader users.
- Full keyboard operability: every draggable canvas object must have an equivalent keyboard-driven edit path (select object → arrow keys nudge position → Enter opens precise numeric input).
- Color must never be the sole carrier of meaning: tension/compression, safe/unsafe, and diagram sign conventions must pair color with icon, pattern, or label.
- Colorblind-friendly palette mode (deuteranopia/protanopia/tritanopia-safe) selectable in Account Settings, applied platform-wide including diagrams and stress heatmaps.
- High-contrast mode: alternate theme meeting WCAG AAA contrast ratios for text and UI chrome.
- Reduced-motion mode: disables/minimizes non-essential animation (Playback Mode remains available but defaults to discrete step transitions rather than continuous motion) per `prefers-reduced-motion` and an explicit in-app toggle.
- All interactive elements must have visible focus states and accessible names (ARIA labels) including canvas glyphs exposed via an accessible object model.
- Text resizing up to 200% must not break layout or truncate critical data.
- Captions/transcripts required for Voice Narration feature.

---

## 22. Error States

- **Statically unstable model:** Canvas shows the beam with a distinct "unstable" visual treatment (dashed outline, warning color); Dashboard replaces KPIs with a specific diagnostic message (e.g., "This beam has only 1 support providing vertical restraint — add at least one more restraint to solve.").
- **Solver non-convergence (indeterminate edge cases):** Specific message naming the likely cause (e.g., ill-conditioned stiffness matrix from near-zero span segment) with a suggested fix action.
- **Invalid input (e.g., negative section dimension):** Inline field-level validation with a specific message and the field highlighted; global recompute is paused (last-valid state remains displayed, dimmed) until corrected.
- **Import failure (DXF/DWG/IFC):** Explicit per-entity error report listing which geometry could/could not be imported, never a silent partial import.
- **Network/save failure:** Non-blocking toast with explicit "retry" action; local draft state preserved and never lost, with a visible "unsaved — working offline" indicator.
- **AI assistant failure/uncertainty:** AI must explicitly state when it is not confident or when a request is ambiguous, and must never silently apply a guessed mutation without confirmation.
- **Export failure:** Explicit error with the specific format/section that failed; partial exports are never silently presented as complete.

---

## 23. Empty States

- **Blank canvas (new project):** Friendly illustrated prompt: "Start by choosing a beam type, or describe your beam to the AI assistant," with quick-start template chips (Simply Supported, Cantilever, Continuous...).
- **No projects yet (Dashboard):** Illustrated empty state with "Create your first project" and "Explore a Learning Path" as dual CTAs.
- **No comments yet:** Subtle placeholder in the collaboration panel inviting the first annotation.
- **No results yet (Research Dashboard, before first sweep run):** Placeholder chart skeleton with "Configure your first parametric study" CTA.
- **Diagram panel with no loads applied:** Diagrams show a flat zero-line with a caption: "Add a load to see this diagram come alive," rather than a blank void.

---

## 24. Notifications

- **In-app toasts:** transient, non-blocking (save confirmations, minor warnings, AI suggestion applied).
- **Inline banners:** persistent until dismissed or resolved (statically unstable model, unresolved comment thread, pending approval).
- **Collaboration notifications:** new comment, comment resolved, approval state change, mention (@engineer) — delivered in-app and optionally via email/digest per user preference.
- **System notifications:** export complete (especially for large PDF renders that may take a few seconds), scheduled autosave conflict requiring manual merge resolution.
- All notifications must be individually configurable (frequency, channel) in Account Settings; no dark patterns (no notification may be un-disable-able except critical security notices).

---

## 25. Keyboard Shortcuts

| Action | Shortcut |
|---|---|
| Command palette | Ctrl/Cmd + K |
| Undo / Redo | Ctrl/Cmd + Z / Shift+Ctrl/Cmd + Z |
| Save | Ctrl/Cmd + S |
| Select tool | V |
| Pan tool | H (or spacebar-hold) |
| Add Point Load | L |
| Add Distributed Load | Shift + L |
| Add Support | S |
| Add Hinge | G |
| Zoom in / out | Ctrl/Cmd + "+" / "-" |
| Fit to view | Shift + 1 |
| Toggle Diagram Panel | D |
| Toggle AI Assistant | A (or Ctrl/Cmd + J) |
| Run Analyze / Playback | Ctrl/Cmd + Enter |
| Step frame forward/back (in Playback) | Right / Left arrow |
| Play/Pause (in Playback) | Spacebar |
| Toggle Learn/Professional Mode | Ctrl/Cmd + M |
| Delete selected entity | Delete / Backspace |
| Duplicate selected entity | Ctrl/Cmd + D |
| Nudge selected entity | Arrow keys (Shift = large step) |
| Open Beam Inspector at selection | I |
| Export Report | Ctrl/Cmd + E |

All shortcuts must be re-mappable in Account Settings and must be discoverable via the Command Palette (which lists the bound shortcut next to every action).

---

## 26. Mouse Interactions

- **Click:** select entity; single click on empty canvas deselects.
- **Click + drag on a support/load glyph:** reposition with live snap guides and live recompute preview (ghost trail optional at low opacity showing prior position during drag).
- **Click + drag on a resize handle (distributed load extent, section dimension):** resize with numeric tooltip following the cursor.
- **Right-click:** context menu (Edit, Duplicate, Delete, Convert Load Type, Pin Inspector, Add Comment).
- **Scroll wheel:** zoom, centered on cursor position.
- **Middle-click drag (or Space+drag):** pan.
- **Hover:** tooltip after 400ms dwell; in Learn Mode, hover also triggers formula/explanation overlays.
- **Double-click on a numeric value anywhere (KPI card, Inspector, diagram axis label):** opens precise numeric input field.
- **Drag-select (marquee) on empty canvas:** multi-select all enclosed entities.
- **Shift+click:** add/remove from multi-selection.

---

## 27. Touch Support

- Tablet-first touch support (iPad-class devices) as a secondary supported form factor (desktop-first, per Section "Tech Recommendations"/UI Philosophy).
- Single-finger drag: reposition selected entity (equivalent to mouse drag).
- Pinch: zoom; two-finger drag: pan.
- Tap: select; long-press: open context menu equivalent.
- Double-tap: open precise numeric input, same as double-click.
- All primary actions available via touch must also be reachable through the standard toolbar (no touch-only hidden gestures for core functionality) to preserve discoverability and accessibility.
- Playback Mode transport controls must have touch target sizes ≥ 44×44px per platform HIG guidance.

---

## 28. Performance Goals

- Real-time recompute P95 < 50ms for models ≤ 20 elements (Section 9.2); P95 < 250ms up to 100 elements (soft real-time band with a subtle "computing" affordance rather than a blocking spinner).
- Canvas and diagram rendering sustain 60 FPS during drag and Playback Mode on reference hardware (2023+ mid-tier laptop / M-series equivalent); minimum acceptable degraded floor of 30 FPS on low-end hardware with automatic quality reduction (fewer particles, simplified stress gradients) rather than dropped frames causing jank.
- Time-to-interactive for a new blank project: < 2 seconds on broadband.
- Report PDF generation for a standard report (≤ 10 pages): < 5 seconds P95.
- AI assistant first-token response latency: < 1.5 seconds P95 for explanation queries.
- Autosave debounce: local optimistic save within 500ms of a pause in editing; server sync within 3 seconds under normal connectivity.

---

## 29. Security Considerations

- All data encrypted in transit (TLS 1.3) and at rest (AES-256 or equivalent).
- Project-level access control (owner, editor, commenter, viewer) with per-share-link expiry options.
- SSO support (SAML/OIDC) for institutional/enterprise accounts.
- Least-privilege API key scopes for the Developer Platform; keys revocable and auditable.
- Plugin sandboxing: third-party plugins execute in an isolated context with no direct access to other projects' data or to the host DOM outside their declared UI surface.
- Rate limiting and abuse detection on the public API and AI assistant endpoints.
- No customer project data used to train shared/global AI models without explicit, separate opt-in consent.
- Regular third-party penetration testing prior to each major version's GA release.
- Signed digital signature blocks in reports must use a verifiable, tamper-evident mechanism (e.g., cryptographic hash embedded in the PDF metadata, independently checkable).

---

## 30. Scalability

- Solver services must scale horizontally and be stateless per-request (model in, results out) to support concurrent Research Mode parametric sweeps (potentially hundreds of solves per sweep).
- Real-time collaboration (comments, multi-user viewing) must scale via a pub/sub presence layer independent of the core solver path.
- Report generation must be offloadable to background workers for large/complex reports so it never blocks the interactive session.
- Storage layer must support versioned, incremental project history without linear growth in load time as revision count increases (e.g., snapshot + delta compaction strategy).
- The plugin marketplace and scripting console must be isolated (separate execution tier) so that a runaway user script cannot degrade the shared solver infrastructure.

---

## 31. Future Expansion

V1 (Beam Analysis) is explicitly the foundation for the modules enumerated in Section 60 (Future Modules). Every core abstraction — the element/entity model, the solver provider interface, the canvas rendering pipeline, the report component tree, the plugin architecture — must be designed against the full future scope, not just beams. See CLAUDE.md → "Future Expandability" and "Rules for adding new engineering modules" for the concrete engineering contract that operationalizes this section.

---

## 32. Risks

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Real-time recompute cannot hit performance targets for larger continuous/Gerber beams | High | Medium | Early performance prototyping of the indeterminate solver; adaptive precision (coarse live preview + exact settle-down); Section 28 soft real-time band. |
| Numerical results diverge from professional expectations, damaging trust | Critical | Medium | Rigorous validation suite (Section 37) benchmarked against hand calculations and commercial software before GA; independent PE review of solver methodology. |
| Educational and professional user needs pull UI in conflicting directions | Medium | High | Shared core with mode-specific presentation layers (Learn/Professional) rather than a compromise single UI; user testing per persona. |
| AI assistant hallucinates incorrect engineering explanations, causing harm | Critical | Medium | AI answers must be grounded in solver-computed values (retrieval over generation for numeric facts), never freely generated numbers; explicit confidence disclosure; human confirmation before any model mutation. |
| Scope creep from the very large future-module roadmap delays V1 | High | High | Strict V1 scope gate (this document); future modules explicitly deferred with architecture-only guardrails, not feature implementation. |
| Plugin/scripting surface introduces security or stability issues | Medium | Medium | Sandboxed execution tier, reviewed marketplace submission process, rate/resource limits. |
| Import/export fidelity (DXF/DWG/IFC) proves harder than estimated | Medium | Medium | Beta-flag risky import paths at launch; prioritize DXF/SVG which are lower risk, defer DWG/IFC depth. |
| Over-reliance on animation harms accessibility/performance on low-end devices | Medium | Medium | Reduced-motion mode, adaptive quality scaling, WCAG compliance gate before GA. |

---

## 33. Assumptions

- Users have modern evergreen browsers; no support required for Internet Explorer or legacy Edge.
- V1 targets Imperial and SI unit systems only (other regional systems deferred).
- V1 code-checking references common standards (e.g., AISC for steel, ACI for concrete) at a preliminary/advisory level only — Beamworks V1 is not positioned as a certified code-compliance tool requiring stamped liability transfer; this positioning may evolve in later versions with appropriate legal/engineering sign-off.
- Cloud sync assumes persistent internet connectivity for full collaboration features; offline-first local editing is supported but real-time multi-user presence requires connectivity.
- Initial GA scope excludes moving loads' full dynamic time-history and true dynamic loads (flagged "future" per the source specification) — V1 may include simplified/static-equivalent placeholders only.
- AI features assume access to a capable underlying language model API with acceptable latency and cost characteristics; AI feature depth may be phased if constraints emerge.

---

## 34. Milestones

- **M0 — Foundations (Weeks 1–6):** Solver core (determinate + indeterminate beam solving), data model schema, canvas rendering skeleton, CI/CD pipeline, validation suite scaffolding.
- **M1 — Core Modeling (Weeks 7–12):** All beam types, all support types, all load types functional with live recompute; Properties Panel; undo/redo.
- **M2 — Visualization (Weeks 13–18):** SFD/BMD/Deflection/Stress diagrams live-animated; 2D + pseudo-3D beam rendering; visualization mode switching.
- **M3 — Playback Mode (Weeks 19–22):** Full animated Engineering Playback sequence with transport controls.
- **M4 — Education Layer (Weeks 23–28):** Learn Mode, Formula Explorer, Step-by-Step Solver, Practice/Challenge/Exam Mode, Random Problem Generator.
- **M5 — AI Layer (Weeks 25–30, parallel to M4):** AI Beam Builder, AI Tutor, AI Reviewer, AI Report Writer.
- **M6 — Reporting & Collaboration (Weeks 29–34):** Report Builder/export, comments/annotations, approval workflow, revision history.
- **M7 — Project Management & Interop (Weeks 33–38):** Projects/templates/autosave/cloud sync, DXF/SVG import-export (beta DWG/IFC).
- **M8 — Developer Platform (Weeks 37–42):** REST API, Python scripting console, plugin architecture (alpha marketplace).
- **M9 — Hardening & Launch (Weeks 40–46):** Accessibility audit, performance tuning, security pen-test, validation suite sign-off, GA launch.

*(Timeline illustrative; engineering leadership to convert into sprint-level planning.)*

---

## 35. Roadmap

- **V1.0 — Beam Analysis** (this document's primary scope): full beam modeling, live analysis, Playback Mode, Learn Mode, baseline AI, reporting, projects, DXF/SVG interop, developer API alpha.
- **V1.x — Beam Analysis maturity:** additional beam code-check libraries, expanded material/section libraries, mobile companion viewer, plugin marketplace GA.
- **V2 — Frame Analysis:** 2D frames, extension of the solver to matrix stiffness method for frame elements, extension of canvas to multi-member topology.
- **V3 — Truss Analysis:** pin-jointed truss solving (method of joints/sections), reusing the frame-era stiffness solver core.
- **V4 — 3D Frames & Column/Footing Design:** 3D extension of the frame solver, column interaction diagrams, footing design module.
- **V5 — Slab Design, Retaining Walls, Steel/RC Design Modules:** design-code-driven modules building atop the analysis core.
- **V6 — Bridge Analysis, Prestressed Concrete, Structural Dynamics:** moving loads (full dynamic), modal analysis, response spectrum/time-history.
- **V7 — Finite Element Mesh & Continuum Analysis:** generalized FEM core, enabling slabs-as-plates, arbitrary 2D/3D continuum problems.
- **V8 — Seismic/Wind Analysis, Soil-Structure Interaction, BIM Collaboration:** advanced loading domains and full IFC-based BIM round-tripping.
- **V9 — Cloud Compute, VR/AR, Digital Twin:** large-scale cloud solve farms for optimization/ML-assisted design, immersive visualization, live sensor-linked digital twins of built structures.

---

## 36. Version Planning

- Semantic versioning at the product level (MAJOR.MINOR.PATCH) mapped to the roadmap above (MAJOR = new analysis domain/module, MINOR = feature within a domain, PATCH = fixes/perf/content).
- Solver numerical-method versioning is tracked independently (see CLAUDE.md → Versioning Strategy) so that a MINOR product release can never silently change a MAJOR numerical result without an explicit "solver version" bump and migration notice, preserving NFR-10 (Determinism).
- Feature flags gate beta/experimental capabilities (DWG/IFC import, plugin marketplace, dynamic/moving loads) independent of the version number, allowing controlled rollout.

---

## 37. Acceptance Criteria

V1 GA is accepted when all of the following hold:

1. All beam types in Section 38 can be created, edited, and solved with correct reactions/SFD/BMD/deflection/stress against a validation suite of ≥ 25 benchmark cases (hand-calculated and/or cross-checked against at least one established commercial tool), all within 0.1% relative numerical error.
2. All support types (Section 39) and load types (Section 40) are implemented with drag, edit, animate, and delete support, and combine correctly under superposition.
3. Live recompute meets the performance targets in Section 28 across the validation suite of model sizes.
4. Engineering Playback Mode runs end-to-end (loads → reactions → SFD → BMD → deflection → stress → summary) with full transport controls for every beam type in the validation suite.
5. Learn Mode and Professional Mode both function against the same underlying model with no divergent numerical results.
6. AI Beam Builder correctly constructs at least the benchmark natural-language modeling prompts defined in the AI test set (Section 50) with ≥ 85% first-attempt success without requiring correction.
7. Report export succeeds in all five formats (PDF/PNG/SVG/CSV/JSON) for every beam type in the validation suite, matching on-screen data exactly.
8. WCAG 2.2 AA audit passes with zero critical/blocker findings.
9. Security review (encryption, access control, plugin sandboxing) passes with zero critical/high findings.
10. Crash-free session rate ≥ 99.5% across the beta cohort in the final two weeks before GA.
11. REST API and Python scripting console each demonstrate at least 3 end-to-end reference workflows in documentation with passing automated tests.
12. DXF and SVG import/export round-trip a reference set of test files without geometric deviation beyond a defined tolerance (e.g., 0.1% of span length).

---

## 38. Domain Specification — Beam Types

Each beam type below defines: description, degrees of static indeterminacy, canonical use cases, solver approach, and UX considerations.

### 38.1 Simply Supported Beam
- One pin (or equivalent) + one roller, both providing vertical restraint, statically determinate.
- Solver: direct equilibrium (ΣF=0, ΣM=0).
- UX: canonical "first beam" in Learn Mode; supports must visually distinguish pin (2 restraint arrows) vs roller (1 restraint arrow + rolling wheel glyph).

### 38.2 Cantilever Beam
- Single fixed support at one end, free at the other.
- Solver: direct equilibrium from the fixed end; moment/shear diagrams start at zero at the free end.
- UX: fixed support glyph must clearly show both force and moment restraint (hatch pattern convention).

### 38.3 Fixed-Fixed Beam
- Fixed supports at both ends; statically indeterminate to the 3rd degree (in 2D beam bending).
- Solver: stiffness method or moment-distribution/three-moment equation, cross-validated.
- UX: default educational callout explaining indeterminacy and why simple statics alone cannot solve it.

### 38.4 Propped Cantilever Beam
- One fixed support + one simple support (pin or roller); indeterminate to the 1st degree.
- Solver: force method (redundant reaction at the prop) or stiffness method.

### 38.5 Overhanging Beam
- Simply supported span with one or both ends extending beyond the supports (overhang).
- Solver: standard determinate equilibrium; special attention to sign convention discontinuities at support locations and moment reversal over the overhang.
- UX: canvas must clearly render the overhang region distinctly (e.g., subtle shading) since it's a common source of student confusion.

### 38.6 Continuous Beam
- Beam spanning 3+ supports across multiple spans; indeterminate (degree = number of redundant supports).
- Solver: three-moment equation or stiffness method, generalized for arbitrary span count.
- UX: span dividers must be clearly marked; per-span load assignment must remain intuitive as span count grows; Properties Panel must support "add span" as a first-class action.

### 38.7 Gerber Beam
- Continuous beam with internal hinges introduced to restore determinacy (or to model construction joints).
- Solver: must decompose the beam into determinate sub-spans connected at hinges, solving sequentially/recursively; hinge transmits shear but not moment.
- UX: hinge glyph distinct from support glyphs (small circle marker on the beam axis); dragging a hinge must be constrained to valid positions and re-validate determinacy live.

### 38.8 Future Beam Types
- The beam-type registry must be an open, pluggable enum/interface (not a hardcoded switch) so that additional configurations (e.g., beams with elastic connections, beams with sliding joints) can be added as new entries without touching the solver dispatch core. See CLAUDE.md → Plugin Architecture.

---

## 39. Domain Specification — Supports

| Support | Restrains | DOF Released | Visual Glyph | Notes |
|---|---|---|---|---|
| Pin | Vertical + Horizontal translation | Rotation free | Triangle with pivot dot | Classic hinge support |
| Roller | Vertical translation (perpendicular to rolling surface) | Horizontal + Rotation free | Triangle on rollers/circles | Rolling direction must be configurable (default vertical restraint) |
| Fixed | Vertical + Horizontal translation + Rotation | None | Hatched wall/ground symbol | Full restraint |
| Guided | Rotation + one translation (perpendicular to guide) | One translation free | Bracket/slot symbol | Useful for symmetry boundary conditions |
| Spring | Partial restraint proportional to stiffness k | Elastic, not rigid | Coil/zigzag symbol with stiffness label | Requires stiffness input (force/length or moment/radian for rotational springs) |
| Elastic Foundation | Distributed elastic restraint along a beam segment | Continuous (Winkler foundation) | Hatched/dotted band beneath the segment with modulus label | Modeled as continuous spring bed (modulus k per unit length); required for Research Features |

**Cross-cutting requirements:**
- All supports must be draggable along the beam axis (snap to integer/round positions, snap to load positions, snap to existing dimension lines) with a live "ghost" preview of resulting reaction changes during drag.
- All supports must animate: on creation (scale/fade in), on reaction solve (a subtle directional pulse/glow proportional to reaction magnitude during Playback Mode), and on deletion (fade/scale out).
- Snapping must be "intelligent": snap targets include grid lines, other entities' x-positions, dimension guides, and beam endpoints/span boundaries, with visual snap-guide lines shown during drag (similar to Figma's smart guides).
- Removing a support that renders the beam unstable must trigger the Section 22 error state immediately, not after a delayed recompute.

---

## 40. Domain Specification — Load Types

Every load type must support: **Magnitude, Direction, Position, Animation, Dragging, Editing, Deleting, Color coding, Live updates**, per the source specification. Each is detailed below.

### 40.1 Point Load
- A concentrated force at a single x-position, with direction (typically vertical, but must support arbitrary angle for generalization toward frame analysis).
- Drag handle: the load's application point; magnitude editable via inline numeric field appearing on selection.
- Color: default red/orange for downward loads, distinguishable hue for upward loads.

### 40.2 Distributed Load (full-span UDL)
- Uniform magnitude across the entire beam span.
- Rendered as a uniform band of arrows/hatching; editing magnitude scales all arrows uniformly with an animated transition.

### 40.3 Partial UDL
- Uniform magnitude over a sub-range [x1, x2] of the span.
- Two drag handles (start/end) plus a body-drag to move the whole load without resizing; resize handles show live length readout.

### 40.4 UVL (Uniformly Varying Load)
- Linearly varying magnitude from w1 at x1 to w2 at x2 (general trapezoidal is the superset; UVL typically implies one end at zero — see Triangular below as the canonical zero-end case).
- Rendered as a wedge of arrows with linearly varying length; both endpoint magnitudes independently editable.

### 40.5 Triangular Load
- Special case of UVL with magnitude zero at one end, peak at the other (or peak at an interior point forming two triangles, configurable).
- UX: a single drag handle for peak magnitude, endpoint handles for extent.

### 40.6 Trapezoidal Load
- General case: w1 at x1, w2 at x2, both independently non-zero.
- UX: four control points (two extent, two magnitude) each independently draggable with snap-to-equal (shift-drag) shortcut to quickly create a UDL from a trapezoid.

### 40.7 Applied Moment (Concentrated Moment)
- A point moment (couple) applied at a location, direction (CW/CCW) toggleable.
- Rendered as a curved arrow glyph; drag to reposition, click to toggle direction, inline field for magnitude.

### 40.8 Temperature Load
- Represents a thermal gradient/uniform temperature change across the section, inducing internal stress/deformation independent of mechanical load.
- Requires material thermal coefficient (Section 41) to compute effect; UX includes a distinct thermometer-style glyph and a dedicated "Temperature Mode" visualization (Section 47).

### 40.9 Settlement (Support Settlement)
- A prescribed displacement (not a force) applied at a support, used to compute induced reactions/moments in indeterminate beams.
- UX: editable via the support's Properties Panel (a "settlement" field) rather than a separate canvas glyph, since it's a support-associated boundary condition; must still animate distinctly (the support glyph visibly displaces during Playback).

### 40.10 Moving Load
- A load (or set of loads, e.g., an axle group) that traverses the span; V1 may implement as a static-position slider representing "load at position x" with an envelope mode showing max moment/shear as a function of load position (influence-line-like behavior), with full continuous-time animation as a stretch goal.
- UX: dedicated "scrub" control distinct from Playback Mode's solve-sequence scrubber — this one scrubs load position, not solve-time.

### 40.11 Dynamic Load (Future)
- Time-varying load (impact, harmonic, seismic-equivalent) requiring a dynamic/modal solver; explicitly out of scope for V1 computation but the data schema must reserve a `dynamicLoad` entity type and UI affordance (visible but disabled/"Coming soon" in the load type picker) so the roadmap item is visible to users and the schema is stable ahead of implementation.

### 40.12 Custom Load
- User- or plugin-defined load described by an arbitrary function w(x) (piecewise or expression-based), enabling research/edge-case modeling.
- UX: a lightweight function editor (expression input with live preview plot) in the Properties Panel; solver must support numerical integration of arbitrary w(x) for equivalent nodal actions where closed-form superposition isn't applicable.

**Cross-cutting load requirements:**
- Every load type's color coding must be consistent and documented in a legend accessible from the canvas (small "?" legend toggle), and must remain distinguishable under the colorblind-safe palette mode.
- All load edits must trigger recompute within the real-time performance envelope; larger recomputes (Custom Load numerical integration) may fall into the "soft real-time" band (Section 28) with a subtle computing indicator rather than a spinner that blocks interaction.
- Deleting a load must animate a fade/collapse and immediately update all dependent diagrams.

---

## 41. Domain Specification — Materials

### 41.1 Built-in Materials
- **Steel** (multiple grades selectable, e.g., ASTM A992, A36).
- **Concrete** (normal weight, multiple strength classes, e.g., f'c = 3000/4000/5000 psi or MPa equivalents).
- **Timber** (species/grade selectable, e.g., Douglas Fir-Larch No.1).
- **Aluminum** (common alloy/temper options, e.g., 6061-T6).
- **Composite** — a material representing a computed effective section combining two or more base materials (e.g., steel-concrete composite beam), requiring transformed-section calculations.
- **Custom Materials** — fully user-defined property set.

### 41.2 Required Properties per Material
- Young's Modulus (E)
- Density (ρ)
- Poisson's Ratio (ν)
- Yield Strength (Fy) (or characteristic strength for concrete/timber, appropriately labeled per material class)
- Allowable Stress (Fallow), derived by default from a configurable safety factor / code-based reduction, but independently overridable
- Thermal Coefficient (α), used by Temperature Load calculations

### 41.3 UX Considerations
- Material Picker must show a live preview of derived section behavior (e.g., a mini stress-strain sketch) and must clearly flag when a Custom Material's values fall outside typical engineering ranges (soft warning, not a hard block, to preserve research flexibility).
- Switching a beam's material must animate a "material swap" transition (subtle color-shift wash across the beam glyph) and must trigger full recompute since stiffness (EI) changes propagate through deflection and stress results.
- Per-segment material assignment (composite/variable-material beams) must be supported for Research Mode without requiring a full "Frame" model — this is explicitly a V1 requirement to support Research Features (Section 56), not deferred to V2.

---

## 42. Domain Specification — Section Library

### 42.1 Built-in Sections
- Rectangle (b × h)
- Circle (diameter or radius)
- Tube / Pipe (outer diameter, wall thickness)
- I-Section (standard library lookup, e.g., AISC W-shapes, plus fully parametric custom I dimensions)
- T-Section
- L-Section (Angle)
- Channel (C-shape)
- Box (rectangular hollow section)
- Custom Sections — arbitrary polygon or imported DXF profile

### 42.2 Automatically Computed Properties
For every section (built-in or custom), the system must automatically compute and display:
- Area (A)
- Centroid location (relative to a defined reference point)
- Moment of Inertia (Ix, Iy, and Ixy where relevant for unsymmetric sections)
- Section Modulus (Sx, Sy — both top/bottom fiber where the section is unsymmetric about the bending axis)
- Radius of Gyration (rx, ry)
- Polar Moment of Inertia (J), noting that torsion is a future-module concern but the property should be computed and displayed for completeness/education

### 42.3 UX Considerations
- Section Picker shows a live cross-section preview with computed properties updating instantly as parametric dimensions are adjusted (slider + numeric field for each dimension).
- Custom polygon sections use a point-based editor (click to place vertices, drag to adjust) with live property recomputation using standard polygon-integration formulas; must validate for simple (non-self-intersecting) polygons.
- Section changes must animate the beam's rendered cross-section (in 3D/pseudo-3D views) with a smooth morph rather than an abrupt swap.
- Imported DXF profiles (for Custom Sections) route through the same import pipeline as full-model DXF import (Section 55) but scoped to a single closed profile.

---

## 43. Interactive Canvas Specification

The canvas is the heart of the application per the source specification, and every capability below is a hard requirement for V1, architected to generalize to multi-element models in later versions.

- **Zoom:** continuous scroll-wheel/pinch zoom, centered on cursor/pinch-midpoint; discrete zoom-to-fit and zoom-to-selection shortcuts; zoom percentage always visible and directly editable (click to type an exact zoom level).
- **Pan:** space+drag, middle-mouse-drag, or two-finger touch drag; infinite canvas bounds (no hard edge), with a "return to origin/fit" affordance if the user pans far away.
- **Drag:** all entities (supports, loads, hinges, dimension handles, comment pins) are draggable per their type-specific constraints (Sections 39–40).
- **Resize:** applicable to extent-based loads (partial UDL, trapezoidal, etc.) via edge handles.
- **Rotate:** reserved primarily for future frame/2D-orientation needs, but load direction (angle) must be rotatable via a small angle-handle for generalized point loads, even in V1's 1D beam context, to keep the data model frame-ready.
- **Context Menus:** right-click (or long-press) menus for every entity type, scoped to valid actions for that entity.
- **Selection / Multi-selection:** click, shift-click, and marquee-drag selection; multi-selected entities show a shared bounding box with group-drag support where physically meaningful (e.g., moving two loads together while preserving their relative offset).
- **Snap:** grid snap (configurable grid size), entity-to-entity snap (align to existing load/support x-positions), and dimension-guide snap (Figma-style smart guides with measurement callouts).
- **Grid:** togglable visual grid, with snap-to-grid independently togglable from grid visibility.
- **Undo / Redo:** infinite undo stack for the session; persisted across reloads for the same project (not just in-memory), respecting NFR-10 determinism (undo must restore an identical solved state).
- **Infinite Canvas:** no artificial pan boundary; long/large beams remain fully navigable.
- **Layer System:** logical layers (Geometry, Loads, Dimensions, Comments, Diagram Overlays) independently togglable for visibility, primarily to reduce visual clutter in dense professional models; layers are a visibility concern only in V1 (no z-ordering complexity needed until multi-member Frame Analysis).
- **Object Inspector:** see Section 51 (Beam Inspector) for the click-to-inspect experience layered on top of basic selection.
- **Properties Panel:** schema-driven, context-sensitive editor reflecting the currently selected entity type (see Component Library, Section 20).

---

## 44. Live Structural Analysis Specification

On every model mutation (add/move/edit/delete of any support, load, material, or section), the system must recompute, without a manual "Analyze" trigger, the following results across the full span at a resolution sufficient for smooth diagram rendering (minimum station density: adaptive, denser near discontinuities/point loads/support locations, per CLAUDE.md → Structural Solver Standards):

- Support Reactions (force and moment components per support)
- Shear Force Diagram (V(x))
- Bending Moment Diagram (M(x))
- Deflection (v(x))
- Stress (bending and shear, top/bottom fiber and neutral-axis-relative where relevant)
- Slope / Rotation (θ(x) = dv/dx)
- Safety Factor (ratio of allowable to actual peak stress, or code-defined equivalent)
- Critical Locations (x-positions of maxima/minima for each quantity, auto-highlighted on diagrams and callable from the Engineering Dashboard KPI cards)

All of the above must animate on update — i.e., when a value changes, the diagram must visibly morph from its old shape to its new shape over a short, consistent transition duration (per CLAUDE.md → Animation Guidelines), never snap instantaneously, so the user's mental model of cause-and-effect is reinforced.

**Real-time envelope:** Section 28 defines the hard performance targets; any model exceeding the "hard real-time" band automatically falls back to the documented "soft real-time" indicator without ever silently failing to update.

---

## 45. Engineering Playback Mode

The flagship feature. On pressing Analyze:

1. **Loads appear** — each load glyph animates into existence in sequence (staggered, ~150ms apart) rather than all at once, to narratively establish "here is what we're applying."
2. **Supports react** — a subtle directional pulse/highlight travels through each support glyph.
3. **Reaction equations appear** — the actual ΣF/ΣM equations used to solve for that specific model populate as animated text (numbers counting up to their final value), not generic placeholder equations.
4. **Shear diagram grows** — the SFD draws left-to-right (a leading-edge "pen" animation) rather than fading in all at once.
5. **Moment diagram forms** — similarly draws left-to-right, ideally shown as the mathematical integral of the SFD forming beneath it (visually reinforcing the calculus relationship).
6. **Beam bends** — the beam glyph itself visibly deforms into its true deflected shape (exaggerated by a configurable scale factor for visibility, always labeled as "deflection exaggerated Nx" to avoid misleading the viewer).
7. **Stress spreads** — a color gradient animates across the beam's length and cross-section representing the bending/shear stress field.
8. **Critical sections glow** — the specific x-locations of maximum moment, shear, deflection, and stress pulse/glow with a callout label.
9. **Summary appears** — a final KPI summary card overlays with Export/Replay/Exit actions.

**Controls (available at every stage):**
- Play / Pause
- Scrub (drag along a labeled chapter timeline: Loads → Reactions → SFD → BMD → Deflection → Stress → Summary)
- Replay (restart from stage 1)
- Speed Control (0.5x / 1x / 2x / 4x)
- Frame Stepping (single-frame forward/back, for detailed inspection or lecture use)

Playback Mode must be able to run for every valid model in the validation suite, must respect the reduced-motion accessibility mode (substituting discrete stage-jumps for continuous motion), and must be screenshot/recordable (an in-app "export as video/GIF" stretch capability is noted for future consideration but not required for V1 GA).

---

## 46. Interactive Animation System

Cross-cutting animation capabilities required throughout the product (not limited to Playback Mode):

- Real-time deformation (beam glyph reflects current deflection shape live, at all times, not just during Playback).
- Smooth graph morphing (diagrams interpolate between old and new states on every recompute).
- Animated load placement (drag-to-place with a satisfying "settle" animation on release/snap).
- Reaction growth (reaction arrows/values animate toward their new magnitude rather than jump-cutting).
- Stress heatmaps (continuous color-gradient animation, not discrete color bands, for perceptual smoothness).
- Cross-section stress animation (a zoomed cross-section view showing the stress distribution across the section depth, animating in sync with the main beam view).
- Failure animation (a distinct, clearly-labeled "what if this failed" visualization triggered explicitly by the user — e.g., a "Show failure mode" toggle — never shown unprompted or in a way that could be mistaken for the actual current safety state).
- Material switching animation (color/texture wash transition on material change).
- Timeline animation (shared scrubbing infrastructure reused between Playback Mode and the Moving Load position scrubber).
- Playback controls (shared `PlaybackTransportBar` component, Section 20).
- Camera animation (smooth pan/zoom transitions when the system automatically frames a region of interest, e.g., "jump to critical section").
- Presentation mode (a distraction-free full-screen mode for lecture/demo use, hiding editing chrome while preserving Playback and Inspector functionality).

**Performance target:** 60 FPS for all of the above on reference hardware (Section 28), with graceful degradation rather than dropped correctness on lower-end hardware.

---

## 47. Beam Visualization Modes

- **2D** — the default schematic elevation view; always available, always the fastest-rendering baseline.
- **Pseudo-3D** — an extruded, lightly-shaded rendering of the beam giving a sense of cross-sectional depth without full 3D camera control; a "cheap but convincing" middle ground for users who don't need full 3D navigation.
- **Full 3D** — a true 3D scene with orbit/pan/zoom camera controls, physically-shaded material rendering, and the beam's actual cross-sectional geometry extruded along its length.
- **Transparent Mode** — renders the beam material as semi-translucent to reveal internal stress/strain fields or an embedded reinforcement/composite layer.
- **Wireframe** — outline-only rendering, useful for overlaying diagrams without visual competition from solid shading.
- **Stress Mode** — color-mapped stress field across the beam length and cross-section.
- **Deflection Mode** — exaggerated deformed-shape rendering with a labeled scale factor.
- **Moment Mode** — visual emphasis on the bending moment field (e.g., a color/curvature overlay tied to M(x)).
- **Shear Mode** — visual emphasis on the shear field (e.g., a color overlay tied to V(x), potentially with shear-flow arrows in the cross-section view).
- **Temperature Mode** — visualizes the thermal gradient/expansion effect from Temperature Loads (Section 40.8).
- **Buckling Mode** — a preview/placeholder visualization mode reserved for future buckling-analysis capability (V1 may show a simplified Euler-buckling-based advisory indicator for compression members if in scope, otherwise clearly marked "Coming soon").
- **Safety Mode** — a single-glance color-coded rendering (e.g., green/yellow/red banding along the beam length) showing utilization ratio at every station.

All modes must be switchable via a single control (a segmented control or dropdown in the canvas toolbar) with an animated cross-fade/morph transition between modes, never an abrupt cut, consistent with the Interactive Animation System (Section 46).

---

## 48. Stress Visualization

- **Color maps** — a perceptually uniform, colorblind-safe default color scale (e.g., a diverging blue-white-red scale for compression/neutral/tension) with alternate palette options.
- **Heat maps** — continuous gradient stress visualization across both the beam's length and its cross-section.
- **Neutral Axis** — always explicitly rendered as a reference line/plane in both the elevation and cross-section views when in Stress Mode.
- **Compression** — visually distinct (color + optional pattern) from tension per Accessibility requirements (color must never be the sole differentiator).
- **Tension** — as above.
- **Shear Flow** — arrows or streamlines within the cross-section illustrating shear flow distribution (parabolic for rectangular sections, etc.).
- **Stress vectors** — optional vector-field overlay at user-selected stations (invoked via the Beam Inspector) showing the local stress state.
- **Animated stress evolution** — as loads/geometry change, the stress field must visibly animate/morph rather than snap, consistent with Section 46.

---

## 49. Educational Features

- **Learn Mode** — see Section 19.2; the primary educational surface, sharing the full solver/rendering core with Professional Mode.
- **Professional Mode** — the default, full-density surface for practicing engineers (Section 19.1).
- **Step-by-Step Solver** — decomposes the full solution (equilibrium equations → reactions → internal force equations by segment → diagram construction → deflection via chosen method, e.g., double integration or moment-area → stress calculation) into discrete, navigable steps with narration text and the relevant formula rendered in full (not just the final numeric substitution).
- **Formula Explorer** — a searchable, categorized reference of every formula used anywhere in the engine (equilibrium, section properties, stress, deflection methods, indeterminate-beam methods), each entry showing the general formula, a worked numeric example tied to the current model where applicable, and a short derivation/explanation.
- **Equation Tree** — a visual, expandable tree showing how a final result (e.g., peak deflection) decomposes into its contributing sub-calculations, letting a student "drill down" from result to first principles.
- **Interactive Theory** — short interactive mini-demos embedded contextually (e.g., an interactive Mohr's Circle widget when viewing combined stress states).
- **Hover explanations** — plain-language tooltips for every technical term throughout the UI, toggleable, defaulting to "on" in Learn Mode and "off" (available on demand) in Professional Mode.
- **Animated concepts** — short, focused animations illustrating core concepts (e.g., "why does a cantilever have its maximum moment at the fixed end") accessible from the Formula Explorer and Learning Paths.
- **Engineering Playback** — see Section 45; doubles as an educational device and a professional demo device.
- **Worked Examples** — a curated library of fully-solved reference problems spanning all beam types and common load configurations, each openable as a live, editable model (not just static text).
- **Practice Mode** — untimed problem practice with immediate feedback and hints.
- **Challenge Mode** — timed or scored practice with leaderboard/streak mechanics (opt-in, never anxiety-inducing by default — timers must be optional and clearly togglable).
- **Exam Mode** — a stricter, distraction-free problem-solving environment (hides hints/AI assistance, tracks time) suitable for instructor-assigned assessments; must support instructor-defined problem sets and export of student results (respecting privacy/FERPA-equivalent constraints).
- **Random Problem Generator** — generates beam problems constrained by instructor-selected parameters (beam type, load type(s), difficulty band, target learning objective) with an auto-generated, step-by-step worked solution and answer key, exportable as a problem set document.
- **AI Professor** — a specialized AI Tutor persona (see Section 50) focused on Socratic-method guidance rather than direct answers, configurable by instructors for their courses.
- **Voice Narration** — optional spoken narration accompanying Guided Lessons and Playback Mode, with captions/transcripts required for accessibility (Section 21), and adjustable playback speed.
- **Learning Paths** — structured, ordered sequences of lessons/practice building toward a learning objective (e.g., "Statically Indeterminate Beams 101"), with visible progress tracking.
- **Progress Tracking** — per-user persisted completion state, streaks, and mastery indicators surfaced on the Project Dashboard and within each Learning Path.

---

## 50. AI Features

All AI features share a single architectural requirement: **the AI always has read access to the full current model state and computed results for the active session**, and numeric facts presented by the AI must be sourced from the solver's actual computed values (retrieval), never independently generated/estimated by the language model (generation), to prevent hallucinated engineering numbers.

- **AI Beam Builder** — constructs or modifies a beam model from a structured or semi-structured description (e.g., a pasted spec sheet).
- **Natural Language Modeling** — free-text commands ("add a 5 kN/m UDL from 2m to 6m") parsed into structured model mutations, always presented as a confirmable diff before applying (FR-24).
- **AI Tutor** — Socratic/explanatory assistant for Learn Mode, adapting explanation depth to the user's demonstrated level.
- **AI Reviewer** — runs a defined rule set against a solved model and surfaces warnings (e.g., unusually low safety factor, an unsupported/free end, a load magnitude far outside typical ranges for the assigned material/section, symmetric model with asymmetric-looking results suggesting a possible input error) inline on the canvas as non-blocking annotations.
- **AI Design Suggestions** — proposes alternative sections/materials to improve a target metric (weight, cost, deflection) while maintaining an adequate safety factor, presented as selectable, comparably-previewed alternatives (never auto-applied).
- **AI Optimization** — a more automated variant of Design Suggestions integrated with the Optimization module (Section 57), able to run a constrained search and present a ranked shortlist.
- **AI Error Detection** — overlaps with AI Reviewer but focused specifically on input-validity issues (e.g., a load positioned outside the beam span due to a likely unit-entry mistake).
- **AI Report Writer** — generates a natural-language executive summary and recommendations section for the exported Report (Section 53), grounded strictly in the solved model's actual computed values.
- **AI Explanation Engine** — the underlying "explain this number" capability surfaced throughout the Inspector, KPI cards, and Formula Explorer; a single shared service rather than a feature reimplemented per surface.
- **Context-aware conversations** — the AI Assistant Panel (Section 20) maintains conversational context scoped to the active project/model, resetting appropriately on project switch, and must clearly indicate when it is referencing the current model versus general engineering knowledge.

**AI Test Set (for Acceptance Criterion 6, Section 37):** a maintained benchmark of ≥ 50 natural-language modeling prompts spanning all beam types and load types, used to measure first-attempt success rate before GA and continuously in CI thereafter.

---

## 51. Beam Inspector

- Invoked by clicking (or long-press on touch) anywhere along the beam's length, or via keyboard (`I` with a position selected).
- Displays, for the exact clicked coordinate: Coordinates (x, and unit), Moment, Shear, Stress (top/bottom fiber), Deflection, Slope/Rotation, Material (name + key properties), Section Properties (relevant computed values), Safety Factor at that station.
- Every value must have a "view derivation" affordance linking into the Step-by-Step Solver / Formula Explorer, scoped to that specific station's calculation.
- The Inspector must be pinnable (persists as an annotation on the canvas) and shareable (a pinned Inspector becomes visible to all collaborators on the shared project, distinct from a Comment but potentially convertible into one).
- The Inspector must update live if the model changes while pinned at a fixed x-coordinate (values update; if the beam span changes such that x is no longer valid, the pin must gracefully clamp or flag itself as stale with an explicit indicator).

---

## 52. Engineering Dashboard

Animated KPI cards, always visible (collapsible in Learn Mode to reduce clutter, expanded by default in Professional Mode):

- Maximum Moment (value + location)
- Maximum Shear (value + location)
- Maximum Stress (value + location, and whether tension or compression governs)
- Maximum Deflection (value + location, and as a ratio of span, e.g., L/360-style callout where a serviceability limit is configured)
- Maximum Rotation (value + location)
- Reaction Forces (per support, summarized with an expandable per-support breakdown)
- Utilization (peak actual/allowable ratio, color-coded)
- Safety Factor (headline number, color-coded green/yellow/red against configurable thresholds)
- Warnings (a dedicated card surfacing the count and top-priority item from AI Reviewer / validation warnings, expandable to the full list)

Each KPI card must animate its numeric value (counting up/down) whenever it changes due to a model edit, reinforcing the live-analysis mental model, and must support click-through to the relevant diagram/location (e.g., clicking "Maximum Moment" pans/zooms the canvas to that station and opens the Beam Inspector there).

---

## 53. Reports

### 53.1 Required Content
- Project Information (name, engineer, date, revision, code standard if applicable)
- Beam Drawing (accurate schematic matching the canvas exactly)
- Loads (full tabulated list with type, magnitude, position/extent)
- Reactions (per support, with equations shown if "show derivations" is enabled in the Report Builder)
- SFD (chart, with key values annotated)
- BMD (chart, with key values annotated)
- Stress (summary values and, optionally, the stress-mode visualization as a rendered image)
- Deflection (chart + peak value + serviceability check if configured)
- Material (properties table)
- Section (properties table)
- Equations (the governing equations used, per Formula Explorer content, included at the user's discretion)
- Summary (KPI recap, matching the Engineering Dashboard)
- Recommendations (AI Report Writer's grounded narrative summary, editable by the user before export)

### 53.2 Export Formats
- **PDF** — the primary professional deliverable; must support custom branding (logo, accent color), engineer/PE details, and a digital signature block (Section 29).
- **PNG** — single-image export of the current canvas/diagram view, for quick sharing.
- **SVG** — vector export of the canvas/diagrams, for use in external documents/presentations.
- **CSV** — tabulated numeric data (loads, reactions, station-by-station diagram values) for spreadsheet analysis.
- **JSON** — the full structured model + results, for programmatic reuse (also the format used for full project data portability, NFR-9).

### 53.3 UX
- The Report Builder (Section 19.5) must render a live, paginated, WYSIWYG-accurate preview using the same component tree as the final export (no drift between preview and output).
- Section inclusion/exclusion must be toggleable per report instance without affecting the underlying model.
- Reports must remain regenerable at any time from the current model state — a report is a view, not a divergent copy, consistent with Product Principle 3 ("One truth").

---

## 54. Project Management

- **Projects** — the top-level container for one or more beam models (V1 may scope one beam per project, or support multiple named beam models per project for comparison studies — recommend the latter for research/comparison workflows).
- **Templates** — user-savable and system-provided starting configurations (e.g., "20ft W-shape simply supported with UDL") instantiable from the Project Dashboard.
- **Autosave** — continuous local optimistic autosave with server sync (Section 28 performance targets); explicit save indicator in the top bar.
- **Recent Files** — Project Dashboard surface, sortable/searchable.
- **Cloud Sync** — cross-device project availability; conflict resolution for concurrent edits (last-write-wins with a visible diff/merge prompt for genuinely conflicting concurrent edits, never silent data loss).
- **Revision History** — a scrubbable timeline of past saved states, with named "checkpoints" (manual save-points) and automatic periodic snapshots; any revision can be previewed and restored (restoring creates a new revision rather than destructively overwriting history).
- **Digital Signatures** — see Section 29/53.2; a verifiable sign-off mechanism for licensed engineers approving a report.
- **Company Branding** — logo, color, and firm details configurable at the account/team level, defaulting into new reports.
- **Engineer Details** — name, license number, stamp image (where applicable/permitted), configurable per user profile.
- **Approval Workflow** — a defined state machine (Draft → In Review → Changes Requested → Approved → Superseded) with role-based permissions on who can transition which states.
- **Comments** — threaded, pinned to specific canvas coordinates or specific KPI/report sections; resolvable.
- **Annotations** — freestanding canvas markup (text notes, highlight regions) distinct from threaded comments, for personal or shared reference notes.
- **Collaboration** — multi-user presence (cursors/selection indicators for concurrent viewers), respecting the access-control model in Section 29.

---

## 55. CAD / BIM

### 55.1 Import
- **DXF** — full V1 support for geometry import (beam centerline, section profile extraction for Custom Sections).
- **DWG** — supported via conversion pipeline (DWG→DXF equivalent) at V1 GA behind a beta flag, given higher fidelity risk (Section 32 risk register).
- **SVG** — full V1 support, primarily for section profile import and export round-tripping.
- **PDF** — geometry extraction where feasible (vector PDFs only; raster/scanned PDFs are explicitly out of scope for geometry extraction in V1, though the pdf skill/tooling may still support viewing/annotation use cases), behind a beta flag.
- **IFC** — reserved for future BIM module (Section 60); V1 may support minimal metadata-only import (project info) with full structural round-tripping deferred to V2+.

### 55.2 Export
- **DXF** — accurate schematic export preserving real-world dimensions.
- **IFC** — deferred to future BIM module; V1 schema should reserve export hooks.
- **SVG** — accurate vector export of the canvas/diagrams (shared with Report export, Section 53.2).
- **PDF** — shared with Report export.

All import/export must round-trip a defined reference test-file set without geometric deviation beyond a documented tolerance (Acceptance Criterion 12, Section 37).

---

## 56. Research Features

- **Variable EI** — per-segment or continuously-varying Young's Modulus × Moment of Inertia along the span (tapered/non-prismatic members), requiring the solver to support piecewise or functionally-defined stiffness rather than a single constant EI.
- **Composite Beams** — transformed-section analysis combining two or more materials (Section 41.1); required in V1 per explicit product scope for Research Mode.
- **Elastic Foundation** — Winkler foundation modeling (Section 39, Elastic Foundation support type) with configurable modulus, including non-uniform (segment-varying) foundation stiffness for research use cases.
- **Experimental Data** — import of external reference data (e.g., a published benchmark solution) for overlay/comparison against the model's analytical results.
- **Sensor Data** — import of instrumented physical test data (e.g., strain gauge or LVDT deflection readings, typically CSV/time-series) for overlay against analytical predictions, supporting validation/calibration workflows.
- **Sensitivity Analysis** — automated sweep of a chosen input parameter (e.g., foundation modulus, section depth, material E) across a defined range, producing a chart of a chosen output metric (e.g., peak deflection) versus the swept parameter.
- **Optimization** — see Section 57; research use extends this into open-ended design-space exploration rather than only constrained "pick a section" optimization.
- **Parametric Studies** — generalized multi-parameter sweep (beyond single-variable Sensitivity Analysis), producing a results matrix/heatmap across two or more varied inputs.
- **Research Dashboard** — the dedicated screen (Section 17) surfacing sweep configuration, results visualization, and benchmark validation status.
- **Benchmark Validation** — a user-facing (and internally CI-enforced) capability to compare the current model's results against a known-correct reference solution, reporting relative error — this is both a research feature and the mechanism underlying the platform's own validation suite (Section 37).

---

## 57. Optimization

- Optimize for: **Weight, Cost, Safety, Embodied Carbon, Deflection, Material Usage** — user-selectable objective (single-objective in V1; multi-objective/Pareto-front exploration is a natural V1.x/V2 extension).
- The optimizer searches over available Section Library entries (and, where enabled, Material choices) subject to a minimum safety-factor constraint (and optionally a maximum deflection/serviceability constraint), returning a ranked shortlist of candidate sections with a clear comparison table (weight, cost estimate, safety factor, deflection, embodied carbon estimate per candidate).
- Suggestions are always presented for user selection/preview (rendered live on the canvas as a "preview swap") — never silently auto-applied, consistent with AI Design Suggestions (Section 50) and Product Principle 1 (direct manipulation, user in control).
- Cost and embodied-carbon estimates require a reference dataset (regional material cost index, embodied-carbon-per-unit-mass by material) which must be clearly sourced/labeled and configurable/overridable by the user (these figures vary significantly by region/supplier and must never be presented as precise/authoritative without that caveat).

---

## 58. Sustainability

- **Carbon Footprint** — estimated embodied carbon of the current beam (material mass × embodied-carbon-per-unit-mass factor), surfaced as a Dashboard-adjacent metric, not a core KPI card by default (to avoid crowding structural KPIs) but easily accessible.
- **Material Usage** — total material volume/mass, useful both for sustainability and for cost estimation (Section 57).
- **Environmental Impact** — a broader qualitative/quantitative summary combining carbon footprint, material sourcing considerations, and (where data is available) recyclability/end-of-life notes for the selected material.
- **Embodied Carbon** — see Carbon Footprint; explicitly named as its own line item since it's an increasingly common. reporting requirement in professional practice.
- **Greener Alternatives** — surfaced via the Optimization module (Section 57) when "Embodied Carbon" is selected as (or included among) the optimization objective(s).

---

## 59. Developer Features

- **Plugin System** — a defined, sandboxed extension interface (see CLAUDE.md → Plugin Architecture) allowing registration of new load types, section types, material libraries, export formats, and (in later versions) new element/solver types, without modifying core platform code.
- **REST API** — covering model CRUD, analysis execution (submit a model, receive computed results), and report generation, with OpenAPI-documented endpoints, versioned, and rate-limited per Section 29.
- **Python Scripting** — an in-app scripting console (and/or downloadable SDK) enabling batch operations, custom parametric studies, and programmatic model generation, sharing the exact same solver core as the interactive UI (no parallel/divergent "scripting engine").
- **Batch Processing** — submit multiple model variants (e.g., a parametric sweep, Section 56) for solving in a single request/job, with results returned as a structured collection (useful for both the Research Dashboard and external integrations).
- **Command Palette** — see Section 25/20; a fuzzy-searchable action launcher exposing every platform action, including developer-oriented actions (open scripting console, view API keys).
- **Extension Marketplace** — a discovery/distribution surface for third-party plugins, with a review/approval process before public listing (security/quality gate, Section 29) and a clear sandboxing/permissions disclosure shown to installing users.
- **SDK** — client libraries (starting with JavaScript/TypeScript and Python) wrapping the REST API for common integration patterns.

---

## 60. Future Modules

The following modules are explicitly out of scope for V1 implementation but are the reason several V1 architectural requirements exist (see CLAUDE.md → Future Expandability and Rules for adding new engineering modules). Each is listed with its anticipated relationship to the V1 core:

- **Frame Analysis (2D)** — generalizes the beam solver into a matrix stiffness method over an arbitrary connected topology of beam-column elements; the V1 element/entity schema (loads, supports, materials, sections all as reusable, element-agnostic data types) is explicitly designed to be reused without modification.
- **3D Frames** — extends Frame Analysis to 3D topology and 3D stiffness matrices (adding torsion, biaxial bending, and out-of-plane behavior); reuses the Frame solver's matrix-assembly approach with expanded DOF-per-node.
- **Truss Analysis** — a specialization (axial-only elements) of the Frame solver; reuses topology/canvas infrastructure from Frame Analysis with a simplified element stiffness formulation.
- **Slab Design** — introduces 2D plate/shell elements, motivating the eventual Finite Element Mesh module; slab design code-checking (e.g., punching shear, reinforcement design) builds atop that continuum solver.
- **Column Design** — axial-flexural interaction diagrams, reusing Section Library and Material infrastructure directly; a natural companion to Frame Analysis once vertical members are modeled as first-class elements.
- **Footing Design** — soil-bearing and reinforced-concrete footing sizing, consuming reactions computed by the Frame/Column solvers as its primary input.
- **Retaining Walls** — combines soil pressure loading (a new load-type family), stability checks (overturning/sliding), and structural (cantilever/counterfort wall) design.
- **Steel Design** — code-based (e.g., AISC) member checking (flexure, shear, combined, buckling/stability) layered atop the Frame Analysis solver's internal force outputs.
- **RC Design** — code-based (e.g., ACI) reinforced-concrete member design (flexural reinforcement, shear reinforcement, development length) layered atop the same internal-force outputs.
- **Bridge Analysis** — extends Moving Load (Section 40.10) into full influence-line/influence-surface analysis and code-specific vehicle load models (e.g., HL-93), likely requiring the Frame/FEM solver for realistic bridge topologies.
- **Prestressed Concrete** — introduces prestressing tendon force as a new internal-load contribution to the beam/frame solver, plus time-dependent loss calculations (creep/shrinkage/relaxation).
- **Tunnel Structures** — a specialized continuum (FEM) + soil-structure-interaction application.
- **Finite Element Mesh** — the generalized continuum solver underlying Slab Design, Tunnel Structures, and any arbitrary 2D/3D solid/shell/plate problem; the single biggest architectural undertaking on the roadmap, explicitly sequenced after Frame/Truss maturity.
- **Structural Dynamics** — modal analysis, response spectrum, and time-history solving; consumes the same mass/stiffness assembly infrastructure built for Frame/FEM, adding a mass matrix and eigenvalue solver.
- **Earthquake Analysis** — a specific application of Structural Dynamics plus code-specific seismic load provisions.
- **Wind Analysis** — code-specific wind load generation feeding into the Frame/FEM static or dynamic solvers as a new load-type family.
- **Soil-Structure Interaction** — extends the Elastic Foundation concept (Section 39) into full 2D/3D soil springs/continuum coupling with the structural solver.
- **BIM Collaboration** — full IFC round-tripping (import and export) once the topology model is rich enough to represent a complete building (post Frame/3D Frame maturity).
- **Cloud Computing** — large-scale distributed solving for optimization sweeps, ML-assisted design search, and heavy FEM meshes, building on the horizontally-scalable solver-service architecture required from V1 (Section 30).
- **VR** — immersive 3D visualization of the Full 3D beam/frame/FEM rendering mode (Section 47), for design review and education use cases.
- **AR** — overlay of the model onto a physical job site or physical model for construction/education use cases.
- **Digital Twin** — live sensor-data-linked models (extending Research Features' Sensor Data import, Section 56, into continuous real-time ingestion) for monitoring built structures against their analytical predictions over time.

---

## 61. Tech Stack Recommendations

> Full architectural rationale and enforceable engineering rules live in `CLAUDE.md`. This section provides the PRD-level recommendation and justification summary.

- **Frontend:** TypeScript + React, chosen for component-driven UI matching the Component Library (Section 20), broad hiring pool, and mature ecosystem for canvas/animation libraries.
- **Rendering Engine:** A custom canvas/WebGL rendering layer (built on top of a library such as PixiJS or a thin custom WebGL abstraction) for the 2D/pseudo-3D beam canvas, and Three.js (or equivalent) for the Full 3D visualization mode, chosen because off-the-shelf charting libraries alone cannot deliver the required 60 FPS animated, physically-driven rendering across both diagram and geometry views.
- **Chart Library:** A combination of a custom lightweight chart renderer for the live-morphing SFD/BMD/Deflection diagrams (full control over animation timing/easing is required, which most off-the-shelf chart libraries do not expose at the needed granularity) and a standard library (e.g., a Recharts/D3-based approach) for simpler, static Report-context charts.
- **Animation Library:** A dedicated animation/tweening engine (e.g., GSAP-class capability, or a custom requestAnimationFrame-driven tween system) to guarantee the consistent timing/easing tokens required by CLAUDE.md → Animation Guidelines across both SVG/Canvas and DOM-based UI elements.
- **State Management:** A predictable, serializable state store (e.g., a Redux-class or signal-based reactive store) chosen specifically because the entire model must be serializable data (Engineering Principle 4) to support undo/redo, autosave, scripting, and AI-driven mutation uniformly.
- **Math Engine:** A dedicated linear-algebra/numerical library (matrix operations for the stiffness method, root-finding/integration utilities for indeterminate and custom-load calculations) — implemented or wrapped in a well-tested, independently-versioned internal package so solver correctness (NFR-3, NFR-10) can be unit-tested in complete isolation from UI code.
- **Physics/Solver Engine:** A custom-built structural solver (not a generic game-physics engine, which optimizes for plausibility over correctness) implementing determinate statics, the stiffness method, and the three-moment equation, architected as described in CLAUDE.md → Structural Solver Standards, explicitly designed to generalize to Frame/Truss/FEM without a rewrite.
- **Backend:** A statically-typed backend service (e.g., a Node.js/TypeScript or equivalent typed-language service) exposing the REST API (Section 59) and hosting the same solver core (or a server-side build of it) used client-side, ensuring identical numerical results whether computed in-browser or via the API (NFR-10).
- **Database:** A document/relational hybrid appropriate for versioned, structured project data (e.g., a relational store for account/permissions/metadata plus a document store or JSON columns for the model schema itself), chosen to support Revision History's snapshot+delta model (Section 30) efficiently.
- **Testing Strategy:** Unit tests for every solver function against closed-form and benchmark solutions (Section 37); component/UI tests for the Component Library; end-to-end tests for the core User Flows (Section 18); a dedicated, continuously-run "Benchmark Validation" regression suite (Section 56) gating every solver-affecting change.
- **CI/CD:** Automated build/test/deploy pipeline with mandatory solver-validation-suite pass as a merge gate for any change touching solver code; feature-flagged progressive rollout for beta capabilities (Section 36).
- **Deployment:** Cloud-hosted, horizontally-scalable stateless solver services (Section 30) behind a CDN-fronted static frontend, with background workers for heavy report generation and batch/parametric solving.
- **Folder Structure / Coding Standards / Design System:** fully specified in `CLAUDE.md`, which is the authoritative engineering handbook for implementation.

