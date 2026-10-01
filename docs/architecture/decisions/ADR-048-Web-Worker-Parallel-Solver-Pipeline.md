# ADR-048: Multi-Threaded Web Worker Parallel Solver Pipeline

## Status
Accepted

## Context
Non-linear structural analysis (e.g. ASCE 41-17 incremental static pushover stepping, iterative second-order $P\text{-}\Delta$ Newton-Raphson iterations, and state-switching contact mechanisms) requires heavy matrix factorization and repeated tangent stiffness reassembly. Running these iterative algorithms directly on the browser's main JavaScript thread blocks the UI event loop, causing dropped frames, unresponsiveness, and poor user experience.

Prior to Sprint B4.5, BeamLab had a basic 2D matrix solver worker (`analysis.worker.ts`). However, the advanced Phase B4 3D space frame solvers (`SpaceFrameSolver3D`, `PDeltaSolver3D`, `TensionOnlySolver3D`, `PushoverSolver3D`) ran synchronously on the main thread.

## Decision
We implemented a dedicated multi-threaded parallel solver pipeline:
1. **Background Web Worker (`apps/web/src/workers/spaceFrameParallel.worker.ts`)**:
   - Operates entirely off the main thread as an ES module Web Worker (`type: 'module'`).
   - Handles `SPACE_FRAME_3D`, `PDELTA_3D`, `TENSION_ONLY_3D`, and `PUSHOVER_3D` requests.
   - Posts streaming progress events (`ParallelSolverProgressMessage`) during long-running iterations, updating the stage, progress percentage, current iteration/step, and residual force norm.
2. **Parallel Solver Client (`apps/web/src/engine/ParallelSolverClient.ts`)**:
   - Manages worker instance lifecycle, pending request maps, correlation IDs, and promise resolutions.
   - Provides clean asynchronous methods:
     - `solveSpaceFrame(model, onProgress?)`
     - `solvePDelta(model, options, onProgress?)`
     - `solveTensionOnly(model, options, onProgress?)`
     - `solvePushover(model, options, onProgress?)`
   - Graceful fallback to dynamic in-thread solver execution if running in non-browser environments (e.g., SSR, Node.js unit tests).
3. **UI Fluidity**:
   - The UI thread is kept completely free to render 60 FPS Three.js viewport animations, orbit controls, and results scrubbers while heavy non-linear equilibrium loops compute in the background worker.

## Consequences
- **Positive**: Zero frame drops or browser freezing during 50-step pushover analyses or large 3D space frame assemblies.
- **Positive**: Real-time convergence progress bars and iteration diagnostics can be streamed directly to UI panels.
- **Positive**: Robust environment-agnostic fallback ensures seamless testability in CI and Vitest.
