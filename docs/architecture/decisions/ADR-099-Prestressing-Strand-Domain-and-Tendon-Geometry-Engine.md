# ADR-099: Prestressing Strand Domain and Tendon Geometry Engine

## Status
Accepted

## Context
Phase B16 introduces prestressed and post-tensioned (PT) concrete structural engineering to BeamLab (`@beamlab/prestressed-engine`). Prestressed concrete elements rely on high-tensile steel strands positioned at controlled eccentricities to pre-compress concrete tension zones and counteract gravity-induced bending moments and deflections.

Accurate modeling of prestressed concrete requires:
1. **High-Tensile Prestressing Steel Catalog**: ASTM A416 Grade 270 (1860 MPa) low-relaxation strands, EN 10138-3 Y1860S7, and IS 14268 Class 2 strands with exact nominal cross-sectional areas ($A_{strand}$), yield strengths ($f_{py} = 0.90 f_{pu}$), and modulus of elasticity ($E_p \approx 195\text{–}197\text{ GPa}$).
2. **Tendon Assembly Specifications**: Support for single mono-strands (unbonded slab systems with grease/plastic sheath) and multi-strand tendons housed in galvanized or corrugated plastic ducts (bonded beam/girder systems).
3. **Parametric Tendon Trajectory Formulation**:
   - **Parabolic Profile**: For simply supported members subject to uniformly distributed loads, yielding constant upward equivalent balancing force.
   - **Harped / Draped Profile**: For precast girders with concentrated hold-down deviators at third-points or custom stations.
   - **Reverse Continuous Parabola**: For continuous indeterminate spans with convex support reverse curves (crest) transitioning seamlessly to concave midspan sags.
4. **Differential Kinematics**: First derivative $\theta(x) = dy/dx$ (tangent slope) and second derivative $\kappa(x) = d^2y/dx^2$ (curvature), required for friction loss calculation and transverse balanced load derivation.

## Decision
1. Create `@beamlab/prestressed-engine` package with dual ESM/CJS build via `tsup` and strict TypeScript declarations.
2. Implement `StrandCatalog.ts` providing standard strand definitions (0.5" / 12.7mm, 0.6" / 15.2mm, and custom sizes) with tendon capacity and initial jacking limits per ACI 318-19 Section 20.3.2.5.1 ($0.80 f_{pu}$ or $0.94 f_{py}$).
3. Implement `TendonProfileEngine.ts` supporting analytical evaluation of coordinates $y(x)$, eccentricity $e(x) = y(x) - y_{cgc}$, slope $\theta(x)$, cumulative angular change $\alpha(x)$, and local curvature $\kappa(x)$.
4. Provide comprehensive unit tests verifying geometric accuracy, inflection smoothness, and coordinate limits.

## Consequences
- Enables analytical friction and wobble loss calculations in Sprint B16.2.
- Furnishes direct input to equivalent load balancing and hyperstatic secondary moments in Sprint B16.3.
- Supplies geometric coordinates for interactive 3D WebGL tendon rendering in Sprint B16.5.
