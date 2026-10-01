# BeamLab Python Scientific SDK

The official Python Scientific SDK for **BeamLab** — Cloud Computational Structural Mechanics, Continuum FEM, Geotechnical Earth Retaining, Blast Dynamics, and Distributed Solve Farm Integration.

## Quickstart

```python
import numpy as np
from beamlab import Model, Catenary, RetainingWall, BlastAnalysis, SolveFarmClient

# 1. Structural Frame Modeling & Local NumPy Solve
model = Model(name="Portal Frame")
n1 = model.add_node(x=0.0, y=0.0, fixed=[True, True, True])
n2 = model.add_node(x=0.0, y=4.0)
n3 = model.add_node(x=6.0, y=4.0)
n4 = model.add_node(x=6.0, y=0.0, fixed=[True, True, True])

col_sec = {"A": 0.012, "I": 2.5e-4, "E": 200e9}
beam_sec = {"A": 0.018, "I": 6.8e-4, "E": 200e9}

model.add_member(n1, n2, **col_sec)
model.add_member(n2, n3, **beam_sec)
model.add_member(n4, n3, **col_sec)

# Apply point load at midspan
model.add_nodal_load(n2, fx=45e3)

displacements = model.solve()
print(f"Frame Peak Displacement: {np.max(np.abs(displacements)):.4f} m")

# 2. Specialized Geotechnical & Extreme Dynamics Engines
wall = RetainingWall.analyze(height=5.0, friction_angle=32.0, unit_weight=18.5)
print(f"Retaining Wall Sliding FS: {wall.fs_sliding:.2f}")

blast = BlastAnalysis.calculate_waveform(charge_mass=250.0, standoff=15.0)
print(f"Reflected Peak Overpressure: {blast.peak_reflected_kpa:.1f} kPa")

# 3. Cloud Solve Farm Remote Execution
client = SolveFarmClient(endpoint="https://farm.beamlab.io")
job = client.submit(model, solver="direct-sparse", priority="interactive")
print(f"Remote Cloud Solve Job ID: {job.id}")
```
