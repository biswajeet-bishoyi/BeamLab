# CLAUDE.md — Engineering Handbook for AI-Assisted Development
### StructuraX Platform (Codename) — Beam Analysis V1 → Structural Analysis Ecosystem

**Audience:** Claude (or any AI coding agent) and human engineers collaborating on this codebase.
**Purpose:** This document is the single source of truth for *how* code is written, structured, tested, reviewed, and shipped. The PRD.md defines *what* to build. This file defines *how*. When the two conflict on implementation detail, CLAUDE.md wins; when they conflict on product intent, PRD.md wins.

Every rule below exists because of a failure mode observed in real engineering software (silently wrong stress values, jittery 3D scenes, unbounded undo stacks, non-reproducible reports, accessibility regressions, etc.). Do not treat any rule as boilerplate — each is load-bearing.

---

## Table of Contents

1. Project Philosophy
2. Coding Standards
3. Architecture
4. Folder Structure
5. Naming Conventions
6. Component Design Rules
7. State Management
8. API Design
9. Error Handling
10. Performance Guidelines
11. Accessibility Guidelines
12. Animation Guidelines
13. Visualization Standards
14. Engineering Calculation Standards
15. Mathematical Accuracy Requirements
16. Unit Testing Requirements
17. Integration Testing
18. E2E Testing
19. Git Workflow
20. Branch Strategy
21. Commit Convention
22. Documentation Standards
23. Code Review Checklist
24. Security Practices
25. Performance Budget
26. Logging
27. Analytics
28. Dependency Rules
29. UI Consistency Rules
30. Design Tokens
31. Reusable Components
32. Reusable Hooks
33. Rendering Strategy
34. Caching Strategy
35. Memory Optimization
36. Numerical Stability
37. Floating Point Precision
38. Matrix Solver Standards
39. Structural Solver Standards
40. Finite Element Preparation
41. Future Expandability
42. Plugin Architecture
43. AI Integration Standards
44. Report Generation Standards
45. Export Standards
46. File Organization
47. Internationalization & Localization
48. Versioning & Release Strategy
49. Long-Term Vision
50. Recommended Libraries by Subsystem
51. Rules for Adding a New Engineering Module
52. Determinism & Verifiability Checklist

---

## 1. Project Philosophy

### 1.1 Core Beliefs

1. **Correctness is non-negotiable. Delight is mandatory.** This is engineering software — a wrong bending moment can end up in a stamped drawing. Every calculation must be *provably* correct against hand-verified references before it ships. But correctness alone is not enough: the product must also feel like premium software, not a spreadsheet with a canvas bolted on.
2. **The canvas is the product.** Menus, panels, and dialogs support the canvas; they do not compete with it. Any feature that can be expressed as a direct manipulation on the canvas should be, before it is expressed as a form.
3. **Live feedback beats buttons.** An "Analyze" button is a concession, not a feature. Every parameter change should propagate to results within a single animation frame budget wherever the solver architecture allows it (see §10, §33).
4. **Numbers before pixels.** Never render a diagram, deflection curve, or stress color before the underlying numeric result has been validated by the solver's internal consistency checks (§14–§16). A beautiful animation of a wrong answer is worse than no animation.
5. **Every module is a citizen, not a guest.** Beam Analysis is V1, not "the app." All abstractions (Structure, Load, Support, Material, Section, Result) must be designed so that Frame, Truss, Slab, and future modules plug into the same architecture without a rewrite. See §41–§42.
6. **Explainability is a feature, not a debug tool.** Every result the platform shows must be traceable to an equation, a step, and a source. This is what separates an "Engineering Copilot" from a black box.
7. **Determinism is sacred.** The same model, same inputs, same software version → the same result, bit-for-bit where feasible, and numerically identical to solver tolerance otherwise. Non-determinism in a structural solver is a defect, always, with no exceptions for "it's just a UI animation."

### 1.2 Non-Goals (explicitly out of scope for how we build, not just what we build)

- We do not optimize for "getting a demo working." Every feature ships with tests, error states, and empty states from day one of that feature's implementation — not retrofitted later.
- We do not hand-roll a general-purpose CAD kernel. We integrate proven libraries (§50) rather than reinventing geometry, linear algebra, or PDF generation.
- We do not treat accessibility, i18n, or performance budgets as "polish passes." They are acceptance criteria for every PR (§23).

### 1.3 How Claude Should Think While Working In This Repo

- Before writing a solver function, find or write the reference hand-calculation in `/docs/verification/` and the corresponding test in `/tests/solver/` — test-first for anything with an equation in it.
- Before writing a new component, check `/src/design-system/` for an existing token, primitive, or pattern. Do not invent a new shade of blue.
- Before introducing a dependency, check §28 and get it justified in the PR description, not just imported.
- When uncertain whether a calculation convention (sign, coordinate direction) matches engineering practice, default to the conventions fixed in §14.2, and never guess silently — flag it in the PR description.

---

## 2. Coding Standards

### 2.1 Language & Tooling Baseline

- **TypeScript everywhere**, `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitAny: true`. No `.js` files in `/src`. No `any` in committed code except in isolated, commented adapter shims for third-party untyped libraries, each wrapped and typed at the boundary within one file.
- **ESLint + Prettier** enforced via pre-commit hook (Husky + lint-staged) and CI gate. A PR with lint errors cannot merge — this is a hard gate, not a warning.
- **Functional style preferred** for calculation code: pure functions, no hidden mutation, no shared mutable module-level state in `/src/core/solver/**`. React state and rendering code may use idiomatic React patterns (hooks, local state) but solver internals stay pure so they are unit-testable in isolation from React entirely.

### 2.2 General Rules

- Functions do one thing. If a function needs a comment block explaining three phases, it is three functions.
- No function in `/src/core/**` (engineering domain code) may exceed ~60 lines. No file in `/src/core/**` may exceed ~400 lines before it must be split by responsibility (e.g., `momentDiagram.ts` separate from `shearDiagram.ts`).
- Magic numbers are forbidden outside `/src/core/constants/`. `9.81`, `1e-6`, `0.001` all need a named constant with a comment citing the source (code standard clause, numerical tolerance rationale, etc.).
- Every exported function in `/src/core/**` has a TSDoc comment stating: purpose, units of every parameter, units of the return value, sign convention assumed, and known limitations.
- Prefer immutable data structures for the structural model (`readonly` fields, `Object.freeze` in dev builds) so the live-recalculation architecture (§10) can rely on referential equality for memoization.

### 2.3 Units Discipline

This is the single most common source of catastrophic bugs in engineering software. Rules:

- **All internal storage and computation is in SI base/derived units**: meters, newtons, pascals, kilograms, seconds, radians. No exceptions, ever, anywhere in `/src/core/**`.
- Unit conversion happens **only** at the UI input/output boundary (`/src/core/units/convert.ts`), which is the single, fully-tested module allowed to convert. A user-facing "kN/m" or "ksi" is a display concern, resolved by a `UnitSystem` context that wraps every numeric display component.
- Every numeric input component must declare its physical quantity type (`Length`, `Force`, `Moment`, `Stress`, `Distributed Load`, etc.) as a TypeScript branded type so a `Force` value cannot be silently passed where a `Moment` is expected without an explicit, named conversion function.

### 2.4 Comments & Self-Documentation

- Comments explain *why*, not *what*. `// convert to SI` is banned; `// user enters kN/m; solver requires N/m per SI convention (§2.3)` is required.
- Every non-obvious sign convention, coordinate origin, or engineering assumption gets an inline comment with a link to the relevant PRD/CLAUDE section, e.g. `// sagging positive per §14.2 convention`.

---

## 3. Architecture

### 3.1 High-Level Layers

```
┌─────────────────────────────────────────────────────────┐
│  Presentation Layer  (React components, canvas renderer) │
├─────────────────────────────────────────────────────────┤
│  Interaction Layer    (gestures, tools, command dispatch) │
├─────────────────────────────────────────────────────────┤
│  Application State    (store, undo/redo, selectors)      │
├─────────────────────────────────────────────────────────┤
│  Domain / Core Engine  (pure structural model + solvers) │
├─────────────────────────────────────────────────────────┤
│  Services Layer        (persistence, export, AI, API)    │
└─────────────────────────────────────────────────────────┘
```

