import { describe, it, expect } from 'vitest';
import {
  ResponseSpectrumGenerator,
  Asce7Options,
  Eurocode8Options,
  Is1893Options,
} from './ResponseSpectrumGenerator';
import { ModalCombinationEngine, ModalResponseItem } from '../modal/ModalCombinationEngine';

describe('Codified Response Spectra Generator & Modal Combination Core', () => {
  describe('ResponseSpectrumGenerator', () => {
    it('evaluates ASCE 7-22 response spectrum across all period branches', () => {
      const options: Asce7Options = {
        Sds: 1.0, // g
        Sd1: 0.6, // g
        Tl: 8.0,  // s
        R: 1.0,
        Ie: 1.0,
      };

      // T0 = 0.2 * (0.6 / 1.0) = 0.12 s
      // Ts = 0.6 / 1.0 = 0.60 s
      const Sa_at_zero = ResponseSpectrumGenerator.getAsce7Sa(0, options);
      expect(Sa_at_zero).toBeCloseTo(0.4, 2); // Sds * 0.4 = 0.4g

      const Sa_plateau = ResponseSpectrumGenerator.getAsce7Sa(0.35, options);
      expect(Sa_plateau).toBeCloseTo(1.0, 2); // Sds = 1.0g

      const Sa_constant_velocity = ResponseSpectrumGenerator.getAsce7Sa(1.2, options);
      expect(Sa_constant_velocity).toBeCloseTo(0.6 / 1.2, 2); // Sd1 / T = 0.50g

      const Sa_long_period = ResponseSpectrumGenerator.getAsce7Sa(10.0, options);
      expect(Sa_long_period).toBeCloseTo((0.6 * 8.0) / (10.0 * 10.0), 2); // Sd1 * Tl / T^2 = 0.048g
    });

    it('evaluates Eurocode 8 Type 1 elastic and design spectra', () => {
      const optionsElastic: Eurocode8Options = {
        groundType: 'B', // S = 1.2, Tb = 0.15, Tc = 0.50, Td = 2.0
        spectrumType: 'TYPE_1',
        ag_g: 0.25,
        isDesignSpectrum: false,
      };

      // In plateau Tb <= T <= Tc: Se = ag * S * 2.5 = 0.25 * 1.2 * 2.5 = 0.75g
      const Se_plateau = ResponseSpectrumGenerator.getEurocode8Sa(0.30, optionsElastic);
      expect(Se_plateau).toBeCloseTo(0.75, 2);

      // Design spectrum with behavior factor q = 3.0
      const optionsDesign: Eurocode8Options = {
        ...optionsElastic,
        q: 3.0,
        isDesignSpectrum: true,
      };
      const Sd_plateau = ResponseSpectrumGenerator.getEurocode8Sa(0.30, optionsDesign);
      // Sd = ag * S * (2.5 / q) = 0.25 * 1.2 * (2.5 / 3) = 0.25g
      expect(Sd_plateau).toBeCloseTo(0.25, 2);
    });

    it('evaluates IS 1893:2016 Part 1 spectral acceleration', () => {
      const options: Is1893Options = {
        zone: 'V', // Z = 0.36
        soilType: 'II', // Medium soil: Sa/g = 2.5 for 0.10s <= T <= 0.55s
        R: 5.0, // Special Moment Resisting Frame
        I: 1.2, // Business/Commercial building
      };

      // Ah = (Z / 2) * (I / R) * (Sa / g)
      // Ah = (0.36 / 2) * (1.2 / 5.0) * 2.5 = 0.18 * 0.24 * 2.5 = 0.108g
      const Ah_plateau = ResponseSpectrumGenerator.getIs1893Sa(0.35, options);
      expect(Ah_plateau).toBeCloseTo(0.108, 3);
    });

    it('interpolates user-defined response spectrum points', () => {
      const customPoints = [
        { period_s: 0.0, Sa_g: 0.3 },
        { period_s: 0.5, Sa_g: 0.9 },
        { period_s: 1.5, Sa_g: 0.3 },
      ];

      expect(ResponseSpectrumGenerator.getUserDefinedSa(0.25, customPoints)).toBeCloseTo(0.6, 2);
      expect(ResponseSpectrumGenerator.getUserDefinedSa(1.0, customPoints)).toBeCloseTo(0.6, 2);
    });
  });

  describe('ModalCombinationEngine', () => {
    it('computes Der Kiureghian cross-modal coefficient for identical and closely spaced modes', () => {
      // Identical modes
      const rhoSelf = ModalCombinationEngine.computeRhoIJ(1.0, 1.0, 0.05, 0.05);
      expect(rhoSelf).toBeCloseTo(1.0, 4);

      // Closely spaced modes (T1 = 1.0s, T2 = 1.05s) with 5% damping
      const rhoClose = ModalCombinationEngine.computeRhoIJ(1.0, 1.05, 0.05, 0.05);
      expect(rhoClose).toBeGreaterThan(0.5); // Substantial modal coupling

      // Well-separated modes (T1 = 1.0s, T2 = 0.3s)
      const rhoFar = ModalCombinationEngine.computeRhoIJ(1.0, 0.3, 0.05, 0.05);
      expect(rhoFar).toBeLessThan(0.05); // Negligible modal coupling
    });

    it('demonstrates CQC capturing cross-modal correlation over SRSS', () => {
      // Two coupled modes with close periods and equal base shear contributions
      const modes: ModalResponseItem[] = [
        { modeIndex: 1, period_s: 1.00, responseValue: 100, dampingRatio: 0.05 },
        { modeIndex: 2, period_s: 1.03, responseValue: 80, dampingRatio: 0.05 },
      ];

      const cqcResult = ModalCombinationEngine.combineCQC(modes);
      const srssResult = ModalCombinationEngine.combineSRSS(modes);

      // SRSS = sqrt(100^2 + 80^2) = sqrt(16400) = 128.06
      expect(srssResult).toBeCloseTo(128.06, 1);

      // In CQC, because rho12 > 0, CQC > SRSS
      expect(cqcResult).toBeGreaterThan(srssResult);
    });

    it('evaluates 100% + 30% directional combination rule and spatial SRSS', () => {
      const Rx = 150;
      const Ry = 100;
      const Rz = 50;

      const dirResult = ModalCombinationEngine.combineDirectional(Rx, Ry, Rz);

      // Case X: 150 + 0.3*100 + 0.3*50 = 150 + 30 + 15 = 195
      expect(dirResult.caseX).toBe(195);
      // Case Y: 0.3*150 + 100 + 0.3*50 = 45 + 100 + 15 = 160
      expect(dirResult.caseY).toBe(160);
      // Governing envelope is 195
      expect(dirResult.governingEnvelope).toBe(195);

      // SRSS = sqrt(150^2 + 100^2 + 50^2) = sqrt(22500 + 10000 + 2500) = sqrt(35000) = 187.08
      expect(dirResult.srssCombination).toBeCloseTo(187.08, 1);
    });
  });
});
