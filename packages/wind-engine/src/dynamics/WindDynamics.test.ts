/**
 * WindDynamics.test.ts
 *
 * Unit tests for along-wind dynamic gust resonance and cross-wind vortex shedding.
 */

import { describe, it, expect } from 'vitest';
import { GustResonanceEngine, DynamicBuildingProperties } from './GustResonanceEngine';
import { VortexSheddingEngine, VortexSheddingInput } from './VortexSheddingEngine';

describe('Wind Dynamic Resonance Engines', () => {
  describe('GustResonanceEngine (Along-Wind)', () => {
    it('treats structures with n1 >= 1.0 Hz as rigid with G >= 0.85', () => {
      const rigidProps: DynamicBuildingProperties = {
        fundamentalFrequency_Hz: 1.5,
        dampingRatio: 0.02,
        buildingHeight_m: 25,
        crossWindWidth_m: 20,
        alongWindLength_m: 20,
        exposureCategory: 'B',
        basicWindSpeed_mps: 40,
      };

      const result = GustResonanceEngine.calculateGustFactor(rigidProps);
      expect(result.isFlexible).toBe(false);
      expect(result.gustEffectFactor).toBeGreaterThanOrEqual(0.85);
      expect(result.resonantFactor_R).toBeUndefined();
    });

    it('computes dynamic resonant factor R and amplified Gf for flexible buildings (n1 < 1.0 Hz)', () => {
      const flexibleProps: DynamicBuildingProperties = {
        fundamentalFrequency_Hz: 0.22, // Tall building T1 ~ 4.5s
        dampingRatio: 0.015,
        buildingHeight_m: 140,
        crossWindWidth_m: 35,
        alongWindLength_m: 35,
        exposureCategory: 'B',
        basicWindSpeed_mps: 45,
      };

      const result = GustResonanceEngine.calculateGustFactor(flexibleProps);
      expect(result.isFlexible).toBe(true);
      expect(result.resonantFactor_R).toBeDefined();
      expect(result.resonantFactor_R!).toBeGreaterThan(0);
      expect(result.gustEffectFactor).toBeGreaterThan(0.85);
      expect(result.spectralFactor_Rn).toBeGreaterThan(0);
      expect(result.peakFactor_gR).toBeGreaterThan(3.0);
    });
  });

  describe('VortexSheddingEngine (Cross-Wind)', () => {
    it('computes Strouhal number based on cross-section geometry', () => {
      const sqSt = VortexSheddingEngine.getStrouhalNumber('SQUARE', 20, 20);
      expect(sqSt).toBe(0.12);

      const circSt = VortexSheddingEngine.getStrouhalNumber('CIRCULAR', 20, 20);
      expect(circSt).toBe(0.18);

      const rectSt = VortexSheddingEngine.getStrouhalNumber('RECTANGULAR', 40, 20);
      expect(rectSt).toBe(0.09);
    });

    it('identifies vortex shedding lock-in condition and computes peak transverse amplitude', () => {
      // Slender tower: b = 15m, f1 = 0.20 Hz, St = 0.12
      // v_crit = (15 * 0.20) / 0.12 = 25.0 m/s
      // If design speed = 28 m/s, 25.0 m/s is within the design speed range -> Lock-in occurs!
      const input: VortexSheddingInput = {
        crossSectionType: 'SQUARE',
        crossWindDimension_b_m: 15,
        alongWindDimension_d_m: 15,
        buildingHeight_m: 90,
        fundamentalFrequency_Hz: 0.20,
        dampingRatio: 0.015,
        averageMassPerMeter_kg_m: 25000,
        designWindSpeed_mps: 28,
      };

      const result = VortexSheddingEngine.analyze(input);
      expect(result.strouhalNumber).toBe(0.12);
      expect(result.criticalVelocity_mps).toBeCloseTo(25.0, 1);
      expect(result.isLockInSusceptible).toBe(true);
      expect(result.peakTransverseAmplitude_mm).toBeGreaterThan(0);
      expect(result.peakBaseCrossWindShear_kN).toBeGreaterThan(0);
    });

    it('verifies safety when critical velocity is well above design wind speed', () => {
      // Stiff building: f1 = 1.0 Hz -> v_crit = (15 * 1.0) / 0.12 = 125 m/s >> 25 m/s
      const stiffInput: VortexSheddingInput = {
        crossSectionType: 'SQUARE',
        crossWindDimension_b_m: 15,
        alongWindDimension_d_m: 15,
        buildingHeight_m: 40,
        fundamentalFrequency_Hz: 1.0,
        dampingRatio: 0.02,
        averageMassPerMeter_kg_m: 35000,
        designWindSpeed_mps: 25,
      };

      const result = VortexSheddingEngine.analyze(stiffInput);
      expect(result.criticalVelocity_mps).toBeGreaterThan(100);
      expect(result.isLockInSusceptible).toBe(false);
    });
  });
});
