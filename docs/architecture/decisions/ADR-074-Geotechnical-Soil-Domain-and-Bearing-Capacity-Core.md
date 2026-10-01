# ADR-074: Geotechnical Soil Domain & Bearing Capacity Core

## Status
Accepted

## Context
Structural analysis models historically terminate at superstructure column bases with idealized boundary conditions (fixed, pinned, or roller supports). However, realistic foundation engineering requires rigorous geotechnical soil mechanics:
1. Multi-layered stratigraphy with depth-varying bulk and saturated densities ($\gamma_{dry}, \gamma_{sat}$), cohesion $c$, internal friction angle $\phi$, and elastic modulus $E_s$.
2. Hydrostatic pore water pressure $u$ and effective overburden stress $\sigma'_v(z)$ under variable seasonal water table horizons.
3. Theoretical ultimate bearing capacity $q_{ult}$ and allowable bearing pressure $q_{all}$ under Meyerhof, Vesic, and Hansen formulations with shape, depth, and groundwater corrections.
4. Immediate elastic settlement ($S_i$) and 1D primary consolidation settlement ($S_c$).

## Decision
We created `@beamlab/foundation-engine` implementing:
1. **Soil Stratigraphy Engine** (`SoilStratigraphy.ts`):
   - Multi-layer profiles with automated depth sorting and layer boundary resolution.
   - Hydrostatic pore water pressure $u = (z - z_{wt})\gamma_w$ for $z > z_{wt}$.
   - Depth-integrated effective vertical stress $\sigma'_v(z) = \sigma_v(z) - u(z)$.
   - Weighted average soil strength parameter extraction across foundation shear influence zones ($D_f$ to $D_f + B$).
2. **Bearing Capacity & Settlement Core** (`BearingCapacityEngine.ts`):
   - Analytical bearing capacity factors ($N_c, N_q, N_\gamma$) supporting Vesic ($N_\gamma = 2(N_q + 1)\tan\phi$), Meyerhof, and Hansen equations, with $\phi = 0$ undrained cohesion limits ($N_c = 5.14, N_q = 1.0$).
   - Shape correction factors ($s_c, s_q, s_\gamma$) for rectangular footings.
   - Depth embedment factors ($d_c, d_q, d_\gamma$) for shallow and deep embedment ratios ($D_f/B$).
   - Immediate elastic settlement estimation using rigid foundation influence coefficients.
   - 1D consolidation settlement for compressible clay layers using 2:1 stress dispersion $\Delta\sigma(z) = P / [(B+z)(L+z)]$.

## Consequences
### Positive
- Bridges superstructure analytical reactions directly to subgrade soil bearing capacities and settlement limits.
- Supports multi-layer boreholes with accurate groundwater buoyant uplift mechanics.
- Zero external runtime dependencies, packaged with dual CJS/ESM distribution.

### Trade-offs
- 2:1 stress dispersion is used for consolidation stress distribution; Boussinesq elastic point/area integration can be added for complex non-rectangular footings.
