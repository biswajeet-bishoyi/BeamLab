import { describe, it, expect } from 'vitest';
import { InfluenceLineEngine } from './InfluenceLineEngine.js';

describe('InfluenceLineEngine - Müller-Breslau Influence Lines', () => {
  describe('Simply Supported Single Span Bridge (L = 20m)', () => {
    const L = 20.0;

    it('should generate exact reaction influence lines', () => {
      const ilRA = InfluenceLineEngine.generateSimpleSpanInfluenceLine({
        spanLengthM: L,
        actionType: 'reaction',
        evaluationStationM: 0.0,
      });

      expect(ilRA.evaluateAt(0)).toBeCloseTo(1.0, 4);
      expect(ilRA.evaluateAt(10)).toBeCloseTo(0.5, 4);
      expect(ilRA.evaluateAt(20)).toBeCloseTo(0.0, 4);
      expect(ilRA.positiveAreaM).toBeCloseTo(10.0, 1); // 0.5 * 1.0 * 20 = 10 m
      expect(ilRA.peakPositiveValue).toBeCloseTo(1.0, 4);
      expect(ilRA.peakNegativeValue).toBe(0);

      const ilRB = InfluenceLineEngine.generateSimpleSpanInfluenceLine({
        spanLengthM: L,
        actionType: 'reaction',
        evaluationStationM: L,
      });

      expect(ilRB.evaluateAt(0)).toBeCloseTo(0.0, 4);
      expect(ilRB.evaluateAt(10)).toBeCloseTo(0.5, 4);
      expect(ilRB.evaluateAt(20)).toBeCloseTo(1.0, 4);
    });

    it('should generate exact midspan bending moment influence line (peak = L/4 = 5.0m)', () => {
      const x0 = 10.0;
      const ilM = InfluenceLineEngine.generateSimpleSpanInfluenceLine({
        spanLengthM: L,
        actionType: 'moment',
        evaluationStationM: x0,
      });

      // Peak ordinate at midspan: x0 * (L - x0) / L = 10 * 10 / 20 = 5.0 m
      expect(ilM.evaluateAt(x0)).toBeCloseTo(5.0, 4);
      expect(ilM.evaluateAt(0)).toBeCloseTo(0.0, 4);
      expect(ilM.evaluateAt(L)).toBeCloseTo(0.0, 4);
      expect(ilM.evaluateAt(5)).toBeCloseTo(2.5, 4);
      expect(ilM.evaluateAt(15)).toBeCloseTo(2.5, 4);

      // Area under triangle: 0.5 * 20 * 5.0 = 50.0 m^2
      expect(ilM.positiveAreaM).toBeCloseTo(50.0, 1);
      expect(ilM.negativeAreaM).toBe(0);

      // Response under 100 kN point load placed at midspan
      const pointResponse = ilM.calculateVehicleResponse([10.0], [100.0]);
      expect(pointResponse).toBeCloseTo(500.0, 2); // 100 kN * 5.0 m = 500 kNm

      // Response under AASHTO lane load 9.3 kN/m: 9.3 * 50.0 = 465.0 kNm
      const laneResponse = ilM.calculateLaneResponse(9.3, 'max-positive');
      expect(laneResponse).toBeCloseTo(465.0, 1);
    });

    it('should generate exact quarter-point shear influence line with jump discontinuity delta V = 1.0', () => {
      const x0 = 5.0; // Quarter point
      const ilV = InfluenceLineEngine.generateSimpleSpanInfluenceLine({
        spanLengthM: L,
        actionType: 'shear',
        evaluationStationM: x0,
      });

      // Just left of x0: -5 / 20 = -0.25
      expect(ilV.evaluateAt(4.999)).toBeCloseTo(-0.25, 2);

      // Just right of x0: (20 - 5) / 20 = +0.75
      expect(ilV.evaluateAt(5.001)).toBeCloseTo(0.75, 2);

      // Verify jump = 1.0
      expect(ilV.peakPositiveValue).toBeCloseTo(0.75, 4);
      expect(ilV.peakNegativeValue).toBeCloseTo(-0.25, 4);

      // Positive area: 0.5 * 15 * 0.75 = 5.625 m
      expect(ilV.positiveAreaM).toBeCloseTo(5.625, 1);

      // Negative area: 0.5 * 5 * (-0.25) = -0.625 m
      expect(ilV.negativeAreaM).toBeCloseTo(-0.625, 1);
    });
  });

  describe('Continuous 2-Span Bridge (L1 = L2 = 20m, Total = 40m)', () => {
    const L = 20.0;

    it('should generate interior pier moment influence line that is non-positive everywhere', () => {
      const ilPierM = InfluenceLineEngine.generateContinuousTwoSpanInfluenceLine({
        spanLengthM: L,
        actionType: 'moment',
        evaluationStationM: 20.0, // Pier B at x = 20
      });

      expect(ilPierM.evaluateAt(0)).toBeCloseTo(0, 4);
      expect(ilPierM.evaluateAt(20)).toBeCloseTo(0, 4);
      expect(ilPierM.evaluateAt(40)).toBeCloseTo(0, 4);

      // Under unit load at mid of Span 1 (x = 10m): M_B = -(10 * (400 - 100)) / (4 * 20^2) = -3000 / 1600 = -1.875 m
      expect(ilPierM.evaluateAt(10)).toBeCloseTo(-1.875, 4);
      // Under unit load at mid of Span 2 (x = 30m): same by symmetry
      expect(ilPierM.evaluateAt(30)).toBeCloseTo(-1.875, 4);

      expect(ilPierM.positiveAreaM).toBe(0);
      expect(ilPierM.negativeAreaM).toBeLessThan(0);
      expect(ilPierM.peakNegativeValue).toBeLessThan(-1.875); // Peak occurs near 0.577 * L = 11.55m
    });

    it('should generate interior pier reaction influence line with peak 1.0 at pier B', () => {
      const ilPierR = InfluenceLineEngine.generateContinuousTwoSpanInfluenceLine({
        spanLengthM: L,
        actionType: 'reaction',
        evaluationStationM: 20.0,
      });

      expect(ilPierR.evaluateAt(20)).toBeCloseTo(1.0, 4);
      expect(ilPierR.evaluateAt(0)).toBeCloseTo(0.0, 4);
      expect(ilPierR.evaluateAt(40)).toBeCloseTo(0.0, 4);
      expect(ilPierR.positiveAreaM).toBeGreaterThan(0);
    });
  });
});
