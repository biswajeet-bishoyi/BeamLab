# ADR-088: Interactive 3D Wind Aerodynamics Studio UI

## Status
Accepted

## Context
Structural and facade engineers designing low-rise and tall buildings require an intuitive, visual, and highly interactive computational aerodynamics studio to configure atmospheric boundary layer wind velocity profiles, determine MWFRS and C&C pressure distributions, evaluate dynamic along-wind resonant gust effects and cross-wind vortex shedding lock-in risks, and audit high-rise occupant comfort accelerations against international standards (ISO 10137 / AIJ) with Tuned Mass Damper (TMD) mitigation sizing.

Prior to Sprint B13.5, `@beamlab/wind-engine` provided the underlying analytical calculation kernels (Sprints B13.1–B13.4), but `apps/web` lacked an integrated UI for structural wind engineering.

## Decision
We implemented the **Interactive 3D Wind Aerodynamics Studio UI (`apps/web/src/features/wind/WindStudio.tsx`)**:

1. **Multi-Standard Codified Profiles (Tab 1: Wind Profile & Velocity Pressure)**:
   - Real-time parameter tuning for ASCE 7-22 (Exposure B, C, D, $K_z$, $K_{zt}$, $K_d$, $K_e$, Risk Category I–IV), Eurocode 1 EN 1991-1-4 (Terrain Category 0–IV, $c_r(z)$, $c_o(z)$, $I_v(z)$, $q_p(z)$), and IS 875 Part 3: 2015 (Terrain Category 1–4, $k_1, k_2, k_3, k_4$).
   - Interactive SVG logarithmic boundary layer wind velocity profile chart comparing current standard height curve with building elevation and reference gradient height.
   - Comprehensive telemetry display of base velocity, reference velocity pressure $q_h$, peak gust velocity $v_{gust}$, and turbulence intensity $I_v(h)$.

2. **Building Aerodynamic Pressure & MWFRS / C&C Loads (Tab 2: Facade Pressures & MWFRS)**:
   - Dynamic 3D building isometric projection displaying windward positive pressure (+0.80), leeward suction (-0.50 to -0.20 based on $L/B$), sidewalls (-0.70), and suction eddies.
   - External pressure coefficient distribution $C_p$ and internal pressure enclosure classification ($GC_{pi} = \pm 0.18, \pm 0.55, 0.0$).
   - Multi-story wind lateral force distribution table showing tributary heights, cumulative story shears $V_i$, and total base overturning moment $M_{OTM}$.
   - Components & Cladding (C&C) localized perimeter suction zone calculation ($a = \min(0.1 B, 0.4 h) \ge 3\text{ ft}$) with wall and roof corner suction factors.

3. **Dynamic Along-Wind Gust Effect & Vortex Lock-In (Tab 3: Dynamic Gust & Vortex Lock-In)**:
   - Rigid ($n_1 \ge 1.0\text{ Hz}$, $G = 0.85$) vs Flexible ($n_1 < 1.0\text{ Hz}$, $G_f$) gust effect factor calculator implementing Davenport/Kaimal velocity spectrum, background factor $Q$, and resonant factor $R$.
   - Along-wind dynamic lateral force comparison between rigid and flexible gust responses.
   - Vortex shedding lock-in evaluation using Strouhal number $St = 0.14$, critical lock-in velocity $v_{crit} = b f_1 / St$, and 125% design velocity safety threshold check.
   - Scruton number $Sc$ calculation, peak cross-wind roof amplitude $y_{max}$, and base transverse shear telemetry.

4. **Occupant Comfort & Tuned Mass Damper Sizing (Tab 4: Occupant Comfort & TMD)**:
   - Peak resultant wind-induced acceleration $a_{peak} = \sqrt{a_x^2 + a_y^2}$ evaluation in milli-g.
   - Multi-period (1-year, 5-year, 10-year) return period serviceability audit against ISO 10137 residential/office thresholds.
   - Color-coded motion perception grading (`NOT_PERCEPTIBLE`, `THRESHOLD_PERCEPTION`, `NOTICEABLE_DISCOMFORT`, `UNACCEPTABLE_DISCOMFORT`).
   - Tuned Mass Damper (TMD) engineering dashboard: target modal damping ratio $\xi_{target}$, optimized mass ratio $\mu$, total TMD mass in tonnes, and optimum tuning frequency $f_{TMD}$.

5. **Calculation Note & Export (Tab 5: Calculation Report)**:
   - Formatted engineering verification report with code citations, formulas, and parameters.
   - One-click copy-to-clipboard functionality for seamless incorporation into structural design documents.

6. **Web Workspace Integration**:
   - Registered `windStudioOpen` and `setWindStudioOpen` in `apps/web/src/store/index.ts`.
   - Added interactive "Wind" button with dynamic blue/indigo gradient styling and tooltip in `apps/web/src/layouts/TopNav.tsx`.
   - Mounted `WindStudio` overlay inside `apps/web/src/layouts/WorkspaceLayout.tsx` with Framer Motion transitions.

## Consequences
- Structural engineers have a comprehensive, interactive computational wind engineering suite built directly into the BeamLab web workspace.
- Seamless multi-standard aerodynamic calculations across ASCE 7-22, Eurocode 1, and IS 875.
- 100% test passing rate across all 45 monorepo projects, zero external runtime dependencies in `@beamlab/wind-engine`.
