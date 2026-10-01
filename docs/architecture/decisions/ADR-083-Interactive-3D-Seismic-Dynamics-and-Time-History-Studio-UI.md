# ADR-083: Interactive 3D Seismic Dynamics & Time-History Studio UI

## Status
Accepted

## Context
Engineers performing earthquake-resistant structural design need an integrated, visual, and interactive environment to configure multi-code response spectra, perform modal combination analysis, visualize real-time dynamic response under historic strong-motion earthquakes, and audit drift limits and plan torsional irregularities.
Prior to Phase B12, users lacked a dedicated seismic studio in `apps/web` to configure dynamic spectral parameters, inspect CQC modal correlation matrices $[\rho_{ij}]$, and scrub through step-by-step Newmark direct integration time histories.

## Decision
We implemented the **Interactive 3D Seismic Dynamics & Time-History Studio UI (`apps/web/src/features/seismic/SeismicStudio.tsx`)**:

1. **Tabbed Architecture**:
   - **Tab 1: Response Spectra Generator**:
     - Interactive multi-code design spectrum curves ($S_a(T)$) for ASCE 7-22, Eurocode 8 Type 1/2, and IS 1893:2016.
     - Real-time parameter tuning (Site class / Soil type, $S_{DS}$, $S_{D1}$, $T_L$, PGA, Zone, $R$, $I$, and damping ratio $\xi$ with $\eta$ factor).
     - SVG spectrum chart with dynamic building fundamental mode marker intersecting the response spectrum.
   - **Tab 2: Modal MRSA & Base Shear Scaling**:
     - 5-mode eigenvalue participation breakdown: Periods $T_n$, Frequencies $f_n$, effective modal masses, and cumulative mass ratios.
     - Automatic ASCE 7 / Eurocode 8 90% mass threshold compliance badge.
     - Complete Quadratic Combination (CQC) vs SRSS toggle.
     - Interactive Der Kiureghian cross-modal correlation heatmap matrix $[\rho_{ij}]$.
     - Base shear scaling dashboard comparing Equivalent Lateral Force (ELF) static base shear $V_b$ with dynamic modal shear $V_t$, displaying scale factor $SF$.
   - **Tab 3: Dynamic Time-History Analysis & Playback**:
     - Historic earthquake library (El Centro 1940, Northridge 1994, Kobe 1995, Tohoku 2011) and synthetic harmonic generator.
     - Target PGA scaling slider and baseline drift correction toggle.
     - Direct Newmark-$\beta$ numerical integration solver with interactive play/pause and time scrubber.
     - Real-time animated multi-story stick/shear building deformation visualization displaying instantaneous floor displacements and dynamic base shear telemetry.
   - **Tab 4: Story Drift & Torsional Irregularity**:
     - Multi-story drift audit table checking design story drift $\Delta = C_d \delta_e / I_e$ against codified allowable limits $\Delta_a$, with Demand/Capacity (D/C) ratio indicators.
     - P-Delta second-order stability coefficient $\theta$ check per story level.
     - Diaphragm edge displacement audit checking $\delta_{max} / \delta_{avg}$ and classifying Type 1a / 1b torsional irregularity with accidental eccentricity amplification factor $A_x$.
   - **Tab 5: Calculation Note & Export**:
     - Formatted engineering verification report with code citations, parameters, and one-click copy to clipboard.

2. **Integration into BeamLab Web Workspace**:
   - Added `seismicStudioOpen` and `setSeismicStudioOpen` to the global Zustand store (`apps/web/src/store/index.ts`).
   - Integrated a dedicated "Seismic" studio button in `apps/web/src/layouts/TopNav.tsx`.
   - Mounted `<SeismicStudio />` in `apps/web/src/layouts/WorkspaceLayout.tsx` with smooth AnimatePresence transition overlays.

## Consequences
- Engineers can interactively evaluate seismic demands across international design standards in real time.
- Direct integration time-history playback provides clear visual understanding of dynamic structure response.
- Complete 100% monorepo build and test pass with zero external runtime dependencies.
