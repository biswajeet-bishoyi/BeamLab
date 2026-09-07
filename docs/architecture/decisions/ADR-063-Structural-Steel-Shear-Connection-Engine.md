# ADR-063: Structural Steel Shear Connection Engine

## Status
Accepted

## Context
In structural framing, simple shear connections transfer gravity shear reactions between beams, girders, and columns while allowing beam ends to rotate freely under load, behaving as idealized structural pins.

Engineers commonly employ:
1. **Single-Plate Shear Connections (Shear Tabs / Fin Plates)**: A single steel plate shop-welded to a supporting member (column flange, column web, or girder web) and field-bolted to the supported beam web.
2. **Double Web Angle Connections (Clip Angles)**: A pair of hot-rolled angles bolted to the beam web and either bolted or welded to the support.

Prior to Sprint B8.2, BeamLab had bolt and weld mechanics (Sprint B8.1) but lacked comprehensive connection assembly evaluators capable of checking interaction among bolt groups, plate limit states, beam web failure modes, and weld eccentricities.

## Decision
We implemented the **Shear Connection Engine** in `packages/connection-engine/src/shear/`:

### 1. Domain Models (`ShearConnectionTypes.ts`)
- `SinglePlateConfig`: Thickness $t_p$, height $h_p$, width $w_p$, steel grade, bolt layout (rows, columns, pitch $p$, gage $g$, edge distances $e_v, e_h$), weld size $w$, distance $a$ from support to bolt line.
- `DoubleAngleConfig`: Angle sizes ($L_1 \times L_2 \times t_a$), beam web bolt layout, support attachment (bolted or welded).
- `BeamSectionGeometry` & `CopedBeamGeometry`: Depth, flange dimensions, web thickness $t_w$, yield strength $F_y$, and cope depths/lengths.
- Standardized `ShearConnectionEvaluation` returning the governing limit state, capacity, utilization, and full step-by-step LaTeX audit formulas.

### 2. Block Shear Rupture Engine (`BlockShearEngine.ts`)
- Generalized 2D block shear path evaluation for shear tabs, clip angles, and beam webs:
  - Gross and net shear areas ($A_{gv}, A_{nv}$) with $(n - 0.5) d_h$ bolt hole deductions.
  - Gross and net tension areas ($A_{gt}, A_{nt}$) with $0.5 d_h$ deductions.
  - **AISC 360-16 Section J4.3 (Eq. J4-5)**:
    $$R_n = 0.60 F_u A_{nv} + U_{bs} F_u A_{nt} \le 0.60 F_y A_{gv} + U_{bs} F_u A_{nt}$$
    with $\phi = 0.75$ and $U_{bs} = 1.0$.
  - **Eurocode 3 EN 1993-1-8 Clause 3.10.2 (Block Tearing)**:
    $$V_{eff,1,Rd} = \frac{f_u A_{nt}}{\gamma_{M2}} + \frac{f_y A_{nv} / \sqrt{3}}{\gamma_{M0}}$$
    with $\gamma_{M2} = 1.25$ and $\gamma_{M0} = 1.0$.

### 3. Single-Plate Shear Engine (`SinglePlateShearEngine.ts`)
- Evaluates conventional vs. extended shear tabs:
  - Conventional criteria ($a \le 89\text{ mm}$): Reduced effective eccentricity ($e_{eff} = a - 25\text{ mm}$) per AISC 15th Ed. Manual Table 10-9 with Instantaneous Center of Rotation (ICR) bolt group capacity.
  - Extended criteria ($a > 89\text{ mm}$): Full eccentricity $e = a$, ICR analysis, plus plate flexural yielding ($M_n = F_y Z_p$).
- Full limit state sweep:
  1. Bolt group shear under eccentric load.
  2. Plate gross shear yielding ($0.60 F_y A_{gv}$, $\phi = 1.00$).
  3. Plate net shear rupture ($0.60 F_u A_{nv}$, $\phi = 0.75$).
  4. Plate block shear rupture.
  5. Bolt hole bearing and tearout on plate (AISC Section J3.10).
  6. Bolt hole bearing and tearout on beam web.
  7. Double fillet weld to support under combined shear and weld moment ($V \times a$).

### 4. Double Web Angle Engine (`DoubleAngleShearEngine.ts`)
- Evaluates all-bolted and welded/bolted double clip angles:
  1. Beam web bolts double shear capacity ($\phi R_n = 2 \cdot \phi F_{nv} A_b$).
  2. Bolt bearing on beam web ($t_w$).
  3. Double angle gross shear yielding ($2 \cdot 0.60 F_y A_g$).
  4. Double angle net shear rupture ($2 \cdot 0.60 F_u A_{nv}$).
  5. Double angle block shear rupture.
  6. Support attachment capacity (shear in outstanding leg bolts or double fillet weld).

## Consequences

### Positive
- Fully automated structural shear connection verification matching AISC 15th Ed. Manual and Eurocode 3.
- Automatic identification of governing failure modes and minimum connection capacity.
- Zero black-box calculations: complete step-by-step mathematical transparency with LaTeX formulas.

### Trade-offs
- Beam local web buckling and coped beam net section checks assume standard rectangular cope geometries.
