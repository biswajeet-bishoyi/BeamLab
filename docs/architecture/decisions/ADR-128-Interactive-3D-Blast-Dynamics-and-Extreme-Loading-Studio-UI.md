# ADR-128: Interactive 3D Blast Dynamics and Extreme Loading Studio UI

## Status
Accepted

## Context
Structural protection against extreme events requires seamless visual comprehension of high-rate dynamic phenomena (expanding airblast shock fronts, transient structural deflection oscillations, alternate path redistributions, and barrier scabbing/perforation craters).

## Decision
We implemented `BlastStudio` in `apps/web/src/features/blast/BlastStudio.tsx`:
1. **Four Specialized Dynamic Domains**:
   - `airblast`: Standoff detonation modeling computing Kingery-Bulmash scaled parameters, incident/reflected overpressure, and Friedlander decay curves.
   - `sdof-dynamics`: Time-history numerical integration of structural members under blast loads, tracking peak displacement $y_{max}$, ductility ratio $\mu$, and support rotation angle $\theta$ against UFC 3-340-02 / ASCE 59-11 criteria.
   - `progressive-collapse`: DoD UFC 4-023-03 alternate load path verification with critical column removal, dynamic amplification factor (DAF), demand-capacity ratio (DCR), and catenary tie tension checks.
   - `projectile-impact`: High-velocity missile impact on reinforced concrete / steel barriers per Modified NDRC and BRL equations, calculating penetration depth $x$, scabbing limit $h_s$, and perforation limit $h_p$.
2. **Interactive 3D Three.js Visualizer**:
   - Real-time 3D rendering of explosive fireball, expanding spherical shock front shell, target facade deflection, framed progressive collapse bay with removed column wireframe, and missile penetration crater.
3. **Scorecard HUD**:
   - Real-time limit state pass/fail indicators against DoD UFC 3-340-02, ASCE 59-11, and UFC 4-023-03.

## Consequences
- Provides engineers and security designers with intuitive, instantaneous visual verification of blast resistance and extreme impact mitigation.
