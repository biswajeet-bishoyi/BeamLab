# ADR-119: Rankine, Coulomb, Surcharge & Hydrostatic Lateral Earth Pressure Formulation

## Status
Accepted

## Context
Earth retaining structures (cantilever walls, gravity retaining walls, basement walls, and deep excavation shoring) require accurate determination of lateral earth pressures under complex soil stratigraphy, sloping backfills, wall friction, surcharges, and water table conditions. Existing tools often oversimplify backfills or lack seamless integration with full numerical slicing and structural design codes.

## Decision
We implemented `LateralEarthPressureEngine` in `@beamstudio/earth-engine` with the following analytical capabilities:
1. **Rankine Theory**:
   - Classical horizontal backfill coefficients: $K_a = \tan^2(45^\circ - \phi/2)$, $K_p = \tan^2(45^\circ + \phi/2)$, and Jaky's at-rest coefficient $K_0 = (1 - \sin\phi)\sqrt{OCR}$.
   - Sloping backfill Rankine formulation for surcharge angle $\beta \le \phi$.
2. **Coulomb Theory**:
   - Incorporates back of wall inclination $\theta$, backfill inclination $\beta$, and wall-soil friction $\delta$.
3. **Cohesive Soils & Tension Cracks**:
   - Active and passive horizontal stresses: $\sigma'_a = K_a \sigma'_v - 2 c \sqrt{K_a}$, $\sigma'_p = K_p \sigma'_v + 2 c \sqrt{K_p}$.
   - Tension crack depth $z_c = \frac{2c}{\gamma \sqrt{K_a}}$, with support for hydrostatic water pressure within open cracks.
4. **Surcharges**:
   - Uniform infinite surcharge $\Delta \sigma_h = K_a q$.
   - Boussinesq modified line loads $q_L$ and strip loads $q_s$.
5. **Numerical Discretization**:
   - Trapezoidal integration over wall height $H$ to yield exact resultant active force $P_a$, passive resistance $P_p$, hydrostatic force $P_w$, and their exact centers of action $\bar{z}$.

## Consequences
- High-fidelity calculation of lateral pressure distributions across heterogeneous soil strata.
- Directly feeds into retaining wall stability and deep excavation shoring analyses.
