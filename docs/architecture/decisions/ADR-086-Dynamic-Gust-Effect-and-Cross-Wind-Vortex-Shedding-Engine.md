# ADR-086: Dynamic Gust Effect and Cross-Wind Vortex Shedding Engine

## Status
Accepted

## Context
Slender and tall structures exhibit dynamic sensitivity to atmospheric wind turbulence that cannot be captured by static pressure coefficients alone:
1. **Along-Wind Dynamic Resonance (ASCE 7-22 Section 26.11)**:
   - Structures with fundamental natural frequency $n_1 < 1.0\text{ Hz}$ ($T_1 > 1.0\text{ s}$) are classified as flexible / dynamically sensitive.
   - Wind gust effects are amplified by resonant energy exchange between atmospheric turbulence power spectra and structural vibration modes.
   - The flexible gust effect factor $G_f$ requires evaluation of background turbulence $Q$, resonant factor $R$, aerodynamic admittance ($R_h, R_B, R_L$), and peak dynamic factors $g_Q, g_R$.
2. **Cross-Wind Vortex Shedding (Aeroelastic Instability)**:
   - When alternating vortices shed from opposite building faces at frequency $f_s = \frac{St \cdot v}{b}$, and $f_s$ approaches natural frequency $f_1$, dynamic "lock-in" can occur.
   - Resonant lock-in causes large cross-wind transverse oscillations even at moderate wind velocities below the peak design gust speed.
   - Mass-damping ratio (Scruton number $Sc$) determines the amplitude of cross-wind dynamic forces.

## Decision
We implemented `GustResonanceEngine` and `VortexSheddingEngine` in `@beamstudio/wind-engine`:
- **Along-Wind Gust Factor ($G_f$)**:
  - Automatically identifies whether building is rigid ($G = 0.85$) or flexible ($n_1 < 1.0\text{ Hz}$).
  - Computes integral length scales $L_{\bar{z}}$, turbulence intensity $I_{\bar{z}}$, Davenport/Kaimal spectral factor $R_n$, and resonant magnification $R$.
- **Cross-Wind Vortex Shedding**:
  - Calculates Strouhal number $St$ for square ($0.12$), rectangular ($0.09-0.12$), and circular ($0.18$) sections.
  - Determines critical lock-in velocity $v_{crit} = b f_1 / St$.
  - Flags aerodynamic lock-in danger whenever $v_{crit} \le 1.25 v_{design}$.
  - Computes Scruton number $Sc = \frac{2 m_e (2 \pi \xi)}{\rho b^2}$, peak transverse roof amplitude $y_{max}$, and equivalent base cross-wind dynamic shear force.

## Consequences
- Enables structural designers to detect dangerous dynamic wind resonance and galloping risks early during preliminary massing.
- Provides actionable quantitative telemetry for whether dynamic mitigations (such as Tuned Mass Dampers or aerodynamic corner chamfering) are required.
