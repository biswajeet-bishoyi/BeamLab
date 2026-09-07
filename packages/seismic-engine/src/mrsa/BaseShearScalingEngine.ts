/**
 * BaseShearScalingEngine.ts
 *
 * Equivalent Lateral Force (ELF) Base Shear calculation and Dynamic-to-Static
 * Base Shear Scaling Engine per ASCE 7-22 Section 12.9.1.4, Eurocode 8, and IS 1893:2016.
 * Scales dynamic modal forces and drift when modal base shear Vt is less than the specified
 * threshold of static base shear Vb (typically 100% per ASCE 7-22 or 85% per IS 1893).
 */

import {
  ResponseSpectrumGenerator,
  Asce7Options,
  Eurocode8Options,
  Is1893Options,
} from '../spectra/ResponseSpectrumGenerator';

export interface ElfOptions {
  standard: 'ASCE_7_22' | 'EUROCODE_8' | 'IS_1893_2016';
  totalWeight_kN: number;
  fundamentalPeriod_s: number;
  minimumRatioThreshold?: number; // default 1.0 for ASCE 7-22, 0.85 for IS 1893
  asceOptions?: Asce7Options & { S1?: number };
  eurocodeOptions?: Eurocode8Options;
  is1893Options?: Is1893Options;
}

export interface BaseShearScaleResult {
  standardUsed: string;
  totalWeight_kN: number;
  fundamentalPeriod_s: number;
  staticBaseShear_kN: number;
  dynamicBaseShear_kN: number;
  ratioDynamicToStatic: number;
  minimumRequiredRatio: number;
  isScalingRequired: boolean;
  scaleFactor: number;
  scaledDynamicBaseShear_kN: number;
}

export class BaseShearScalingEngine {
  /**
   * Computes the Equivalent Lateral Force (ELF) static base shear Vb.
   */
  public computeStaticBaseShear(options: ElfOptions): number {
    const W = options.totalWeight_kN;
    const T = options.fundamentalPeriod_s;

    if (options.standard === 'ASCE_7_22') {
      const opt = options.asceOptions ?? { Sds: 1.0, Sd1: 0.6, R: 8.0, Ie: 1.0 };
      const Sds = opt.Sds;
      const Sd1 = opt.Sd1;
      const R = opt.R ?? 1.0;
      const Ie = opt.Ie ?? 1.0;
      const Tl = opt.Tl ?? 8.0;
      const S1 = opt.S1 ?? 0.5 * Sd1;

      // Cs = Sds / (R / Ie)
      let Cs = Sds / (R / Ie);

      // Upper limit: Cs <= Sd1 / (T * (R / Ie)) for T <= Tl, or (Sd1 * Tl) / (T^2 * (R / Ie)) for T > Tl
      if (T > 0) {
        const CsMax = T <= Tl ? Sd1 / (T * (R / Ie)) : (Sd1 * Tl) / (T * T * (R / Ie));
        Cs = Math.min(Cs, CsMax);
      }

      // Lower limit: Cs >= max(0.044 * Sds * Ie, 0.5 * S1 / (R / Ie))
      const CsMin1 = 0.044 * Sds * Ie;
      const CsMin2 = (0.5 * S1) / (R / Ie);
      const CsMin = Math.max(CsMin1, CsMin2, 0.01);
      Cs = Math.max(Cs, CsMin);

      return Number((Cs * W).toFixed(2));
    } else if (options.standard === 'EUROCODE_8') {
      const opt = options.eurocodeOptions ?? {
        groundType: 'B',
        spectrumType: 'TYPE_1',
        ag_g: 0.25,
        q: 3.0,
        isDesignSpectrum: true,
      };
      // Sd(T1) * m * lambda, lambda = 0.85 for T1 <= 2*Tc and building > 2 storeys, or 1.0
      const Sd_g = ResponseSpectrumGenerator.getEurocode8Sa(T, { ...opt, isDesignSpectrum: true });
      const lambda = 0.85;
      const Fb = Sd_g * W * lambda;
      return Number(Fb.toFixed(2));
    } else {
      // IS 1893:2016
      const opt = options.is1893Options ?? {
        zone: 'IV',
        soilType: 'II',
        R: 5.0,
        I: 1.2,
      };
      const Ah = ResponseSpectrumGenerator.getIs1893Sa(T, opt);
      const Vb = Ah * W;
      return Number(Vb.toFixed(2));
    }
  }

  /**
   * Evaluates and applies base shear scaling factor.
   */
  public evaluateScaling(
    dynamicBaseShear_kN: number,
    options: ElfOptions
  ): BaseShearScaleResult {
    const staticBaseShear = this.computeStaticBaseShear(options);
    const minRatio =
      options.minimumRatioThreshold ?? (options.standard === 'ASCE_7_22' ? 1.0 : 0.85);

    const targetShear = minRatio * staticBaseShear;
    const ratioDynToStatic = staticBaseShear > 0 ? dynamicBaseShear_kN / staticBaseShear : 1.0;

    const isScalingRequired = dynamicBaseShear_kN < targetShear;
    const scaleFactor =
      dynamicBaseShear_kN > 0 && isScalingRequired
        ? targetShear / dynamicBaseShear_kN
        : 1.0;

    const scaledShear = dynamicBaseShear_kN * scaleFactor;

    return {
      standardUsed: options.standard,
      totalWeight_kN: options.totalWeight_kN,
      fundamentalPeriod_s: options.fundamentalPeriod_s,
      staticBaseShear_kN: Number(staticBaseShear.toFixed(2)),
      dynamicBaseShear_kN: Number(dynamicBaseShear_kN.toFixed(2)),
      ratioDynamicToStatic: Number(ratioDynToStatic.toFixed(3)),
      minimumRequiredRatio: minRatio,
      isScalingRequired,
      scaleFactor: Number(scaleFactor.toFixed(3)),
      scaledDynamicBaseShear_kN: Number(scaledShear.toFixed(2)),
    };
  }
}
