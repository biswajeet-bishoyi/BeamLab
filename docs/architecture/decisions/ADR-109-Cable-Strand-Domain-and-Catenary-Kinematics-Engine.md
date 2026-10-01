# ADR-109: Cable Strand Domain & Catenary Kinematics Engine

## Status
Accepted

## Context
Tension-only structural elements such as stay cables (cable-stayed bridges, suspended roofs, guyed masts) and main suspension bridge cables exhibit strong geometric non-linearity even under service dead loads. Unlike flexural members:
1. **Sag-Tension Interaction**: Self-weight creates an elastic catenary profile $y(x)$ that couples horizontal tension $H$, vertical sag $f$, and stressed arc length $L_s$.
2. **Inclined Asymmetry**: Support towers introduce substantial elevation differences ($h = y_B - y_A$), shifting the vertex $x_v$ and generating unequal cable anchor tensions ($T_B > T_A$).
3. **Manufacture vs In-Situ Geometry**: Due to high axial stresses ($\sigma \approx 700\text{--}900\text{ MPa}$), elastic elongation $\Delta L = \int \frac{T(s)}{EA} ds$ is significant. Fabricators require the precise unstressed cutting length $L_0 = L_s - \Delta L$ prior to shop prestretching.

Prior to Sprint B18.1, BeamLab lacked a codified cable strand domain and analytical catenary solver.

## Decision
We implement `@beamlab/cable-engine` with a dedicated catenary kinematics package (`packages/cable-engine/src/catenary/`):

1. **Standard Cable Strand Catalog (`CableCatalog.ts`)**:
   - Codified steel grades: Grade 1860 Parallel Wire Strand (PWS), Grade 1770 Full Locked Coil Rope (EN 12385-10), Grade 1570 Structural Spiral Strand (ASTM A586), and AISI 316 Stainless Steel Strand.
   - Standard structural stay diameters ranging from Ø15.7mm (monostrand) up to Ø250mm (heavy suspension cable group).

2. **Exact Catenary Kinematics Engine (`CatenaryGeometryEngine.ts`)**:
   - Exact closed-form solution for the catenary vertex $x_v$ using hyperbolic decomposition:
     $$x_v = \frac{L}{2} - c \cdot \operatorname{asinh}\left( \frac{h / c}{2 \sinh(L / 2c)} \right)$$
     where $c = H / w$ is the catenary parameter.
   - Exact total stressed arc length:
     $$L_s = \sqrt{h^2 + \left(2c \sinh\left(\frac{L}{2c}\right)\right)^2}$$
   - Exact vertical reactions $V_A = H \sinh(x_v / c)$ and $V_B = H \sinh((L - x_v) / c)$, guaranteeing global equilibrium $V_A + V_B = w \cdot L_s$.
   - Newton-Raphson inverse solver enabling direct modeling by target sag $f$ or sag ratio $f/L$.
   - Fast parabolic approximation for shallow cables ($f/L \le 0.1$).
   - Stressed and unstressed cutting lengths ($L_s$ and $L_0$).

## Consequences
- Establishes the mathematical foundation for Ernst equivalent modulus (Sprint B18.2) and stay tension optimization (Sprint B18.3).
- Provides exact geometric coordinates for 3D WebGL Web visual rendering in Sprint B18.5.