- **Domain / Core Engine** has zero dependency on React, on the DOM, or on any rendering library. It is a standalone TypeScript package (`packages/core-engine`) that could theoretically run in Node, a Web Worker, or be published to npm independently. This is what lets us later expose a headless REST API and a Python SDK without a rewrite.
- **Presentation Layer** never computes engineering results. It only requests them from the Domain layer through selectors and displays them. If a component contains a bending-moment formula, that is an architecture violation.
- **Interaction Layer** translates raw input events (drag, click, keyboard) into *Commands* (see §7.3) that are dispatched to the store. This indirection is what makes Undo/Redo, collaboration, and the AI "do this for me" feature all possible through the same command bus.

### 3.2 Why This Architecture

- **Separation of solver from UI** is what allows: (a) running the solver in a Web Worker off the main thread for large models, (b) unit-testing the solver at 100% without a browser, (c) reusing the exact same solver for the future REST API and Python SDK, (d) server-side report generation without duplicating logic.
- **Command-based interaction** is what allows: (a) deterministic undo/redo, (b) recording/replaying an "Engineering Playback" session, (c) AI Beam Builder issuing the same commands a human would issue via drag, so AI actions are auditable and reversible exactly like manual ones.

### 3.3 Module Boundaries

Each engineering module (Beam, Frame, Truss, ...) is a plugin package under `packages/modules/<name>` that:
- Exports a `ModuleDefinition` (see §41–§42) describing its supported element types, load types, solvers, and result types.
- Depends only on `packages/core-engine` (shared primitives: geometry, materials, sections, units, matrix solver) and never on another module package directly.
- Registers its own UI panels, toolbox entries, and result visualizers via the plugin registry, so the shell app has no hardcoded knowledge of "Beam" as a concept.

### 3.4 Data Flow for Live Analysis

```
User drags load →  dispatch(MoveLoadCommand)
   → store reducer updates immutable StructuralModel
   → selector `selectAnalysisInputHash` changes
   → solver worker recomputes affected result sets (memoized per unchanged subtree)
   → result store updates
   → connected components re-render via selector subscriptions
   → renderer interpolates from previous to new result over N ms (animation, §12)
```

No component polls. No component computes. Everything is subscription + selector based (see §7).

---

## 4. Folder Structure

```
/apps
  /web                      # main SPA shell (Vite + React)
  /docs-site                # marketing/docs site (separate deploy)
/packages
  /core-engine
    /geometry
    /materials
    /sections
    /units
    /matrix-solver
    /model                  # StructuralModel, Node, Element, Support, Load types
    /commands                # Command definitions + reducers
  /modules
    /beam
      /solver
      /ui
      /visualizers
      /tests
    /frame                   # future
    /truss                   # future
  /renderer                  # canvas/WebGL rendering primitives shared by all modules
  /design-system              # tokens, primitives, Storybook
  /ai-copilot                 # AI feature orchestration, prompt templates, tool schemas
  /report-engine               # PDF/report generation, independent of UI
  /import-export                # DXF/DWG/IFC/PDF import-export adapters
  /sdk                          # public JS/TS SDK wrapping core-engine for embedding
/services
  /api                        # backend REST/GraphQL service
  /worker-solver               # optional server-side solver microservice for heavy jobs
  /auth
  /storage
/tests
  /solver                     # cross-cutting solver verification suite (hand-calc references)
  /e2e
/docs
  /verification                # hand-calculation reference documents per beam case
  /adr                          # Architecture Decision Records
/scripts
```

Rules:
- No file lives directly in `/src` at the app root beyond `main.tsx`/`App.tsx` — everything else belongs to a package.
- A module package (`packages/modules/beam`) must never import from another module package. Shared code moves to `core-engine` or `renderer`.
- Every package has its own `package.json`, its own test config, and can theoretically be built and tested standalone in CI (enables parallelized CI, §17–§18).

---

## 5. Naming Conventions

| Category | Convention | Example |
|---|---|---|
| React components | PascalCase, one per file, filename matches | `BeamCanvas.tsx` |
| Hooks | camelCase, `use` prefix | `useAnalysisResult.ts` |
| Domain types/interfaces | PascalCase, no `I` prefix | `StructuralModel`, `PointLoad` |
| Branded unit types | PascalCase noun for the quantity | `Length`, `ForcePerLength` |
| Pure solver functions | camelCase, verb-first | `computeBendingMoment()` |
| Commands | PascalCase, noun + `Command` suffix | `AddPointLoadCommand` |
| Selectors | camelCase, `select` prefix | `selectMaxMoment()` |
| Constants | SCREAMING_SNAKE_CASE, in `/core/constants` | `GRAVITY_M_PER_S2` |
| Test files | `*.test.ts` colocated or in `/tests` mirroring path | `momentDiagram.test.ts` |
| CSS/design tokens | kebab-case CSS variables | `--color-tension-500` |
| Event/command payload fields | camelCase, explicit units suffix when ambiguous | `magnitudeN`, `positionM` |

Numeric fields that could be ambiguous in unit MUST carry a unit suffix in code even though the branded type also encodes it (defense in depth): `spanM`, `loadKNPerM` is **not** allowed as *storage* (violates §2.3 SI-only rule) but is fine as a *UI-layer* local variable right before conversion at the boundary.

---

## 6. Component Design Rules

1. **Presentational vs. Container split.** Container components subscribe to store/selectors and pass plain props down. Presentational components receive only primitives/plain objects and render — they may be storybook-tested with zero store dependency.
2. **No component exceeds 250 lines.** If it does, extract sub-components or hooks.
3. **Every interactive component has four documented states minimum:** default, hover/focus, active/dragging, disabled. Canvas objects (loads, supports) additionally require: selected, invalid/error (e.g., load placed off-span), and animating.
4. **Props are explicit and typed; no `...rest` spreading into DOM nodes without an explicit allowlist**, to avoid leaking internal props into the DOM and to keep components self-documenting.
5. **Canvas objects are components too.** Even though rendered via SVG/WebGL, every draggable canvas entity (a Support, a Load glyph) is implemented as a logical component with its own hook (`useDraggable`, `useSnap`) — no ad hoc mouse-math scattered across a monolithic canvas file.
6. **Every component that displays a numeric engineering value must go through the `<Quantity>` primitive** (renders value + unit + tooltip with formula reference), never a raw `{value}` interpolation, to guarantee consistent formatting, unit conversion, and accessibility labeling everywhere in the app (§29–§30).

---

## 7. State Management

### 7.1 Store Architecture

- Use a single normalized store (Zustand or Redux Toolkit — see §50 for the decision) split into slices: `modelSlice` (the structural model: nodes, elements, supports, loads, materials, sections), `resultSlice` (derived analysis results, never hand-edited, always derived by the solver), `uiSlice` (selection, tool mode, panel layout, zoom/pan), `historySlice` (undo/redo stack of Commands), `sessionSlice` (project metadata, collaboration state).
- `resultSlice` is **write-only by the solver pipeline**. No UI action ever calls `setResult(...)` directly — this guarantees results always reflect the current model (no stale-result bugs).

### 7.2 Derived State via Selectors

- All cross-cutting derived values (max moment, utilization ratio, governing load case) are memoized selectors (Reselect-style), never computed inline in a component's render body.
- Selectors are unit-tested independently of components.

### 7.3 Commands (the mutation boundary)

- The **only** way to mutate `modelSlice` is by dispatching a `Command` object: `{ type, payload, timestamp, source: 'user' | 'ai' | 'import' }`.
- Every Command has a paired `invert()` used for undo, generated deterministically from the command + the previous model snapshot (structural sharing, not deep clone, for performance — see §35).
- This is what enables: replayable sessions (Engineering Playback recording is literally a Command log with timestamps), AI actions being fully auditable (`source: 'ai'` is visually distinguished and always shown in history), and collaborative editing (commands are the CRDT-friendly unit of sync).

### 7.4 Rules

- Never store derived/computed values in `modelSlice`. If it can be computed from other state, it is a selector, not a field.
- Never mutate store state directly outside a reducer/command handler — enforced via Immer or Redux Toolkit's built-in immutability, plus a lint rule banning direct slice mutation outside `/store/`.
- Local component state (`useState`) is allowed only for pure UI ephemera that no other component needs (e.g., "is this tooltip open").

---

## 8. API Design

### 8.1 Principles

- REST for CRUD-shaped resources (projects, users, templates); a typed RPC-style layer (tRPC or GraphQL — see §50) for the richer analysis/report operations that don't map cleanly to REST verbs.
- Every API is versioned from day one: `/api/v1/...`. Breaking changes require `/api/v2/...`, never an in-place breaking change to v1.
- All engineering payloads (a `StructuralModel` sent to a solver microservice) use the exact same TypeScript types as the client, published from `packages/core-engine`, so client and server can never silently drift on the shape of a beam.

