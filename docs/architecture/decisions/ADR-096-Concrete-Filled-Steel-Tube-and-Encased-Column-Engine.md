# ADR-096: Concrete-Filled Steel Tube (CFT) & Encased Composite Column Engine

## Status
Accepted

## Context
In mid-rise and high-rise construction, steel-concrete composite columns provide extreme axial load resistance, excellent seismic energy dissipation, and slender architectural profiles. Modern standards (AISC 360-22 Section I2 and Eurocode 4 EN 1994-1-1 Section 6.7) define distinct formulation methodologies for:
1. Filled composite members (Rectangular and Circular Concrete-Filled Steel Tubes / CFTs).
2. Encased composite members (structural wide-flange core embedded in reinforced concrete).
3. Confinement effects in circular tubes ($C_2 = 0.95$ vs $0.85$).
4. Effective flexural stiffness $(EI)_{eff}$ incorporating steel, concrete core, and longitudinal rebar contributions.
5. Combined axial compression and biaxial bending via 4-point plastic P-M interaction envelopes (Points A, B, C, D).

## Decision
We implemented `@beamlab/composite-engine/src/column`:
1. **`CompositeColumnModels.ts`**:
   - Geometrical definitions for `RectangularCftDefinition`, `CircularCftDefinition`, and `EncasedColumnDefinition` with boundary conditions ($L, K$).
2. **`CompositeAxialBucklingEngine.ts`**:
   - Cross-section area breakdown ($A_s, A_c, A_{sr}$) and moments of inertia ($I_{sx}, I_{sy}, I_{cx}, I_{cy}, I_{rx}, I_{ry}$).
   - Plastic squash load $P_{p0} = F_y A_s + F_{yr} A_{sr} + C_2 f'_c A_c$ with confinement factor $C_2 = 0.95$ for circular CFT and $0.85$ for rectangular CFT/encased.
   - Effective flexural stiffness $(EI)_{eff} = E_s I_s + E_s I_{sr} + C_1 E_c I_c$ per AISC 360-22 Eq. I2-6 / I2-14.
   - Euler elastic buckling load $P_e = \pi^2 (EI)_{eff} / (KL)^2$.
   - AISC 360-22 nominal compressive strength $P_n$ (inelastic vs elastic column buckling regimes), LRFD design capacity $\phi_c P_n$ ($\phi_c = 0.75$), ASD allowable capacity $P_n / \Omega_c$ ($\Omega_c = 2.00$).
   - Eurocode 4 EN 1994-1-1 design buckling resistance $N_{b,Rd} = \chi N_{pl,Rd}$ using buckling curve b ($\alpha = 0.34$) for CFT and curve c ($\alpha = 0.49$) for encased shapes.
3. **`CompositeInteractionEngine.ts`**:
   - 4-point plastic P-M interaction diagram:
     - **Point A**: Pure concentric axial squash load $(M = 0, P = P_{p0})$.
     - **Point B**: Pure plastic bending capacity $(M = M_p, P = 0)$.
     - **Point C**: Balanced concrete compression thrust with steel in pure flexure $(M = M_p, P = C_2 f'_c A_c)$.
     - **Point D**: Intermediate transition point $(P = (P_A + P_C)/2, M = 0.88 M_p)$.
   - AISC 360-22 Section H1 combined axial-flexural interaction equation check:
     $$\frac{P_u}{\phi_c P_n} + \frac{8}{9} \left( \frac{M_{ux}}{\phi_b M_{nx}} + \frac{M_{uy}}{\phi_b M_{ny}} \right) \le 1.0$$
   - Component utilizations and pass/fail evaluation.

## Consequences
- Enables rigorous design of modern high-capacity columns (CFTs and encased wide-flanges).
- Accurate capture of concrete confinement enhancement in round circular tubes.
- Full compatibility with AISC 360-22, Eurocode 4, and AISC Design Guide 30.
- Serves as the foundation for the 3D visual column rendering in Sprint B15.5.
