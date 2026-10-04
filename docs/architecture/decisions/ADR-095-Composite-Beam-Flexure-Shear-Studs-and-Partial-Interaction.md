# ADR-095: Composite Beam Flexure, Shear Stud Connectors & Partial Interaction Engine

## Status
Accepted

## Context
Steel-concrete composite beams achieve their high strength and stiffness through headed shear stud connectors welded through profiled steel deck to the beam flange. Depending on architectural constraints, deflection limits, and stud pitch limitations, designers frequently specify partial composite action ($\eta = 25\%$ to $99\%$) rather than 100% full interaction. Furthermore, in unshored construction, the bare steel wide-flange section must independently resist the wet concrete, deck, and construction live loads prior to slab curing.

## Decision
We implemented `@beamstudio/composite-engine/src/beam`:
1. **`ShearStudConnectorEngine.ts`**:
   - Computes nominal shear strength $Q_n$ per AISC 360-22 Section I8.2a:
     $$Q_n = 0.5 A_{sa} \sqrt{f'_c E_c} \le R_g R_p A_{sa} F_u$$
     incorporating deck geometry coefficients ($R_g, R_p$) for perpendicular ribs ($R_g = 1.0$ or $0.85$, $R_p = 0.75$) and parallel ribs ($R_p = 0.75$ or $0.60$).
   - Calculates Eurocode 4 EN 1994-1-1 design shear resistance $P_{Rd}$ with reduction factor $k_t$.
   - Determines total interface horizontal shear $V' = \min(C_{max}, T_{max})$ and required shear stud count for full composite action.
   - Evaluates the partial interaction degree $\eta = V' / V_{full}$ and verifies codified minimums ($\eta \ge 0.25$).
2. **`PlasticStressDistributionEngine.ts`**:
   - Rigid-plastic stress distribution model identifying the plastic neutral axis (PNA) across three primary regimes:
     - **Case 1 (In Slab)**: $C_{max} \ge T_s$, $a = T_s / (0.85 f'_c b_e) \le t_{slab}$, moment arm $z = d/2 + h_{deck} + t_{slab} - a/2$.
     - **Case 2 (In Top Flange)**: Concrete compression $C_c = V'$, steel compressive force $C_s = (T_{max} - C_c)/2 \le b_f t_f F_y$, PNA depth $y_{pna} = C_s / (b_f F_y)$.
     - **Case 3 (In Steel Web)**: Top flange fully yields in compression, web carries remainder $C_w = C_s - C_f$, web depth $y_w = C_w / (t_w F_y)$.
   - Computes plastic moment capacity $M_p$, AISC LRFD capacity $\phi_b M_p$ ($\phi = 0.90$), ASD allowable moment $M_p / \Omega$, and Eurocode 4 $M_{Rd}$.
   - Generates the continuous $M_p(\eta)$ curve showing flexural capacity gain as a function of shear stud count.
3. **`ConstructionStageAuditor.ts`**:
   - Audits unshored construction load combinations ($1.2 D + 1.6 L_{const}$) for wet concrete, steel beam, metal deck, and construction live load.
   - Verifies bare steel flexural capacity ($\phi M_n$), web shear resistance ($\phi V_n$), and wet concrete dead load deflection $\Delta_{wet} \le \min(L/360, 25.4\text{ mm})$.

## Consequences
- Provides exact cross-section plastic stress distributions and moment capacities for any wide-flange section, deck profile, and concrete slab.
- Ensures compliance with AISC 360-22, Eurocode 4, and ASCE 37 temporary construction loading standards.
- Serves as the analytical foundation for column interaction (Sprint B15.3), serviceability deflection/vibration (Sprint B15.4), and interactive visual rendering (Sprint B15.5).
