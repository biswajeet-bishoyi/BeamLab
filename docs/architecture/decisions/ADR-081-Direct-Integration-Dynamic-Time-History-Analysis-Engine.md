# ADR-081: Direct Integration Dynamic Time-History Analysis Engine

## Status
Accepted

## Context
Seismic design and structural engineering validation often necessitate transient dynamic analysis under ground motions, particularly for structures with significant irregularities, non-linear considerations, or benchmark verification of response spectrum analysis.
Engineers require:
1. Access to strong-motion earthquake record catalogs (such as El Centro 1940, Northridge 1994, Kobe 1995, Tohoku 2011) and synthetic harmonic wave generators.
2. Ground motion post-processing including scaling to target Peak Ground Acceleration (PGA) and baseline correction (zero-mean acceleration baseline).
3. A robust direct integration solver capable of solving Single-Degree-of-Freedom (SDOF) and Multi-Degree-of-Freedom (MDOF) dynamic equations of motion:
   $$M \ddot{u}(t) + C \dot{u}(t) + K u(t) = -M r \ddot{u}_g(t)$$
4. Viscous damping modeling using Rayleigh proportional damping $C = \alpha M + \beta K$.
5. Time-step response histories including relative displacements, relative velocities, absolute accelerations, story drifts, and dynamic base shear histories.

## Decision
We implemented `NewmarkIntegrator` and `GroundMotionProcessor` within `@beamlab/seismic-engine`:

1. **Newmark-$\beta$ Direct Step-by-Step Integration**:
   - Employs the unconditionally stable Newmark Average Acceleration method ($\gamma = 0.5$, $\beta = 0.25$).
   - Computes effective stiffness $\hat{K} = K + a_0 M + a_1 C$ with integration constants:
     $$a_0 = \frac{1}{\beta \Delta t^2}, \quad a_1 = \frac{\gamma}{\beta \Delta t}, \quad a_2 = \frac{1}{\beta \Delta t}, \quad a_3 = \frac{1}{2\beta} - 1, \quad a_4 = \frac{\gamma}{\beta} - 1, \quad a_5 = \frac{\Delta t}{2}\left(\frac{\gamma}{\beta} - 2\right)$$
   - Forms effective dynamic load $\hat{P}_{i+1}$ at each time step using state vectors $(u_i, \dot{u}_i, \ddot{u}_i)$.
   - Solves for $u_{i+1}$, then updates velocity $\dot{u}_{i+1}$ and acceleration $\ddot{u}_{i+1}$ without numerical drift or energy dissipation for linear elastic regimes.

2. **Rayleigh Damping Calculation**:
   - For user-specified modal damping ratios $\zeta_1, \zeta_2$ at frequencies $\omega_1, \omega_2$ (or modes $m, n$), coefficients $\alpha$ and $\beta$ are computed via:
     $$\begin{bmatrix} \alpha \\ \beta \end{bmatrix} = \frac{2 \omega_1 \omega_2}{\omega_2^2 - \omega_1^2} \begin{bmatrix} \omega_2 & -\omega_1 \\ -1/\omega_2 & 1/\omega_1 \end{bmatrix} \begin{bmatrix} \zeta_1 \\ \zeta_2 \end{bmatrix}$$

3. **Ground Motion Library & Processing**:
   - Built-in historic records for El Centro 1940 (PGA 0.319g), Northridge 1994 (PGA 0.843g), Kobe 1995 (PGA 0.821g), and Tohoku 2011 (PGA 0.548g).
   - High-fidelity synthetic harmonic wave generator with Hann envelope.
   - Exact PGA scaling and zero-mean baseline correction.

## Consequences
- Fast, pure TypeScript step-by-step linear dynamic solver with zero external dependencies.
- Complete time-history telemetry: story drift envelopes, peak base shear $V_{b,max}$, and instantaneous response states suitable for 60fps playback scrubbing in the 3D studio.
