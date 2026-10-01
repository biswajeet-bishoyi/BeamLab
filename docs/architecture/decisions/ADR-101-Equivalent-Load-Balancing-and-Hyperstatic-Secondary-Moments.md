# ADR-101: Equivalent Load Balancing and Hyperstatic Secondary Moments

## Status
Accepted

## Context
In prestressed concrete design, T.Y. Lin's **Equivalent Load Balancing Method** provides an intuitive and mathematically rigorous approach to understanding prestress mechanics:
1. **Load Balancing Mechanics**:
   - The curvature of a draped tendon applies a continuous radial pressure to the concrete.
   - For a parabolic tendon with midspan sag $d$ under effective prestress $P_{eff}$, the tendon applies a uniform upward force:
     $$w_{bal} = -P_{eff} \frac{d^2 y}{dx^2} = \frac{8 P_{eff} d}{L^2}$$
   - For harped tendons with sharp angle changes, concentrated upward kink forces $Q_{bal} = 2 P_{eff} \sin\theta$ develop at each hold-down station.
   - At anchorages, eccentricities generate end moments $M_{anchor} = P_{eff} e_{anchor}$ and longitudinal compression $N = P_{eff} \cos\theta$.
   - When $w_{bal} = w_{dead}$, the beam behaves as a pure axially compressed column under dead load with zero bending stress and zero deflection!

2. **Primary vs Secondary (Hyperstatic) Prestress Moments**:
   - In statically determinate beams (simply supported, cantilevers), the prestress moment is purely primary:
     $$M_{pt}(x) = M_1(x) = P_{eff}(x) \cdot e(x)$$
   - In statically indeterminate (continuous) beams or frames, the beam cannot deform freely without generating secondary hyperstatic support reactions $R_{hyp}$.
   - The total prestress moment is:
     $$M_{total}(x) = M_1(x) + M_2(x)$$
   - The secondary (hyperstatic / parasitic) moment is linear between supports:
     $$M_2(x) = M_{total}(x) - M_1(x)$$
   - Under ACI 318-19 Section 5.3.11 and Eurocode 2 Section 5.10.8, secondary moments $M_2$ must be included in ultimate strength design combinations:
     $$M_u = 1.2 M_D + 1.6 M_L + 1.0 M_2$$

## Decision
1. Implement `LoadBalancingEngine.ts` in `packages/prestressed-engine/src/loads/` providing:
   - Analytical balanced load $w_{bal}$ for parabolic profiles and $Q_{bal}$ for harped profiles.
   - Net sustained and live load calculations ($w_{net,sustained} = w_{dead} - w_{bal}$, $w_{net,total} = w_{dead} + w_{live} - w_{bal}$).
   - Balanced dead load ratio ($\beta_{bal} = w_{bal} / w_{dead} \times 100\%$) and engineering suitability rating.
2. Implement `HyperstaticPrestressEngine.ts` providing:
   - Primary moment distribution $M_1(x) = P_{eff}(x) \cdot e(x)$.
   - Indeterminate continuous beam analysis under equivalent loads to derive $M_{total}(x)$.
   - Secondary hyperstatic moment extraction $M_2(x) = M_{total}(x) - M_1(x)$.
   - Factored load combination generator incorporating $1.0 M_2$.
3. Provide rigorous unit tests validating simply supported determinate cases ($M_2 \equiv 0$) and continuous 2-span benchmark cases ($M_2 \neq 0$).

## Consequences
- Directly feeds into extreme fiber stress checks at transfer and service (Sprint B16.4).
- Supplies ultimate flexural load demand $M_u$ with codified $1.0 M_2$ contribution (Sprint B16.4).
- Provides load balancing visualizations for the 3D Tendon Studio UI (Sprint B16.5).
