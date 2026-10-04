# ADR-067: Reinforced Concrete Beam Flexure, Shear, and Serviceability Engine

## Status
Accepted

## Context
Reinforced concrete beam design requires simultaneous verification across ultimate limit states (ULS) and serviceability limit states (SLS) under modern building standards:
- **Flexural Mechanics**: Singly and doubly reinforced rectangular and flanged (T and L) beams require non-linear equilibrium between concrete compression $C_c(c)$, compression rebar $C_s(c)$, and tension rebar $T_s(c)$. The tension strain $\epsilon_t$ dictates the strength reduction factor $\phi$ (ACI 318 Table 21.2.2) and ductility compliance.
- **Shear Mechanics**: ACI 318-19 introduced the critical shear size effect factor $\lambda_s = \sqrt{\frac{2}{1 + 0.004 d}} \le 1.0$ (modifying $V_c$ for members without minimum shear reinforcement) along with longitudinal reinforcement ratio $\rho_w^{1/3}$. Eurocode 2 utilizes a variable-angle truss model ($1.0 \le \cot\theta \le 2.5$) and concrete diagonal strut crushing limits.
- **Serviceability (Deflection & Cracking)**: Calculation of effective moment of inertia $I_e$ using the Bischoff formulation (ACI 318-19 Eq. 24.2.3.5a) and long-term sustained load deflection multipliers $\lambda_\Delta = \frac{\xi}{1 + 50 \rho'}$. Crack control requires limiting rebar spacing per ACI 318 Section 24.3.2 and evaluating direct characteristic crack width $w_k \le 0.3$ mm per Eurocode 2 Clause 7.3.4.

## Decision
We implement the reinforced concrete beam design core within `@beamstudio/concrete-engine`:

1. **Beam Flexural Engine (`BeamFlexureEngine`)**:
   - Solves for neutral axis depth $c$ and Whitney stress block depth $a = \beta_1 c$ using a rapid secant/Newton root finder.
   - Automatically differentiates rectangular behavior vs. true flanged behavior ($a > h_f$).
   - Calculates compression steel stress $f'_s = \min(f_y, E_s \epsilon'_s)$ and subtracts displaced concrete ($0.85 f'_c$).
   - Classifies section behavior into `TENSION_CONTROLLED` ($\epsilon_t \ge 0.005, \phi = 0.90$), `TRANSITION` ($0.65 \le \phi < 0.90$), or `COMPRESSION_CONTROLLED` ($\phi = 0.65$).
   - Checks minimum flexural reinforcement $A_{s,min} = \max\left(\frac{0.25\sqrt{f'_c}}{f_y}, \frac{1.4}{f_y}\right) b_w d$ and ductility limits ($\epsilon_t \ge 0.004$).

2. **Beam Shear Engine (`BeamShearEngine`)**:
   - Implements ACI 318-19 Section 22.5:
     - Incorporates size effect factor $\lambda_s = \sqrt{2 / (1 + 0.004 d)} \le 1.0$ and $\rho_w^{1/3}$.
     - Stirrup shear strength $V_s = \frac{A_v f_{yt} d}{s}$.
     - Diagonal strut web crushing check $V_s \le 0.66 \sqrt{f'_c} b_w d$.
     - Maximum stirrup spacing $s_{max} = \min(d/2, 600\text{ mm})$ or $\min(d/4, 300\text{ mm})$.
     - Minimum shear reinforcement $A_{v,min} / s = \max(0.062\sqrt{f'_c}/f_{yt}, 0.35/f_{yt}) b_w$.
   - Implements Eurocode 2 variable-angle truss model and concrete crushing capacity $V_{Rd,max}$.

3. **Beam Serviceability Engine (`BeamServiceabilityEngine`)**:
   - Cracking moment: $M_{cr} = f_r I_g / y_t$.
   - Transformed cracked section analysis: solves quadratic equilibrium for cracked neutral axis $k d$ and cracked moment of inertia $I_{cr}$.
   - Effective moment of inertia: Bischoff formula $I_e = \frac{I_{cr}}{1 - ((2/3)(M_{cr}/M_a))^2 (1 - I_{cr}/I_g)}$.
   - Long-term deflection factor: $\lambda_\Delta = \frac{\xi}{1 + 50 \rho'}$ ($\xi = 2.0$ for 5+ years).
   - Flexural crack control: maximum bar spacing $s \le 380(280/f_s) - 2.5 c_c$ and Eurocode 2 direct crack width $w_k = s_{r,max} (\epsilon_{sm} - \epsilon_{cm}) \le 0.30$ mm.

## Consequences
### Positive
- Fully covers standard beam flexure, shear, and serviceability requirements in both ACI 318-19 and Eurocode 2.
- Transparent mathematical derivation steps generated in LaTeX for immediate report generation and UI auditability.
- Strict protection against brittle failure modes (minimum steel, maximum spacing, web crushing).

### Negative / Trade-offs
- Flanged beams with multiple non-uniform web widths or pre-stressed tendons require 2D fiber section discretization (handled by `FiberSectionAnalyzer`).
