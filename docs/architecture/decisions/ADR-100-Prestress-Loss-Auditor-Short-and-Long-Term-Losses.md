# ADR-100: Prestress Loss Auditor (Short-Term and Long-Term Prestress Losses)

## Status
Accepted

## Context
During the lifecycle of a prestressed or post-tensioned concrete structure, the initial force introduced at the hydraulic jacking end ($P_0 = A_p f_{pj}$) experiences continuous reduction due to immediate and time-dependent phenomena:

1. **Immediate Friction and Wobble Losses**:
   - Curvature friction $\mu$: Friction between strands and duct walls along intended profile curvature $\alpha(x)$. Typical values: $\mu = 0.15\text{–}0.25\text{ rad}^{-1}$ for flexible metal duct, $0.05\text{–}0.15$ for greased plastic sheath.
   - Wobble friction $k$: Accidental angular misalignment/wobble along linear duct length $x$. Typical values: $k = 0.0010\text{–}0.0033\text{ m}^{-1}$ ($0.0003\text{–}0.0010\text{ ft}^{-1}$).
   - Formulation: $P(x) = P_0 e^{-(\mu \alpha(x) + k x)}$ (ACI 318-19 Eq. 20.3.2.5.2, Eurocode 2 Eq. 5.45).

2. **Anchorage Seating Draw-In (Wedge Slip)**:
   - When the jacking ram releases, the conical gripping wedges slip backward by draw-in distance $\Delta_{slip}$ (typically 6 mm / 0.25 in) before seating firmly in the anchor head.
   - This draw-in reverses friction force over seating influence length $L_{set} = \sqrt{\frac{\Delta_{slip} E_p A_p}{p_{friction}}}$, producing a triangular stress relief zone at the jacking end.

3. **Elastic Shortening Loss ($\Delta f_{pES}$)**:
   - In pre-tensioned members: $\Delta f_{pES} = \frac{E_p}{E_{ci}} f_{cgp}$ where $f_{cgp}$ is concrete stress at tendon centroid at transfer.
   - In post-tensioned multi-tendon members stressed sequentially: earlier tendons shorten as subsequent tendons are stressed: $\Delta f_{pES} = \frac{N - 1}{2N} \frac{E_p}{E_{ci}} f_{cgp}$.

4. **Time-Dependent Long-Term Losses**:
   - Concrete Creep ($\Delta f_{pCR}$): Sustained compressive stress under effective prestress and dead load: $\Delta f_{pCR} = K_{cr} \frac{E_p}{E_c} (f_{cgp} - f_{cgs})$.
   - Concrete Shrinkage ($\Delta f_{pSH}$): Drying shrinkage over time influenced by volume-to-surface ratio ($V/S$) and ambient relative humidity ($RH$).
   - Steel Relaxation ($\Delta f_{pR}$): Constant strain stress decay in high-tensile strands over years. For low-relaxation strands: $\Delta f_{pR} = \left[ \frac{\log(24 t)}{45} \left( \frac{f_{pi}}{f_{py}} - 0.55 \right) \right] f_{pi}$.

## Decision
1. Implement `PrestressLossAuditor.ts` in `packages/prestressed-engine/src/losses/` providing:
   - `calculateFrictionLoss(tendon, geometry, mu, k, jackingEnd)`
   - `calculateAnchorageSeatingLoss(frictionResult, wedgeSlipMm, Ep, Ap)`
   - `calculateElasticShorteningLoss(f_cgp, Ep, Eci, numTendons, isPretensioned)`
   - `calculateLongTermLosses(input)`
   - `auditTotalLosses(input)` returning a comprehensive loss breakdown ledger, percentage loss, and continuous $P_{eff}(x)$ distribution.
2. Provide support for single-end jacking and double-end jacking configurations.
3. Validate against standard PTI (Post-Tensioning Institute) and ACI 318-19 design benchmark problems.

## Consequences
- Produces realistic effective prestress distributions $P_{eff}(x)$ for load balancing (Sprint B16.3).
- Enables accurate extreme fiber stress calculations at initial transfer and full service (Sprint B16.4).
- Supplies interactive loss ledger charts for the 3D Tendon Studio UI (Sprint B16.5).
