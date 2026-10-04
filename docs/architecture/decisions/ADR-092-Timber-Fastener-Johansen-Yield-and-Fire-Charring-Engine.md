# ADR-092: Timber Fastener Johansen Yield & Fire Charring Engine

## Status
Accepted

## Context
Designing robust structural wood and mass timber assemblies requires two specialized failure verification engines:
1. **Ductile Connection Failure via European Yield Model (EYM)**: Timber connections with metallic dowel-type fasteners (bolts, dowels, screws, nails) experience complex interactions between wood embedment crushing and plastic hinge bending in the steel fastener. Johansen's yield theory establishes 6 distinct single-shear failure modes (Mode I_m, Mode I_s, Mode II, Mode III_m, Mode III_s, Mode IV) and group action row reductions ($n_{ef}$).
2. **Structural Fire Resistance & Charring**: Rather than melting or losing stability catastrophically like unprotected structural steel, timber forms an insulating outer charcoal layer that pyrolyzes at a predictable rate ($\beta_0 = 0.65\text{ mm/min}$). Standardized fire resistance design (EN 1995-1-2 / AWC TR10) uses the effective residual cross-section method including a $7\text{ mm}$ zero-strength heated layer ($d_0$).

Prior to Sprint B14.4, BeamLab lacked EYM fastener connection and fire charring engines.

## Decision
We implemented **Sprint B14.4: Timber Fastener & Connection Yield Engine (`packages/timber-engine/src/connections/`)**:

1. **Johansen European Yield Model Engine (`JohansenYieldEngine.ts`)**:
   - Characteristic fastener yield moment $M_{y,Rk} = 0.3 f_{u,k} d^{2.6}$.
   - Wood embedment strength $f_{h,\alpha}$ with Hankinson angle reduction ($0^\circ$ to $90^\circ$).
   - Full evaluation of failure modes Mode I through Mode IV with plastic hinge formation.
   - Fastener axial withdrawal rope effect ($F_{ax,Rk} / 4$) with codified percentage limits by fastener type (15% for dowels, 25% for bolts, 100% for screws).
   - Ductility indicator classifying ductile failure modes (Modes III & IV).

2. **Fastener Group Action Engine (`FastenerGroupActionEngine.ts`)**:
   - Eurocode 5 effective number of fasteners in a row along grain: $n_{ef} = \min(n, n^{0.9} (a_1 / (13 d))^{0.25})$.
   - Automated minimum spacing checks: spacing along grain $a_1 \ge 5 d$, perpendicular $a_2 \ge 3 d$, end distance $a_3 \ge \max(7 d, 80\text{ mm})$, and edge distance $a_4 \ge 3 d$.
   - Multi-row connection capacity: $R_d = n_{rows} \cdot n_{ef} \cdot \frac{k_{mod} F_{v,Rk}}{\gamma_M}$.

3. **Timber Fire Charring Engine (`TimberFireCharringEngine.ts`)**:
   - Codified charring rates: $\beta_0 = 0.65\text{ mm/min}$ (softwood/glulam), $0.50\text{ mm/min}$ (hardwood), $0.80\text{ mm/min}$ (CLT).
   - Effective charring depth $d_{eff} = d_{char,0} + k_0 d_0$ with zero-strength layer $d_0 = 7\text{ mm}$.
   - Residual section dimensions ($b_{fi}, d_{fi}$) for 4-sided, 3-sided, and bottom-exposed configurations.
   - Fire resistance rating (FRR) residual bending capacity $M_{fi,Rd} = k_{fi} \frac{f_{m,k}}{\gamma_{M,fi}} S_{fi}$ for 30, 60, 90, 120 minutes.

## Consequences
- Accurate evaluation of timber connections ensuring ductile failure over brittle wood splitting.
- Explicit verification of mass timber structural fire resistance without arbitrary empirical rules.
- 100% test pass rate with 24/24 passing tests in `@beamstudio/timber-engine`.
