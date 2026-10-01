# ADR-043: Dynamic Mode Shape & Vibration Eigen-Visualizer

## Status
Accepted

## Context
In earthquake engineering (ASCE 7-22, Eurocode 8, IS 1893) and structural dynamics, eigenvalue analysis determines how a structural system naturally oscillates when subjected to ground motions, wind gust excitation, and operational vibrations:
$$([K] - \omega_n^2 [M])\{\phi_n\} = \{0\}$$
Critical design criteria governed by dynamic modes include:
1. **Natural Cyclic Frequency & Fundamental Period**:
   $$f_n = \frac{\omega_n}{2\pi}\text{ [Hz]}, \quad T_n = \frac{1}{f_n}\text{ [s]}$$
   Determines spectral acceleration $S_a(T)$ on design response spectra.
2. **Modal Mass Participation Ratios**:
   $$U_{n, X} = \frac{(\Gamma_{n, X})^2}{M_{total}}, \quad U_{n, Y} = \frac{(\Gamma_{n, Y})^2}{M_{total}}$$
   Codes mandate that enough modes are included in dynamic analysis such that the cumulative effective modal mass reaches at least $90\%$ of total structural mass in each orthogonal horizontal direction:
   $$\sum U_X \ge 90\%, \quad \sum U_Y \ge 90\%$$
3. **Continuous Harmonic Phase Animation**:
   $$u(x, y, z, t) = \{\phi_n\} \cdot \sin(\omega_n t)$$
   Visualizing relative phase motion allows engineers to instantly identify torsional vulnerability, soft-story mechanisms, and localized flexible rafter/chord flutter.

## Decisions

### 1. Dynamic Modal Analysis Engine (`ModalAnalysisEngine`)
- **Eigenvalue Evaluation**: Computes frequencies $f_n$, periods $T_n$, circular frequencies $\omega_n$, and generalized modal masses $M_n$.
- **Mass Participation Accounting**: Tracks directional participation percentages ($U_X, U_Y, U_Z$) and cumulative progressive sums.
- **Seismic Code Compliance Verification**: Automatically flags whether the modal basis satisfies the $\ge 90\%$ effective mass criterion (Eurocode 8 / ASCE 7-22), reporting the exact mode count required to reach $90\%$.
- **Motion Classification**: Auto-classifies each mode into structural motion archetypes (`Sway_X`, `Sway_Y`, `Torsion_Z`, `Vertical_Z`, `Coupled`).

### 2. Interactive Modal Vibration Studio (`ModalVibrationStudio`)
- **Harmonic Wireframe Oscillator**: 60 FPS phase-driven SVG visualizer rendering sinusoidal modal vibrations:
  $$u(t) = \phi \cdot \sin(\omega t \cdot \text{speed})$$
  with ghost undeformed wireframe overlay and deformed node coordinates.
- **Dynamic Control Deck**:
  - Play/Pause toggle and phase reset ($\omega t = 0^\circ$).
  - Animation speed scaler ($0.2\times, 0.5\times, 1.0\times, 2.0\times$).
  - Amplitude magnification slider ($5\times$ to $50\times$).
  - Ghost structure toggle.
- **Directional Spectrum Progress Bars**: Visualizes cumulative participation progress against the $90\%$ code threshold marker.
- **Modal Eigenvalue Spectrum Table**: Mode-by-mode breakdown with one-click mode switching and CSV export.

### 3. Studio Drawer Integration (`MemberDiagramStudio`)
- Integrated alongside the Critical Station Hunter and Global Equilibrium Audit in the top header toolbar.

## Consequences
- **Positive**:
  - Engineers can visually and mathematically verify structural dynamics without leaving the web browser.
  - Transparent verification of the mandatory $90\%$ cumulative mass participation requirement for seismic certification.
- **Next Steps**:
  - Phase B3 is now 100% COMPLETE.
  - Advance to **Phase B4: Advanced Solver & Non-Linear Mechanics** (P-Delta second order effects, cable catenary formulation, elastoplastic pushover, and web worker parallel solvers).
