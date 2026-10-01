/**
 * WindProfile.test.ts
 *
 * Unit tests for WindProfileEngine across ASCE 7-22, Eurocode 1, and IS 875:2015.
 */

import { describe, it, expect } from 'vitest';
import { WindProfileEngine } from './WindProfileEngine';

describe('WindProfileEngine', () => {
  describe('ASCE 7-22 Velocity Pressure & Exposure Coefficients', () => {
    it('computes correct Kz values per Table 26.10-1 for Exposures B, C, and D', () => {
      // Exposure B at z = 30m: zg = 365.76, alpha = 7.0
      // Kz = 2.01 * (30 / 365.76)^(2/7) = 2.01 * (0.0820)^0.2857 = 2.01 * 0.4901 = 0.985
      const kzB_30m = WindProfileEngine.getAsce7Kz(30, 'B');
      expect(kzB_30m).toBeCloseTo(0.985, 2);

      // Exposure C at z = 10m: zg = 274.32, alpha = 9.5
      // Kz = 2.01 * (10 / 274.32)^(2/9.5) = 2.01 * (0.03645)^0.2105 = 2.01 * 0.4975 = 1.00
      const kzC_10m = WindProfileEngine.getAsce7Kz(10, 'C');
      expect(kzC_10m).toBeCloseTo(1.0, 2);

      // Exposure D at z = 20m: zg = 213.36, alpha = 11.5
      const kzD_20m = WindProfileEngine.getAsce7Kz(20, 'D');
      expect(kzD_20m).toBeGreaterThan(kzC_10m);
    });

    it('enforces zmin lower bound limit for heights below zmin', () => {
      // Exposure B zmin = 9.14m
      const kz_5m = WindProfileEngine.getAsce7Kz(5, 'B');
      const kz_zmin = WindProfileEngine.getAsce7Kz(9.14, 'B');
      expect(kz_5m).toBe(kz_zmin);
    });

    it('computes ASCE 7-22 velocity pressure qz (N/m^2)', () => {
      // V = 45 m/s, Kd = 0.85, Kzt = 1.0, Ke = 1.0
      // qz = 0.613 * Kz * 0.85 * 45^2 = 0.613 * Kz * 0.85 * 2025 = 1055.13 * Kz
      const qz = WindProfileEngine.getAsce7VelocityPressure(10, {
        basicWindSpeed_mps: 45,
        exposureCategory: 'C',
        Kd: 0.85,
      });

      const kz = WindProfileEngine.getAsce7Kz(10, 'C');
      expect(qz).toBeCloseTo(0.613 * kz * 0.85 * 2025, 0);
      expect(qz).toBeGreaterThan(800);
    });
  });

  describe('Eurocode 1 (EN 1991-1-4) Peak Velocity Pressure', () => {
    it('computes mean velocity vm, roughness cr, and peak velocity pressure qp', () => {
      const res = WindProfileEngine.getEurocode1PeakPressure(25, {
        fundamentalBasicWindSpeed_mps: 26,
        terrainCategory: 'II',
      });

      expect(res.vm_mps).toBeGreaterThan(15);
      expect(res.cr).toBeGreaterThan(0.5);
      expect(res.Iv).toBeGreaterThan(0.1);
      expect(res.qp_N_m2).toBeGreaterThan(500);
    });

    it('scales turbulence and roughness properly with terrain category', () => {
      const terrain0 = WindProfileEngine.getEurocode1PeakPressure(20, {
        fundamentalBasicWindSpeed_mps: 25,
        terrainCategory: '0', // Sea
      });

      const terrainIV = WindProfileEngine.getEurocode1PeakPressure(20, {
        fundamentalBasicWindSpeed_mps: 25,
        terrainCategory: 'IV', // Dense urban
      });

      // Sea terrain has much lower roughness length -> higher velocity and higher peak pressure
      expect(terrain0.qp_N_m2).toBeGreaterThan(terrainIV.qp_N_m2);
      // Urban terrain has higher turbulence intensity Iv
      expect(terrainIV.Iv).toBeGreaterThan(terrain0.Iv);
    });
  });

  describe('IS 875 (Part 3): 2015 Design Pressure', () => {
    it('evaluates Vz = Vb * k1 * k2 * k3 * k4 and pz = 0.6 * Vz^2', () => {
      const res = WindProfileEngine.getIs875DesignPressure(30, {
        basicWindSpeed_mps: 44,
        terrainCategory: 2,
        k1_riskCoefficient: 1.0,
        k3_topographyFactor: 1.0,
        k4_cyclonicFactor: 1.0,
      });

      // At 30m in Category 2, k2 > 1.0
      expect(res.k2).toBeGreaterThan(1.0);
      expect(res.Vz_mps).toBeCloseTo(44 * res.k2, 1);
      expect(res.pz_N_m2).toBeCloseTo(0.6 * Math.pow(res.Vz_mps, 2), 0);
    });
  });

  describe('Vertical Profile Generation', () => {
    it('generates discretized profile points up to total building height', () => {
      const points = WindProfileEngine.generateProfile('ASCE_7_22', 40, 5, {
        asce: { basicWindSpeed_mps: 50, exposureCategory: 'B' },
      });

      expect(points.length).toBe(9); // 0, 5, 10, 15, 20, 25, 30, 35, 40
      expect(points[0]!.height_m).toBe(0);
      expect(points[points.length - 1]!.height_m).toBe(40);

      // Pressure increases monotonically with height
      for (let i = 1; i < points.length; i++) {
        expect(points[i]!.velocityPressure_N_m2).toBeGreaterThanOrEqual(
          points[i - 1]!.velocityPressure_N_m2
        );
      }
    });
  });
});
