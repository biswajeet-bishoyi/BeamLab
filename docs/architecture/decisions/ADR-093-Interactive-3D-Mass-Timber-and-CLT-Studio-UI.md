# ADR-093: Interactive 3D Mass Timber & CLT Studio UI

## Status
Accepted

## Context
Structural engineers designing sustainable mass timber structures (Glued Laminated Timber, Cross-Laminated Timber panels, and engineered wood connections) need an integrated, visual, and highly interactive studio within the BeamLab web workspace.
Key requirements include:
1. Codified wood species database and environmental modification factor controls across Eurocode 5, NDS 2024, and IS 883:1994.
2. Interactive Hankinson off-axis bearing strength curve visualizer ($0^\circ$ to $90^\circ$).
3. Complete Sawn Timber & Glulam beam-column verification (lateral torsional buckling $k_{crit} / C_L$, column buckling $k_c / C_P$, combined P-$\delta$ interaction, longitudinal shear with crack factor $k_{cr}$, and creep deflection).
4. 3D multi-layer CLT layup inspector with real-time gamma method $(EI)_{eff}$, $(GA)_{eff}$, interlaminar rolling shear check, and floor vibration natural frequency ($f_1 \ge 8.0\text{ Hz}$).
5. European Yield Model (EYM) Johansen failure mode inspection (Modes I–IV) and ISO 834 fire charring time progression with residual cross-section visualization.
6. Professional calculation report with one-click copy.

## Decision
We implemented the **Interactive 3D Mass Timber & CLT Studio UI (`apps/web/src/features/timber/TimberStudio.tsx`)**:

1. **Tab 1: Wood Species & Modification Factors**:
   - Standard selector (Eurocode 5, NDS 2024, IS 883).
   - Species/Grade selector spanning Softwood (C16, C24, C30, DF-L No.1, SP No.2), Glulam (GL24h, GL28h, GL32h, 24F-1.8E), Hardwood (D30, Teak, Sal), and Indian species (Deodar).
   - Modification parameters: Service Class (1, 2, 3), Load Duration (Permanent to Instantaneous / NDS durations), wet service toggle, and temperature adjustments.
   - Live telemetry cards: $f_{m,d}, f_{c,0,d}, f_{v,d}, E_{0,eff}$.
   - Interactive SVG Hankinson curve displaying $f_c(\theta)$ from $0^\circ$ to $90^\circ$ with live angle scrubbing.

2. **Tab 2: Sawn & Glulam Member Design**:
   - Cross-section dimensions ($b, d, L, l_u$) and applied design demands ($N, M_y, M_z, V_z$).
   - Real-time audit cards: Lateral Torsional Buckling ($k_{crit} / C_L$), Column Stability ($k_c / C_P$), Longitudinal Shear ($k_{cr} = 0.67$), and Creep Deflection ($w_{fin} \le L / 250$).
   - Overall compliance badge with combined interaction index.

3. **Tab 3: CLT Layup & Rolling Shear**:
   - Standard CLT layup presets (3-ply 60mm, 3-ply 100mm, 5-ply 140mm, 7-ply 210mm).
   - 3D layer visualization with alternating warm amber ($0^\circ$ longitudinal) and emerald ($90^\circ$ transverse) textures.
   - Gamma method $(EI)_{eff}$ and Kreuzinger $(GA)_{eff}$ stiffness computations.
   - Bending DCR, interlaminar rolling shear DCR, and floor natural vibration frequency $f_1$ (Hz).

4. **Tab 4: Fastener Yield & Fire Charring**:
   - Fastener selection (bolts, dowels, screws, nails), diameter $d$, strength $f_{u,k}$, member thicknesses $t_1, t_2$.
   - Complete Johansen European Yield Model (EYM) comparison displaying capacity for all 6 failure modes (Mode I_m, Mode I_s, Mode II, Mode III_m, Mode III_s, Mode IV) and ductility classification.
   - Group action calculator ($n_{ef}$) and codified spacing verification ($a_1, a_2, a_3, a_4$).
   - Standard ISO 834 fire charring simulation: Time scrubber (0 to 120 mins), 4-sided/3-sided exposure, residual cross-section visualizer displaying burned envelope vs sound structural core, and residual moment resistance $M_{fi,Rd}$.

5. **Tab 5: Calculation Report**:
   - Engineering note formatted for structural submittals with one-click copy to clipboard.

6. **Web Workspace Integration**:
   - Bound `timberStudioOpen` and `setTimberStudioOpen` in `apps/web/src/store/index.ts`.
   - Added "Timber" button with Trees icon and emerald-amber gradient styling in `apps/web/src/layouts/TopNav.tsx`.
   - Mounted `<TimberStudio />` inside `apps/web/src/layouts/WorkspaceLayout.tsx` with Framer Motion transitions.

## Consequences
- Engineers have an interactive, dedicated mass timber engineering suite directly integrated into the BeamLab web workspace.
- 100% build and test pass across all 46 projects in the monorepo.
