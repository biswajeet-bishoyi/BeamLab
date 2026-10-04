# ADR-122: Global Slope Stability Slices Engine with Bishop and Fellenius Methods

## Status
Accepted

## Context
Slope stability analysis is essential for evaluating earth embankments, cuts, and the overall global shear failure safety factor around retaining structures. Limit equilibrium method of slices remains the primary engineering standard.

## Decision
We implemented `SlopeStabilityEngine` in `@beamstudio/earth-engine`:
1. **Geometric Slice Generation**:
   - Automatically computes profile intersection, slice midpoints, base elevation $y_{base}$, slice height $h_i$, base inclination angle $\alpha_i = \arcsin((x_i - x_c)/R)$, and pore water pressures $u_i$.
2. **Limit Equilibrium Solvers**:
   - **Fellenius (Ordinary) Method**:
     $$FS = \frac{\sum [c' l_i + (W_i \cos\alpha_i - u_i l_i) \tan\phi']}{\sum W_i \sin\alpha_i}$$
   - **Bishop's Simplified Method**:
     Implicit iterative solution satisfying vertical force equilibrium:
     $$FS^{(k+1)} = \frac{1}{\sum W_i \sin\alpha_i} \sum \frac{c' b_i + (W_i - u_i b_i) \tan\phi'}{m_{\alpha, i}}$$
     $$m_{\alpha, i} = \cos\alpha_i \left(1 + \frac{\tan\alpha_i \tan\phi'}{FS}\right)$$
3. **Grid-Search Optimization**:
   - Automated hunting algorithm over $(x_c, y_c, R)$ domain to identify the critical failure circle with minimal factor of safety $FS_{min}$.

## Consequences
- Fast, robust evaluation of circular slip failure modes for geotechnical structures.
- Direct identification of critical sliding surfaces for visualization and engineering mitigation.
