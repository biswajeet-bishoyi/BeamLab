# ADR-082: Seismic Story Drift, Diaphragm & Torsional Irregularity Diagnostics

## Status
Accepted

## Context
Code-compliant seismic design requires rigorous checking of inter-story drift limits, second-order P-Delta dynamic stability coefficients, and plan torsional irregularity to protect structural elements and avoid catastrophic collapse.
Engineers must adhere to:
1. **ASCE 7-22 Section 12.8.6 & 12.12**:
   - Design displacement calculation $\delta_x = \frac{C_d \delta_{xe}}{I_e}$.
   - Allowable story drift limits $\Delta_a$ classified by Risk Category (I/II: 0.020 $h_{sx}$, III: 0.015 $h_{sx}$, IV: 0.010 $h_{sx}$, Masonry: 0.007 $h_{sx}$).
   - P-Delta stability coefficient $\theta = \frac{P_x \Delta I_e}{V_x h_{sx} C_d} \le \theta_{max} = \frac{0.5}{\beta C_d} \le 0.25$.
     - $\theta \le 0.10$: Negligible second-order effects.
     - $0.10 < \theta \le \theta_{max}$: Drift and forces amplified by $\frac{1}{1 - \theta}$.
     - $\theta > \theta_{max}$: Inadmissible dynamic instability (redesign mandatory).
2. **Eurocode 8 EN 1998-1:2004 Section 4.4.3.2**:
   - Damage limitation check $d_r \nu \le \text{limit} \cdot h$ with behavior reduction factor $\nu = 0.4 \text{ or } 0.5$.
3. **IS 1893 (Part 1): 2016 Cl 7.11.1**:
   - Minimum design lateral force: story drift shall not exceed $0.004 h_{sx}$.
4. **Plan Torsional Irregularity (ASCE 7-22 Section 12.3.2.1, Table 12.3-1)**:
   - Type 1a Torsional Irregularity: $\delta_{max} / \delta_{avg} > 1.20$.
   - Type 1b Extreme Torsional Irregularity: $\delta_{max} / \delta_{avg} > 1.40$ (Prohibited in SDC E & F).
   - Accidental eccentricity amplification factor $A_x = \left(\frac{\delta_{max}}{1.2 \delta_{avg}}\right)^2 \le 3.0$.

## Decision
We implemented `StoryDriftAuditor` and `TorsionalIrregularityAuditor` in `@beamstudio/seismic-engine`:

1. **StoryDriftAuditor**:
   - Audits elastic and design story drifts $\Delta_i = \delta_i - \delta_{i-1}$, story drift ratios $\theta_i$, allowable drifts $\Delta_a$, and Demand/Capacity (D/C) ratios.
   - Computes story-by-story P-Delta stability coefficients $\theta$ and amplification factors $\frac{1}{1 - \theta}$.
   - Provides automated engineering diagnostics and actionable recommendations for stiffening or redesign.

2. **TorsionalIrregularityAuditor**:
   - Evaluates diaphragm edge displacements $\delta_{max}$ and $\delta_{min}$.
   - Computes average displacement $\delta_{avg}$ and ratio $\delta_{max} / \delta_{avg}$.
   - Automatically classifies into `NONE`, `TYPE_1A_TORSIONAL`, or `TYPE_1B_EXTREME_TORSIONAL`.
   - Computes codified accidental eccentricity amplification $A_x$ (bounded between 1.0 and 3.0).
   - Validates Seismic Design Category (SDC) compatibility, warning when Type 1b structures are located in prohibited SDC E or F.

## Consequences
- Fast, automated compliance checking across all major building codes.
- Immediate visual warnings of dynamic instability or code-prohibited configurations in the structural design workflow.
- Clean zero-dependency implementation ready for integration into the 3D Seismic Studio.
