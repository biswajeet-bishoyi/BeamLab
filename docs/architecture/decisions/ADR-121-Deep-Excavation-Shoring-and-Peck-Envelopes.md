# ADR-121: Deep Excavation Cantilever, Anchored Shoring & Peck Apparent Pressure Envelopes

## Status
Accepted

## Context
Urban deep excavations (basements, subway stations, utility trenches) require shoring systems ranging from flexible cantilever sheet piles to multi-tiered anchored walls and strutted braced cuts. Classical Rankine distributions fail for strutted cuts due to arching effects, necessitating empirical apparent earth pressure envelopes (Peck 1969).

## Decision
We implemented `DeepExcavationEngine` in `@beamstudio/earth-engine`:
1. **Cantilever Sheet Piles**:
   - Solves non-linear moment equilibrium about sheet pile toe to compute calculated embedment depth $D_{calc}$ and factored design depth $D_{design} = 1.25 D_{calc}$.
   - Locates depth of zero shear to establish peak bending moment $M_{max}$ and required elastic section modulus $S_{req} = M_{max} / (0.66 f_y)$.
2. **Anchored Sheet Piles (Free Earth Support)**:
   - Evaluates moment equilibrium about anchor elevation $h_a$.
   - Computes anchor tension force $T$, maximum span moment $M_{span}$, and tieback anchor parameters (free length $L_f$ beyond active failure wedge, bond length $L_b$ from ultimate grout-ground friction $\tau_{ult}$).
3. **Peck (1969) / FHWA Apparent Earth Pressure Envelopes**:
   - Sand cuts: rectangular $\sigma_a = 0.65 \gamma H K_a$.
   - Soft to medium clay: stability ratio $N = \gamma H / c_u > 4$, $\sigma_a = \gamma H (1 - 4 c_u / (\gamma H))$.
   - Stiff clay: trapezoidal envelope $\sigma_a = 0.3 \gamma H$.
   - Evaluates tributary strut loads per meter and design strut axial demands based on horizonal spacing.

## Consequences
- Provides complete engineering workflows from initial shoring sizing to tieback anchor specification and strut bracing sizing.
