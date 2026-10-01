# ADR-040: Multi-Case Result Enveloping & Critical Station Hunter

## Status
Accepted

## Context
Code-compliant structural design requires sizing members not against an arbitrary single load condition, but against the maximum extremes of all valid Ultimate Limit State (ULS) and Serviceability Limit State (SLS) load combinations:
1. **Multi-Case Dual Enveloping**: Across multiple design combinations ($1.4D$, $1.2D + 1.6L$, $1.2D + 1.0L \pm 1.0W$, $0.9D \pm 1.0W$, $1.2D + 1.0L + 1.0E$, $1.0D + 1.0L$), bending moments and shears can reverse sign. Engineers must inspect both upper-bound ($M^+_{max}, V^+_{max}, N_{tens}$) and lower-bound ($M^-_{min}, V^-_{min}, N_{comp}$) excursion corridors at every station $s \in [0, L]$.
2. **Governing Combination Tracing**: Presenting envelope numbers without provenance violates engineering auditability. Every enveloped value must identify the exact load combination formula producing it.
3. **Automated Critical Station Discovery**: Large structural frameworks contain hundreds of member stations. Manually scrubbing every member to find the governing section is error-prone. An automated "Hunter" must sweep all members, detect maximum demands ($S_d$), evaluate cross-section resistances ($R_d$), and rank governing utilization ratios ($\eta = S_d / R_d$).
4. **Spatial 3D & 2D Integration**: The enveloping solution must be viewable in both 2D SVG multi-curve plots and 3D spatial ribbons directly in the Three.js canvas.

## Decision
We implement `EnvelopeEngine.ts` and `CriticalStationHunterTable.tsx` in `apps/web/src/features/results/`, integrated into `MemberDiagramStudio` and `DiagramMeshBuilder`.

### Architecture

```
                 Multiple Load Combinations (ULS & SLS)
                                   │
                                   ▼
                            EnvelopeEngine
            ┌──────────────────────┴──────────────────────┐
            ▼                                             ▼
Dual-Bound Station Enveloper                 Critical Station Hunter
(Upper & Lower bounds + Combo Tags)          (Ranking by utilization η = Sd / Rd)
            │                                             │
      ┌─────┴─────┐                                       │
      ▼           ▼                                       ▼
2D Studio     3D Ribbon                     CriticalStationHunterTable
(SVG Band)   (Three.js Band)                (Interactive Ranked Inspector)
```

### Key Technical Decisions

#### 1. Dual-Bound Station Enveloping
For each station $s_i$:
$$M_{z,max}(s_i) = \max_{k} \{M_{z,k}(s_i)\}, \quad \text{combo}_{max} = k_{max}$$
$$M_{z,min}(s_i) = \min_{k} \{M_{z,k}(s_i)\}, \quad \text{combo}_{min} = k_{min}$$
The 2D diagram studio builds a filled polygon corridor enclosed by the upper curve $y_{up}(s)$ and lower curve $y_{low}(s)$, styled with dual boundary cables (Cyan `#38bdf8` for upper, Rose `#f43f5e` for lower).

#### 2. Cross-Section Capacity & Utilization Modeling
For steel and composite members, nominal resistances are estimated according to AISC 360-16 / Eurocode 3:
- Flexural Capacity: $M_{Rd} = Z_x \cdot f_y$
- Shear Capacity: $V_{Rd} = A_v \cdot (f_y / \sqrt{3})$
- Axial Capacity: $N_{Rd} = A \cdot f_y$
- Deflection Limit: $\delta_{lim} = L / 300$
Utilization ratios $\eta = S_d / R_d$ are classified into standardized engineering safety tiers:
- Safe: $\eta \le 0.70$
- Moderate: $0.70 < \eta \le 0.90$
- Critical: $0.90 < \eta \le 1.00$
- Overstressed: $\eta > 1.00$

#### 3. Interactive Station Navigation
Clicking "Inspect" on any row in the `CriticalStationHunterTable` automatically focuses the active member, synchronizes the 3D camera, and sets the 2D crosshair to the exact governing coordinate $x$.

#### 4. 3D Spatial Envelope Ribbons
`DiagramMeshBuilder` supports `'envelope_Mz'` and `'envelope_Vy'` modes in Three.js, extruding a floating ribbon whose top boundary corresponds to $M_{max}$ and bottom boundary corresponds to $M_{min}$, providing spatial intuition of member load reversibility under lateral wind/seismic forces.

## Consequences
- Engineers can evaluate worst-case member demands across all governing combinations without manual spreadsheet calculations.
- Direct traceability from envelope envelope back to the specific governing load combination.
- Provides a solid foundation for Sprint B3.3 (Stress Recovery & Cross-Section Strain State Inspector).
