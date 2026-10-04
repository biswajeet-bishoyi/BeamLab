# ADR-110: Ernst Equivalent Modulus & Geometric Non-Linearity Engine

## Status
Accepted

## Context
Cable structures (stay cables in cable-stayed bridges, cable roofs, and suspension bridges) exhibit strong geometric non-linearity due to sag under dead weight. When tension increases, the cable straightens (geometric deformation) in addition to purely Hookean material stretching.

In linear and quasi-linear bridge structural analysis (such as beam-truss frame discretization in `@beamstudio/direct-stiffness`), modeling each individual cable as dozens of non-linear catenary segments is computationally prohibitive during live load influence surface and vehicle stepping calculations.

In 1965, H.J. Ernst formulated the **Equivalent Modulus of Elasticity ($E_{eq}$)**, which maps the non-linear catenary sag behavior into an equivalent straight chord truss/bar element with an adjusted modulus.

## Decision
We implement `ErnstModulusEngine` and associated types in `@beamstudio/cable-engine/src/ernst/`:

1. **Ernst Tangent Modulus ($E_{tan}$)**:
   $$E_{tan} = \frac{E_0}{1 + \frac{(w \cdot L_h)^2 \cdot E_0 \cdot A}{12 \cdot T^3}} = \frac{E_0}{1 + \frac{\gamma^2 \cdot L_h^2 \cdot E_0}{12 \cdot \sigma^3}}$$
   - Captures instantaneous stiffness for modal vibration, dynamic response, and differential live load increments.
   - Reduction factor $\eta = E_{tan} / E_0 \in (0, 1]$.
   - Irvine sag parameter $\lambda^2 = \left(\frac{w L_h}{T}\right)^2 \frac{E_0 A}{T} \frac{1}{\cos^2\theta}$ for transverse-longitudinal elastodynamic coupling.

2. **Ernst Secant Modulus ($E_{sec}$)**:
   $$E_{sec} = \frac{E_0}{1 + \frac{(w \cdot L_h)^2 \cdot E_0 \cdot A}{24} \cdot \frac{T_1 + T_2}{T_1^2 \cdot T_2^2}}$$
   - Formulates the exact secant stiffness between two distinct tension states ($T_1 \to T_2$).
   - Mathematically converges to $E_{tan}$ as $T_2 \to T_1$.
   - Suitable for step-by-step construction staging, post-tensioning tensioning increments, and thermal expansion increments.

3. **Iterative Elongation Solver (`solveIterativeElongation`)**:
   - Implements fixed-point/secant equilibrium iteration for stay cables subjected to arbitrary deck/tower boundary displacements $\Delta L_c$.
   - Converges monotonically within 3 to 8 iterations.

## Consequences
- Enables standard linear and 2nd-order frame solvers to model stay cables accurately without multi-element discretization.
- Forms the core stiffness kernel required for stay cable tuning (Sprint B18.3) and suspension bridge modeling (Sprint B18.4).
