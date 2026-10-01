# ADR-064: Structural Steel Moment Connection and Base Plate Engine

## Status
Accepted

## Context
While simple shear connections (ADR-063) transfer gravity shear reactions as idealized pins, lateral load-resisting structural systems (such as moment frames, portals, cantilevers, and high-rise columns) require moment-resisting connections capable of transferring substantial bending moments $M_u$ alongside axial forces $P_u$ and shear forces $V_u$:
1. **Beam-to-Column Moment Connections**:
   - Extended (4E, 4ES, 8ES) and Flush end-plate configurations per AISC Design Guide 4, AISC Design Guide 16, AISC 358-16, and Eurocode 3 EN 1993-1-8.
   - Non-linear **Prying Action**: In flexible end-plates, tension forces induce contact compression at plate edges (prying forces $Q$), significantly magnifying total fastener tension demands $T_{total} = B + Q$.
   - Plastic **Yield Line Mechanisms**: Determining the flexural yielding capacity of the end-plate ($M_{np} = F_y t_p^2 Y$) and column flange.
   - Column web structural integrity under concentrated flange tension and compression forces:
     - Column web panel-zone shear (AISC 360-16 Section J10.6 / EC3 6.2.6.1).
     - Column web local yielding (AISC J10.2).
     - Column web local crippling (AISC J10.3).
     - Column web compression buckling (AISC J10.4).
2. **Column Base Plates with Anchor Rods**:
   - Column-to-foundation joints designed according to AISC Design Guide 1 (2nd Ed.), ACI 318, and AISC 360-16 Section J8.
   - Bearing stress distribution on concrete pedestals under small eccentricity ($e \le e_{crit}$, pure bearing) vs. large eccentricity ($e > e_{crit}$, tension developing in anchor rods).
   - Base plate critical cantilever bending over bearing and tension ($m, n, \lambda n'$).
   - Shear transfer via base friction and anchor rod shear.

## Decision
We implemented the moment connection and base plate subsystems in `@beamlab/connection-engine`:

### 1. Prying Action & Equivalent T-Stub Engine (`packages/connection-engine/src/moment/PryingActionEngine.ts`)
- **AISC 15th Edition Manual Part 9 Formulation**:
  - Lever arms $b, a, b', a'$, ratio $\rho = b'/a'$, and net-to-gross ratio $\delta = 1 - d_h/p$.
  - Critical no-prying thickness $t_c = \sqrt{\frac{4 B b'}{\phi F_y p}}$.
  - Prying force $Q = B \cdot [\delta \alpha' \rho (t/t_c)^4]$ and available tension capacity $T_{avail}$.
- **Eurocode 3 EN 1993-1-8 Clause 6.2.4 Equivalent T-Stub**:
  - Evaluates plastic failure modes:
    - Mode 1: Complete flange yielding ($F_{T,1,Rd} = 4 M_{pl,1,Rd} / m$).
    - Mode 2: Bolt failure with flange yielding ($F_{T,2,Rd} = \frac{2 M_{pl,2,Rd} + n \sum F_{t,Rd}}{m + n}$).
    - Mode 3: Bolt tensile rupture without prying ($F_{T,3,Rd} = \sum F_{t,Rd}$).
  - Determines governing resistance $F_{T,Rd} = \min(F_{T,1,Rd}, F_{T,2,Rd}, F_{T,3,Rd})$.

### 2. End-Plate Moment Connection Engine (`packages/connection-engine/src/moment/EndPlateMomentEngine.ts`)
- Flange force calculation from moment couple: $F_f = M_u / (d_b - t_{fb})$.
- Bolt tension resistance incorporating prying action.
- End-plate plastic yield line parameter $Y_p$ and moment capacity $\phi M_{np} = 0.90 F_y t_p^2 Y_p$.
- Column web panel-zone shear resistance $\phi R_n = 0.90 \cdot 0.60 F_y d_c t_{cw} [1 + \frac{3 b_{cf} t_{cf}^2}{d_b d_c t_{cw}}]$.
- Column web local yielding, local crippling, and compression buckling.
- Beam web shear transfer to end-plate.

### 3. Column Base Plate Engine (`packages/connection-engine/src/baseplate/ColumnBasePlateEngine.ts`)
- Concrete foundation bearing strength: $P_p = 0.85 f'_c A_1 \sqrt{A_2 / A_1} \le 1.7 f'_c A_1$ ($\phi_c = 0.65$).
- Eccentricity evaluation ($e = M_u / P_u$) and critical eccentricity $e_{crit} = N/2 - P_u / (2 q_{max})$.
- Non-linear quadratic equilibrium solver for bearing length $Y$ and anchor rod tension demand $T = q_{max} Y - P_u$.
- Anchor rod tensile capacity ($0.75 F_{nt} A_b$).
- Critical cantilever bending thickness ($m, n, \lambda n'$) for small and large eccentricity regimes.
- Interface friction ($\mu = 0.45$) and anchor shear resistance.

## Consequences

### Positive
- Unified framework supporting both moment frame connections and heavy foundation base plates.
- Full parity with published AISC Design Guides 1, 4, 16 and Eurocode 3 EN 1993-1-8.
- Complete LaTeX mathematical derivations for engineering audit trails.

### Trade-offs
- Anchor rod concrete breakout and pullout are assumed designed per ACI 318 Chapter 17 embedment provisions.
