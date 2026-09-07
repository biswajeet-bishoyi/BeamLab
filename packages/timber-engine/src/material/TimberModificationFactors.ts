/**
 * Codified modification factors for timber structures:
 * - NDS 2024 (ANSI/AWC): CD, CM, Ct, CL, CF, CV, Cr, Cfu, Cb
 * - Eurocode 5 (EN 1995-1-1): k_mod, gamma_M, k_def, k_h, k_sys, k_crit
 * - IS 883:1994: k_1 (location), k_2 (shape)
 */

import { TimberGradeDefinition, TimberStandard } from './TimberMaterialDatabase';

export type Eurocode5LoadDuration = 'PERMANENT' | 'LONG_TERM' | 'MEDIUM_TERM' | 'SHORT_TERM' | 'INSTANTANEOUS';
export type Eurocode5ServiceClass = 1 | 2 | 3;

export type NdsLoadDuration = 
  | 'DEAD_0_9'          // Permanent (> 10 years, CD = 0.90)
  | 'OCCUPANCY_1_0'     // Standard design (10 years, CD = 1.00)
  | 'SNOW_1_15'         // Snow load (2 months, CD = 1.15)
  | 'CONSTRUCTION_1_25' // Construction / roof live (7 days, CD = 1.25)
  | 'WIND_SEISMIC_1_6'  // Wind or Earthquake (10 minutes, CD = 1.60)
  | 'IMPACT_2_0';       // Impact load (1 second, CD = 2.00)

export interface NdsFactorsOptions {
  loadDuration: NdsLoadDuration;
  /** Moisture content exceeds 19% for sawn or 16% for glulam (wet service) */
  isWetService?: boolean;
  /** Temperature in Celsius (> 38°C / 100°F triggers Ct reduction) */
  temperatureC?: number;
  /** Member breadth b (mm) */
  b?: number;
  /** Member depth d (mm) */
  d?: number;
  /** Member length L (mm) */
  L?: number;
  /** Repetitive member system (e.g. joists spaced <= 24 in / 610 mm) */
  isRepetitive?: boolean;
  /** Flatwise bending load */
  isFlatwise?: boolean;
}

export interface Ec5FactorsOptions {
  serviceClass: Eurocode5ServiceClass;
  loadDuration: Eurocode5LoadDuration;
  /** Member depth h (mm) for size effect k_h */
  h?: number;
  /** Member type for gamma_M */
  memberType?: 'SOLID_TIMBER' | 'GLULAM' | 'CLT' | 'LVL';
  /** System strength action (sharing load across parallel members) */
  isSystemAction?: boolean;
}

export interface Is883FactorsOptions {
  /** Location: 'INSIDE' | 'OUTSIDE' | 'WET' */
  location: 'INSIDE' | 'OUTSIDE' | 'WET';
  /** Cross-section shape: 'RECTANGULAR' | 'CIRCULAR' */
  shape?: 'RECTANGULAR' | 'CIRCULAR';
}

export class TimberModificationEngine {
  /**
   * Calculate Eurocode 5 k_mod factor based on wood type, service class, and load duration.
   * Table 3.1 in EN 1995-1-1:2004.
   */
  static getEc5Kmod(
    category: 'SOFTWOOD' | 'HARDWOOD' | 'GLULAM' | 'CLT_LAM',
    serviceClass: Eurocode5ServiceClass,
    loadDuration: Eurocode5LoadDuration
  ): number {
    const kmodTable: Record<Eurocode5ServiceClass, Record<Eurocode5LoadDuration, number>> = {
      1: {
        PERMANENT: 0.60,
        LONG_TERM: 0.70,
        MEDIUM_TERM: 0.80,
        SHORT_TERM: 0.90,
        INSTANTANEOUS: 1.10,
      },
      2: {
        PERMANENT: 0.60,
        LONG_TERM: 0.70,
        MEDIUM_TERM: 0.80,
        SHORT_TERM: 0.90,
        INSTANTANEOUS: 1.10,
      },
      3: {
        PERMANENT: 0.50,
        LONG_TERM: 0.55,
        MEDIUM_TERM: 0.65,
        SHORT_TERM: 0.70,
        INSTANTANEOUS: 0.90,
      },
    };

    return kmodTable[serviceClass][loadDuration];
  }

  /**
   * Eurocode 5 partial material safety factor gamma_M (Table 2.3).
   */
  static getEc5GammaM(memberType: 'SOLID_TIMBER' | 'GLULAM' | 'CLT' | 'LVL' = 'SOLID_TIMBER'): number {
    switch (memberType) {
      case 'GLULAM':
      case 'CLT':
        return 1.25;
      case 'LVL':
        return 1.20;
      case 'SOLID_TIMBER':
      default:
        return 1.30;
    }
  }

