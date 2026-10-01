import { describe, it, expect } from 'vitest';
import {
  ModalResponseSpectrumEngine,
  DynamicMode,
} from './ModalResponseSpectrumEngine';
import { BaseShearScalingEngine, ElfOptions } from './BaseShearScalingEngine';
import { ResponseSpectrumGenerator } from '../spectra/ResponseSpectrumGenerator';

describe('Modal Response Spectrum Analysis (MRSA) & Base Shear Scaling Engine', () => {
  const modes: DynamicMode[] = [
    {
      modeNumber: 1,
      period_s: 0.80,
      frequency_Hz: 1.25,
      circularFrequency_rad_s: 7.854,
      effectiveMassX_kg: 750000,
      effectiveMassY_kg: 0,
      massParticipationRatioX: 0.75, // 75%
      massParticipationRatioY: 0,
    },
    {
      modeNumber: 2,
      period_s: 0.26,
      frequency_Hz: 3.846,
      circularFrequency_rad_s: 24.166,
      effectiveMassX_kg: 150000,
      effectiveMassY_kg: 0,
      massParticipationRatioX: 0.15, // 15%
      massParticipationRatioY: 0,
    },
    {
      modeNumber: 3,
      period_s: 0.12,
      frequency_Hz: 8.333,
      circularFrequency_rad_s: 52.36,
      effectiveMassX_kg: 50000,
      effectiveMassY_kg: 0,
      massParticipationRatioX: 0.05, // 5% (Total = 95% >= 90%)
      massParticipationRatioY: 0,
    },
  ];

  const totalWeight_kN = 9806.65; // ~1,000,000 kg total seismic mass

  const mrsaEngine = new ModalResponseSpectrumEngine();
  const scalingEngine = new BaseShearScalingEngine();

  // Test spectrum evaluator
  const asceOptions = {
    Sds: 1.0,
    Sd1: 0.6,
    Tl: 8.0,
    R: 1.0,
    Ie: 1.0,
  };
  const spectrumEvaluator = (T: number) => ResponseSpectrumGenerator.getAsce7Sa(T, asceOptions);

  describe('ModalResponseSpectrumEngine', () => {
    it('analyzes 3-mode structure, confirms 90% threshold, and evaluates CQC/SRSS shears', () => {
      const result = mrsaEngine.analyze(modes, totalWeight_kN, spectrumEvaluator, 'X');

      expect(result.direction).toBe('X');
      expect(result.cumulativeMassParticipationRatio).toBe(0.95);
      expect(result.satisfies90PercentThreshold).toBe(true);
      expect(result.modalResponses.length).toBe(3);

      // Mode 1: T = 0.8s, Sa = Sd1 / T = 0.6 / 0.8 = 0.75g
      // V_b1 = 750,000 kg * 0.75 * 9.80665 / 1000 = 5516.24 kN
      expect(result.modalResponses[0]?.spectralAcceleration_g).toBeCloseTo(0.75, 2);
      expect(result.modalResponses[0]?.modalBaseShear_kN).toBeCloseTo(5516.24, 0);

      // CQC and SRSS Base Shears
      expect(result.baseShearCQC_kN).toBeGreaterThan(5000);
      expect(result.baseShearSRSS_kN).toBeGreaterThan(5000);
      // Both should be close since mode periods (0.80, 0.26, 0.12) are well-spaced
      expect(result.baseShearCQC_kN).toBeCloseTo(result.baseShearSRSS_kN, -2);
    });
  });

  describe('BaseShearScalingEngine', () => {
    it('computes ASCE 7-22 static base shear and scales dynamic shear when below threshold', () => {
      const elfOptions: ElfOptions = {
        standard: 'ASCE_7_22',
        totalWeight_kN: 10000,
        fundamentalPeriod_s: 0.8,
        asceOptions: {
          Sds: 1.0,
          Sd1: 0.6,
          R: 5.0,
          Ie: 1.0,
        },
      };

      // Cs = min(1.0 / 5.0, 0.6 / (0.8 * 5.0)) = min(0.20, 0.15) = 0.15
      // Vb = 0.15 * 10,000 = 1500 kN
      const staticShear = scalingEngine.computeStaticBaseShear(elfOptions);
      expect(staticShear).toBeCloseTo(1500, 0);

      // Suppose dynamic base shear Vt is only 1200 kN
      const dynamicShear = 1200;
      const scaleResult = scalingEngine.evaluateScaling(dynamicShear, elfOptions);

      expect(scaleResult.isScalingRequired).toBe(true);
      expect(scaleResult.scaleFactor).toBeCloseTo(1500 / 1200, 2); // 1.25
      expect(scaleResult.scaledDynamicBaseShear_kN).toBeCloseTo(1500, 0);
    });

    it('does not scale when dynamic base shear exceeds static threshold', () => {
      const elfOptions: ElfOptions = {
        standard: 'ASCE_7_22',
        totalWeight_kN: 10000,
        fundamentalPeriod_s: 0.8,
        asceOptions: {
          Sds: 1.0,
          Sd1: 0.6,
          R: 5.0,
          Ie: 1.0,
        },
      };

      // Dynamic shear 1600 kN > 1500 kN
      const dynamicShear = 1600;
      const scaleResult = scalingEngine.evaluateScaling(dynamicShear, elfOptions);

      expect(scaleResult.isScalingRequired).toBe(false);
      expect(scaleResult.scaleFactor).toBe(1.0);
      expect(scaleResult.scaledDynamicBaseShear_kN).toBe(1600);
    });

    it('scales dynamic base shear per IS 1893:2016 (85% static threshold)', () => {
      const elfOptions: ElfOptions = {
        standard: 'IS_1893_2016',
        totalWeight_kN: 10000,
        fundamentalPeriod_s: 0.8,
        minimumRatioThreshold: 0.85,
        is1893Options: {
          zone: 'IV', // Z = 0.24
          soilType: 'II', // Sa/g = 1.36 / 0.8 = 1.70
          R: 5.0,
          I: 1.0,
        },
      };

      // Ah = (0.24 / 2) * (1.0 / 5.0) * 1.70 = 0.12 * 0.20 * 1.70 = 0.0408
      // Vb = 0.0408 * 10,000 = 408 kN
      const staticShear = scalingEngine.computeStaticBaseShear(elfOptions);
      expect(staticShear).toBeCloseTo(408, 0);

      // Target = 0.85 * 408 = 346.8 kN
      // Suppose dynamic shear is 300 kN
      const dynamicShear = 300;
      const scaleResult = scalingEngine.evaluateScaling(dynamicShear, elfOptions);

      expect(scaleResult.isScalingRequired).toBe(true);
      expect(scaleResult.scaledDynamicBaseShear_kN).toBeCloseTo(346.8, 0);
    });
  });
});
