# ADR-087: High-Rise Occupant Comfort and Acceleration Auditor

## Status
Accepted

## Context
High-rise buildings and slender towers designed purely for ultimate strength often suffer from serviceability failure caused by wind-induced horizontal sway:
1. Low-frequency wind oscillations (between 0.1 and 0.5 Hz) induce inner-ear vestibular motion sickness, disorientation, and anxiety among occupants on upper floors.
2. Building codes and international guidelines govern habitability based on peak horizontal accelerations rather than lateral deflection drift alone:
   - **ISO 10137:2007**: Establishes 1-year and 5-year storm return period peak acceleration limits for residential (typically 4.5–8.0 milli-g) and office buildings (7.0–12.0 milli-g).
   - **AIJ Guidelines (Architectural Institute of Japan)**: Establishes habitability perception curves H-10 through H-90.
   - **ASCE Serviceability Guide**: Recommends 15–20 milli-g limits for 10-year storm events.
3. When lateral accelerations exceed allowable thresholds, structural engineers require rapid preliminary sizing for Tuned Mass Dampers (TMDs) or supplemental damping to restore compliance without completely overhauling the core structural frame.

## Decision
We implemented `OccupantComfortAuditor` in `@beamlab/wind-engine`:
- **Peak Dynamic Acceleration Calculation**:
  - Along-wind peak acceleration: $a_x = g_R \cdot \frac{F_{dyn}}{M_1}$ with modal generalized mass $M_1 \approx \frac{1}{3} M_{total}$.
  - Cross-wind vortex/wake buffeting acceleration: $a_y$ determined from reduced wind velocity $V_{red} = V_h / (f_y B)$.
  - Resultant peak horizontal acceleration: $a_{peak} = \sqrt{a_x^2 + a_y^2}$ (in milli-g).
- **ISO 10137 & AIJ Compliance**:
  - Automatically evaluates allowable acceleration limits based on occupancy type (`RESIDENTIAL`, `OFFICE`, `HOTEL`) and storm return period (`1_YEAR`, `5_YEAR`, `10_YEAR`).
  - Classifies motion perception into `NOT_PERCEPTIBLE`, `PERCEPTIBLE_QUIET`, `MODERATE_MOTION`, and `UNACCEPTABLE_DISCOMFORT`.
- **Tuned Mass Damper (TMD) Automated Sizing**:
  - When non-compliant ($D/C > 1.0$), calculates required supplemental damping ratio $\Delta \xi = \xi (D/C)^2 - \xi$.
  - Sizes TMD mass ratio $\mu$, required physical damper mass in tonnes, and optimal tuning frequency $f_{tmd} = f_1 / (1 + \mu)$ per Den Hartog optimal tuning theory.

## Consequences
- High-rise structural engineers can instantly verify serviceability compliance and habitability criteria directly in the design phase.
- Clear mitigation recommendations provide immediate feasibility data for supplemental damping systems.
