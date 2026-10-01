# ADR-130: Domain Decomposition and FETI Schur Complement Substructuring

## Status
Accepted

## Context
Direct sparse factorization of large structural FEA models scale cubically $\mathcal{O}(N^3)$ in memory and time. Solving massive domains requires distributing non-overlapping subdomains across worker nodes and solving interface boundary compatibility via Schur complement condensation (FETI / Dual-Primal methods).

## Decision
We implemented `DomainDecompositionEngine` in `packages/solve-farm/src/decomposition/DomainDecomposition.ts`:
1. **Subdomain Partitioning**:
   - Model DOFs partitioned into interior degrees of freedom $u_I$ and interface boundary degrees of freedom $u_B$.
2. **Schur Complement Matrix Condensation**:
   - Each subdomain independently condenses interior equations into an effective interface stiffness operator:
     $$S^{(s)} = K_{BB} - K_{BI} (K_{II})^{-1} K_{IB}$$
   - Condensed boundary force vector:
     $$f_{cond}^{(s)} = f_B - K_{BI} (K_{II})^{-1} f_I$$
3. **Interior Back-Substitution**:
   - Once global interface displacements $u_B$ are solved across subdomains, interior displacements are recovered locally on each worker:
     $$u_I = (K_{II})^{-1} (f_I - K_{IB} u_B)$$

## Consequences
- Allows subdomains to be solved in parallel across multiple nodes with low communication overhead limited to interface DOFs.
- Achieves linear memory scaling per worker node.
