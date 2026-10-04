# ADR-084: Codified Wind Profile and Velocity Pressure Engine

## Status
Accepted

## Context
Structural wind load calculations require establishing atmospheric boundary layer velocity and dynamic pressure profiles before applying shape aerodynamic coefficients.
Building codes employ distinct analytical formulations to model boundary layer turbulence, surface roughness, and elevation exposure:
1. **ASCE 7-22 Section 26.10**:
   - Velocity pressure $q_z = 0.613 K_z K_{zt} K_d K_e V^2$ (SI, N/m²).
   - Exposure categories B, C, D with power-law exposure coefficient $K_z = 2.01 (z / z_g)^{2/\alpha}$.
   - Directionality factor $K_d$ and ground elevation factor $K_e$.
2. **Eurocode 1 (EN 1991-1-4:2005 Section 4)**:
   - Terrain categories 0–IV with roughness length $z_0, z_{min}$ and factor $c_r(z) = k_r \ln(z / z_0)$.
   - Turbulence intensity $I_v(z) = \frac{k_I}{c_o(z) \ln(z / z_0)}$.
   - Peak velocity pressure $q_p(z) = [1 + 7 I_v(z)] \frac{1}{2} \rho v_m^2(z)$.
3. **IS 875 (Part 3): 2015 Clause 6.3 & 7.2**:
   - Design wind velocity $V_z = V_b \cdot k_1 \cdot k_2 \cdot k_3 \cdot k_4$.
   - Design wind pressure $p_z = 0.6 V_z^2$ (N/m²).

## Decision
We implemented `WindProfileEngine` in `@beamstudio/wind-engine`:
- Pure TypeScript implementation with zero external runtime dependencies.
- Exact codified exposure formulas with strict lower and upper elevation bounds ($z_{min}, z_g$).
- Continuous vertical profile generation from ground elevation ($z = 0$) up to structure apex with adaptive height stepping.

## Consequences
- Provides a shared foundation for aerodynamic surface pressure distribution, dynamic along-wind gust resonance, and cross-wind vortex shedding calculations.
- Fast, deterministic evaluation suitable for 3D real-time interactive studio rendering.
