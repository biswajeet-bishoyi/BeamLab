/**
 * TimberMaterialEngine: Computes codified design strengths and effective engineering moduli
 * across NDS 2024, Eurocode 5, and IS 883.
 */

import { TimberGradeDefinition, getTimberGrade } from './TimberMaterialDatabase';
import {
  TimberModificationEngine,
  Ec5FactorsOptions,
  NdsFactorsOptions,
  Is883FactorsOptions,
} from './TimberModificationFactors';

export interface TimberDesignStrengths {
  standard: string;
  gradeId: string;
  category: string;
  /** Design bending strength (MPa) */
  fm_d: number;
  /** Design tension parallel (MPa) */
  ft0_d: number;
  /** Design tension perpendicular (MPa) */
  ft90_d: number;
  /** Design compression parallel (MPa) */
  fc0_d: number;
  /** Design compression perpendicular / bearing (MPa) */
  fc90_d: number;
  /** Design shear strength (MPa) */
  fv_d: number;
  /** Design rolling shear strength (MPa) */
  fr_d: number;
  /** Mean design modulus parallel (MPa) */
  E0_mean_d: number;
  /** 5th-percentile modulus parallel (MPa) */
  E0_05_d: number;
  /** Effective long-term elastic modulus accounting for creep (MPa) */
  E0_eff: number;
  /** Governing modification factor (k_mod or CD * CM * Ct) */
  governingFactor: number;
}

export class TimberMaterialEngine {
  /**
   * Compute Eurocode 5 design material properties.
   */
  static computeEurocode5DesignStrengths(
    gradeIdOrDef: string | TimberGradeDefinition,
    options: Ec5FactorsOptions
  ): TimberDesignStrengths {
    const grade = typeof gradeIdOrDef === 'string' ? getTimberGrade(gradeIdOrDef) : gradeIdOrDef;
    const kmod = TimberModificationEngine.getEc5Kmod(grade.category, options.serviceClass, options.loadDuration);
    const gammaM = TimberModificationEngine.getEc5GammaM(options.memberType);
    const kh = options.h ? TimberModificationEngine.getEc5Kh(options.h, grade.category) : 1.0;
    const ksys = options.isSystemAction ? 1.10 : 1.0;
    const kdef = TimberModificationEngine.getEc5Kdef(grade.category, options.serviceClass);

    const factor = (kmod / gammaM) * ksys;
    const fm_d = factor * kh * grade.fm_k;
    const ft0_d = factor * kh * grade.ft0_k;
    const ft90_d = factor * grade.ft90_k;
    const fc0_d = factor * grade.fc0_k;
    const fc90_d = factor * grade.fc90_k;
    const fv_d = factor * grade.fv_k;
    const fr_d = factor * grade.fr_k;

    const E0_mean_d = grade.E0_mean;
    const E0_05_d = grade.E0_05;
    const E0_eff = grade.E0_mean / (1.0 + kdef);

    return {
      standard: 'EUROCODE_5',
      gradeId: grade.id,
      category: grade.category,
      fm_d,
      ft0_d,
      ft90_d,
      fc0_d,
      fc90_d,
      fv_d,
      fr_d,
      E0_mean_d,
      E0_05_d,
      E0_eff,
      governingFactor: factor,
    };
  }

  /**
   * Compute NDS 2024 adjusted design values (ASD).
   */
  static computeNdsDesignStrengths(
    gradeIdOrDef: string | TimberGradeDefinition,
    options: NdsFactorsOptions
  ): TimberDesignStrengths {
    const grade = typeof gradeIdOrDef === 'string' ? getTimberGrade(gradeIdOrDef) : gradeIdOrDef;
    const CD = TimberModificationEngine.getNdsCd(options.loadDuration);
    const CM_b = TimberModificationEngine.getNdsCm('Fb', options.isWetService);
    const CM_c = TimberModificationEngine.getNdsCm('Fc', options.isWetService);
    const CM_v = TimberModificationEngine.getNdsCm('Fv', options.isWetService);
    const CM_E = TimberModificationEngine.getNdsCm('E', options.isWetService);
    const Ct = TimberModificationEngine.getNdsCt(options.temperatureC, options.isWetService);
    const Cr = options.isRepetitive ? 1.15 : 1.0;
    const CF = (options.d && options.b) ? TimberModificationEngine.getNdsCf(options.d, options.b) : 1.0;
    const CV = (options.L && options.d && options.b && grade.category === 'GLULAM')
      ? TimberModificationEngine.getNdsCv(options.L / 1000, options.d, options.b)
      : 1.0;

    // Glulam uses CV; sawn lumber uses CF
    const sizeAdjustment = grade.category === 'GLULAM' ? CV : CF;

    const adjustedFb = grade.fm_k * CD * CM_b * Ct * sizeAdjustment * Cr;
    const adjustedFt = grade.ft0_k * CD * CM_b * Ct * (grade.category === 'GLULAM' ? 1.0 : CF);
    const adjustedFc = grade.fc0_k * CD * CM_c * Ct * (grade.category === 'GLULAM' ? 1.0 : Math.min(1.15, CF));
    const adjustedFcPerp = grade.fc90_k * CM_c * Ct;
    const adjustedFv = grade.fv_k * CD * CM_v * Ct;
    const adjustedFr = grade.fr_k * CD * CM_v * Ct;

    const adjustedE = grade.E0_mean * CM_E * Ct;
    const adjustedE05 = grade.E0_05 * CM_E * Ct;
    const creepFactor = options.isWetService ? 2.0 : 1.5;
    const E0_eff = adjustedE / creepFactor;

    return {
      standard: 'NDS',
      gradeId: grade.id,
      category: grade.category,
      fm_d: adjustedFb,
      ft0_d: adjustedFt,
      ft90_d: grade.ft90_k * CM_b * Ct,
      fc0_d: adjustedFc,
      fc90_d: adjustedFcPerp,
      fv_d: adjustedFv,
      fr_d: adjustedFr,
      E0_mean_d: adjustedE,
      E0_05_d: adjustedE05,
      E0_eff,
      governingFactor: CD * CM_b * Ct,
    };
  }

  /**
   * Compute IS 883:1994 permissible design stresses.
   */
  static computeIs883DesignStrengths(
    gradeIdOrDef: string | TimberGradeDefinition,
    options: Is883FactorsOptions
  ): TimberDesignStrengths {
    const grade = typeof gradeIdOrDef === 'string' ? getTimberGrade(gradeIdOrDef) : gradeIdOrDef;
    const k1 = TimberModificationEngine.getIs883K1(options.location);
    const k2 = TimberModificationEngine.getIs883K2(options.shape);

    const factor = k1 * k2;
    const fm_d = grade.fm_k * factor;
    const ft0_d = grade.ft0_k * k1;
    const ft90_d = grade.ft90_k * k1;
    const fc0_d = grade.fc0_k * k1;
    const fc90_d = grade.fc90_k * k1;
    const fv_d = grade.fv_k * k1;
    const fr_d = grade.fr_k * k1;

    return {
      standard: 'IS_883',
      gradeId: grade.id,
      category: grade.category,
      fm_d,
      ft0_d,
      ft90_d,
      fc0_d,
      fc90_d,
      fv_d,
      fr_d,
      E0_mean_d: grade.E0_mean,
      E0_05_d: grade.E0_05,
      E0_eff: grade.E0_mean / 1.6,
      governingFactor: factor,
    };
  }
}