### 8.2 Endpoint Shape (representative)

```
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/:id
PUT    /api/v1/projects/:id
DELETE /api/v1/projects/:id

POST   /api/v1/analyze            # stateless: body = StructuralModel, returns AnalysisResult
POST   /api/v1/reports            # body = { projectId, template }, returns { reportId, url }
POST   /api/v1/ai/beam-builder     # body = { prompt, currentModel? }, returns { commands: Command[] }
```

- `POST /analyze` is **stateless and pure** — same input always produces the same output, making it trivially cacheable and safe to call from anywhere (including the Python SDK, batch processing, and CI verification jobs) without spinning up the full app.
- The AI endpoints return **Commands**, not a mutated model — this keeps the AI subsystem consistent with the command-bus architecture in §7.3, and lets the client preview/confirm before applying.

### 8.3 Error Contract

All API errors return:
```json
{ "error": { "code": "INVALID_SUPPORT_CONFIGURATION", "message": "...", "details": {...}, "docsUrl": "..." } }
```
Error codes are a fixed, documented enum shared between client and server (`packages/core-engine/errors.ts`) — never a raw string thrown ad hoc.

---

## 9. Error Handling

### 9.1 Categories

1. **Modeling errors** — user has created a mechanically invalid configuration (unstable structure, zero-stiffness mechanism, unsupported beam floating in space). These are *expected* and must be caught by pre-solve validation, never allowed to crash the solver.
2. **Numerical errors** — solver produced NaN/Infinity, singular matrix, non-convergence. These indicate either a modeling error that slipped past validation or a solver bug; both must be logged distinctly (§26) since a solver bug is a Sev-1.
3. **System errors** — network failure, storage failure, worker crash.
4. **Programming errors** — should never reach production; caught by TypeScript + tests, and if one does reach production, an Error Boundary reports it to logging with full context and shows a graceful fallback, never a blank screen.

### 9.2 Rules

- The solver **never throws** for a modeling error; it returns a typed `Result<AnalysisResult, ModelingError>` (Result/Either pattern). Throwing is reserved for truly exceptional, programmer-error conditions.
- Every `ModelingError` carries a human-readable message *and* a suggested fix ("Beam is unstable: add a support to resist horizontal translation") because this is educational software — an error is a teaching moment.
- Every async boundary (worker calls, network calls) has a timeout and a typed failure path; nothing hangs the UI indefinitely. Show a clear "Recalculating is taking longer than expected — [Cancel]" affordance past ~3s.
- React Error Boundaries wrap: the canvas, each dockable panel, and the report generator independently, so one panel crashing does not take down the whole app.

---

## 10. Performance Guidelines

- **Target: 60 FPS for all canvas interaction and animation.** Dragging a load or support must never drop below 50 FPS on the reference hardware profile (mid-range laptop, integrated GPU).
- **Solver recalculation for a single-span beam with <50 loads must complete in <16ms** (single frame) on reference hardware, so "live" truly means live with no debounce needed. Beyond that complexity threshold, debounce recalculation to a trailing 100ms window and show a subtle "recalculating" indicator rather than blocking interaction.
- Heavy solves (large continuous beams, dense FE meshes in future modules) run in a **Web Worker**, never on the main thread, so dragging remains smooth even while a solve is in flight.
- Use `React.memo`/selector-based subscriptions so a change to one load does not re-render the entire component tree — only the components whose selected slice of state actually changed.
- Diagrams (SFD/BMD/deflection) are rendered via a single canvas/WebGL draw call per frame using pre-computed path data, not hundreds of individual SVG elements, once point counts get large (>500 samples).
- All expensive derived computations (section properties for a custom shape, matrix assembly for many-element models) are memoized keyed by a content hash of their inputs, not by object identity alone (to survive serialization round-trips from persistence/collaboration).

---

## 11. Accessibility Guidelines

Accessibility is an acceptance criterion for every PR touching UI, not a separate epic.

- **Keyboard parity**: every canvas action achievable by drag must have a keyboard-accessible equivalent (arrow keys nudge a selected load/support in fixed increments; Tab cycles through structural entities in a stable, logical order; Enter opens the properties panel for the focused entity).
- **Screen reader support**: every canvas entity has an ARIA live region description regenerated on change ("Point load of 10 kilonewtons at 3 meters from left support, selected"). Diagrams (SFD/BMD) additionally expose a data-table fallback view toggle for non-visual consumption.
- **Color is never the only signal.** Tension/compression, safe/unsafe, selected/unselected all pair color with shape, icon, or pattern (see colorblind-safe palette in §30).
- **Contrast**: minimum WCAG AA (4.5:1 text, 3:1 large text/icons) in both Light and Dark themes; High-Contrast mode targets AAA where feasible.
- **Motion sensitivity**: respect `prefers-reduced-motion` — all non-essential animation (playback flourishes, easing) collapses to instant/minimal-motion transitions; essential state-change animation (a bar appearing on a chart) still occurs but without parallax/camera movement.
- **Focus management**: opening a dialog traps focus; closing it returns focus to the triggering element; no keyboard traps anywhere on the canvas.
- Automated `axe-core` checks run in CI against every screen in Storybook and fail the build on new violations (§17).

---

## 12. Animation Guidelines

### 12.1 Principles

- Animation must always communicate **cause and effect** (a load appeared *because* the user added it; the moment diagram *grew* from the previous state to the new one), never decoration for its own sake.
- **Morphing over replacing.** When a diagram updates, interpolate the existing path to the new path (tween each sample point) rather than fading old-out/new-in — this is what makes the live recalculation feel like *one continuous structure*, not a slideshow.
- Standard durations: micro-interactions (hover, selection) 100–150ms; state transitions (value change, diagram update) 200–350ms; narrative sequences (Engineering Playback steps) 600–1200ms per step, user-adjustable via speed control.
- Standard easing: `ease-out` for things entering/growing, `ease-in-out` for things moving between two states, never linear for anything meant to feel physical.
- Every animation is interruptible — if the user changes a load mid-animation, the in-flight animation retargets smoothly to the new destination rather than snapping or queuing.

### 12.2 Engineering Playback Mode Specifics

- Playback is driven by the same Command log used for undo/redo/session recording (§7.3) — it is not a bespoke hand-authored animation, it is a *replay of real derivation steps*, which is what keeps it honest to the actual computation rather than a canned demo.
- Each phase (loads appear → reactions solve → SFD grows → BMD forms → deflection shows → stress spreads → critical points glow → summary) is its own composable `PlaybackStep` with a defined enter/hold/exit, independently unit-testable for timing and independently skippable via scrubbing.
- Scrubbing the timeline must be able to jump to any timestamp and render the *correct intermediate visual state* without replaying every prior frame — implemented by keying each step's visual state as a pure function of `t`, not as stateful accumulation.

### 12.3 Technical Implementation

- Use a dedicated animation library (Framer Motion for DOM/SVG UI chrome; a custom RAF-driven tweening layer for canvas/WebGL diagram morphing — see §50) rather than CSS transitions for anything data-driven, since CSS cannot interpolate arbitrary path data.
- All animation state lives outside React render where possible (a ref-based animation controller) to avoid triggering React reconciliation 60 times a second; React only re-renders on discrete state changes, not per-frame.

---

## 13. Visualization Standards

- **Consistent sign/color convention across the entire app**: sagging (positive) moment = one consistent color (e.g., blue), hogging (negative) = another (e.g., orange); tension = warm color, compression = cool color; this mapping is a design token (§30), never hardcoded per-chart, so it is impossible for two diagrams to accidentally use inverted conventions.
- Every diagram displays: axis labels with units, a legend when more than one series or color mapping is present, and labeled critical points (max/min values, zero-crossings, point-of-contraflexure) by default — not only on hover, because these are the values engineers actually need at a glance.
- Diagrams support a **data-table equivalent view** (for accessibility and for copy-paste into other tools) generated from the exact same sampled data as the visual — never a separately-maintained table that could drift from the chart.
- Stress heatmaps use a **perceptually uniform, colorblind-safe** colormap (e.g., viridis-family) by default; a diverging red/blue map is offered as an explicit opt-in for users who want traditional tension/compression coloring, with a colorblind-safe alternative pattern overlay (hatching) available.
- 3D/Pseudo-3D views never sacrifice numerical readability for aesthetics — critical values are always available via the Inspector regardless of camera angle, and a "reset camera" control is always one click away.

---

## 14. Engineering Calculation Standards

### 14.1 Source of Truth