  /**
   * Eurocode 5 creep deformation factor k_def (Table 3.2).
   */
  static getEc5Kdef(
    category: 'SOFTWOOD' | 'HARDWOOD' | 'GLULAM' | 'CLT_LAM',
    serviceClass: Eurocode5ServiceClass
  ): number {
    if (category === 'CLT_LAM') {
      if (serviceClass === 1) return 0.80;
      if (serviceClass === 2) return 1.00;
      return 2.00;
    }
    if (category === 'GLULAM') {
      if (serviceClass === 1) return 0.60;
      if (serviceClass === 2) return 0.80;
      return 2.00;
    }
    // Solid timber
    if (serviceClass === 1) return 0.60;
    if (serviceClass === 2) return 0.80;
    return 2.00;
  }

  /**
   * Eurocode 5 depth factor k_h for bending and tension (Clause 3.2 & 3.3).
   */
  static getEc5Kh(hMm: number, category: 'SOFTWOOD' | 'HARDWOOD' | 'GLULAM' | 'CLT_LAM'): number {
    if (category === 'GLULAM') {
      if (hMm >= 600) return 1.0;
      return Math.min(1.1, Math.pow(600 / Math.max(hMm, 50), 0.1));
    }
    // Solid timber
    if (hMm >= 150) return 1.0;
    return Math.min(1.3, Math.pow(150 / Math.max(hMm, 50), 0.2));
  }

  /**
   * NDS 2024 Load Duration Factor C_D (Table 2.3.2).
   */
  static getNdsCd(loadDuration: NdsLoadDuration): number {
    switch (loadDuration) {
      case 'DEAD_0_9':
        return 0.90;
      case 'OCCUPANCY_1_0':
        return 1.00;
      case 'SNOW_1_15':
        return 1.15;
      case 'CONSTRUCTION_1_25':
        return 1.25;
      case 'WIND_SEISMIC_1_6':
        return 1.60;
      case 'IMPACT_2_0':
        return 2.00;
      default:
        return 1.00;
    }
  }

  /**
   * NDS 2024 Wet Service Factor C_M.
   */
  static getNdsCm(property: 'Fb' | 'Ft' | 'Fc' | 'Fv' | 'E', isWet: boolean = false): number {
    if (!isWet) return 1.0;
    switch (property) {
      case 'Fb':
        return 0.85;
      case 'Ft':
        return 1.00;
      case 'Fc':
        return 0.80;
      case 'Fv':
        return 0.975;
      case 'E':
        return 0.90;
    }
  }

  /**
   * NDS 2024 Temperature Factor C_t.
   */
  static getNdsCt(temperatureC: number = 20, isWet: boolean = false): number {
    if (temperatureC <= 38) {
      return 1.0;
    }
    if (temperatureC <= 52) {
      return isWet ? 0.80 : 0.90;
    }
    return isWet ? 0.70 : 0.80;
  }

  /**
   * NDS 2024 Size factor C_F for dimension lumber (nominal thickness 2" to 4").
   */
  static getNdsCf(dMm: number, bMm: number): number {
    // Convert mm to inches
    const dIn = dMm / 25.4;
    const bIn = bMm / 25.4;
    if (bIn > 4) return 1.0; // Timber sizes (beams and stringers) use beam rules

    if (dIn <= 4) return 1.5;
    if (dIn <= 5) return 1.4;
    if (dIn <= 6) return 1.3;
    if (dIn <= 8) return 1.2;
    if (dIn <= 10) return 1.1;
    if (dIn <= 12) return 1.0;
    return 0.9;
  }

  /**
   * NDS 2024 Volume factor C_V for glued laminated timber (NDS 5.3.6).
   */
  static getNdsCv(L_m: number, d_mm: number, b_mm: number): number {
    const L_ft = L_m * 3.28084;
    const d_in = d_mm / 25.4;
    const b_in = b_mm / 25.4;
    const x = 0.10; // For Southern Pine x = 0.05, Western Species x = 0.10
    const cv = Math.pow(21.0 / Math.max(L_ft, 1.0), x) *
               Math.pow(12.0 / Math.max(d_in, 1.0), x) *
               Math.pow(5.125 / Math.max(b_in, 1.0), x);
    return Math.min(1.0, Math.max(0.5, cv));
  }

  /**
   * IS 883:1994 Location Factor k_1 (Clause 5.2).
   */
  static getIs883K1(location: 'INSIDE' | 'OUTSIDE' | 'WET'): number {
    switch (location) {
      case 'INSIDE':
        return 1.0;
      case 'OUTSIDE':
        return 5 / 6; // 0.833
      case 'WET':
        return 2 / 3; // 0.667
    }
  }

  /**
   * IS 883:1994 Shape factor k_2 for circular sections (Clause 5.3).
   */
  static getIs883K2(shape: 'RECTANGULAR' | 'CIRCULAR' = 'RECTANGULAR'): number {
    return shape === 'CIRCULAR' ? 1.18 : 1.0;
  }
}
