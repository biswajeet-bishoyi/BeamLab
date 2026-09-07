# ADR-097: Serviceability Deflection, Long-Term Creep & Floor Vibration Auditor

## Status
Accepted

## Context
While steel-concrete composite floor systems exhibit superior strength, their design is frequently governed by serviceability criteria rather than ultimate limit states. Specifically:
1. **Deflection with Partial Shear Connection**: Partial interaction ($\eta < 1.0$) reduces composite stiffness due to interface slip.
2. **Creep & Shrinkage**: Sustained loads induce concrete creep (modeled via effective modular ratio $n_{eff} = 3 n_0$), while differential shrinkage produces downward curvature.
3. **Floor Vibration**: Slender composite beams and long-span bays are vulnerable to human-induced walking excitation. AISC Design Guide 11 defines frequency and peak acceleration thresholds ($a_p / g$) to prevent human annoyance.

## Decision
We implemented `@beamlab/composite-engine/src/serviceability`:
1. **`CompositeDeflectionAuditor.ts`**:
   - Effective moment of inertia under partial composite action per AISC 360-22 Commentary Eq. C-I3-1:
     $$I_{eff} = I_s + \sqrt{\eta} (I_{tr} - I_s)$$
   - Short-term effective stiffness ($I_{eff,short}$ with $n_0 = E_s / E_c$) for transient live loads.
   - Long-term effective stiffness ($I_{eff,long}$ with $n_{eff} = n_0(1 + \chi \varphi_t)$) for superimposed dead loads.
   - Differential concrete shrinkage deflection:
     $$\kappa_{sh} = \frac{\epsilon_{sh} (A_c / n_{long}) e_c}{I_{tr,long}}, \quad \Delta_{sh} = \frac{\kappa_{sh} L^2}{8}$$
   - Independent verification against codified live load ($\Delta_{LL} \le L/360$) and post-composite total ($\Delta_{post} \le L/240$) limits.
   - Construction camber recommendation based on wet concrete deflection.
2. **`FloorVibrationAuditor.ts`**:
   - Implements AISC Design Guide 11 (2nd Edition, 2016) walking vibration assessment.
   - Panel fundamental natural frequency $f_n = 0.18 \sqrt{g / \Delta_j}$ (where $\Delta_j$ is deflection under total vibration weight).
   - Dynamic floor panel stiffness: $D_j = E_s I_{eff} / S$ and transverse deck/slab stiffness $D_g = E_c t_{slab}^3 / 12$.
   - Effective panel width $B = C_j (D_g / D_j)^{0.25} L \le \frac{2}{3} B_{total}$ and modal weight $W = w_{unit} B L$.
   - Human comfort peak acceleration:
     $$\frac{a_p}{g} = \frac{P_o \exp(-0.35 f_n)}{\beta W} \times 100\%$$
     evaluated for office/residential ($a_p/g \le 0.5\%$), shopping malls ($1.5\%$), and sensitive laboratories ($0.15\%$).
   - Automated corrective engineering recommendations when vibration thresholds are exceeded.

## Consequences
- Guarantees full-lifecycle composite beam serviceability validation.
- Prevents floor bounce issues and partition cracking prior to structural fabrication.
- Dual CJS/ESM distribution with zero external dependencies.
