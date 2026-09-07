# ADR-051: Autonomous Wind & Seismic Load Generation Agent

## Status
Accepted

## Context
Structural frame analysis requires realistic environmental lateral loads: wind forces and earthquake ground motions. Calculating these lateral demands manually according to building codes (such as ASCE 7-16 and Eurocode 1 & 8) requires evaluating site-specific atmospheric and seismological hazard maps, velocity pressure profiles with height, tributary facade area projection, and equivalent lateral force (ELF) story shear distributions.

Prior to Sprint B5.3, BeamLab supported direct stiffness and pushover solvers, but required users to manually calculate and input joint lateral forces and factored load combinations.

## Decision
We implemented `AutonomousLoadGenerator` in `packages/agent-structural-analysis/src/loads/AutonomousLoadGenerator.ts`:

### 1. ASCE 7-16 / Eurocode 1 Directional Wind Load Engine
- Evaluates terrain exposure categories:
  - **B**: Urban/suburban sheltered terrain ($K_z = 2.01 (z/365.76)^{2/7}$).
  - **C**: Open flat terrain ($K_z = 2.01 (z/274.32)^{2/9.5}$).
  - **D**: Unobstructed coastal terrain ($K_z = 2.01 (z/213.36)^{2/11.5}$).
- Computes velocity pressure: $q_z = 0.613 K_z K_{zt} K_d V^2$.
- Computes net surface design pressure: $p_{net} = q_z G C_{p,w} + q_h G C_{p,l}$ (windward pressure $+$ leeward suction).
- Automatically clusters frame nodes into elevation stories, evaluates tributary facade areas, and projects net wind forces to spatial frame nodes.
- Exposes a full story-by-story pressure diagnostics table (`storyPressures`).

### 2. ASCE 7-16 / Eurocode 8 Equivalent Lateral Force (ELF) Seismic Engine
- Determines mapped spectral accelerations $S_{DS} = \frac{2}{3} S_s F_a$ and $S_{D1} = \frac{2}{3} S_1 F_v$ across site classes A through E.
- Computes fundamental building period $T_a = C_t \cdot h_n^x$ for steel and concrete moment-resisting frames.
- Calculates seismic response coefficient $C_s$ with lower and upper code bounds ($0.044 S_{DS} I_e \le C_s \le \frac{S_{D1}}{T (R/I_e)}$).
- Computes base shear $V_{base} = C_s \cdot W$.
- Distributes base shear vertically over building height:
  $$F_x = C_{vx} \cdot V = \frac{w_x h_x^k}{\sum w_i h_i^k} \cdot V_{base}$$
  where exponent $k$ interpolates from $1.0$ ($T \le 0.5\text{ s}$) to $2.0$ ($T \ge 2.5\text{ s}$).

### 3. Automated Factored Design Load Combinations
Automatically synthesizes full LRFD and ULS/SLS combination sets:
- **ASCE 7-16 LRFD**: $1.4D$, $1.2D + 1.6L$, $1.2D + 1.0W + 1.0L$, $1.2D + 1.0E + 1.0L$, $0.9D + 1.0W$, $0.9D + 1.0E$, $1.0D + 1.0L$.
- **Eurocode EN 1990**: $1.35D + 1.5L$, $1.35D + 1.5W + 1.05L$, $1.0D + 1.0E + 0.3L$, $1.0D + 1.0L$.

## Consequences
- **Positive**: Engineers can input basic project parameters (wind speed, site class, exposure) and obtain instantaneous, code-compliant lateral load vectors on the 3D model.
- **Positive**: Seamlessly feeds the `EngineeringBlackboard` and `MultiAgentOrchestrator`.
- **Positive**: Rigorously tested against analytical ASCE 7-16 equations.
