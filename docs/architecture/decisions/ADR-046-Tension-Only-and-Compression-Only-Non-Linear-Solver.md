# ADR-046: Tension-Only & Compression-Only Non-Linear Element Solver

## Status
Accepted

## Context
In structural engineering design (slender diagonal cross-braces, cable stays, tie rods, contact bearings, foundation soil uplift), elements frequently exhibit asymmetric uniaxial material or geometric constitutive behavior:
1. **Tension-Only Bracing**: Slender rods, angles, or cables cannot carry compressive force because they buckle at negligible axial loads ($P_{cr} \approx 0$). Once in compression, they go slack and shed all load to other members.
2. **Compression-Only Bearings & Soil**: Foundations on soil or elastomeric bearing pads cannot sustain tensile uplift. When subjected to net upward displacement, the contact boundary opens (liftoff).
3. **Equilibrium State Switching**:
   A simple linear analysis assigns full stiffness to both cross-bracing diagonals, erroneously assuming both diagonals share lateral shear equally. In reality, under lateral wind or seismic drift, one diagonal yields in tension while the other goes slack, resulting in twice the lateral drift.

Prior to Sprint B4.3, BeamLab had linear direct stiffness and P-Delta solvers, but lacked non-linear state-switching for tension-only / compression-only boundary elements.

## Decisions

### 1. State-Switching Non-Linear Solver (`TensionOnlySolver3D`)
- **Kinematic & Force State Criteria**:
  - For active elements:
    - If `tension-only` and $P < -10^{-3}\text{ N}$ or $\Delta L < -10^{-6}\text{ m} \to$ switch to `SLACK_DEACTIVATED`.
    - If `compression-only` and $P > 10^{-3}\text{ N}$ or $\Delta L > 10^{-6}\text{ m} \to$ switch to `LIFTOFF_DEACTIVATED`.
  - For deactivated elements:
    - If `tension-only` and $\Delta L > 10^{-6}\text{ m} \to$ reactivate (`TENSION_ACTIVE`).
    - If `compression-only` and $\Delta L < -10^{-6}\text{ m} \to$ reactivate (`COMPRESSION_ACTIVE`).
- **Phantom Residual Stiffness**:
  - Deactivated elements are assigned a small phantom stiffness factor ($\alpha_{slack} = 10^{-6}$) to ensure the global stiffness matrix remains non-singular without requiring dynamic topology condensation.
- **Convergence**:
  - Iterates until no element changes state between consecutive solver steps (typically 2 to 4 iterations).

### 2. Analytical Verification & Testing
- X-braced steel bay under $+20\text{ kN}$ lateral shear:
  - Diagonal A carries $100\%$ of diagonal tension ($P_A \approx 25\text{ kN}$).
  - Diagonal B goes completely slack ($P_B \approx 0\text{ N}$, `SLACK_DEACTIVATED`).
- Direction reversal ($-20\text{ kN}$ lateral push):
  - Solves state reversal where Diagonal B activates in tension and Diagonal A goes slack.

## Consequences
- **Positive**:
  - Accurate physical modeling of braced frames, tie rods, and foundation liftoff.
  - Fast convergence (sub-20ms in browser Javascript).
- **Next Steps**:
  - Advance to **Sprint B4.4: Non-Linear Static Pushover & Plastic Hinge Engine** (ASCE 41 / FEMA 356 lumped plastic hinges, capacity curve $V_{base}\text{ vs }\Delta_{roof}$, ductility ratio $\mu$).
