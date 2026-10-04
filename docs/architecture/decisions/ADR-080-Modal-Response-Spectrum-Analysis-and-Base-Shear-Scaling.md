# ADR-080: Modal Response Spectrum Analysis (MRSA) and Base Shear Scaling Engine

## Status
Accepted

## Context
Modal Response Spectrum Analysis (MRSA) is the standard dynamic analysis procedure permitted for regular and irregular building structures across all seismic design categories. 

Key codified MRSA requirements include:
1. **Modal Mass Participation Threshold**:
   - ASCE 7-22 Section 12.9.1.1 and Eurocode 8 Clause 4.3.3.3 dictate that the analysis must include a sufficient number of modes to capture at least 90% of the actual building mass in each orthogonal horizontal direction.
2. **Modal Response Recovery**:
   - For each natural vibration mode $n$ with period $T_n$, the spectral acceleration $S_a(T_n)$ is obtained from the design response spectrum.
   - Modal base shear $V_{bn} = M^*_n S_a(T_n)$ and peak spectral displacement $S_{dn} = S_a(T_n) / \omega_n^2$ are computed and combined across all participating modes using Complete Quadratic Combination (CQC).
3. **Base Shear Scaling**:
   - Due to spectral truncation, modal damping assumptions, or building flexibility, dynamic base shear $V_t$ often falls below the Equivalent Lateral Force (ELF) static base shear $V_b$.
   - ASCE 7-22 Section 12.9.1.4 requires that if $V_t < 1.0 V_b$, all member forces and story shears must be scaled by $SF = V_b / V_t$.
   - IS 1893:2016 Part 1 Clause 7.7.3.2 similarly requires scaling if $V_t < 0.85 V_B$.

## Decision
We implemented `ModalResponseSpectrumEngine` and `BaseShearScalingEngine` in `@beamstudio/seismic-engine`:
1. `ModalResponseSpectrumEngine.ts`:
   - Evaluates multi-mode dynamic mass participation ratios and explicitly flags whether the cumulative mass satisfies $\ge 90\%$.
   - Computes modal base shears and SDOF peak displacements.
   - Aggregates system responses via CQC and SRSS.
2. `BaseShearScalingEngine.ts`:
   - Calculates codified ELF static base shear for ASCE 7-22 ($C_s W$ with upper/lower bounds), Eurocode 8 ($S_d(T_1) m \lambda$), and IS 1893:2016 ($A_h W$).
   - Calculates the dynamic scaling factor $SF = \max(1.0, \text{threshold} \times V_b / V_t)$ and outputs scaled dynamic base shears and forces.

## Consequences
### Positive
- Fully automated verification of the 90% mass participation rule.
- Code-compliant scaling preventing underestimation of seismic demands on flexible structural models.
- Clean integration with `@beamstudio/seismic-engine`'s modal combination core.

### Trade-offs
- Linear response spectrum analysis relies on elastic or $R$-reduced spectra; highly non-linear or ductile plastic hinge behavior is addressed in Sprint B12.3 via step-by-step direct integration time-history analysis.
