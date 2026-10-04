# ADR-090: Sawn Timber & Glulam Member Design Engine

## Status
Accepted

## Context
Designing structural sawn timber and glued laminated timber (Glulam) members requires accounting for instability modes that are distinct from isotropic structural steel and concrete:
1. **Lateral Torsional Buckling (LTB)**: Wood's low shear modulus ($G \approx E / 16$) makes slender timber beams prone to lateral torsional buckling at much lower slenderness ratios than steel beams.
2. **Column Buckling**: Fiber compressive buckling parallel to grain governed by Ylinen non-linear interaction (NDS $C_P$) and Ayrton-Perry / Eurocode 5 reduction factors ($k_c$).
3. **P-Delta Interaction**: Second-order amplification of transverse moments under compressive axial forces.
4. **Longitudinal Shear Cracking**: Tension perpendicular to grain micro-fissures along growth rings require codified crack reduction factors ($k_{cr} = 0.67$).
5. **Creep Deflection**: Long-term load duration causes visco-elastic deformations that double instantaneous deflections ($w_{fin} = w_{inst}(1 + k_{def})$).

Prior to Sprint B14.2, BeamLab lacked a codified timber member design engine.

## Decision
We implemented **Sprint B14.2: Sawn Timber & Glulam Member Design Engine (`packages/timber-engine/src/members/`)**:

1. **Geometric Cross-Section Calculator (`TimberMemberModels.ts`)**:
   - Computes area $A$, principal moments of inertia $I_x, I_y$, elastic moduli $S_x, S_y$, radii of gyration $r_x, r_y$, and St. Venant torsional constant $I_{tor}$.

2. **Lateral Torsional Buckling & Flexure Engine (`TimberFlexureEngine.ts`)**:
   - **Eurocode 5 Clause 6.3.3**:
     - Critical elastic buckling stress $\sigma_{m,crit} \approx \frac{0.78 E_{0,05} b^2}{h l_{ef}}$.
     - Relative slenderness $\lambda_{rel,m} = \sqrt{f_{m,k} / \sigma_{m,crit}}$.
     - Lateral stability factor $k_{crit}$ (1.0 for $\lambda_{rel,m} \le 0.75$, linear transition to 1.4, $1/\lambda_{rel,m}^2$ above 1.4).
   - **NDS 2024 Section 3.3.3**:
     - Slenderness factor $R_B = \sqrt{l_e d / b^2} \le 50$.
     - Critical buckling value $F_{bE} = \frac{1.20 E_{min}'}{R_B^2}$.
     - Beam stability factor $C_L$.

3. **Axial Compression & Column Stability Engine (`TimberAxialEngine.ts`)**:
   - Slenderness evaluation about major and minor axes ($\lambda = l_e / r$).
   - **Eurocode 5 Clause 6.3.2**: Buckling reduction factor $k_c$ utilizing straightness factor $\beta_c = 0.1$ for glulam, $0.2$ for solid timber.
   - **NDS 2024 Section 3.7.1**: Column stability factor $C_P$ via Ylinen formula with parameter $c = 0.90$ for glulam, $0.80$ for sawn lumber.

4. **Combined Axial & Biaxial Flexure Interaction (`TimberCombinedStressEngine.ts`)**:
   - Multi-axial interaction formulas with P-delta moment amplification.
   - Longitudinal shear stress $\tau = \frac{1.5 V}{k_{cr} b d} \le f_{v,d}$ with crack factor $k_{cr} = 0.67$.
   - Serviceability deflection verification: Instantaneous $w_{inst}$ and final creep deflection $w_{fin} = w_{inst}(1 + k_{def} \cdot \alpha_D)$ audited against span limits ($L/250$ to $L/360$).

## Consequences
- Full support for multi-code verification of timber beams, columns, and beam-columns.
- Zero external runtime dependencies in `@beamstudio/timber-engine`.
- 100% test coverage with 14/14 passing tests.
