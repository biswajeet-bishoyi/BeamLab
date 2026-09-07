# ADR-105: Müller-Breslau Influence Line & Surface Generation Engine

## Status
Accepted

## Context
A critical requirement in bridge structural engineering is evaluating internal forces (bending moment $M(x_0)$, shear force $V(x_0)$, axial force $N(x_0)$) and support reactions ($R_i$) under transient vehicular moving loads that traverse the superstructure. The Müller-Breslau principle states that the influence line for any action or reaction is represented, to scale, by the deflected shape of the structure produced by introducing a unit corresponding generalized displacement at the release of that action.

BeamLab requires an influence line and surface calculation engine capable of:
1. Deriving exact closed-form and discretized influence line curves for simply supported single-span and continuous multi-span bridge superstructures.
2. Accurately modeling the jump discontinuity ($\Delta V = 1.0$) at the shear evaluation station ($x_0$).
3. Evaluating positive and negative areas under influence lines for accompanying uniformly distributed traffic lane loads ($w_{lane} \int \eta(x) dx$).
4. Rapidly mapping arbitrary multi-axle vehicle trains to calculate instantaneous action responses ($S_{truck} = \sum W_i \eta(x_i)$).

## Decision
We implement `InfluenceLineEngine` within `@beamlab/bridge-engine/src/influence/`:
1. **Single-Span Analytical Influence Lines**:
   - **Reactions**: $R_A(x) = (L - x)/L$, $R_B(x) = x/L$.
   - **Bending Moment $M(x_0)$**: Triangular shape with peak ordinate $\eta_{peak} = \frac{x_0 (L - x_0)}{L}$ at $x = x_0$, zero at both ends, and positive area $A^+ = \frac{x_0 (L - x_0)}{2}$.
   - **Shear Force $V(x_0)$**: Sawtooth curve with ordinate $-x_0 / L$ immediately to the left of $x_0$ and $+(L - x_0) / L$ immediately to the right, exhibiting exact unit jump $\Delta V = 1.0$.
2. **Continuous Multi-Span Flexibility Formulation**:
   - Closed-form Clapeyron Three-Moment Theorem formulation for continuous two-span symmetric superstructures ($L_1 = L_2 = L$).
   - Interior pier moment influence line:
     $$M_B(x) = -\frac{x (L^2 - x^2)}{4 L} \quad (\text{for } x \le L)$$
     which is strictly negative across all spans, producing peak negative support moments when both spans are simultaneously loaded.
   - Superposition: $M(x_0, x) = M_0(x_0, x) + M_B(x) \cdot \frac{x_0}{L}$.
3. **Lane Load Integration & Vehicle Response**:
   - Methods `calculateVehicleResponse` and `calculateLaneResponse` allow instantaneous superposition of multi-axle trucks and lane loading according to AASHTO LRFD Section 3.6.1.2 and Eurocode 1 EN 1991-2.

## Consequences
- Enables instant, closed-form influence line generation without the computational overhead of refactorizing global stiffness matrices for hundreds of unit load positions.
- Forms the core calculation kernel for the Moving Load Stepping & Critical Envelope Hunter in Sprint B17.3.
- Supplies real-time interactive influence line curves to the HUD overlay in the 3D Bridge Studio UI (Sprint B17.5).
