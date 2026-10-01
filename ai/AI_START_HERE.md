# 🚀 BeamLab AI Bootloader: START HERE

Welcome, AI Developer Assistant. This document is your entry point to the **BeamLab** codebase. Before writing code, reading files, or proposing architectures, you must bootstrap your understanding using this and the surrounding files in the `/ai/` folder.

By reading this file, you agree to adhere to the strict structural, mathematical, and architectural boundaries established by the BeamLab leadership.

---

## 🗺️ The AI Bible Map

The project knowledge is split into four core documents:
1. **[AI_START_HERE.md](file:///c:/kanha/college/projects/BeamLab/ai/AI_START_HERE.md)** (This file): Your bootstrapping entry point and rules of engagement.
2. **[PROJECT_CONTEXT.md](file:///c:/kanha/college/projects/BeamLab/ai/PROJECT_CONTEXT.md)**: The structural and modular explanation of how BeamLab's subsystems work.
3. **[CURRENT_STATUS.md](file:///c:/kanha/college/projects/BeamLab/ai/CURRENT_STATUS.md)**: Where the project stands today, completed milestones, and the **AI Memory Index** (Q&A router).
4. **[CTO_DECISIONS.md](file:///c:/kanha/college/projects/BeamLab/ai/CTO_DECISIONS.md)**: A single centralized register of every architectural decision (ADR-001 through ADR-022).

---

## 🏛️ Guiding Philosophy

Every engineering decision in BeamLab is driven by these core beliefs:
1. **Correctness is Non-Negotiable; Delight is Mandatory**: Calculations must be provably correct against verified hand-calculation reference files in [docs/verification/](file:///c:/kanha/college/projects/BeamLab/docs/verification) before shipping. The UI must also feel premium, animated, and alive.
2. **The Canvas is the Product**: Form elements and property panels support the canvas—they do not compete with it. Favor direct manipulation on the WebGL/SVG canvas where possible.
3. **Live Feedback Beats Buttons**: Analysis is a background process synchronized to user edits. When a load is dragged, internal force diagrams, deflection curves, and reactions must recompute and animate at 60 FPS.
4. **Numbers Before Pixels**: Never render a diagram or deform geometry before the numeric values are verified. A beautifully animated wrong answer is a critical failure.
5. **Explainability by Default**: Every number on the screen must be traceable to an equation, derivation step, and standard code reference.
6. **Determinism is Sacred**: The same model inputs under the same version must yield identical bit-for-bit results. Non-determinism is a bug.

---

## 🗺️ Codebase Navigation Map

BeamLab is organized as a **pnpm monorepo** managed by **Turborepo**.

```text
BeamLab/
├── apps/
│   ├── web/                    # Main SPA frontend (Vite + React)
│   └── api-gateway/            # Express gateway (schema validation, auth, routing)
├── packages/
│   ├── core-engine/            # Decoupled domain models, geometry, SI units, math, solvers
│   ├── workspace-runtime/      # Workspace UI OS layer, unified API, focus management
│   ├── knowledge-platform/     # Structured engineering codes, material constants, EKP
│   ├── policy-engine/          # Governance, workflow compliance (EPE)
│   ├── resource-manager/       # Standard steel/concrete catalogs, resources (ERM)
│   ├── solver-runtime/         # Solver execution wrapper, queueing, metrics, adapters
│   ├── engineering-reasoning/  # Confidence aggregation, engineering explanations
│   ├── agent-framework/        # Multi-agent sandboxing, communication, negotiation
│   ├── agent-structural-analysis/ # Specialist Structural Analysis Agent (runs pipeline)
│   ├── agent-design/           # Specialist Design Agent (generates section options)
│   ├── design-system/          # UI tokens, react component primitives, KaTeX support
│   ├── ai-copilot/             # Copilot prompts, tool definitions, stream formatters
│   ├── renderer/               # High-performance 2D/3D WebGL rendering primitives
│   └── import-export/          # Adaptors for DXF, IFC, and PDF reporting
└── docs/
    ├── adr/                    # Raw Architectural Decision Records (ADR-006 to ADR-022)
    └── verification/           # Hand-calculation reference sheets
```

---

## 📑 Rules of Engagement

When executing tasks in this codebase, you must:

1. **Maintain Units Discipline**:
   - All internal storage and mathematics are strictly in **SI Base/Derived Units** (meters, newtons, pascals, kilograms, radians).
   - Conversions (e.g. to Imperial or kN) happen **only** at the presentation boundary via the `<Quantity>` primitive.
2. **Mutate State via Commands**:
   - Never mutate state slices directly. State must only mutate by dispatching a `Command` with a corresponding `invert()` handler to support infinite undo/redo, playback, and synchronization.
3. **Write Tests First**:
   - Before writing any solver function, ensure there is a hand-calculated reference in `docs/verification/` and a corresponding test suite in `tests/`.
4. **Adhere to Naming Conventions**:
   - React Components: `PascalCase.tsx`
   - Solver Functions: `camelCase()` (verb-first)
   - Commands: `PascalCaseCommand`
   - Selectors: `selectCamelCase`
   - Constants: `SCREAMING_SNAKE_CASE`
5. **No Direct Agent Communication**:
   - Agents never call each other directly. They interact through the `WorkspaceRuntime` event bus and shared memory scopes.
