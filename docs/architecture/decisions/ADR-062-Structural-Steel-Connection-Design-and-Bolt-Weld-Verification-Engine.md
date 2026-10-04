# ADR-062: Structural Steel Connection Design and Bolt/Weld Verification Engine

## Status
Accepted

## Context
In structural frame engineering, structural analysis determines internal member forces (axial forces $N$, shear forces $V$, bending moments $M$, and torsional moments $T$). However, the safe physical execution of a building or bridge structure depends entirely on the design and detailing of connections connecting beams, columns, bracings, and foundations.

Prior to Phase B8, BeamLab focused on space frame structural analysis, non-linear mechanics, code compliance of members, and multi-user collaboration. Practicing structural engineers need integrated connection design capabilities to:
1. Verify high-strength structural bolts under shear, direct tension, and combined elliptical interaction according to **AISC 360-16 Chapter J** and **Eurocode 3 EN 1993-1-8 Table 3.4**.
2. Account for bolt hole bearing and tearout rupture considering edge distances ($e_1, e_2$) and pitches ($p_1, p_2$).
3. Model preloaded slip-critical (HSFG) friction resistance under various faying surface treatments (Class A, B, C).
4. Verify fillet welds with directional strength factors ($1.0 + 0.5\sin^{1.5}\theta$ for transverse weld strength enhancement) and effective throat geometry.
5. Analyze complex, multi-bolt eccentric connection patterns using both the **Elastic Vector Superposition Method** and the **Instantaneous Center of Rotation (ICR)** method (Crawford & Kulak non-linear formulation).
6. Provide transparent, step-by-step mathematical calculations with LaTeX formulas, substitution records, and code citations suitable for submission to building control authorities.

## Decision
We established a dedicated engineering package `@beamstudio/connection-engine` in `packages/connection-engine/`:

### 1. Connection Domain Types & Standard Databases (`src/core/ConnectionTypes.ts`)
- Fastener databases: ASTM A325, ASTM A490, ISO Grade 8.8, Grade 10.9 with nominal tensile ($F_{nt}$) and shear ($F_{nv}$) strengths.
- Metric and imperial standard bolt sizes (M12 through M36) with gross and net tensile stress areas ($A_b, A_s$).
- Weld electrodes: E60XX, E70XX ($F_{EXX} = 485\text{ MPa}$), E80XX.
- Structural steel grades: ASTM A36, A572 Gr 50, A992, S275, S355, S460.
- Standardized `CalculationStep` and `LimitStateResult` interfaces for mathematical transparency.

### 2. Bolt Limit State Verification Engine (`src/bolts/BoltLimitStateEngine.ts`)
- **AISC 360-16**:
  - Bolt shear fracture: $\phi R_n = 0.75 \cdot F_{nv} \cdot A_b \cdot n_s$
  - Bolt tensile rupture: $\phi R_n = 0.75 \cdot F_{nt} \cdot A_b$
  - Combined tension & shear: Modified tensile stress $F'_{nt} = 1.3 F_{nt} - \frac{F_{nt}}{\phi F_{nv}} f_{rv} \le F_{nt}$ (Eq. J3-3a)
  - Bearing and tearout: $R_n = \min(1.2 l_c t F_u, 2.4 d t F_u)$
  - Slip-critical friction: $\phi R_n = \phi \mu D_u h_f T_b n_s$ (Eq. J3-4)
- **Eurocode 3 EN 1993-1-8**:
  - Bolt shear resistance: $F_{v,Rd} = \frac{\alpha_v f_{ub} A}{\gamma_{M2}}$ ($\gamma_{M2} = 1.25$)
  - Bolt tension resistance: $F_{t,Rd} = \frac{k_2 f_{ub} A_s}{\gamma_{M2}}$ ($k_2 = 0.9$)
  - Combined interaction: $\frac{F_{v,Ed}}{F_{v,Rd}} + \frac{F_{t,Ed}}{1.4 F_{t,Rd}} \le 1.0$
  - Plate bearing: $F_{b,Rd} = \frac{k_1 \alpha_b f_u d t}{\gamma_{M2}}$

### 3. Bolt Group Mechanics & Vector Analysis (`src/bolts/BoltGroupAnalyzer.ts`)
- Grid pattern generator with arbitrary row/column configurations.
- Centroid $(\bar{x}, \bar{y})$ and polar moment of inertia $J = \sum (x_i^2 + y_i^2)$.
- Elastic vector analysis: Resolves combined direct shear ($V/n$) and torsional shear ($M \times r / J$) vectors on each fastener, identifying governing critical bolts.
- Instantaneous Center of Rotation (ICR): Implements iterative Newton-Raphson equilibrium for eccentric shear using Crawford & Kulak load-deformation curves ($R = R_{ult}(1 - e^{-0.3937\Delta})^{0.55}$) to determine ultimate coefficient $C$.

### 4. Weld Limit State Verification Engine (`src/welds/WeldLimitStateEngine.ts`)
- AISC 360-16: Directional fillet weld strength: $F_{nw} = 0.60 F_{EXX} (1.0 + 0.50 \sin^{1.5}\theta)$.
- Minimum fillet weld sizes per thinner connected part (Table J2.4) and maximum sizes along plate edges.
- Eurocode 3: Simplified method ($f_{vw,d} = \frac{f_u / \sqrt{3}}{\beta_w \gamma_{M2}}$) and directional method with von Mises equivalent stress check in throat plane.

## Consequences

### Positive
- Rigorous mathematical models matching published AISC Design Examples and Eurocode 3 benchmark problems.
- Foundation for shear tabs (Sprint B8.2), moment end-plates & base plates (Sprint B8.3), and 3D Canvas Detailing Studio (Sprint B8.4).
- High execution performance with pure TypeScript routines executing in microsecond timescales.

### Trade-offs
- ICR solver utilizes iterative convergence; guarded by maximum iteration limits and fallback to conservative elastic analysis if numerical oscillation occurs.
