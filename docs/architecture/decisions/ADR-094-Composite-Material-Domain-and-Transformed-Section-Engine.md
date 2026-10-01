# ADR-094: Composite Material Domain, Modular Ratio & Transformed Section Engine

## Status
Accepted

## Context
In modern structural engineering, steel-concrete composite floor beams and girders provide high stiffness-to-weight ratios and efficient material utilization. To model composite systems accurately, BeamLab requires an analytical engine supporting:
1. Multi-standard concrete and structural steel material domains (AISC 360-22 Chapter I, Eurocode 4 EN 1994-1-1, and IS 11384:2022).
2. Effective flange width calculations considering beam spans, transverse girder spacings, edge slab overhangs, and longitudinal shear lag.
3. Modular ratio formulation for short-term loading ($n_0 = E_s / E_c$) and sustained long-term loading accounting for concrete creep ($n_{eff} = n_0(1 + \chi \varphi_t)$ or $n_{eff} = 3n_0$).
4. Transformed section property calculators computing transformed cross-sectional area $A_{tr}$, neutral axis depth $y_{tr}$, moment of inertia $I_{tr}$, and top/bottom elastic section moduli ($S_{tr,top}, S_{tr,bot}$).

## Decision
We implemented `@beamlab/composite-engine/src/material`:
1. **`CompositeMaterialModel.ts`**:
   - Standard steel wide-flange library (`W18x50`, `W21x62`, `IPE360`) and custom section parameters ($A_s, d, b_f, t_f, t_w, I_x, F_y, E_s$).
   - Concrete slab definitions with characteristic strength ($f'_c$ or $f_{ck}$), elastic modulus $E_c = 0.043 w_c^{1.5} \sqrt{f'_c}$ (AISC) or $22000 (f_{cm} / 10)^{0.3}$ (EC4), density $w_c$, and creep coefficient $\varphi_t$.
   - Formed metal deck geometry (deck depth $h_r$, average rib width $w_r$, rib pitch $s_r$, and rib orientation relative to beam axis).
2. **`EffectiveWidthEngine.ts`**:
   - AISC 360-22 Section I3.1.1 effective flange width formulation:
     $$b_e = \min(L/8, S_{left}/2) + \min(L/8, S_{right}/2)$$
   - Eurocode 4 EN 1994-1-1 Clause 5.4.1.2 shear lag formulation:
     $$b_{eff} = b_0 + \sum b_{ei}, \quad b_{ei} = \min(L_{eff}/8, b_i)$$
   - Edge beam boundary condition handling.
3. **`TransformedSectionEngine.ts`**:
   - Short-term and long-term modular ratios $n$.
   - Transformed concrete slab width $b_{tr} = b_e / n$.
   - Elastic transformed section properties calculated relative to the bottom of the steel flange.
   - Elastic top concrete fiber modulus and bottom steel tension flange modulus.

## Consequences
- Enables exact computation of elastic stresses and stiffness for composite beams.
- Provides a shared foundation for plastic stress distribution (Sprint B15.2), deflection/vibration auditing (Sprint B15.4), and interactive visual rendering (Sprint B15.5).
- Zero external runtime dependencies; 100% TypeScript dual CJS/ESM distribution.
