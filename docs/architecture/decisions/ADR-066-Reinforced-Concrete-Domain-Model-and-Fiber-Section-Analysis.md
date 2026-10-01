# ADR-066: Reinforced Concrete Domain Model, Constitutive Material Laws, and Fiber Section Analysis

## Status
Accepted

## Context
Phase B9 introduces reinforced concrete (RC) member design and detailing across international building standards (ACI 318-19, Eurocode 2 EN 1992-1-1, and IS 456:2000). Unlike structural steel design where elastic-plastic section moduli often suffice, reinforced concrete requires non-linear strain compatibility analysis:
- Concrete exhibits non-linear compression stress-strain behavior, tension softening/cracking, and confinement-induced ductility enhancements.
- Rebar exhibits elastoplastic behavior with optional strain-hardening.
- Composite sections (rectangular, flanged T/L, circular, or irregular) under combined axial load $P$ and biaxial flexure $(M_x, M_y)$ require accurate stress integration over arbitrary neutral axis inclinations.
- Empirical interaction formulas alone cannot model asymmetric reinforcement layouts, spalling of concrete cover, or confined concrete cores.

## Decision
We establish `@beamlab/concrete-engine` as the core reinforced concrete calculation kernel for BeamLab:

1. **Constitutive Material Laws (`ConcreteConstitutiveModel`, `RebarConstitutiveModel`)**:
   - **ACI 318-19 Whitney Rectangular Stress Block**: Dynamic calculation of depth factor $\beta_1$ per Table 22.2.2.4.3 ($0.85$ for $f'_c \le 28$ MPa, decreasing linearly to $0.65$ at $\ge 55$ MPa) and stress intensity $\alpha_1 = 0.85$.
   - **Eurocode 2 EN 1992-1-1 Parabolic-Rectangular Model** (Clause 3.1.5): Curvature indices $n$, peak strain $\epsilon_{c2}$, and ultimate crushing strain $\epsilon_{cu2}$ with plateau $f_{cd} = \alpha_{cc} f_{ck} / \gamma_c$.
   - **Modified Kent-Park / Mander Model**: Delineation between unconfined cover concrete (subject to spalling at $\epsilon_{spall}$) and confined core concrete ($f'_{cc} = K \cdot f'_c, \epsilon_{cc0}, \epsilon_{ccu}$).
   - **Rebar Steel**: Elastic-perfectly plastic and bilinear strain-hardening formulations ($E_s = 200,000$ MPa, $\epsilon_y, \epsilon_{uk}, E_{sh}$).

2. **Parametric Fiber Section Discretization (`FiberSection`)**:
   - Discretizes rectangular, flanged (T & L), and circular cross-sections into discrete 2D concrete fiber meshes with designated coordinates $(x, y)$, fiber areas $dA$, and confinement flags.
   - Distinct steel fiber definitions tracking exact spatial coordinate $(x, y)$, bar size designation (#3-#18, T8-T40), cross-sectional area, diameter, and material grade.
   - Parametric placement helpers for perimeter rebar layers (top, bottom, web side-face bars) and circular pitch arrangements.

3. **Non-Linear Strain Compatibility Analyzer (`FiberSectionAnalyzer`)**:
   - Evaluates the 2D strain plane $\epsilon(x, y) = \epsilon_0 - \kappa_x y - \kappa_y x$.
   - Integrates concrete compressive stresses and steel tensile/compressive stresses across all fibers to yield resultant force vectors:
     $$P = \sum \sigma_c dA_c - \sum \sigma_s A_s$$
     $$M_x = \sum \sigma_c y dA_c - \sum \sigma_s y A_s$$
     $$M_y = -\sum \sigma_c x dA_c + \sum \sigma_s x A_s$$
   - Closed-form computation of pure axial compression $P_0$ (ACI Eq. 22.4.2.2), pure tension $P_t = A_{st} f_y$, and numerical root-finding for neutral axis depth $c$ and curvature $\kappa$ for target axial loads.

## Consequences
### Positive
- Provides an exact, non-linear physical foundation for all downstream RC design modules (beams, columns, walls, footings).
- Unifies ACI 318, Eurocode 2, and IS 456 under a modular domain model.
- Seamlessly calculates moment-curvature response and biaxial capacity surfaces without relying on oversimplified approximations.

### Negative / Trade-offs
- Fiber discretization requires numerical mesh summation ($N_{fibers} \approx 200 - 600$), which is more compute-intensive than closed-form equations; however, execution remains sub-millisecond per section in JavaScript V8.
