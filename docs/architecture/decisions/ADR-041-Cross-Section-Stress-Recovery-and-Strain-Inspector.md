# ADR-041: Cross-Section Stress Recovery & Fiber Strain State Inspector

## Status
Accepted

## Context
In structural engineering design workflows (AISC 360-16, Eurocode 3 EN 1993-1-1, IS 800), internal forces ($N, V_y, V_z, M_y, M_z, T$) alone are intermediate representations. Structural engineers and detailers evaluate cross-sectional performance by recovering continuous internal stress fields:
1. Normal Bending & Axial Stresses:
   $$\sigma_x(y, z) = \frac{N}{A} - \frac{M_z \cdot y}{I_{zz}} + \frac{M_y \cdot z}{I_{yy}}$$
2. Transverse & Torsional Shear Stresses:
   $$\tau_{xy}(y) = \frac{V_y \cdot Q_z(y)}{I_{zz} \cdot t_w}, \quad \tau_T = \frac{T \cdot t_{max}}{J}$$
3. Equivalent Multi-Axial Yield Criteria:
   $$\sigma_{vm} = \sqrt{\sigma_x^2 + 3\tau^2}$$
4. Neutral Axis (N.A.) Kinematics:
   The zero-stress neutral axis shifts and rotates under combined axial thrust/tension and biaxial bending:
   $$\tan \alpha_{NA} = \frac{M_y \cdot I_{zz}}{M_z \cdot I_{yy}}, \quad y_{NA} = \frac{\sigma_{axial} \cdot I_{zz}}{M_z}$$

Prior to Sprint B3.3, BeamLab provided internal force diagrams and multi-case envelopes, but lacked localized fiber-level stress recovery, neutral axis visualization, and cross-sectional yield point inspection.

## Decisions

### 1. 2D Fiber Discretization Engine (`StressRecoveryEngine`)
- **Profile Discretization**: Standard steel profiles (IPE, W-beams, Universal Columns, Hollow Sections) are discretized into 2D fiber meshes:
  - Top and bottom flanges: Multi-column fiber ribbons capturing flange tip biaxial extremes.
  - Web: Multi-row fiber grid capturing parabolic shear distribution $Q(y)$.
  - Hollow tubes (CHS): Concentric ring angular fibers capturing uniform shear and perimeter bending.
- **Continuous Interpolation**: Fiber states are calculated on-the-fly at any continuous member station $x \in [0, L]$.

### 2. Interactive SVG Cross-Section Inspector (`CrossSectionStressInspector`)
- **Multi-Metric Heatmaps**:
  - Normal Stress ($\sigma_x$): Blue (Compression) $\leftrightarrow$ Slate (Zero) $\leftrightarrow$ Red/Rose (Tension).
  - Shear Stress ($\tau$): Parabolic web gradient (Slate $\to$ Emerald $\to$ Amber).
  - Von Mises Stress ($\sigma_{vm}$): Continuous multi-hue spectrum with explicit yield limit threshold ($f_y = 355\text{ MPa}$).
  - Elastic Strain ($\varepsilon_x$): Microstrain ($\mu\varepsilon$) field.
- **Dynamic Neutral Axis Line**: Real-time rendering of the tilted and offset neutral axis line across the cross section, indicating depth shift and angle.
- **Hover Probe**: Millimeter-precision crosshair probe querying $(y, z)$, $\sigma_x$, $\tau$, $\sigma_{vm}$, $\varepsilon$, and elastic status.
- **Station Scrubber**: Interactive slider along member span $x \in [0, L]$ with preset shortcuts (Start, Midspan, End).

### 3. Studio Integration (`MemberDiagramStudio`)
- Integrated as a seamless 3rd view mode (`single`, `envelope`, `stress`).
- Synchronized with active member selection and hovered diagram stations.

## Consequences
- **Positive**:
  - Engineers can visually diagnose yielding, neutral axis migration, and web shear peaking at any point along any structural member.
  - Zero roundtrip latency: 2D fiber calculations execute in sub-millisecond Javascript.
- **Next Steps**:
  - Sprint B3.4: Global Equilibrium & Reaction Verification Engine ($\sum F = 0, \sum M = 0$, free-body cuts).
