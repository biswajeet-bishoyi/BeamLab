# ADR-085: Building Aerodynamic Pressure and MWFRS Distribution Engine

## Status
Accepted

## Context
Once atmospheric boundary layer velocity pressure profiles are known, structural designers must calculate:
1. External aerodynamic surface pressure coefficients ($C_p$) for windward, leeward, sidewalls, and roofs (ASCE 7-22 Chapter 27, Eurocode 1 EN 1991-1-4).
2. Internal building pressure coefficients ($GC_{pi}$) based on enclosure condition (Enclosed, Partially Enclosed, or Partially Open per ASCE 7 Table 26.13-1).
3. Floor-by-floor story wind forces, cumulative story shears, and global overturning moment ($M_{OT}$) acting on the Main Wind Force Resisting System (MWFRS).
4. Localized Components & Cladding (C&C) suction design pressures for exterior walls and roof edges/corners where flow separation creates high localized negative pressures.

## Decision
We implemented `AerodynamicPressureEngine` in `@beamlab/wind-engine`:
- **Wall Aerodynamic Coefficients**:
  - Windward $C_p = +0.80$.
  - Leeward $C_p$ evaluated as a continuous piecewise linear function of along-wind to cross-wind aspect ratio $L/B$ ($-0.50$ for $L/B \le 1.0$ up to $-0.20$ for $L/B \ge 4.0$).
  - Side walls $C_p = -0.70$.
- **Story Force Aggregation**:
  - Automatically divides facade elevations into story tributary bands.
  - Combines windward force ($q_z G C_p$) and leeward force ($q_h G |C_p|$) to compute total lateral floor loads.
  - Calculates cumulative story shears and base overturning moment $M_{OT} = \sum F_i \cdot z_i$.
- **Components & Cladding (C&C)**:
  - Automatically calculates codified end zone width $a = \max(0.9\text{ m}, \min(0.1 B, 0.1 L, 0.4 h))$.
  - Evaluates both positive inward pressure and peak suction pressures for wall field (Zone 4), wall corner/end (Zone 5), and roof zones 1, 2, and 3.

## Consequences
- Enables structural frame lateral analysis under code-compliant wind load combinations.
- Integrates seamlessly with BeamLab's 3D canvas and web UI for real-time facade pressure heatmaps and floor shear envelope diagrams.
