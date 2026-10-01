# ADR-075: Spread & Eccentric Isolated Pad Footing Design Engine

## Status
Accepted

## Context
Shallow isolated spread footings are the most prevalent foundation typology in building design. Superstructure columns transfer axial loads ($P$), biaxial bending moments ($M_x, M_y$), and horizontal shears ($V_x, V_y$) to the footing. Designing isolated footings requires simultaneously satisfying geotechnical contact equilibrium and reinforced concrete limit states:
1. **Soil Bearing Distribution**: Verification of the kern limit ($|e_x| \le B/6, |e_y| \le L/6$). Under excessive eccentricity, partial base uplift occurs, requiring Meyerhof effective dimensions ($B' = B - 2e_x, L' = L - 2e_y$) and peak soil pressure verification against allowable bearing pressure $q_{all}$.
2. **One-Way (Beam) Shear**: Evaluated on the critical cross-section located at distance $d$ from column faces in both principal directions ($V_{u1} \le \phi V_c$).
3. **Two-Way (Punching) Shear**: Evaluated on the critical perimeter $b_0$ located at distance $d/2$ from the column perimeter ($V_{up} \le \phi V_c$).
4. **Flexural Bottom Reinforcement**: Cantilever bending moment at column faces, tension rebar area $A_s$, minimum temperature and shrinkage ratios ($\rho_{min} = 0.0018$), bar count, and spacing.

## Decision
We implemented the Spread & Eccentric Isolated Pad Footing Design Engine in `@beamlab/foundation-engine`:
1. **Biaxial Contact & Uplift Model** (`IsolatedFootingEngine.ts`):
   - Calculates 4-corner pressures and eccentricity coordinates $e_x = M_y / P_{tot}$, $e_y = M_x / P_{tot}$.
   - Evaluates kern full contact vs. tension cut-off partial uplift using Meyerhof effective base dimensions.
2. **One-Way Shear Verification**:
   - Calculates shear demand $V_{ux}, V_{uy}$ at distance $d$ from column faces.
   - Computes shear resistance per ACI 318-19 ($\phi V_c = 0.75 \cdot 0.17 \sqrt{f'_c} b_w d$), Eurocode 2 ($V_{Rd,c}$ size effect $k \le 2.0$), and IS 456:2000.
3. **Two-Way Punching Shear Verification**:
   - Traces critical perimeter $b_0 = 2(c_x + c_y + 2d)$ at $d/2$ from column stub.
   - Relieves punching shear demand by deducting upward net soil pressure inside the critical zone: $V_{up} = P_u - q_{net} A_{inner}$.
   - Evaluates three-criterion ACI 318-19 Table 22.6.5.2 limits (column aspect ratio $\beta_c$, interior column location factor $\alpha_s = 40$).
4. **Flexural Rebar Mesh Sizing**:
   - Computes cantilever moments $M_{ux}, M_{uy}$ at column face.
   - Enforces minimum reinforcement limits ($\rho_{min} b H$) and automatically selects bar count and spacing.

## Consequences
### Positive
- Fully integrated structural foundation design complying with ACI 318-19, Eurocode 2, and IS 456.
- Handles both concentric gravity footings and high-overturning moment/wind/seismic footings with partial uplift.
- Zero dependencies, unit tested against textbook benchmarks.

### Trade-offs
- Footing thickness is currently evaluated for uniform thickness slabs; stepped/sloped footings can be incorporated in future extensions.