Every solver algorithm must be traceable to a citable structural engineering reference (e.g., Hibbeler's *Structural Analysis*, Timoshenko's *Theory of Structures*, AISC/Eurocode/IS code clauses as relevant). The citation is recorded as a comment at the top of the implementing file and in `/docs/verification/`.

### 14.2 Fixed Conventions (do not deviate without an ADR, §46)

- **Coordinate system**: X positive rightward along the beam axis from the left end (x=0), Y positive upward.
- **Load convention**: downward (gravity-direction) loads are entered as negative Y by the user-facing sign shown as "downward" in the UI, but stored internally per the branded-force-vector convention documented in `/packages/core-engine/model/loads.ts` — the UI must never expose the raw internal sign to the user without translation through a labeled convention.
- **Moment convention**: sagging (concave up) is positive bending moment; hogging is negative. Displayed BMD draws positive moment *above* the beam axis by engineering-drawing convention (configurable to below-axis "structural steel" convention as a user preference, but blue = sagging always, per §13).
- **Reaction convention**: reactions are computed and displayed with an explicit direction arrow plus signed magnitude; never a bare unsigned number.
- **Slope/rotation**: counter-clockwise positive, consistent with the right-hand rule about the Z axis (out of the screen).

### 14.3 Validation Requirements Before Any Solve

1. Statical determinacy/stability check — reject and explain if the structure is a mechanism (insufficient restraints) or has redundant/conflicting restraints without an indeterminate solver path enabled.
2. Load placement bounds check — a load positioned outside `[0, span]` is rejected with a clear message, not silently clamped.
3. Units/type check at the model boundary — enforced by the branded types (§2.3) at compile time; runtime validation (zod schema or equivalent) at every external input boundary (file import, API, AI-generated commands) since compile-time types don't protect against untrusted runtime data.

### 14.4 Every New Calculation Requires

- A written derivation or citation in `/docs/verification/<topic>.md`.
- At least three hand-verified reference cases (simple, moderate, edge-case) checked into `/tests/solver/fixtures/` with the expected values computed independently of the implementation (by hand or by an independent trusted tool, never by asking the same code to grade itself).
- A documented tolerance (§15) for comparing computed vs. reference values, justified by the numerical method's expected error, not an arbitrarily loose tolerance chosen to make a failing test pass.

---

## 15. Mathematical Accuracy Requirements

