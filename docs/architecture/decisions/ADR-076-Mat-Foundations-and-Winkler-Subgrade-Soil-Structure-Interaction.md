# ADR-076: Mat Foundations and Winkler Subgrade Soil-Structure Interaction (SSI) Engine

## Status
Accepted

## Context
When structural column loads are high, column spacing is tight, or soil bearing capacity is moderate to low, isolated footings overlap or become uneconomical. Raft (mat) foundations support the entire superstructure footprint, distributing vertical forces and overturning moments while mitigating differential settlements.

Accurate structural design of mat foundations requires modeling Soil-Structure Interaction (SSI):
1. **Modulus of Subgrade Reaction ($k_s$)**: Relates contact pressure to soil settlement ($q = k_s \cdot w$). Engineering practice utilizes multiple formulation standards:
   - Bowles empirical formulation scaled by allowable bearing pressure and allowable settlement: $k_s = 40 \cdot q_{all} \cdot FS$.
   - Vesic continuum-elastic formulation accounting for soil modulus $E_s$, Poisson's ratio $\nu_s$, foundation flexural rigidity $E_c I_f$, and mat width $B$.
   - Terzaghi plate load test scaling from 0.3m plate ($k_{s1}$) to full mat width.
2. **Spring Discretization**: The continuous soil continuum is discretized into a 2D grid of tributary area springs ($k_{node} = k_s \cdot A_{trib}$).
3. **Non-Linear Tension Cut-Off**: Soil possesses negligible tensile capacity. Under lateral loads (wind/seismic overturning moments), foundation edges may lift off the ground ($w < 0, q < 0$). Springs undergoing tension must be deactivated in an iterative solver until equilibrium converges on the active compressed footprint.
4. **Serviceability Criteria**: Analysis must verify maximum contact pressure against bearing capacity, maximum settlement against allowable limits, differential settlement, and angular distortion ($\Delta S / L_{span}$) against structural distortion limits (e.g. 1/500).

## Decision
We implemented `WinklerSubgradeEngine` in `@beamlab/foundation-engine`:
1. **Subgrade Modulus Formulations**:
   - Implemented Bowles, Vesic, and Terzaghi methods with user overrides.
2. **2D Spring Mesh Generation**:
   - Generates grid nodes across $[ -B/2, B/2 ] \times [ -L/2, L/2 ]$ with interior ($dx \cdot dy$), edge ($0.5 \cdot dx \cdot dy$), and corner ($0.25 \cdot dx \cdot dy$) tributary areas.
3. **Non-Linear Iterative Tension Cut-Off Equilibrium**:
   - Computes active centroid $(\bar{x}, \bar{y})$ and second moments of area $I_{xx}, I_{yy}$ of the compressed zone.
   - Computes net axial force and eccentric moments about the active centroid.
   - Deactivates springs with calculated tensile pressure ($q < 0$) iteratively until convergence.
   - Accurately balances total reaction against applied columns plus foundation self-weight.
4. **Serviceability & Angular Distortion Reporting**:
   - Calculates contact pressure profile ($q_{max}, q_{min}, q_{avg}$), differential settlement $\Delta S$, angular distortion $\theta = \Delta S / D_{diag}$, and percentage of uplifted footprint.

## Consequences
### Positive
- Robust foundation-soil interaction capability without requiring heavy 3D finite element geomechanics packages.
- Accurate capture of uplift boundary conditions under large lateral wind/seismic moments.
- Zero dependencies, unit tested, and fully type-safe.

### Trade-offs
- Assumes a rigid-to-semi-rigid mat action for contact pressure redistribution; highly flexible mats with localized point loads will benefit from coupled shell FEA in subsequent phases.
