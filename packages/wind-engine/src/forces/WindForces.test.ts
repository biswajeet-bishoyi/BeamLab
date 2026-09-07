/**
 * WindForces.test.ts
 *
 * Unit tests for AerodynamicPressureEngine (MWFRS & C&C wind loads).
 */

import { describe, it, expect } from 'vitest';
import {
  AerodynamicPressureEngine,
  BuildingDimensions,
  BuildingStoryLevel,
} from './AerodynamicPressureEngine';
import { Asce7WindOptions } from '../profile/WindProfileEngine';

describe('AerodynamicPressureEngine', () => {
  describe('Aerodynamic Wall Pressure Coefficients Cp', () => {
    it('evaluates windward, leeward, and sidewall Cp per ASCE 7-22 Figure 27.3-1', () => {
      // L/B = 1.0 (e.g. 20m x 20m)
      const sq = AerodynamicPressureEngine.getWallCoefficients(20, 20);
      expect(sq.windwardCp).toBe(0.8);
      expect(sq.leewardCp).toBe(-0.5);
      expect(sq.sideWallCp).toBe(-0.7);

      // L/B = 2.0 (e.g. 40m x 20m)
      const med = AerodynamicPressureEngine.getWallCoefficients(40, 20);
      expect(med.leewardCp).toBe(-0.3);

      // L/B = 5.0 (> 4.0)
      const longBldg = AerodynamicPressureEngine.getWallCoefficients(100, 20);
      expect(longBldg.leewardCp).toBe(-0.2);
    });

    it('interpolates leeward Cp smoothly between 1.0 and 2.0', () => {
      // L/B = 1.5 -> leeward Cp should be halfway between -0.5 and -0.3 = -0.4
      const mid = AerodynamicPressureEngine.getWallCoefficients(30, 20);
      expect(mid.leewardCp).toBeCloseTo(-0.4, 3);
    });
  });

  describe('Internal Pressure Coefficients GCpi', () => {
    it('provides codified values for enclosed, partially enclosed, and partially open buildings', () => {
      const enclosed = AerodynamicPressureEngine.getInternalPressureCoefficients('ENCLOSED');
      expect(enclosed.positive).toBe(0.18);
      expect(enclosed.negative).toBe(-0.18);

      const partEnc = AerodynamicPressureEngine.getInternalPressureCoefficients('PARTIALLY_ENCLOSED');
      expect(partEnc.positive).toBe(0.55);
      expect(partEnc.negative).toBe(-0.55);

      const partOpen = AerodynamicPressureEngine.getInternalPressureCoefficients('PARTIALLY_OPEN');
      expect(partOpen.positive).toBe(0.0);
      expect(partOpen.negative).toBe(0.0);
    });
  });

  describe('Components & Cladding End Zone Dimension a', () => {
    it('calculates a = max(0.9m, min(0.1B, 0.1L, 0.4h))', () => {
      const bldg: BuildingDimensions = {
        length_m: 40,
        width_m: 25,
        meanRoofHeight_m: 15,
      };

      // 0.1B = 2.5, 0.1L = 4.0, 0.4h = 6.0 -> min = 2.5m
      const a = AerodynamicPressureEngine.getCladdingZoneDimensionA(bldg);
      expect(a).toBe(2.5);
    });

    it('enforces minimum 0.9m for small structures', () => {
      const small: BuildingDimensions = {
        length_m: 6,
        width_m: 4,
        meanRoofHeight_m: 3,
      };
      // 0.1B = 0.4 < 0.9 -> should clamp to 0.9m
      const a = AerodynamicPressureEngine.getCladdingZoneDimensionA(small);
      expect(a).toBe(0.9);
    });
  });

  describe('MWFRS Story Wind Distribution & Base Overturning Moment', () => {
    const bldg: BuildingDimensions = {
      length_m: 30,
      width_m: 20,
      meanRoofHeight_m: 12,
    };

    const stories: BuildingStoryLevel[] = [
      { levelId: 'L1', levelName: 'Level 1', elevation_m: 4.0, storyHeight_m: 4.0 },
      { levelId: 'L2', levelName: 'Level 2', elevation_m: 8.0, storyHeight_m: 4.0 },
      { levelId: 'L3', levelName: 'Level 3 (Roof)', elevation_m: 12.0, storyHeight_m: 4.0 },
    ];

    const windOpt: Asce7WindOptions = {
      basicWindSpeed_mps: 45,
      exposureCategory: 'C',
    };

    it('computes positive windward and negative leeward story forces', () => {
      const report = AerodynamicPressureEngine.analyzeMwfrs(bldg, stories, windOpt, 0.85);

      expect(report.stories).toHaveLength(3);
      expect(report.baseShear_kN).toBeGreaterThan(0);
      expect(report.baseOverturningMoment_kNm).toBeGreaterThan(0);

      // Level 1 shear should equal base shear
      expect(report.stories[0]!.storyShear_kN).toBe(report.baseShear_kN);

      // Story shears decrease monotonically towards the roof
      expect(report.stories[0]!.storyShear_kN).toBeGreaterThan(report.stories[1]!.storyShear_kN);
      expect(report.stories[1]!.storyShear_kN).toBeGreaterThan(report.stories[2]!.storyShear_kN);

      // Roof story shear equals roof story force
      expect(report.stories[2]!.storyShear_kN).toBe(report.stories[2]!.storyForce_kN);
    });

    it('computes C&C suction pressures showing higher suction at corners than interior', () => {
      const report = AerodynamicPressureEngine.analyzeMwfrs(bldg, stories, windOpt, 0.85);

      const zone4 = report.claddingZones.find(z => z.zone === 'ZONE_4_INTERIOR_WALL')!;
      const zone5 = report.claddingZones.find(z => z.zone === 'ZONE_5_END_CORNER_WALL')!;
      const roofCorner = report.claddingZones.find(z => z.zone === 'ZONE_3_ROOF_CORNER')!;

      // Corner suction magnitude should be greater than interior wall suction
      expect(Math.abs(zone5.suctionPressure_N_m2)).toBeGreaterThan(
        Math.abs(zone4.suctionPressure_N_m2)
      );

      // Roof corner suction is the most severe
      expect(Math.abs(roofCorner.suctionPressure_N_m2)).toBeGreaterThan(
        Math.abs(zone5.suctionPressure_N_m2)
      );
    });
  });
});