- All floating-point comparisons in tests use an explicit tolerance (`expectCloseTo(value, expected, { absTol, relTol })`), never bare `===` or default Jest `toBeCloseTo()` precision without justifying the digit count for the specific quantity (a moment in kN·m needs a different absolute tolerance than a stress in Pa).
- Standard default tolerances (overridable per-test with justification): `relTol = 1e-9` for closed-form analytical results (simply supported, cantilever — exact formulas), `relTol = 1e-6` for numerically-integrated results (deflection via double integration of variable EI), `relTol = 1e-4` for iterative/FE-based results once those modules exist.
- **Never silently clamp or round intermediate results.** Rounding for display happens only at the final presentation layer (`<Quantity>` primitive, §6), never inside the solver pipeline, to avoid compounding rounding error across chained calculations (reaction → shear → moment → stress → deflection).
- Every solver function has a documented **valid input domain** and returns a typed `ModelingError` outside it (e.g., negative Young's Modulus, zero section area) rather than producing `NaN`/`Infinity` silently.
- Cross-check high-risk results with an independent method where feasible: e.g., verify that the numerically-integrated deflection curve satisfies the closed-form boundary conditions (zero deflection at pin/fixed supports) within tolerance as a runtime **sanity assertion** in non-production builds, and as an explicit unit test in all builds.

---

## 16. Unit Testing Requirements

- **100% statement coverage is required for `packages/core-engine` and every `packages/modules/*/solver` directory.** This is a hard CI gate, not a goal — a solver PR without full coverage of its new code paths does not merge. UI code targets 80%+ coverage with sensible exclusions (pure styling components) documented in the coverage config.
- Every solver function is tested against: (a) textbook closed-form cases, (b) symmetry properties (e.g., a symmetric beam with symmetric load must produce a symmetric moment diagram — assert this structurally, not just against a magic number), (c) degenerate/edge cases (zero-length segment, load exactly at a support, span of exactly one element).
- Property-based testing (fast-check or equivalent) is required for the matrix solver and for any function claiming a general mathematical property (e.g., "sum of vertical reactions equals sum of vertical loads for any statically determinate configuration" is a property, tested over hundreds of randomized valid configurations, not just three fixed examples).
- Snapshot testing is **banned** for numeric solver output (snapshots hide regressions in exactly the values that matter most) but **allowed** for rendered SVG/diagram markup structure where visual regression tooling (§18) is the real guard.

---

## 17. Integration Testing

- Integration tests exercise the full pipeline: Command dispatch → store update → solver invocation → result selector → (headless) render, without mocking the solver — mocking the thing you're trying to verify defeats the purpose.
- Every module (Beam, and future Frame/Truss) has an integration suite that builds a realistic model via Commands (exactly as the UI would), asserts on the resulting `AnalysisResult`, then applies an inverse command sequence and asserts the model returns to its exact prior state (round-trip/undo integrity).
- Import/export adapters (DXF, IFC, PDF) are integration-tested round-trip: model → export → re-import → assert structural equivalence within tolerance, on every CI run against a fixed corpus of sample files.
- The AI Copilot's Command-generation path is integration-tested by asserting that a fixed set of natural-language prompts (checked into `/tests/ai/fixtures/prompts.json`) produce Commands that, when applied, yield a model matching an expected structural description (span, support types, load list) — not by string-matching the LLM's prose output.

---

## 18. E2E Testing

- Playwright (see §50) drives real browser scenarios: create a simply-supported beam, add three load types, drag a support, verify SFD/BMD update live, run Engineering Playback, export a PDF report, and assert the report contains the expected computed values (via PDF text extraction) — a true "did the whole system work" check.
- Visual regression testing (Playwright's screenshot diffing or Chromatic) covers: canvas rendering at fixed model states, dark/light theme parity, and each Playback phase's key frame — catches unintended rendering drift that unit tests cannot.
- Accessibility E2E: automated `axe-core` scan on every major screen state as part of the E2E suite, plus at least one full keyboard-only user journey (build and analyze a beam using only keyboard) that must pass with zero mouse events.
- E2E suite runs on every PR against a preview deployment, and nightly against production as a smoke test.

---

## 19. Git Workflow

- Trunk-based development on `main`, protected: no direct pushes, PRs required, CI must pass (lint, typecheck, unit, integration, a11y checks — E2E and visual regression on a merge queue before landing on `main`), at least one human approval required in addition to any AI-assisted review.
- Feature branches are short-lived (target <3 days). Long-running feature work uses feature flags (see §41 pattern) rather than long-lived branches, to avoid painful merges in a codebase where the core model types touch nearly everything.
- Rebase, don't merge-commit, when updating a feature branch from `main`, to keep history linear and bisectable — critical for tracking down exactly which commit introduced a numerical regression.

## 20. Branch Strategy

```
main                      — always deployable, protected
feature/<ticket>-<slug>   — short-lived feature branches
fix/<ticket>-<slug>       — bug fixes
release/<version>         — cut for release stabilization, see §48
hotfix/<version>-<slug>   — urgent production fixes, merged to main and cherry-picked to release
```
No `develop` branch — trunk-based flow keeps `main` shippable at all times via feature flags rather than a long-lived integration branch.

## 21. Commit Convention

Conventional Commits, enforced by commitlint:
```
feat(beam-solver): add support for trapezoidal distributed loads
fix(canvas): correct snap tolerance for overlapping supports
perf(diagram-render): batch SFD/BMD draw calls into single canvas pass
docs(verification): add hand-calc reference for propped cantilever
test(matrix-solver): add property-based reaction-equilibrium check
refactor(store): extract command inversion into shared utility
chore(deps): bump zustand to 5.x
```
Breaking changes: `feat(core)!: change Load type to require explicit unit tag` with a `BREAKING CHANGE:` footer explaining the migration.

---

## 22. Documentation Standards

- Every package has a `README.md` covering: purpose, public API surface, and a "how to add X" section (e.g., core-engine's README explains how to add a new Load type end-to-end).
- Every non-trivial architectural decision is recorded as an ADR in `/docs/adr/NNNN-title.md` (context, decision, alternatives considered, consequences) — this is how we prevent re-litigating the same tradeoff every six months and how a new engineer (or a future AI session with no memory of this conversation) understands *why*, not just *what*.
- Public-facing API (REST endpoints, SDK) is documented via OpenAPI/TSDoc and published to `/apps/docs-site` automatically from source annotations — documentation that can drift from code is documentation that will drift from code, so it is generated, not hand-maintained where at all possible.
- Every engineering calculation module ships a "Theory" doc under `/docs/verification/` written for a practicing engineer, not just a developer — this doc doubles as source content for the in-app "Formula Explorer" educational feature.

---

## 23. Code Review Checklist

Every PR review must explicitly confirm:

- [ ] Units: all new numeric fields are SI-internal, branded-typed, converted only at boundaries (§2.3).
- [ ] Tests: new solver logic has ≥3 hand-verified reference cases and property-based tests where applicable (§16).
- [ ] Determinism: no `Date.now()`, `Math.random()`, or object-iteration-order dependency inside solver code without explicit seeding/justification.
- [ ] Error handling: modeling errors return typed `Result`, never throw; user-facing messages are actionable (§9).
- [ ] Accessibility: keyboard path exists, ARIA labels present, contrast checked, `prefers-reduced-motion` respected (§11).
- [ ] Performance: no unmemoized expensive computation added to a render path; large-model perf considered (§10).
- [ ] Animation: any new visual state transition uses the shared tweening approach, not ad hoc CSS (§12).
- [ ] Design tokens: no hardcoded colors/spacing; uses `/design-system` tokens (§30).
- [ ] Docs: ADR added if architecturally significant; README/verification doc updated if a new calculation or module surface was added.
- [ ] Security: no secrets committed; input validated at every trust boundary (§24).

A PR touching `/packages/core-engine/**` or any `solver/**` directory additionally requires review sign-off from a designated "solver owner," not just any reviewer, given the stakes of a wrong calculation.

---

## 24. Security Practices

- All external input (file imports, API payloads, AI-generated commands, URL params) is validated against a schema (zod) at the trust boundary before touching the model — never trust client-supplied "already validated" flags.
- No secrets in source; all API keys/credentials via environment variables and a secrets manager in deployed environments; `.env.example` checked in, `.env` never checked in (enforced via `.gitignore` and a CI secret-scan step).
- File import parsers (DXF/DWG/IFC/PDF) run in a sandboxed worker with strict resource limits — malformed or malicious files must not be able to hang or crash the main thread or exfiltrate data.
- Report/export generation escapes all user-supplied strings (project names, engineer notes, comments) before embedding into PDF/HTML to prevent injection.
- Authentication via industry-standard OAuth2/OIDC (delegated to a managed provider, not hand-rolled); authorization checked server-side on every request — client-side role checks are UX only, never the security boundary.
- Dependency vulnerabilities scanned on every CI run (`npm audit`/Snyk/Dependabot); high/critical vulnerabilities block merge until resolved or explicitly, temporarily waived with a tracked follow-up ticket.

---

## 25. Performance Budget

| Metric | Budget |
|---|---|
| Initial load (first meaningful paint) | < 2.0s on reference connection/hardware |
| Time to interactive canvas | < 3.0s |
| Live recalculation (simple beam, <50 loads) | < 16ms (single frame) |
| Live recalculation (complex/continuous, debounced) | < 100ms trailing debounce |
| Drag interaction frame rate | ≥ 55 FPS sustained |
| Bundle size (initial JS, gzipped) | < 250KB for shell; module chunks lazy-loaded |
| PDF report generation (typical project) | < 3s |
| Memory footprint, single-beam session | < 150MB heap |

Every PR that could plausibly affect these (touches canvas rendering, solver hot paths, or bundle composition) must include a before/after measurement in the PR description; CI runs a Lighthouse/bundle-size check and flags regressions beyond a defined threshold (e.g., +5% bundle size) for explicit reviewer acknowledgment.

---

## 26. Logging

- Structured logging only (`logger.info({ event, ...context })`), never bare `console.log` in committed code — enforced by lint rule, with `console.*` allowed only behind a dev-only debug flag.
- Log levels: `debug` (dev-only verbose solver tracing), `info` (user actions, command dispatch, successful analyses), `warn` (recoverable modeling errors, deprecated API usage), `error` (numerical failures, system errors, caught exceptions), `fatal` (unrecoverable — triggers alerting).
- Solver numerical failures (`NaN`, non-convergence, singular matrix) always log at `error` with full model snapshot (sanitized of any user PII) attached, since these are the failures we most need to reproduce and fix.
- No PII or full user-identifying project content in production logs beyond what's needed for debugging; structural model geometry/loads are not considered sensitive by default but project names/company branding may be — redact per a documented policy.

---

## 27. Analytics

- Product analytics track **feature usage**, not personal data: which load types are used most, how often Playback is used vs. skipped, average model complexity, which export formats are chosen — informs roadmap prioritization (§48 in PRD).
- Analytics events are defined in a single typed schema (`/packages/analytics/events.ts`) so an event name/shape can't drift between call sites; adding a new event requires adding it to this schema first.
- No analytics collection of the actual engineering content of a user's private project (specific dimensions, loads, company info) beyond aggregate, anonymized usage counters, and this is disclosed in-product — engineers working on real projects must trust that their data isn't being harvested.
- Performance telemetry (real-user monitoring for the budgets in §25) is collected separately from product analytics and used to catch field regressions the synthetic CI checks miss.

---

## 28. Dependency Rules

- New dependencies require justification in the PR: what it does, why it's needed over rolling it ourselves or using an existing dependency, bundle size impact, license compatibility (MIT/Apache/BSD preferred; GPL/AGPL banned for anything shipped client-side), and maintenance health (recent commits, open critical issues).
- `packages/core-engine` has an intentionally **minimal** dependency footprint — it should be embeddable/publishable independently, so it avoids pulling in React, UI, or heavy libraries; math/geometry utilities only.
- Pin exact versions for anything touching numerical results (matrix solver library, math library) — a transparent minor-version bump silently changing floating point behavior in a solver dependency is exactly the kind of bug this handbook exists to prevent. Renovate/Dependabot updates to these are reviewed manually, never auto-merged, even for patch versions.
- Non-numerical UI dependency updates may auto-merge if CI (including visual regression) passes clean.

---

## 29. UI Consistency Rules

- One and only one modal dialog pattern, one and only one dockable-panel pattern, one and only one toast/notification pattern — implemented once in `/design-system`, used everywhere, never reimplemented per-feature.
- Every icon comes from the single icon set (see §30); no mixing icon libraries, no ad hoc SVGs for common concepts (delete, edit, warning) duplicated across features.
- Every numeric display uses `<Quantity>` (§6); every color use for engineering meaning (tension/compression, safe/unsafe, sagging/hogging) pulls from the fixed semantic token set (§13, §30) — never a raw hex value chosen in the moment.
- Empty states, loading states, and error states are implemented as shared, parameterized components (`<EmptyState icon title description action />`) rather than bespoke markup per screen, so tone and layout stay consistent platform-wide.

---

## 30. Design Tokens

Tokens are defined once in `/packages/design-system/tokens` (as CSS custom properties + a TS export for use in canvas/WebGL code where CSS vars aren't directly usable) and consumed everywhere — no component defines its own color, spacing, radius, shadow, or font value.

Representative token categories:
- **Color — semantic engineering**: `--color-sagging`, `--color-hogging`, `--color-tension`, `--color-compression`, `--color-safe`, `--color-warning`, `--color-danger`, each with a light-theme and dark-theme value and a colorblind-safe alternate palette variant.
- **Color — UI**: `--color-surface-*`, `--color-border-*`, `--color-text-*`, `--color-accent-*`, following a consistent numeric scale (50–900) per hue.
- **Spacing**: an 8px base scale (`--space-1` = 4px through `--space-12` = 96px) — no arbitrary pixel values in component styles.
- **Typography**: a defined type scale and a monospace variant reserved specifically for numeric/equation display, so numbers always render in a font with consistent digit widths (critical for scanning tables of results).
- **Motion**: `--duration-micro`, `--duration-transition`, `--duration-narrative`, `--ease-out-standard`, `--ease-in-out-standard` — matching §12's animation guidelines, defined once.
- **Elevation/shadow**: a fixed shadow scale for dockable panels, dialogs, and dragged/floating canvas objects.

---

## 31. Reusable Components

Core shared component inventory maintained in `/packages/design-system` (Storybook-documented, each with states per §6):

`Button`, `IconButton`, `Toggle`, `Slider`, `NumericInput` (unit-aware, wraps `<Quantity>` for input), `Select`, `Tabs`, `Dialog`, `Drawer`/`DockablePanel`, `Tooltip`, `ContextMenu`, `Toast`, `EmptyState`, `ErrorState`, `LoadingSkeleton`, `Quantity` (value+unit+tooltip), `KPIStatCard` (animated dashboard tile), `DiagramCanvas` (shared SFD/BMD/deflection chart primitive), `ColorLegend`, `PlaybackTransportControls` (play/pause/scrub/speed), `CommandPalette`, `PropertiesInspectorRow`, `MaterialPicker`, `SectionPicker`, `SupportGlyph`, `LoadGlyph`.

Rule: before building a new UI element, search this inventory and Storybook. A new component is added to `/design-system` (not inlined in a feature folder) if it is or plausibly will be used in more than one place.

---

## 32. Reusable Hooks

`/packages/core-engine` and app-level shared hooks:

- `useAnalysisResult(elementId?)` — subscribes to the relevant slice of live results with selector-based memoization.
- `useCommand()` — returns a `dispatch` bound to the command bus, used by every interactive tool.
- `useDraggable(entityId, options)` — shared drag physics/snap logic for canvas entities.
- `useSnap(candidatePositions, tolerance)` — shared intelligent-snapping logic for supports/loads.
- `useUndoRedo()` — exposes `undo/redo/canUndo/canRedo` bound to `historySlice`.
- `useUnitSystem()` — current display unit preference + conversion helpers, consumed by `<Quantity>` and `NumericInput`.
- `usePlaybackController(commandLog)` — drives Engineering Playback state machine (play/pause/scrub/speed) as a pure, testable controller independent of the rendering components that visualize it.
- `useKeyboardShortcut(binding, handler)` — centralizes shortcut registration so conflicts are detectable in one place (§ platform-wide shortcut registry).
- `useReducedMotion()` — wraps `prefers-reduced-motion` + an in-app override, consumed by all animation code.

---

## 33. Rendering Strategy

- **Canvas/WebGL for the structural diagram itself** (beam, loads, supports, deformation, SFD/BMD, stress visualization) via a thin abstraction over PixiJS/Three.js/Konva (decision + rationale in §50) — chosen for animation performance at scale; **DOM/SVG + React for UI chrome** (panels, dialogs, forms, dashboard cards) where accessibility semantics and layout flexibility matter more than raw draw performance.
- The 2D beam view and diagrams render via a 2D canvas/SVG-hybrid renderer; the 3D/Pseudo-3D beam view is a separate renderer module (Three.js) that shares the same underlying `AnalysisResult` data — both renderers are "views" over identical domain data, never independent sources of truth for what's being displayed.
- Renderer code is organized by *what it draws* (`renderBeamAxis`, `renderSupportGlyph`, `renderMomentDiagram`) as small, independently testable (via pixel/path snapshot) functions composed by a scene graph, not a single monolithic draw function.
- Level-of-detail: at high zoom-out (viewing a long continuous beam), diagram sampling density adapts to avoid overdraw; at high zoom-in, more sample points render for precision — LOD logic is centralized, not duplicated per view.

---

## 34. Caching Strategy

- **Solver memoization**: cache `AnalysisResult` keyed by a content hash of the relevant `StructuralModel` subset (structural sharing means only changed subtrees need rehashing) — dragging a load back to its exact previous position should hit cache and render instantly, not recompute.
- **Section property caching**: standard library sections (I-beams, channels, etc.) have precomputed properties bundled as static data, never recalculated at runtime; custom sections compute once and cache by shape-definition hash.
- **HTTP caching**: `GET` endpoints (templates, section library, material library) are cacheable with proper ETags/`Cache-Control`; the stateless `/analyze` endpoint is safe to cache by request-body hash at a CDN/edge layer for identical repeated requests (useful for shared example models hit by many users).
- **Client persistence caching**: autosave writes to local storage/IndexedDB debounced (not on every keystroke) plus immediately on significant events (before navigation, before a risky operation) — never lose more than a few seconds of work, never thrash storage on every frame of a drag.

---

## 35. Memory Optimization

- Structural model updates use **structural sharing** (Immer-style persistent data structures) so an edit to one load doesn't require cloning the entire model graph — critical for undo/redo history depth and for large continuous-beam/future-frame models.
- Undo/redo history stores **Commands + inverses**, not full model snapshots, bounded to a configurable max depth (default 200 steps) with older history compacted, to avoid unbounded memory growth in long sessions.
- Canvas/WebGL renderers dispose of GPU resources (textures, geometries) explicitly on unmount/model-change — verified via a memory-leak check in the E2E suite that opens/closes many projects in sequence and asserts heap growth stays bounded.
- Large imported geometry (DXF/IFC reference underlays) is streamed/tiled rather than loaded wholesale when it exceeds a size threshold, to keep memory bounded for large site drawings used as backgrounds.

---

## 36. Numerical Stability

- Avoid subtracting nearly-equal large numbers in solver code (catastrophic cancellation) — where an equation is prone to this (e.g., certain deflection integration forms), use the numerically stable reformulation and document why in a comment citing the specific instability avoided.
- Matrix assembly for the stiffness method (future Frame/FE modules) uses well-conditioned formulations and reports the condition number; a near-singular matrix produces a typed `ModelingError` ("structure is nearly unstable — check for redundant or insufficient restraints") rather than returning a wildly inaccurate but non-crashing result.
- Iterative methods (once introduced for nonlinear/dynamic modules) always have a defined convergence criterion, maximum iteration count, and explicit non-convergence error path — never a silent "best effort" result presented as converged.
- All accumulation over many elements (e.g., summing moment contributions along a discretized beam) uses summation orders and, where precision demands it, compensated summation (Kahan summation) to control floating-point drift for long/highly-discretized beams.

---

## 37. Floating Point Precision

- Use IEEE 754 double precision (`number` in JS/TS) throughout; do not introduce mixed precision without explicit justification.
- Never compare floats with `===`; always use the tolerance-aware comparison utilities from `/packages/core-engine/numerics/compare.ts` (§15) both in solver logic (e.g., "is this load at exactly the support location") and in tests.
- Serialization (save/load, API transport) preserves full double precision — never round-trip through a lossy string format without sufficient significant digits (use a fixed, documented minimum of 15 significant digits for JSON serialization of computed results).
- Display rounding (§15) is cosmetic-only and reversible: the underlying stored/serialized value is never overwritten with a rounded display value.

---

## 38. Matrix Solver Standards

- The generalized stiffness-method matrix solver (needed even for V1's more complex beam cases and essential for future Frame/Truss/FE modules) lives in `packages/core-engine/matrix-solver`, independent of any specific element type, operating on abstract stiffness/load vectors so it can be reused unchanged by every future module.
- Use a proven, well-tested linear algebra library (see §50) for the actual matrix decomposition/solve rather than hand-rolling Gaussian elimination, except where a specialized, well-documented method (e.g., banded/sparse solvers for large FE meshes) is justified by profiling data showing the general solver is a bottleneck.
- Every solve reports: the method used, condition number (or an estimate), and iteration count where applicable — surfaced in developer/debug tooling and logged on failure, even though hidden from the typical end-user UI.
- Boundary condition application (support constraints) is implemented via a single, well-tested reduction/penalty method chosen and documented in an ADR — not reimplemented ad hoc per module.

---

## 39. Structural Solver Standards

- Each beam-analysis method (double integration, moment-area, Macaulay's method, unit-load/virtual-work, three-moment/Clapeyron for continuous beams, stiffness/matrix method) is implemented as a discrete, independently-tested strategy behind a common `BeamSolverStrategy` interface, selected automatically based on beam type/complexity (or explicitly by an advanced user/educational mode wanting to see a specific classical method demonstrated) — this directly supports the "Learn Mode shows the method" educational requirement without special-casing the UI per method.
- Every solver strategy returns not just final values but a **derivation trace** (the sequence of intermediate equations/values) used to drive the Formula Explorer and Engineering Playback — the trace is structured data (not prose), so it can be rendered as LaTeX, animated, or narrated by voice, all from one source.
- Solver strategies are pure functions of `(StructuralModel) → Result<AnalysisResult & DerivationTrace, ModelingError>` — no I/O, no globals, no hidden state — enabling trivial parallel testing, server-side reuse, and Web Worker execution.
- Support for future indeterminate/dynamic/FE-based analysis is designed in from day one via the strategy interface being method-agnostic about *how* it solves, only strict about the *shape* of what it returns.

---

## 40. Finite Element Preparation

Even though full FE meshing is a future module (§41 in PRD roadmap), V1's core types are designed so FE is additive, not a rewrite:

- `StructuralModel` already models beams as a sequence of `Node`s connected by `Element`s (not a single opaque "beam" blob) — a simply supported beam with three loads is internally a small number of elements/nodes, the same primitive future dense-FE-mesh beams will use, just with far fewer subdivisions.
- The matrix solver (§38) already operates generically on nodal DOFs and element stiffness matrices — a future FE module contributes new `Element` stiffness-matrix implementations (e.g., higher-order beam elements, plate elements) without touching the solver core.
- Section/material property computation is already decoupled from element count, so refining mesh density in the future doesn't require touching material/section code.
- Result storage already supports per-node/per-element granularity (not just "the beam's" single result), so increasing element count for FE precision is a data-volume change, not a data-model change.

---

## 41. Future Expandability

- New engineering modules (Frame, Truss, Slab, Column, Footing, Retaining Wall, Steel Design, RC Design, Bridge, Prestressed Concrete, Dynamics/Seismic/Wind, Soil-Structure Interaction) are added as new `packages/modules/<name>` packages implementing the `ModuleDefinition` contract (§3.3, §42) — never by branching or special-casing the Beam module's code.
- Feature flags (`/packages/core-engine/flags`) gate in-progress modules/features so partially-built work can land on `main` continuously (supporting trunk-based development, §19) without being exposed to users before it's ready.
- The UI shell (toolbox, panel registry, canvas tool registry) has zero hardcoded knowledge of "Beam" — it renders whatever the currently active module(s) register. Adding Frame Analysis should require zero changes to shell code, only a new module package plus registration.
- Version the `StructuralModel` schema explicitly (`schemaVersion` field) with migration functions, so old saved projects remain loadable as the model evolves to support new module types.

---

## 42. Plugin Architecture

### 42.1 Module Contract

```ts
interface ModuleDefinition {
  id: string;                         // 'beam', 'frame', 'truss', ...
  displayName: string;
  elementTypes: ElementTypeDefinition[];
  loadTypes: LoadTypeDefinition[];
  solverStrategies: BeamSolverStrategy[]; // or generalized SolverStrategy
  resultVisualizers: ResultVisualizerDefinition[];
  toolboxEntries: ToolboxEntryDefinition[];
  inspectorPanels: InspectorPanelDefinition[];
  reportSections: ReportSectionDefinition[];
}
```

- Registration happens through a central `ModuleRegistry` at app bootstrap; modules are otherwise unaware of each other and of the shell's internals — they only implement the contract's interfaces.
- Third-party/external plugin support (Plugin Marketplace in the PRD roadmap) uses the **same contract**, sandboxed (Web Worker + a restricted capability API for touching the model only via the Command bus, §7.3) — internal modules and external plugins are architecturally the same kind of citizen, differing only in trust/sandboxing level, so investment in the internal module system directly pays off the external plugin system later.
- Scripting/automation (Python scripting, batch processing) is implemented as a headless client of the exact same Command bus and `/analyze` API used by the interactive UI and by AI features — one integration surface serves humans, scripts, and AI uniformly.

---

## 43. AI Integration Standards

- Every AI feature (Beam Builder, AI Tutor, AI Reviewer, AI Optimization, AI Error Detection, AI Report Writer, AI Explanation Engine) is specified with explicit **inputs, outputs, and failure behavior** before implementation — no AI feature ships as an open-ended "chat with the model" without a defined task contract.
- **AI never mutates the model directly.** AI Beam Builder and AI Reviewer/Optimizer propose **Commands** (§7.3, §8.2) that the user previews and confirms (or, for low-risk/explicitly-configured auto-apply flows, are applied but always appear distinctly in undo history tagged `source: 'ai'` and are one click to revert).
- **AI never fabricates engineering results.** Explanation/tutoring features are grounded by passing the actual computed `AnalysisResult` and `DerivationTrace` (§39) into the prompt context — the AI explains *this* beam's *actual* numbers, never guesses or free-associates a plausible-sounding value. Any AI output presenting a numeric engineering value must be traceable to the solver's actual output, verified programmatically before display (reject/regenerate if the AI's stated number doesn't match the ground truth within tolerance).
- AI Error Detection/Reviewer runs the same validation rules as the core solver's pre-solve checks (§14.3) plus higher-level design-sense heuristics (e.g., "utilization ratio is unusually low — section may be oversized") — implemented as inspectable, testable rule functions, not opaque prompt-only logic, so its suggestions can be unit tested like any other feature.
- All AI prompts/templates are versioned in `/packages/ai-copilot/prompts` with changelogs, since prompt changes are behavior changes and need the same review rigor as code changes.
- Token/cost budgets and latency budgets are defined per AI feature; every AI call has a graceful degraded/offline fallback (e.g., Formula Explorer still works from static content if AI Explanation Engine is unavailable) — the app never becomes unusable because an AI service is down.

---

## 44. Report Generation Standards

- Reports are generated by `packages/report-engine`, a headless package independent of the UI, driven by the same `AnalysisResult`/`StructuralModel` types — so reports can be generated server-side, from the CLI/SDK, or client-side identically.
- Report content is composed from the same `ReportSectionDefinition`s each module registers (§42) — a Frame module automatically contributes its own report sections without the report engine needing Frame-specific code.
- Every number in a report is rendered through the same `<Quantity>`-equivalent formatting logic used in the UI (a shared formatting utility, not a duplicated implementation) — a report must never disagree with the on-screen value due to divergent rounding/formatting logic.
- Reports are deterministic: the same project state and template always produce byte-identical (or, for PDF, pixel-identical modulo timestamp/metadata) output — required for revision history, digital signatures, and approval workflows to mean anything.
- Company branding/letterhead, engineer details, and digital signature blocks are template-driven, stored per-project/per-organization, never hardcoded.

---

## 45. Export Standards

- Every export format (PDF, PNG, SVG, CSV, JSON, DXF, IFC) has: a defined schema/spec reference, a round-trip test where re-import is supported (§17), and a versioned format identifier embedded in the export (so a future importer can detect and migrate older exports).
- JSON export of a project is the canonical, fully-lossless format (it *is* the serialized `StructuralModel` + results) — all other export formats are derived, potentially-lossy views for specific purposes (drafting, spreadsheets, presentation), and are documented as such so users understand which format to use for which purpose (e.g., "use JSON to reopen this exact project; use DXF to bring the geometry into your CAD tool").
- CSV export of results (SFD/BMD sample points, reaction tables) uses a stable, documented column schema versioned alongside the JSON schema.

---

## 46. File Organization

(See §4 for the full tree.) Additional rules:
- Test files live adjacent to source (`Foo.ts` + `Foo.test.ts`) for unit tests; cross-cutting solver verification and E2E live in top-level `/tests` since they span multiple packages.
- Static reference data (standard section library, standard material library) lives in versioned JSON/data files under `packages/core-engine/data`, not hardcoded in TypeScript literals, so it can be updated/extended (including by future user-contributed custom libraries) without a code change.
- Every ADR (§22) is numbered sequentially and never renumbered/deleted, even if superseded — superseding ADRs reference the ones they replace, preserving decision history.

---

## 47. Internationalization & Localization

- All user-facing strings go through an i18n layer (e.g., `react-i18next` or equivalent) from day one — no hardcoded English strings in components, enforced by a lint rule scanning for bare string literals in JSX text nodes outside designated exceptions (icons' `aria-label`s still route through i18n too).
- Units localization is separate from language localization: a user can read the UI in French while displaying results in US customary units, or vice versa — the `UnitSystem` (§2.3) and the language locale are independent settings.
- Number formatting (decimal separators, thousands separators, significant digits) respects locale via `Intl.NumberFormat`, wrapped inside the shared `<Quantity>` primitive so this is handled once, not per-component.
- Right-to-left language support is planned for from the start in layout (logical CSS properties — `margin-inline-start` not `margin-left`) even before RTL languages are actually shipped, to avoid a costly retrofit.
- Engineering terminology translation is reviewed by someone with domain fluency in the target language, not machine-translated blindly — "moment," "shear," "deflection" have precise technical meanings that generic translation tools frequently get wrong.

---

## 48. Versioning & Release Strategy

- Semantic Versioning for the platform (`MAJOR.MINOR.PATCH`) and independently for `packages/core-engine` and the public SDK, since the SDK has external consumers who need a stable, clearly-versioned contract distinct from the app's own release cadence.
- `MAJOR` bump: breaking change to the `StructuralModel` schema without an automatic migration, breaking API v(n) contract, or breaking SDK public surface.
- `MINOR` bump: new module, new load/support/material type, new AI feature, backward-compatible API additions.
- `PATCH` bump: bug fixes, performance improvements, non-breaking solver corrections (any solver correction affecting computed results, even a patch, requires a clear changelog entry and, if it changes previously-shipped results, a prominent release note — silently changing engineering answers between versions without disclosure is unacceptable).
- Release branches (`release/x.y`) get a stabilization period (test-only fixes, no new features) before tagging; hotfixes cherry-pick from `main` or land directly on the release branch and are back-merged.
- A **changelog is mandatory** for every release, auto-generated from Conventional Commits (§21) and hand-annotated for anything affecting computed engineering results.

---

## 49. Long-Term Vision

The architecture, conventions, and standards in this document are chosen specifically so that:

- **Beam Analysis (V1)** proves out the full stack — live solving, Playback, AI Copilot, reporting, plugin architecture — on the simplest possible engineering domain, so every subsequent module (Frame, Truss, Slab, Column, Footing, Retaining Wall, Steel/RC Design, Bridge, Prestressed Concrete, Dynamics/Seismic/Wind, Soil-Structure Interaction, full FE) is primarily *new domain logic behind an existing contract*, not new architecture.
- The **headless core-engine + command bus** design means the same computational core eventually powers: the interactive web app, a Python SDK for scripted/batch structural analysis, a REST API for third-party integration, a plugin marketplace, and potentially a VR/AR/digital-twin front end — all without re-deriving the engineering logic per surface.
- **Determinism, full test coverage, and citation-backed calculations** are what let this platform credibly progress from "educational and exploratory" toward being trustworthy enough for real stamped engineering work — the bar that CSI, Bentley, and Autodesk tools must meet, and the bar this codebase holds itself to from the very first commit.

---

## 50. Recommended Libraries by Subsystem

| Subsystem | Recommendation | Rationale |
|---|---|---|
| UI framework | React 18+ (concurrent features) | Ecosystem maturity, concurrent rendering helps keep canvas interaction smooth alongside heavier panel content |
| Build tool | Vite | Fast HMR critical for iterating on canvas/animation code |
| State management | Zustand (core) + Reselect-style selectors | Minimal boilerplate, good performance characteristics for high-frequency canvas-driven updates; Redux Toolkit acceptable alternative if team prefers stricter conventions |
| Canvas/2D rendering | Custom thin layer over Konva or PixiJS | High-performance 2D scene graph with good hit-testing/dragging support for many interactive entities |
| 3D rendering | Three.js (r150+) | Industry standard, large ecosystem, sufficient for pseudo-3D/3D beam and future frame/truss visualization |
| Charts (dashboard, non-diagram) | Recharts or a custom D3-based layer for SFD/BMD (needs precise path morphing control D3 gives directly) | Recharts for KPI/summary charts; hand-rolled D3/canvas for engineering diagrams where exact animation control matters |
| Animation | Framer Motion (DOM/SVG chrome) + custom RAF tweening controller (canvas data) | Framer Motion covers UI polish cheaply; canvas data animation needs frame-precise control Framer Motion doesn't give for arbitrary path interpolation |
| Math/linear algebra | ml-matrix or a WASM-compiled solver (e.g., via Eigen compiled to WASM) for heavier future FE workloads | Start with a well-tested JS matrix library for V1's needs; graduate to WASM once mesh sizes in future modules demand it — decision documented as an ADR when triggered |
| Symbolic/formula rendering | KaTeX | Fast, high-quality LaTeX rendering for Formula Explorer and derivation traces |
| Schema validation | zod | Runtime validation matching TS types at trust boundaries (§24) |
| Testing (unit/integration) | Vitest | Fast, Vite-native, Jest-compatible API |
| Property-based testing | fast-check | Mature, well-integrated with Vitest/Jest |
| E2E/visual regression | Playwright | Cross-browser, strong screenshot-diff and accessibility tooling support |
| PDF generation | pdf-lib or a headless-Chromium HTML-to-PDF pipeline (Puppeteer) for richly laid-out reports | pdf-lib for precise programmatic control where needed; Puppeteer-based HTML templates when report layout complexity favors CSS layout over manual PDF drawing — pick per report type, document the choice |
| DXF/DWG import-export | dxf-parser / dxf-writer (DWG typically requires a commercial conversion service/library due to closed format) | Open format (DXF) has viable open libraries; DWG interoperability likely needs a licensed SDK — flagged as a build-vs-buy decision in an ADR |
| IFC (BIM) | web-ifc | Purpose-built, actively maintained WASM IFC parser |
| Backend framework | Node.js + Fastify (or NestJS if the team prefers stronger structure/DI conventions) | Fast, TypeScript-first, good fit for a typed API shared with the client |
| API layer | tRPC for internal app-to-backend calls; OpenAPI-documented REST for the public/external API and SDK | tRPC gives end-to-end type safety for the app itself; public API needs a stable, language-agnostic contract for external integrators |
| Database | PostgreSQL (project/user data) + object storage (S3-compatible) for exported files/large assets | Relational integrity for structured project/version data; object storage for binary exports |
| Auth | Auth0 / Clerk / equivalent managed OIDC provider | Avoid hand-rolling auth; managed providers handle the hard security edges |
| Realtime/collaboration | WebSockets (e.g., via a Yjs CRDT layer) built on the Command bus | Commands are naturally CRDT-friendly operations; Yjs gives proven conflict resolution primitives rather than a bespoke OT implementation |
| CI/CD | GitHub Actions + a merge queue for E2E/visual gating | Wide ecosystem support, straightforward integration with the gating strategy in §19 |
| Monitoring/error tracking | Sentry | Strong source-map support for pinpointing exact failing solver code in production |
| Feature flags | LaunchDarkly or an in-house flag service reading from `core-engine/flags` | Enables the trunk-based, module-by-module rollout strategy in §41 |

---

## 51. Rules for Adding a New Engineering Module

A new module (Frame, Truss, Slab, etc.) is not "done" until it satisfies every item below — this is the Definition of Done for a module, distinct from the Definition of Done for a single PR (§23):

1. Implements the full `ModuleDefinition` contract (§42) — no shell code changes required to register it.
2. Defines its `Element`/`Load`/`Support` types as extensions compatible with the shared `StructuralModel` node/element primitives (§40) — no parallel, incompatible modeling concepts.
3. Ships at least one `BeamSolverStrategy`-equivalent solver strategy with a full `DerivationTrace` (§39), not just a final-answer calculator.
4. Has ≥3 hand-verified reference cases per supported element/load combination checked into `/tests/solver/fixtures`, with citations (§14.4).
5. Achieves 100% statement coverage in its solver directory (§16) before merge to `main` behind its feature flag.
6. Registers report sections (§44), export support for at least JSON (canonical) and one domain-appropriate format, and result visualizers following the shared visualization standards (§13).
7. Passes the full accessibility checklist (§11) for every new screen/panel it introduces.
8. Has an ADR documenting its solver method choice, any new dependency introduced, and any deviation from an existing convention (with justification).
9. Ships an educational "Theory" doc (§22) suitable for the Formula Explorer/Learn Mode.
10. Is demonstrated end-to-end in at least one E2E test (§18) exercising create → live-analyze → Playback → export/report.

---

## 52. Determinism & Verifiability Checklist

Applies to every solver-touching change, enforced in code review (§23) and, where automatable, in CI:

- [ ] No use of `Math.random()`, wall-clock time, or non-deterministic iteration order anywhere in the solve path.
- [ ] Given identical `StructuralModel` input (including floating point bit-for-bit), output `AnalysisResult` is bit-for-bit identical across repeated runs and across supported platforms/browsers (verified by a cross-platform CI matrix for solver tests specifically).
- [ ] Every returned numeric result is traceable to a specific line/step in the `DerivationTrace` — no value appears in the UI that cannot be explained by walking the trace.
- [ ] Every new or modified calculation has a citation to a named, checkable reference (textbook, code clause) in `/docs/verification/`.
- [ ] Tolerances used in tests are justified by the numerical method, not chosen to make a test pass (§15).
- [ ] A changed calculation that affects previously-shipped results is called out explicitly in the changelog (§48), never a silent drift.

---

*End of CLAUDE.md. This document is itself under version control and subject to the same PR review process as code — propose changes via PR, justify with an ADR if the change is architecturally significant, and keep it in sync with reality: a handbook nobody follows because it drifted from the actual codebase is worse than no handbook at all.*
