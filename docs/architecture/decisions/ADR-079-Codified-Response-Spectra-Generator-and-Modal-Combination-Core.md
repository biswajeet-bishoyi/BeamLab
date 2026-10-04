# ADR-079: Codified Response Spectra Generator and Modal Combination Core

## Status
Accepted

## Context
Seismic hazard evaluation in modern structural design codes (ASCE 7-22, Eurocode 8, and IS 1893:2016) prescribes smoothed pseudo-acceleration response spectra $S_a(T)$ representing peak dynamic amplification experienced by single-degree-of-freedom (SDOF) oscillators across structural periods.

Key structural dynamics requirements include:
1. **Multi-Standard Formulations**:
   - ASCE 7-22 / IBC 2024: Two-period ($S_{DS}, S_{D1}, T_0, T_S$) and long-period transition ($T_L$) parameterization scaled by importance factor $I_e$ and response modification factor $R$.
   - Eurocode 8 (EN 1998-1): Ground types A–E, Type 1/2 spectra, damping correction factor $\eta = \sqrt{10 / (5 + \xi)} \ge 0.55$, and behavior factor $q$.
   - IS 1893:2016 Part 1: Seismic zones II–V ($Z = 0.10 \dots 0.36$), soil types I, II, III, and $A_h = \frac{Z I S_a}{2 R g}$.
2. **Modal Correlation & Spatial Directionality**:
   - Modal coupling: In structures with closely-spaced frequencies or high 3D torsional coupling ($\omega_j / \omega_i \approx 0.90 \dots 1.10$), standard SRSS modal combination underestimates peak internal forces and displacements. The Complete Quadratic Combination (CQC) method using Der Kiureghian's cross-modal correlation coefficients $\rho_{ij}$ is mandatory.
   - Directional orthogonality: Combining concurrent orthogonal seismic actions via the 100% + 30% rule ($E_X \pm 0.3 E_Y \pm 0.3 E_Z$) or spatial SRSS.

## Decision
We initialized `@beamstudio/seismic-engine` and implemented:
1. `ResponseSpectrumGenerator.ts`:
   - Functions for ASCE 7-22, Eurocode 8, IS 1893:2016, and user-defined piecewise response spectra.
   - Viscous damping correction factors $\eta(\xi)$ and discretization utilities.
2. `ModalCombinationEngine.ts`:
   - Der Kiureghian cross-modal correlation matrix generator $[\rho_{ij}]$.
   - Complete Quadratic Combination (CQC) and Square Root of Sum of Squares (SRSS).
   - 100/30 directional orthogonal rule and spatial SRSS envelope evaluations.

## Consequences
### Positive
- Fully type-safe, zero runtime dependencies, dual CJS/ESM distribution.
- Code-compliant response spectra curves across major US, European, and Indian building codes.
- Accurate cross-modal correlation capturing closely-spaced modal interaction.

### Trade-offs
- Analyzed spectra are linear-elastic / codified R-reduced; non-linear inelastic spectra will be complemented with direct integration time-history solvers in subsequent sprints.
