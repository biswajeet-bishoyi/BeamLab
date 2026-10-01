/**
 * GustResonanceEngine.ts
 *
 * ASCE 7-22 Section 26.11 Along-Wind Dynamic Gust Effect Factor Engine.
 * Formulates rigid building factor (G = 0.85) vs dynamically sensitive flexible
 * building factor (Gf) using background (Q) and resonant (R) turbulence response spectra.
 */

import { AsceExposureCategory } from '../profile/WindProfileEngine';

export interface DynamicBuildingProperties {
  fundamentalFrequency_Hz: number; // n1 in Hz (or 1/T1)
  dampingRatio: number; // beta (e.g. 0.01 for welded steel, 0.02 for reinforced concrete)
  buildingHeight_m: number; // h
  crossWindWidth_m: number; // B (perpendicular to wind)
  alongWindLength_m: number; // L (parallel to wind)
  exposureCategory: AsceExposureCategory;
  basicWindSpeed_mps: number; // V in m/s
}

export interface GustFactorResult {
  isFlexible: boolean; // true if n1 < 1.0 Hz
  fundamentalFrequency_Hz: number;
  gustEffectFactor: number; // G (rigid) or Gf (flexible)
  equivalentHeight_zbar_m: number;
  turbulenceIntensity_Izbar: number;
  integralLengthScale_Lzbar_m: number;
  meanWindSpeed_Vzbar_mps: number;
  backgroundFactor_Q: number;
  resonantFactor_R?: number;
  peakFactor_gQ: number;
  peakFactor_gR?: number;
  spectralFactor_Rn?: number;
  diagnostics: string[];
}

