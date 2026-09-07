/**
 * TimberFireCharringEngine: One-dimensional and notional charring depth calculation,
 * effective residual cross-section method, and fire resistance rating (FRR) audits
 * per Eurocode 5 Part 1-2 (EN 1995-1-2) and AWC Technical Report 10.
 */

export type FireExposureSides = 'FOUR_SIDES' | 'THREE_SIDES' | 'ONE_SIDE_BOTTOM';

export interface FireCharringInput {
  /** Initial cross-section breadth b (mm) */
  b: number;
  /** Initial cross-section depth d (mm) */
  d: number;
  /** Material category */
  category: 'SOFTWOOD' | 'HARDWOOD' | 'GLULAM' | 'CLT_LAM';
  /** Fire exposure duration t (minutes, e.g. 30, 60, 90, 120) */
  fireDurationMins: number;
  /** Fire exposure sides */
  exposureSides: FireExposureSides;
  /** Characteristic bending strength f_m,k (MPa) */
  fm_k: number;
}

export interface FireCharringResult {
  fireDurationMins: number;
  /** Basic charring rate beta_0 (mm/min) */
  beta0: number;
  /** Notional charring depth d_char,0 (mm) */
  dchar0: number;
  /** Zero-strength layer thickness d_0 (mm) */
  d0: number;
  /** Effective charring depth d_eff = d_char,0 + k_0 * d_0 (mm) */
  deff: number;

  /** Residual cross-section breadth b_fi (mm) */
  b_fi: number;
  /** Residual cross-section depth d_fi (mm) */
  d_fi: number;
  /** Residual area A_fi (mm²) */
  area_fi: number;
  /** Residual section modulus S_fi (mm³) */
  S_fi: number;
  /** Residual moment of inertia I_fi (mm⁴) */
  I_fi: number;
  /** Percentage of initial area retained */
  areaRetainedPercent: number;

  /** Design bending resistance in fire M_fi,Rd (kNm) */
  fireBendingResistanceKNm: number;
  /** Whether the section maintains positive structural integrity */
  hasIntegrity: boolean;
}

export class TimberFireCharringEngine {
  /**
   * Determine codified charring rate beta_0 in mm/min (EN 1995-1-2 Table 3.1).
   */
  static getCharringRate(category: 'SOFTWOOD' | 'HARDWOOD' | 'GLULAM' | 'CLT_LAM'): number {
    switch (category) {
      case 'GLULAM':
        return 0.65; // Glued laminated timber: 0.65 mm/min
      case 'HARDWOOD':
        return 0.50; // Dense solid hardwood: 0.50 mm/min
      case 'CLT_LAM':
        return 0.80; // CLT without fire-resistant adhesives: 0.80 mm/min (delamination allowance)
      case 'SOFTWOOD':
      default:
        return 0.65; // Solid softwood: 0.65 mm/min
    }
  }

  /**
   * Evaluate effective residual cross-section and bending resistance under standard ISO 834 fire exposure.
   */
  static evaluateFirePerformance(input: FireCharringInput): FireCharringResult {
    const { b, d, category, fireDurationMins, exposureSides, fm_k } = input;
    const beta0 = this.getCharringRate(category);

    // 1. Notional charring depth: d_char,0 = beta_0 * t
    const dchar0 = beta0 * fireDurationMins;

    // 2. Zero-strength layer d_0 = 7 mm (EN 1995-1-2 Clause 4.2.2)
    // k_0 = t / 20 <= 1.0 for t < 20 min; k_0 = 1.0 for t >= 20 min
    const d0 = 7.0;
    const k0 = Math.min(1.0, fireDurationMins / 20);
    const deff = dchar0 + k0 * d0;

    // 3. Residual section dimensions depending on exposure sides
    let b_fi = b;
    let d_fi = d;

    switch (exposureSides) {
      case 'FOUR_SIDES':
        b_fi = Math.max(0, b - 2 * deff);
        d_fi = Math.max(0, d - 2 * deff);
        break;
      case 'THREE_SIDES':
        // Beams exposed on bottom and both sides (slab protects top face)
        b_fi = Math.max(0, b - 2 * deff);
        d_fi = Math.max(0, d - deff);
        break;
      case 'ONE_SIDE_BOTTOM':
        // Floor slab/panel exposed to fire only from below
        b_fi = b;
        d_fi = Math.max(0, d - deff);
        break;
    }

    const hasIntegrity = b_fi > 0 && d_fi > 0;
    const initialArea = b * d;
    const area_fi = b_fi * d_fi;
    const areaRetainedPercent = (area_fi / initialArea) * 100;

    const I_fi = (b_fi * Math.pow(d_fi, 3)) / 12;
    const S_fi = (b_fi * Math.pow(d_fi, 2)) / 6;

    // Fire design bending strength: f_m,fi,d = k_mod,fi * k_fi * f_m,k / gamma_M,fi
    // In fire, gamma_M,fi = 1.0; k_fi = 1.15 for timber; k_mod,fi = 1.0
    const k_fi = 1.15;
    const gamma_M_fi = 1.0;
    const fm_fi_d = (k_fi * fm_k) / gamma_M_fi;

    const fireBendingResistanceKNm = (S_fi * fm_fi_d) / 1e6;

    return {
      fireDurationMins,
      beta0,
      dchar0,
      d0,
      deff,
      b_fi,
      d_fi,
      area_fi,
      S_fi,
      I_fi,
      areaRetainedPercent,
      fireBendingResistanceKNm: Math.max(0, fireBendingResistanceKNm),
      hasIntegrity,
    };
  }
}
