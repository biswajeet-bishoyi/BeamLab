# ADR-089: Timber Material Domain and Orthotropic Constitutive Engine

## Status
Accepted

## Context
Structural wood and mass timber construction (Glued Laminated Timber, Cross-Laminated Timber, and structural sawn lumber) require rigorous material modeling that accounts for wood's orthotropic cellular nature: strengths and stiffness parallel to the grain ($0^\circ$) are an order of magnitude higher than perpendicular to the grain ($90^\circ$). Additionally, timber mechanical capacities are highly sensitive to load duration, environmental moisture content (service classes), temperature, member size, and load sharing across parallel framing.

Prior to Phase B14, BeamLab lacked a dedicated structural wood engine (`@beamlab/timber-engine`).

## Decision
We implemented **Sprint B14.1: Timber Material Domain & Orthotropic Constitutive Engine** in `@beamlab/timber-engine`:

1. **Codified Timber Grade Database (`TimberMaterialDatabase.ts`)**:
   - Eurocode 5 / EN 338 softwoods (C16, C24, C30) and hardwoods (D30).
   - Eurocode 5 / EN 14080 Glued Laminated Timber (GL24h, GL28h, GL32h).
   - NDS 2024 (ANSI/AWC) stress-graded lumber (Douglas Fir-Larch No. 1, Southern Pine No. 2, Glulam 24F-1.8E).
   - IS 883:1994 Indian standard species (Teak, Sal, Deodar).
   - Comprehensive orthotropic parameters: $E_{0,mean}, E_{0,05}, E_{90,mean}, G_{0,mean}, G_{90,mean}$, characteristic bending $f_{m,k}$, tension parallel/perpendicular ($f_{t,0}, f_{t,90}$), compression parallel/perpendicular ($f_{c,0}, f_{c,90}$), longitudinal shear $f_v$, and rolling shear $f_r$.

2. **Codified Modification Factors (`TimberModificationFactors.ts`)**:
   - **Eurocode 5**: Service Classes 1, 2, 3 and load duration classes (Permanent, Long, Medium, Short, Instantaneous) for $k_{mod}$, partial factor $\gamma_M$, creep deformation factor $k_{def}$, depth factor $k_h$, and system strength factor $k_{sys}$.
   - **NDS 2024**: Load duration factor $C_D$ (0.90 to 2.00), wet service factor $C_M$, temperature factor $C_t$, size factor $C_F$, glulam volume factor $C_V$, and repetitive member factor $C_r$.
   - **IS 883**: Location factor $k_1$ and shape factor $k_2$.

3. **Orthotropic Constitutive Modeling (`OrthotropicWoodModel.ts`)**:
   - Hankinson formula for off-axis bearing and tensile/compressive strength at arbitrary grain inclination angle $\theta$:
     $$f_\theta = \frac{f_0 f_{90}}{f_0 \sin^2 \theta + f_{90} \cos^2 \theta}$$
   - Plane-stress orthotropic stiffness matrix $[C]$.
   - Norris / Tsai-Hill orthotropic failure criterion for combined biaxial stress states.

4. **Design Strength Resolution (`TimberMaterialEngine.ts`)**:
   - Unified interface generating design strengths ($f_{m,d}, f_{c,0,d}, f_{v,d}$) and long-term creep-adjusted moduli $E_{0,eff} = E_{mean} / (1 + k_{def})$.

## Consequences
- Foundation established for Sawn Timber / Glulam member design (Sprint B14.2), CLT orthotropic plates (Sprint B14.3), and Johansen fastener connections (Sprint B14.4).
- Zero external runtime dependencies in `@beamlab/timber-engine`.
- 100% test passing rate in Vitest.