export class GustResonanceEngine {
  /**
   * Calculates ASCE 7-22 along-wind gust effect factor (G or Gf).
   */
  public static calculateGustFactor(props: DynamicBuildingProperties): GustFactorResult {
    const {
      fundamentalFrequency_Hz: n1,
      dampingRatio: beta,
      buildingHeight_m: h,
      crossWindWidth_m: B,
      alongWindLength_m: L,
      exposureCategory,
      basicWindSpeed_mps: V,
    } = props;

    const isFlexible = n1 < 1.0;
    const diagnostics: string[] = [];

    // Terrain parameters per ASCE 7-22 Table 26.11-1
    let c: number;
    let l_const: number;
    let epsilon_bar: number;
    let b_bar: number;
    let alpha_bar: number;
    let zmin: number;

    switch (exposureCategory) {
      case 'B':
        c = 0.30;
        l_const = 97.54; // m (320 ft)
        epsilon_bar = 1 / 3.0;
        b_bar = 0.45;
        alpha_bar = 1 / 4.0;
        zmin = 9.14;
        break;
      case 'C':
        c = 0.20;
        l_const = 152.4; // m (500 ft)
        epsilon_bar = 1 / 5.0;
        b_bar = 0.65;
        alpha_bar = 1 / 6.5;
        zmin = 4.57;
        break;
      case 'D':
        c = 0.15;
        l_const = 198.12; // m (650 ft)
        epsilon_bar = 1 / 8.0;
        b_bar = 0.80;
        alpha_bar = 1 / 9.0;
        zmin = 2.13;
        break;
    }

    // Equivalent height z_bar = max(0.6 * h, zmin)
    const z_bar = Math.max(0.6 * h, zmin);

    // Turbulence intensity Iz_bar = c * (10 / z_bar)^(1/6)
    const Iz_bar = c * Math.pow(10 / z_bar, 1 / 6);

    // Integral length scale of turbulence Lz_bar = l * (z_bar / 10)^epsilon_bar
    const Lz_bar = l_const * Math.pow(z_bar / 10, epsilon_bar);

    // Mean hourly wind speed at z_bar: Vz_bar = b_bar * (z_bar / 10)^alpha_bar * V
    const Vz_bar = b_bar * Math.pow(z_bar / 10, alpha_bar) * V;

    // Background response factor Q
    // Q = sqrt(1 / (1 + 0.63 * ((B + h) / Lz_bar)^0.63))
    const Q = Math.sqrt(1 / (1 + 0.63 * Math.pow((B + h) / Lz_bar, 0.63)));

    const gQ = 3.4;
    const gv = 3.4;

    if (!isFlexible) {
      // Rigid building (n1 >= 1.0 Hz)
      // G = 0.925 * (1 + 1.7 * gQ * Iz_bar * Q) / (1 + 1.7 * gv * Iz_bar)
      const numerator = 1 + 1.7 * gQ * Iz_bar * Q;
      const denominator = 1 + 1.7 * gv * Iz_bar;
      const G_computed = 0.925 * (numerator / denominator);
      // Codified default is 0.85, or computed value (typically 0.82 - 0.90)
      const G_final = Number(Math.max(0.85, G_computed).toFixed(3));

      diagnostics.push(
        `Structure is RIGID (n1 = ${n1.toFixed(2)} Hz >= 1.0 Hz). Resonant amplification is negligible.`
      );
      diagnostics.push(`Computed rigid gust factor G = ${G_final}. Background factor Q = ${Q.toFixed(3)}.`);

      return {
        isFlexible: false,
        fundamentalFrequency_Hz: n1,
        gustEffectFactor: G_final,
        equivalentHeight_zbar_m: Number(z_bar.toFixed(2)),
        turbulenceIntensity_Izbar: Number(Iz_bar.toFixed(3)),
        integralLengthScale_Lzbar_m: Number(Lz_bar.toFixed(1)),
        meanWindSpeed_Vzbar_mps: Number(Vz_bar.toFixed(2)),
        backgroundFactor_Q: Number(Q.toFixed(3)),
        peakFactor_gQ: gQ,
        diagnostics,
      };
    }

    // Flexible / Dynamically sensitive building (n1 < 1.0 Hz)
    // 1. Reduced frequency N1
    const N1 = (n1 * Lz_bar) / Math.max(1.0, Vz_bar);

    // 2. Normalized power spectral density Rn
    const Rn = (7.47 * N1) / Math.pow(1 + 10.3 * N1, 5 / 3);

    // 3. Peak factor gR
    const T_duration = 3600; // 1 hour = 3600s
    const sqrt2ln = Math.sqrt(2 * Math.log(T_duration * n1));
    const gR = sqrt2ln + 0.577 / sqrt2ln;

    // 4. Aerodynamic admittance functions: Rh, RB, RL
    const calcAdmittance = (eta: number): number => {
      if (eta <= 1e-4) return 1.0;
      return (1 / eta) - (1 / (2 * eta * eta)) * (1 - Math.exp(-2 * eta));
    };

    const eta_h = (4.6 * n1 * h) / Math.max(1.0, Vz_bar);
    const eta_B = (4.6 * n1 * B) / Math.max(1.0, Vz_bar);
    const eta_L = (15.4 * n1 * L) / Math.max(1.0, Vz_bar);

    const Rh = calcAdmittance(eta_h);
    const RB = calcAdmittance(eta_B);
    const RL = calcAdmittance(eta_L);

    // 5. Resonant response factor R
    // R = sqrt((1 / beta) * Rn * Rh * RB * (0.53 + 0.47 * RL))
    const R_sq = (1 / Math.max(1e-4, beta)) * Rn * Rh * RB * (0.53 + 0.47 * RL);
    const R = Math.sqrt(Math.max(0, R_sq));

    // 6. Along-wind flexible gust effect factor Gf
    // Gf = 0.925 * (1 + 1.7 * Iz_bar * sqrt(gQ^2 * Q^2 + gR^2 * R^2)) / (1 + 1.7 * gv * Iz_bar)
    const dynamicTerm = Math.sqrt(gQ * gQ * Q * Q + gR * gR * R * R);
    const num = 1 + 1.7 * Iz_bar * dynamicTerm;
    const den = 1 + 1.7 * gv * Iz_bar;
    const Gf = 0.925 * (num / den);

    diagnostics.push(
      `Structure is FLEXIBLE (n1 = ${n1.toFixed(3)} Hz < 1.0 Hz, T1 = ${(1 / n1).toFixed(2)}s). Dynamic resonance analysis active.`
    );
    diagnostics.push(
      `Resonant factor R = ${R.toFixed(3)}, Background factor Q = ${Q.toFixed(3)}, Spectral factor Rn = ${Rn.toFixed(3)}.`
    );
    diagnostics.push(
      `Along-wind flexible gust effect factor Gf = ${Gf.toFixed(3)} (amplification over static = ${((Gf / 0.85 - 1) * 100).toFixed(1)}%).`
    );

    return {
      isFlexible: true,
      fundamentalFrequency_Hz: n1,
      gustEffectFactor: Number(Gf.toFixed(3)),
      equivalentHeight_zbar_m: Number(z_bar.toFixed(2)),
      turbulenceIntensity_Izbar: Number(Iz_bar.toFixed(3)),
      integralLengthScale_Lzbar_m: Number(Lz_bar.toFixed(1)),
      meanWindSpeed_Vzbar_mps: Number(Vz_bar.toFixed(2)),
      backgroundFactor_Q: Number(Q.toFixed(3)),
      resonantFactor_R: Number(R.toFixed(3)),
      peakFactor_gQ: gQ,
      peakFactor_gR: Number(gR.toFixed(3)),
      spectralFactor_Rn: Number(Rn.toFixed(4)),
      diagnostics,
    };
  }
}
