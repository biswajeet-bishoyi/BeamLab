# ADR-125: Biggs Equivalent SDOF Non-Linear Dynamic Blast Response Analysis

## Status
Accepted

## Context
Full non-linear dynamic continuum finite element modeling of structural members under blast overpressure can be computationally intensive. Biggs (1964) and DoD UFC 3-340-02 equivalent Single Degree of Freedom (SDOF) methods provide fast, code-approved evaluations of dynamic deflection, ductility, and support rotations.

## Decision
We implemented `SDOFBlastEngine` in `@beamlab/blast-engine`:
1. **Biggs Transformation Factors**:
   - Boundary condition lookups for $K_{LM} = K_M / K_L$ across simply-supported, fixed-fixed, cantilever, and propped-cantilever configurations.
   - Equivalent dynamic mass $M_e = K_{LM} M_{total}$.
2. **Non-Linear Resistance & Rate Effects**:
   - Dynamic Increase Factor (DIF) accounts for high strain-rate strength amplification in structural steel ($1.15 \sim 1.25$) and concrete ($1.25 \sim 1.40$).
   - Bilinear elastic-ideal plastic resistance function $R(y)$.
3. **Explicit Time-History Integration**:
   - Velocity Verlet explicit numerical integration solving:
     $$M_e \ddot{y} + C \dot{y} + R(y) = F(t)$$
   - Computes peak dynamic displacement $y_{max}$, ductility ratio $\mu = y_{max} / y_{el}$, and support rotation angle $\theta$.
   - Automatic classification into Low, Medium, and High protection damage levels per ASCE 59-11 and UFC 3-340-02.

## Consequences
- Enables rapid screening and design of protective structural members (blast-resistant facades, shear walls, columns).
