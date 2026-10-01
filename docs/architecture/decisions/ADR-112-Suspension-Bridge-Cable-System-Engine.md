# ADR-112: Suspension Bridge Cable System Engine (Main Cable, Hangers & Tower Saddles)

## Status
Accepted

## Context
Major suspension bridges transfer total suspended deck dead load and live load trains to high-strength main cables through vertical or inclined suspender (hanger) wire ropes. The main cables in turn transfer vertical thrusts and horizontal tensions across tower saddles into massive concrete gravity or rock anchorages.

Key engineering challenges:
1. **Multi-Segment Geometric Equilibrium**: Under continuous deck load and individual hanger point loads, the main cable adopts a smooth catenary profile where maximum tension occurs at the tower saddles ($T_{max} = H / \cos\theta$).
2. **Suspender Hanger Fabrication Lengths**: Because suspenders operate under high axial tension ($P = q_{deck} \cdot s$), significant elastic elongation $\Delta L = \frac{P L_s}{E_h A_h}$ occurs. Fabricators require the exact unstressed cutting length $L_0 = L_s - \Delta L$ prior to socketing.
3. **Tower Saddle Sliding Equilibrium**: Friction between the main cable and the cast steel saddle groove must resist out-of-balance horizontal tensions ($\Delta H$) between the main span and side spans. The Euler-Eytelwein capstan friction equation dictates the maximum permissible tension ratio before saddle sliding:
   $$\frac{T_{max}}{T_{min}} \le e^{\mu \cdot \theta_{wrap}}$$
4. **Cable Band Clamping Safety**: Cable clamps bolted around the main cable must prevent slippage along the inclined cable under suspender live loads.

## Decision
We implement `SuspensionCableSystemEngine` in `@beamlab/cable-engine/src/suspension/`:

1. **Global Horizontal Tension & Profile**:
   - Closed-form solution:
     $$H = \frac{(q_{deck} + w_{cable}) \cdot L_{main}^2}{8 \cdot f_{main}}$$
   - Exact elevation tracking $y(x)$, arc length $L_s$, and maximum saddle tension $T_{max}$.

2. **Hanger Discretization & Fabrication Lengths**:
   - Calculates in-situ stressed length $L_s(x_k)$, tensile load $P_k$, elastic elongation $\Delta L_k$, and unstressed shop length $L_{0,k}$.
   - Evaluates cable band clamp frictional sliding safety factors.

3. **Tower Saddles Equilibrium & Sliding Safety**:
   - Solves tower saddle wrap angle $\theta_{wrap} = \theta_{main} + \theta_{side}$.
   - Computes vertical thrust downward on tower piers ($N_{tower}$).
   - Validates sliding safety factor $SF_{slip} = \frac{e^{\mu \theta_{wrap}}}{T_{max} / T_{min}} > 1.0$.
   - Computes saddle contact radial bearing pressure $\sigma_{bearing} = \frac{N_{tower}}{2 R_s \cdot D_{cable}}$.

## Consequences
- Completes the analytical cable structures engine covering both stay cable systems and suspension bridge systems.
- Provides input geometry and forces for the 3D Cable Structures Studio UI in Sprint B18.5.
