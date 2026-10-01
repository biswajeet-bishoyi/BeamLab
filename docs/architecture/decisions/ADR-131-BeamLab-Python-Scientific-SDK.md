# ADR-131: BeamLab Python Scientific SDK Architecture

## Status
Accepted

## Context
Scientific researchers, computational civil engineers, and automated optimization workflows (e.g. parametric sweeps, generative design, machine learning surrogate training) require a pure Python scientific library that interfaces seamlessly with BeamLab's domain engines and Cloud Solve Farm without requiring manual GUI interactions.

## Decision
We created the `beamlab-sdk` Python package in `sdk/python/`:
1. **Core Structural Mechanics (`beamlab.model`)**:
   - `Node`, `Member`, and `Model` data classes.
   - 2D/3D frame stiffness matrix formulation, local-to-global coordinate rotation $T$, and boundary-conditioned linear solver via NumPy.
   - Serialization to/from BeamLab standard JSON format (`model.to_dict()`).
2. **Specialized Engineering Domains (`beamlab.domains`)**:
   - `Catenary`: Cable sag, horizontal tension $H$, max support tension $T_{max}$, and catenary profiles.
   - `RetainingWall`: Rankine active earth pressure, overturning & sliding safety factors, and kern eccentricity limits.
   - `BlastAnalysis`: Kingery-Bulmash scaled distance $Z$, peak overpressure $P_{so}$, positive phase duration $t_d$, and SDOF dynamic load factor (DLF).
3. **Cloud Solve Farm Client (`beamlab.client`)**:
   - `SolveFarmClient` class with job submission, status polling, and residual generator streaming.

## Consequences
- Enables automated headless analysis, testing, and parametric studies in standard Python scientific environments (Jupyter, Google Colab, HPC clusters).
