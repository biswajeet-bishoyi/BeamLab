# ADR-124: Kingery-Bulmash Empirical Blast Waveform Engine and Friedlander Decay Modeling

## Status
Accepted

## Context
Designing structures against blast effects (terrorist explosive threats, accidental petrochemical vapor cloud explosions) requires determining incident and reflected shock wave overpressures, arrival times, durations, and impulses. The empirical formulations of Kingery-Bulmash and UFC 3-340-02 (formerly TM 5-855-1) remain the global standard benchmark for airblast characterization.

## Decision
We implemented `KingeryBulmashEngine` in `@beamstudio/blast-engine`:
1. **Explosives Catalog & Equivalency**:
   - Built-in equivalency factors for TNT, Composition B (1.11), ANFO (0.82), C-4 (1.30), RDX (1.60), PETN (1.28), and Semtex (1.25).
   - Surface burst reflection factor $1.8 \times$ ground enhancement.
2. **Scaled Distance & Peak Pressures**:
   - Scaled distance parameter $Z = R / W_{eff}^{1/3}$.
   - Unified Brode-Henrych equations for incident peak overpressure $P_{so}$.
   - Rankine-Hugoniot normal reflected pressure $P_r = 2 P_{so} \frac{7 P_0 + 4 P_{so}}{7 P_0 + P_{so}}$, with angular obliquity attenuation.
3. **Friedlander Waveform Generation**:
   - Evaluates shock front velocity $U$, arrival time $t_a$, and positive duration $t_d$.
   - Modified Friedlander decay function:
     $$P(t) = P_{peak} \left(1 - \frac{t - t_a}{t_d}\right) e^{-b \frac{t - t_a}{t_d}}$$
   - Exact discontinuity sampling at $t = t_a$ preserves the instantaneous shock pressure rise.

## Consequences
- Produces physically accurate, time-resolved blast loading curves for dynamic SDOF and structural finite element analysis.
