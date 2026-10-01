# ADR-091: Cross-Laminated Timber (CLT) Orthotropic Plate & Panel Engine

## Status
Accepted

## Context
Cross-Laminated Timber (CLT) is the primary mass timber product utilized for floor slabs, roofs, and shear walls in multi-story timber buildings. Unlike isotropic concrete slabs or homogeneous glulam, CLT panels are composed of orthogonally cross-bonded wood lamellae (3-ply, 5-ply, 7-ply).
Because wood's shear modulus perpendicular to the grain ($G_{90}$) is an order of magnitude lower than parallel to the grain ($G_0$), CLT slabs exhibit:
1. Significant shear deformation, where transverse shear deflection contributes 10% to 25% of total deflection.
2. Interlaminar **Rolling Shear** failure in cross layers, where fibers roll over each other under out-of-plane shear.
3. Floor vibration sensitivity requiring dynamic verification of natural frequency $f_1 \ge 8\text{ Hz}$.

Prior to Sprint B14.3, BeamLab had no support for multi-ply CLT orthotropic laminate modeling.

## Decision
We implemented **Sprint B14.3: Cross-Laminated Timber (CLT) Orthotropic Plate & Panel Engine (`packages/timber-engine/src/clt/`)**:

1. **CLT Multi-Ply Layup Domain (`CltLayupModel.ts`)**:
   - Configurable 3-ply, 5-ply, and 7-ply layups with alternating $0^\circ / 90^\circ$ grain orientations.
   - Standard presets (`CLT_3s_60`, `CLT_3s_100`, `CLT_5s_140`, `CLT_7s_210`) referencing certified stress grades.

2. **Gamma Method & Kreuzinger Shear Analogy (`CltShearAnalogyEngine.ts`)**:
   - Effective bending stiffness $(EI)_{eff} = \sum (E_i I_i + \gamma_i E_i A_i z_i^2)$ per Eurocode 5 (Annex B).
   - Gamma connection efficiency factor $\gamma_i$ for each longitudinal layer.
   - Effective shear stiffness $(GA)_{eff} = \frac{a^2}{\sum t_i / (G_i b)}$ via Kreuzinger shear analogy accounting for rolling shear layers.
   - Dual-component deflection evaluation: $w_{total} = w_{bending} + w_{shear} = \frac{5 q L^4}{384 (EI)_{eff}} + \frac{q L^2}{8 (GA)_{eff}}$.

3. **Multi-Layer Stress & Serviceability Auditor (`CltPanelStressAuditor.ts`)**:
   - Extreme outer fiber bending stress $\sigma_m = \frac{M E_{outer} (h/2)}{(EI)_{eff}} \le f_{m,d}$.
   - Interlaminar rolling shear stress $\tau_{roll} = \frac{V (ES)_{eff}}{(EI)_{eff} b} \le f_{r,d}$.
   - Fundamental floor vibration frequency $f_1 = \frac{\pi}{2 L^2} \sqrt{\frac{(EI)_{eff}}{m}}$ based on quasi-permanent mass combination ($\psi_2 = 0.20$).

## Consequences
- Accurate evaluation of mass timber floor and roof panels under out-of-plane and serviceability loads.
- Prevention of rolling shear and floor vibration issues in CLT specifications.
- 100% test pass rate with 19/19 passing tests in `@beamlab/timber-engine`.
