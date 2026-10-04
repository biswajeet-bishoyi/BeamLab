# ADR-106: Moving Load Stepping, Critical Envelope Hunter & Fatigue Range

## Status
Accepted

## Context
Bridge design codes (AASHTO LRFD Section 3.6.1, Eurocode 1 EN 1991-2) require engineers to determine the worst-case internal forces across every station along a bridge superstructure by varying the position of vehicular axle trains. Unlike stationary building loads, vehicular loads translate along lanes in both traffic directions, where different axle configurations govern different structural actions:
1. Maximum positive bending moments along the span occur when the heavy drive axles straddle the peak of the moment influence line.
2. Maximum shear and support reactions govern when the heaviest axle is placed directly at the bearing seat.
3. Fatigue limit states (Fatigue I & II in AASHTO) require assessing the cyclic live load stress range ($\Delta f = \Delta M / S_x$) produced by a single design truck with a constant $9.0\text{ m}$ rear axle spacing and a reduced dynamic load allowance ($IM = 15\%$).
4. Accompanying design lane loads ($9.3\text{ kN/m}$ for AASHTO, $27\text{ kN/m}$ for Eurocode LM1) must be superposed over the loaded influence line segments concurrently with the truck.

BeamLab requires an automated, robust stepping analyzer that steps multi-axle trains along the span, records critical governing head positions, computes peak force envelopes, and evaluates fatigue stress ranges.

## Decision
We implement `MovingLoadAnalyzer` within `@beamstudio/bridge-engine/src/moving/`:
1. **Incremental Multi-Axle Stepping Algorithm**:
   - The vehicle train is stepped across the bridge domain from $x_{head} = -L_{truck}$ to $x_{head} = L_{span} + L_{truck}$ at user-configurable spatial increments $\Delta x$ (default $0.1\text{ m}$).
   - For each evaluation station $x_0$, the instantaneous truck response is computed as:
     $$S_{truck}(x_{head}) = \sum_{i=1}^n W_i \cdot \eta(x_{head} - d_i)$$
     for all axles actively on the bridge ($0 \le x_{head} - d_i \le L$).
2. **Bidirectional Traversing**:
   - Evaluates both forward (normal axle order) and reverse (rear axle leading) travel directions to ensure asymmetrical truck configurations (e.g. $35\text{ kN} - 142\text{ kN} - 142\text{ kN}$) capture the absolute worst-case envelope.
3. **Dynamic Impact and Lane Load Superposition**:
   - Applies the dynamic load allowance $IM$ strictly to the truck component:
     $$S_{max}^+(x_0) = S_{truck}^+(x_0) \cdot (1 + IM) + w_{lane} \int \max(0, \eta) dx$$
     $$S_{min}^-(x_0) = S_{truck}^-(x_0) \cdot (1 + IM) + w_{lane} \int \min(0, \eta) dx$$
4. **Fatigue Stress Range Evaluation**:
   - Automates AASHTO Fatigue Truck stepping to extract $\Delta M_{fat}(x_0) = M_{fat}^+(x_0) - M_{fat}^-(x_0)$ and converts it to stress range $\Delta f = \Delta M / S_x$ when section modulus $S_x$ is specified.

## Consequences
- Produces complete, smooth response envelopes ($M_{max}^+, M_{min}^-, V_{max}^+, V_{min}^-$) for all stations along the bridge.
- Accurately tracks governing truck head positions ($x_{gov}$), enabling interactive 3D visualization of the truck in its exact critical pose in the Bridge Studio UI (Sprint B17.5).
- Directly feeds the girder distribution factors and skew engine in Sprint B17.4.
