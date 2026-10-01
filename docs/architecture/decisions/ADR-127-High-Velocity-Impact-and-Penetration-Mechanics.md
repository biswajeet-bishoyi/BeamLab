# ADR-127: High-Velocity Projectile Impact and Penetration Mechanics via Modified NDRC and BRL

## Status
Accepted

## Context
Critical infrastructure (nuclear power plants, defense facilities, industrial chemical plants) must be fortified against tornado-generated missiles, aircraft debris, and high-velocity ballistic fragments. Predictive equations are necessary to determine penetration, scabbing, and perforation thickness thresholds.

## Decision
We implemented `ImpactEngine` in `@beamlab/blast-engine`:
1. **Concrete Barriers (Modified NDRC)**:
   - Implemented National Defense Research Committee (NDRC) formulations incorporating projectile mass $M$, velocity $v_0$, diameter $d$, and nose shape factor $N^*$ (flat, blunt, spherical, conical, ogive).
   - Computes penetration depth $x$, scabbing limit thickness $h_s$, perforation limit thickness $h_p$, and residual exit velocity $v_r$.
2. **Structural Steel Barriers (BRL)**:
   - Implemented Ballistic Research Laboratory (BRL) empirical perforation limit thickness based on kinetic energy and steel yield strength.

## Consequences
- Enables barrier thickness sizing to prevent dangerous backface scabbing and projectile perforation.
