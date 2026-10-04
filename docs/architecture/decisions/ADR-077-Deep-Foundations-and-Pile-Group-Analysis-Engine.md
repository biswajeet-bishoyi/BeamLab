# ADR-077: Deep Foundations and Pile Group Analysis Engine

## Status
Accepted

## Context
When near-surface soil stratum lacks sufficient bearing capacity or structures impose substantial concentrated vertical, lateral, or overturning loads (e.g. mid-rise to high-rise towers, bridge piers, heavily loaded columns), deep foundations must be employed to transfer loads through weak strata to deeper competent soil or bedrock.

Deep foundation engineering requires evaluating geotechnical and structural limit states across single piles and rigid pile caps:
1. **Single Pile Capacity**:
   - Shaft friction summation $Q_s = \sum f_{si} A_{si}$ through multi-layer stratigraphy. For cohesive clays, Tomlinson's $\alpha$-method ($f_s = \alpha \cdot c_u$); for cohesionless sands, Burland's $\beta$-method ($f_s = \beta \cdot \sigma'_v = K \tan(\delta) \sigma'_v$) with critical depth limits ($z_{crit} \approx 15D$).
   - End bearing $Q_b = q_b A_b$ at pile tip ($9 c_u$ in cohesive clay; $N_q \sigma'_v \le q_{b,max}$ in sand).
   - Structural axial compressive capacity of reinforced concrete pile under tied column confinement.
   - Uplift / tension resistance ($0.75 Q_s + W_{pile}$).
2. **Pile Group Interactions**:
   - Group efficiency reduction due to overlapping stress bulbs (Converse-Labarre formulation).
   - Rigid pile cap equilibrium under biaxial overturning moments:
     $$P_i = \frac{P_{total}}{N} \pm \frac{M_{y,net} \cdot x_i}{\sum x_k^2} \pm \frac{M_{x,net} \cdot y_i}{\sum y_k^2}$$
   - Identifying tension piles ($P_i < 0$) and peak pile utilization ratios.
3. **Rigid Pile Cap Limit States**:
   - One-way shear at critical distance $d$ from column face ($V_{ux} \le \phi V_c$).
   - Two-way punching shear around column ($b_0$ at $d/2$) and individual pile punching through the cap.
   - Flexural design and Strut-and-Tie Method (STM) tension ties ($T = M_u / jd$) providing orthogonal reinforcement meshes.

## Decision
We implemented `SinglePileEngine` and `PileGroupEngine` in `@beamstudio/foundation-engine`:
1. **`SinglePileEngine.ts`**:
   - Supports bored cast-in-situ, driven precast, and steel pipe piles.
   - Seamlessly integrates with `SoilStratigraphy` for layer-by-layer stress recovery and friction integration.
   - Evaluates geotechnical ultimate/allowable compression, uplift capacity, and ACI 318 tied structural axial capacity.
2. **`PileGroupEngine.ts`**:
   - Generates parametric pile grids or custom coordinate layouts.
   - Computes Converse-Labarre group efficiency $\eta_{CL}$.
   - Evaluates rigid pile cap equilibrium with cap self-weight and biaxial moments.
   - Performs one-way beam shear, two-way punching shear (column perimeter and pile perimeter), and flexure/tension tie reinforcement detailing.

## Consequences
### Positive
- Unified deep foundation analysis from single borehole soil layers to structural pile cap detailing.
- Code-compliant shear and punching verifications ensuring constructible cap thicknesses and rebar schedules.
- Fully type-safe with dual CJS/ESM bundling and zero external runtime dependencies.

### Trade-offs
- Assumes a rigid pile cap behavior for pile load distribution, which is standard for thick pile caps ($H_{cap} \ge s / 3$); flexible caps with thin slabs can be extended with FEA shell modeling.
