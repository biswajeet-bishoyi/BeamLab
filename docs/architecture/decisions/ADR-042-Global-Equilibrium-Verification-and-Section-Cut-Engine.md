# ADR-042: Global Equilibrium Verification & Free-Body Section Cut Engine

## Status
Accepted

## Context
In professional structural engineering analysis (AISC 360, Eurocode, IS 456 / IS 800), verification of numerical equilibrium is the primary gatekeeper for calculation validity. Before sizing members or checking code ratios, engineers must prove:
1. **Global Force Equilibrium**:
   $$\sum \vec{F}_{ext} + \sum \vec{R}_{supports} = \vec{0}$$
   $$\sum F_X = 0, \quad \sum F_Y = 0, \quad \sum F_Z = 0$$
2. **Global Moment Equilibrium**:
   $$\sum \vec{M}_{ext, O} + \sum (\vec{r}_i \times \vec{R}_i + \vec{M}_{r, i}) = \vec{0}$$
3. **Equilibrium Residual Metrics**:
   The residual force norm $\|\Delta \vec{F}\|$ and relative discrepancy percentage:
   $$\epsilon_F = \frac{\|\Delta \vec{F}\|}{\|\sum \vec{F}_{ext}\|} \times 100\%$$
   must be within acceptable numerical tolerances ($< 0.01\%$).
4. **Free-Body Cut Verification**:
   When dissecting a sub-structure along an arbitrary cut plane (e.g. floor slicing at $Z = z_0$, or apex cut at $X = x_0$), the integrated internal force resultants transferred across the cut boundary must exactly balance the applied loads and reactions on the isolated body:
   $$\sum \vec{F}_{isolated, ext} + \sum \vec{R}_{isolated} + \sum \vec{F}_{cut, internal} = \vec{0}$$

Prior to Sprint B3.4, BeamLab had internal force stations and envelope hunter algorithms, but lacked an automated equilibrium auditor, reaction schedule reporter, and free-body cut analyzer.

## Decisions

### 1. Global Equilibrium Verifier (`EquilibriumVerifier`)
- **Residual Tensor Evaluation**: Computes 6-DOF force and moment balance about model origin $(0, 0, 0)$ across all load combinations (Gravity ULS, Lateral Wind ULS, Serviceability SLS).
- **Classification Engine**: Assigns status:
  - `PERFECT` ($\|\Delta F\| < 10^{-3}\text{ kN}, \|\Delta M\| < 10^{-3}\text{ kNm}$)
  - `BALANCED` ($\epsilon_F < 0.05\%$)
  - `WARNING` ($\epsilon_F < 0.5\%$)
  - `IMBALANCED` ($\epsilon_F \ge 0.5\%$)
- **Planar Free-Body Section Cut**:
  - Dynamically calculates which members intersect the user-defined plane ($Z = z_0$ or $X = x_0$).
  - Projects internal forces ($N, V_y, V_z, M_y, M_z, T$) into global coordinate vectors.
  - Verifies sub-structure force closure against isolated applied loads.

### 2. Interactive Equilibrium Audit Panel (`EquilibriumAuditPanel`)
- **6-DOF Equilibrium Scorecard**: Side-by-side comparison of applied load, total reaction, residual discrepancy, and pass/fail indicators.
- **Support Reactions Schedule**: Tabular breakdown of support nodes, coordinates, fixity types, reaction vectors ($F_x, F_y, F_z$), and overturning moments ($M_y$).
- **Free-Body Cut Inspector**: Interactive plane axis switch ($Z$ vs $X$) and coordinate slider with real-time sub-structure force closure readouts.
- **Export & Copy**: Direct CSV export and one-click formatted calculation text copy for engineering audit reports.

### 3. Studio Drawer Integration (`MemberDiagramStudio`)
- Collapsible glassmorphic drawer toggleable with the `Equilibrium` header button.

## Consequences
- **Positive**:
  - Structural engineers can instantly verify the integrity of the finite element solver results.
  - Free-body cuts provide transparent physical validation of internal member forces against external loads.
- **Next Steps**:
  - Sprint B3.5: Dynamic Mode Shape & Vibration Eigen-Visualizer ($f_n\text{ [Hz]}$, modal mass participation, animated deformations).
