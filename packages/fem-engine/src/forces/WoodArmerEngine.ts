/**
 * Wood-Armer Plate Reinforcement & Transverse Shear Engine
 * BeamLab Sprint B19.3 — Wood-Armer Orthogonal Design Moments
 */

import { PlateMomentField, WoodArmerResult, SlabTransverseShearResult } from './types';

export class WoodArmerEngine {
  /**
   * Computes the Wood-Armer orthogonal design bending moments (M_xd, M_yd)
   * for top and bottom reinforcing steel layers from raw shell bending & twisting moments.
   *
   * Formulated according to R.H. Wood (1968) and A. Armer (1969).
   */
  public static calculateWoodArmerMoments(field: PlateMomentField): WoodArmerResult {
    const { mxx, myy, mxy } = field;
    const absMxy = Math.abs(mxy);

    // --- 1. Bottom Face (Positive / Sagging Reinforcement) ---
    let mxdB = mxx + absMxy;
    let mydB = myy + absMxy;
    let caseB: 'standard' | 'x-adjusted' | 'y-adjusted' = 'standard';

    if (mxdB < 0) {
      mxdB = 0;
      mydB = myy + (absMxy > 0 ? (mxy * mxy) / (Math.abs(mxx) || 1e-9) : 0);
      caseB = 'x-adjusted';
    } else if (mydB < 0) {
      mydB = 0;
      mxdB = mxx + (absMxy > 0 ? (mxy * mxy) / (Math.abs(myy) || 1e-9) : 0);
      caseB = 'y-adjusted';
    }

    // Bottom face moments must be non-negative
    mxdB = Math.max(0, mxdB);
    mydB = Math.max(0, mydB);

    // --- 2. Top Face (Negative / Hogging Reinforcement) ---
    let mxdT = mxx - absMxy;
    let mydT = myy - absMxy;
    let caseT: 'standard' | 'x-adjusted' | 'y-adjusted' = 'standard';

    if (mxdT > 0) {
      mxdT = 0;
      mydT = myy - (absMxy > 0 ? (mxy * mxy) / (Math.abs(mxx) || 1e-9) : 0);
      caseT = 'x-adjusted';
    } else if (mydT > 0) {
      mydT = 0;
      mxdT = mxx - (absMxy > 0 ? (mxy * mxy) / (Math.abs(myy) || 1e-9) : 0);
      caseT = 'y-adjusted';
    }

    // Top face moments must be non-positive (hogging)
    mxdT = Math.min(0, mxdT);
    mydT = Math.min(0, mydT);

    return {
      mxdBottom: mxdB,
      mydBottom: mydB,
      mxdTop: mxdT,
      mydTop: mydT,
      governingCaseBottom: caseB,
      governingCaseTop: caseT,
    };
  }

  /**
   * Evaluates transverse out-of-plane shear stress and compares against concrete shear strength.
   *
   * @param vx Transverse shear along X (kN/m)
   * @param vy Transverse shear along Y (kN/m)
   * @param slabThicknessM Total slab thickness t (m)
   * @param fckMPa Concrete characteristic cylinder strength (MPa, default 30 MPa)
   * @param rebarRatio Longitundinal tension rebar ratio rho_l (default 0.005)
   */
  public static calculateTransverseShear(
    vx: number,
    vy: number,
    slabThicknessM: number,
    fckMPa: number = 30,
    rebarRatio: number = 0.005
  ): SlabTransverseShearResult {
    const vResultant = Math.hypot(vx, vy); // kN/m
    const d = 0.9 * slabThicknessM; // Effective depth (m)

    // Shear stress: tau = V / (1.0m * d) in MPa
    const shearStressMPa = (vResultant * 1000) / (1.0 * d * 1e6);

    // Concrete shear capacity without shear reinforcement (Eurocode 2: v_Rd,c)
    // k = min(1 + sqrt(200 / (d * 1000)), 2.0)
    const k = Math.min(2.0, 1 + Math.sqrt(200 / (d * 1000)));
    const rho = Math.min(0.02, rebarRatio);
    const vMin = 0.035 * Math.pow(k, 1.5) * Math.sqrt(fckMPa);
    const vRdc = Math.max(vMin, 0.12 * k * Math.cbrt(100 * rho * fckMPa));

    return {
      vx,
      vy,
      vResultant,
      shearStressMPa,
      shearCapacityVcMPa: vRdc,
      shearReinforcementRequired: shearStressMPa > vRdc,
    };
  }
}
