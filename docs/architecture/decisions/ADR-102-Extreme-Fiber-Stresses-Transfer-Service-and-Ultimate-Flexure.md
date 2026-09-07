# ADR-102: Extreme Fiber Stresses (Transfer & Service), Class U/T/C Crack Control and Ultimate Flexural Strength

## Status
Accepted

## Context
Designing prestressed and post-tensioned concrete structural members requires multi-stage verification across two distinct operational domains:

1. **Serviceability Limit State (SLS) - Elastic Fiber Stress Verification**:
   - **Stage 1 (Initial Transfer)**: When strands are released or anchored into young concrete ($f'_{ci} \approx 0.70\text{–}0.80 f'_c$), the beam carries initial prestress $P_i$ and self-weight dead load $M_0$. High compression at the bottom fiber and tensile stress at the top fiber must remain within codified limits:
     $$\sigma_{bot,i} \le 0.60 f'_{ci} \quad \text{(Compression)}$$
     $$\sigma_{top,i} \ge -0.25 \sqrt{f'_{ci}} \quad \text{(Tension)}$$
   - **Stage 2 (Full Service)**: Under effective prestress $P_{eff}$ (after all short- and long-term losses) and full dead + live service moments ($M_S = M_D + M_L$), bottom tension and top compression must be verified:
     $$\sigma_{top,s} \le 0.45 f'_c \quad \text{(Sustained)}$$
     $$\sigma_{top,s} \le 0.60 f'_c \quad \text{(Total)}$$
   - **Crack Control Classification (ACI 318-19 Section 24.5.2)**:
     - **Class U (Uncracked)**: Extreme fiber tensile stress $f_t \le 0.62 \sqrt{f'_c}$ (gross section properties $I_g$ govern; standard for parking decks and liquid structures).
     - **Class T (Transition)**: $0.62 \sqrt{f'_c} < f_t \le 1.0 \sqrt{f'_c}$ (transitional cracked behavior).
     - **Class C (Cracked)**: $f_t > 1.0 \sqrt{f'_c}$ (requires minimum bonded reinforcement and crack width checks).

2. **Ultimate Limit State (ULS) - Factored Flexural Strength ($\phi M_n$)**:
   - Concrete compressive block depth $a$ and neutral axis depth $c = a / \beta_1$.
   - Prestress steel stress at nominal capacity $f_{ps}$:
     - Bonded tendons: $f_{ps} = f_{pu} (1 - \frac{\gamma_p}{\beta_1} [\rho_p \frac{f_{pu}}{f'_c} + \frac{d}{d_p}(\omega - \omega')])$ per ACI 318-19 Eq. 20.3.2.3.1.
     - Unbonded tendons: $f_{ps} = f_{pe} + 70 + \frac{f'_c}{100 \rho_p} \le \min(f_{py}, f_{pe} + 420\text{ MPa})$ per ACI 318-19 Eq. 20.3.2.4.1.
   - Nominal moment: $M_n = A_{ps} f_{ps} (d_p - a/2) + A_s f_y (d - a/2)$.
   - Net tensile strain $\epsilon_t$, strength reduction factor $\phi \in [0.65, 0.90]$, and check $\phi M_n \ge M_u$.
   - Dual Eurocode 2 EN 1992-1-1 Section 6.1 check ($M_{Rd}$).

## Decision
1. Implement `FiberStressAuditor.ts` in `packages/prestressed-engine/src/design/` computing:
   - Initial transfer fiber stress profiles ($\sigma_{top,i}, \sigma_{bot,i}$) and allowable check ratios.
   - Full service fiber stress profiles ($\sigma_{top,s}, \sigma_{bot,s}$) under sustained and total service loads.
   - ACI 318-19 Class U/T/C crack classification and decompression moment $M_{dec}$.
2. Implement `UltimateFlexuralCapacityEngine.ts` in `packages/prestressed-engine/src/design/` computing:
   - Analytical $f_{ps}$ for bonded and unbonded tendons.
   - Whitney stress block depth $a$, neutral axis $c$, and net tensile strain $\epsilon_t$.
   - Nominal capacity $M_n$, strength reduction factor $\phi$, and design capacity $\phi M_n$.
   - Flexural design check against factored load demand $M_u$.
3. Provide rigorous unit tests benchmarking manual textbook examples from Lin & Burns, Nilson, and ACI 318-19 design examples.

## Consequences
- Completes the core structural engineering mechanics pipeline for prestressed concrete.
- Powers the interactive fiber stress diagrams, Class U/T/C badges, and calculation sheets in the UI Studio (Sprint B16.5).
