# ADR-107: AASHTO LRFD Girder Distribution Factors, Skew Correction & Dynamic Engine

## Status
Accepted

## Context
Bridge live load analysis requires transforming 3D multi-lane vehicular loads into 1D line girder design actions. Rather than mandating complex 3D finite element grillage or shell modeling for every preliminary bridge span, the AASHTO LRFD Bridge Design Specifications (Section 4.6.2.2) provides codified Live Load Distribution Factors (LLDF) ($g_m, g_v$). These distribution factors depend on:
1. Girder spacing ($S$), span length ($L$), and deck slab thickness ($t_s$).
2. Longitudinal stiffness parameter $K_g = n (I + A e_g^2)$, where $n = E_{girder} / E_{deck}$ and $e_g$ is the vertical eccentricity between the girder and deck slab centroids.
3. Transverse multi-presence factors ($m = 1.20$ for 1 lane, $1.00$ for 2 lanes, $0.85$ for 3 lanes).
4. Skew angle ($\theta$) corrections: skew reduces midspan live load moments ($1 - c_1 (\tan \theta)^{1.5}$) while amplifying shear reactions at obtuse corners ($1 + 0.20 (L t_s^3 / K_g)^{0.1} \sqrt{\tan \theta}$).

Furthermore, bridges are subjected to dynamic vehicular effects beyond static gravity:
- Dynamic Load Allowance ($IM = 33\%$ for strength flexure/shear, $15\%$ for fatigue, $75\%$ for expansion joints).
- Centrifugal force on horizontally curved highway alignments: $C = f \frac{v^2}{g R} W_{truck}$.
- Braking force during vehicular deceleration: $BR = \max(0.25 W_{truck}, 0.05 (W_{truck} + W_{lane}))$.

BeamLab requires a dedicated, unified distribution and dynamic forces calculation engine.

## Decision
We implement `GirderDistributionEngine` and `BridgeDynamicForcesEngine` within `@beamlab/bridge-engine`:
1. **AASHTO LRFD Empirical Distribution Formulation**:
   - Computes modular ratio $n$, composite eccentricity $e_g$, and longitudinal stiffness $K_g$.
   - Interior girder moment factors:
     $$g_{m1} = 0.06 + \left(\frac{S}{4.3}\right)^{0.4} \left(\frac{S}{L}\right)^{0.3} \left(\frac{K_g}{L t_s^3}\right)^{0.1}$$
     $$g_{m2+} = 0.075 + \left(\frac{S}{2.9}\right)^{0.6} \left(\frac{S}{L}\right)^{0.2} \left(\frac{K_g}{L t_s^3}\right)^{0.1}$$
   - Interior girder shear factors:
     $$g_{v1} = 0.36 + \frac{S}{7.6}$$
     $$g_{v2+} = 0.2 + \frac{S}{3.6} - \left(\frac{S}{10.7}\right)^2$$
   - Exterior girder factors via the Lever Rule for 1 lane and rigid rotation $e \cdot g_{int}$ for 2+ lanes.
2. **Skew Angle Corrections**:
   - Accounts for support skew $\theta \in [0^\circ, 60^\circ]$, adjusting design moment downward and obtuse corner shear upward.
3. **Bridge Dynamic & Lateral Forces**:
   - Calculates dynamic load allowances across AASHTO LRFD, Eurocode 1 (amplification factor $\Phi_2$), and IRC 6:2017.
   - Computes centrifugal lateral force and longitudinal braking force applied at the codified height ($1.8\text{ m}$ above roadway).

## Consequences
- Enables structural engineers to seamlessly bridge the gap between longitudinal moving load analysis and individual girder design.
- Integrates directly with the moving load envelope results from Sprint B17.3 to provide per-girder design moments and shears ($M_{design} = g_m \cdot M_{total}$).
- Feeds into the interactive 3D Bridge Studio UI in Sprint B17.5.
