/**
 * SeismicChecks.test.ts
 *
 * Unit tests for StoryDriftAuditor, P-Delta Stability checks,
 * and TorsionalIrregularityAuditor.
 */

import { describe, it, expect } from 'vitest';
import {
  StoryDriftAuditor,
  StoryDefinition,
  StoryDisplacement,
  DriftCheckConfig,
} from './StoryDriftAuditor';
import {
  TorsionalIrregularityAuditor,
  DiaphragmStoryDisplacement,
} from './TorsionalIrregularityAuditor';

describe('Seismic Story Drift & Torsional Irregularity Engine', () => {
  describe('StoryDriftAuditor', () => {
    const sampleStories: StoryDefinition[] = [
      {
        storyId: 'story-1',
        storyName: 'Story 1',
        elevation_m: 3.5,
        storyHeight_m: 3.5,
        totalVerticalLoad_kN: 5000,
        storyShear_kN: 600,
      },
      {
        storyId: 'story-2',
        storyName: 'Story 2',
        elevation_m: 7.0,
        storyHeight_m: 3.5,
        totalVerticalLoad_kN: 3500,
        storyShear_kN: 480,
      },
      {
        storyId: 'story-3',
        storyName: 'Story 3 (Roof)',
        elevation_m: 10.5,
        storyHeight_m: 3.5,
        totalVerticalLoad_kN: 1800,
        storyShear_kN: 250,
      },
    ];

    it('evaluates ASCE 7-22 elastic-to-design amplification and drift limits correctly', () => {
      // Elastic displacements in mm: [6.0, 14.0, 20.0]
      const displacements: StoryDisplacement[] = [
        { storyId: 'story-1', elasticDisplacement_mm: 6.0 },
        { storyId: 'story-2', elasticDisplacement_mm: 14.0 },
        { storyId: 'story-3', elasticDisplacement_mm: 20.0 },
      ];

      const config: DriftCheckConfig = {
        standard: 'ASCE_7_22',
        riskCategory: 'II',
        Cd: 4.5,
        Ie: 1.0,
      };

      const report = StoryDriftAuditor.audit(sampleStories, displacements, config);

      expect(report.standard).toBe('ASCE_7_22');
      expect(report.stories).toHaveLength(3);

      // Story 1:
      // delta_xe = 6.0, delta_x = 4.5 * 6.0 / 1.0 = 27.0 mm
      // design drift = 27.0 mm, drift ratio = 27.0 / 3500 = 0.00771
      // Allowable for Risk Cat II = 0.020 (70 mm)
      const s1 = report.stories[0];
      expect(s1.elasticDrift_mm).toBe(6.0);
      expect(s1.designDrift_mm).toBe(27.0);
      expect(s1.driftRatio).toBeCloseTo(0.00771, 4);
      expect(s1.allowableDrift_mm).toBe(70.0);
      expect(s1.isCompliant).toBe(true);

      // Story 2:
      // delta_xe = 14.0, prev = 6.0 -> delta_drift_e = 8.0 mm
      // design drift = 4.5 * 8.0 = 36.0 mm -> ratio = 36 / 3500 = 0.01029
      const s2 = report.stories[1];
      expect(s2.elasticDrift_mm).toBe(8.0);
      expect(s2.designDrift_mm).toBe(36.0);
      expect(s2.driftRatio).toBeCloseTo(0.01029, 4);
      expect(s2.isCompliant).toBe(true);

      expect(report.allCompliant).toBe(true);
      expect(report.maxDemandCapacityRatio).toBeLessThan(1.0);
    });

    it('correctly flags drift failure when displacement exceeds codified threshold', () => {
      // Very flexible structure
      const largeDisplacements: StoryDisplacement[] = [
        { storyId: 'story-1', elasticDisplacement_mm: 20.0 }, // Cd=5.0 -> 100mm > 70mm limit!
        { storyId: 'story-2', elasticDisplacement_mm: 35.0 },
        { storyId: 'story-3', elasticDisplacement_mm: 45.0 },
      ];

      const config: DriftCheckConfig = {
        standard: 'ASCE_7_22',
        riskCategory: 'II',
        Cd: 5.0,
      };

      const report = StoryDriftAuditor.audit(sampleStories, largeDisplacements, config);
      expect(report.allCompliant).toBe(false);
      expect(report.stories[0].isCompliant).toBe(false);
      expect(report.stories[0].demandCapacityRatio).toBeGreaterThan(1.0);
      expect(report.summary).toContain('FAIL');
    });

    it('evaluates IS 1893:2016 0.004 drift limit', () => {
      const displacements: StoryDisplacement[] = [
        { storyId: 'story-1', elasticDisplacement_mm: 10.0 }, // 10/3500 = 0.00286 < 0.004 -> PASS
        { storyId: 'story-2', elasticDisplacement_mm: 26.0 }, // drift = 16/3500 = 0.00457 > 0.004 -> FAIL
        { storyId: 'story-3', elasticDisplacement_mm: 32.0 },
      ];

      const report = StoryDriftAuditor.audit(sampleStories, displacements, {
        standard: 'IS_1893_2016',
      });

      expect(report.stories[0].isCompliant).toBe(true);
      expect(report.stories[1].isCompliant).toBe(false);
      expect(report.allCompliant).toBe(false);
    });

    it('computes ASCE 7 P-Delta stability coefficient and flags amplification status', () => {
      // Px = 5000 kN, Vx = 600 kN, hsx = 3500 mm, Cd = 5.0, Ie = 1.0, beta = 1.0
      // theta = (Px * Delta * Ie) / (Vx * hsx * Cd)
      // If Delta = 60 mm:
      // theta = (5000 * 60 * 1.0) / (600 * 3500 * 5.0) = 300,000 / 10,500,000 = 0.0286 (<= 0.1 -> NEGLIGIBLE)
      const displacements: StoryDisplacement[] = [
        { storyId: 'story-1', elasticDisplacement_mm: 12.0 }, // design drift = 12 * 5 = 60mm
      ];
      const report = StoryDriftAuditor.audit([sampleStories[0]], displacements, {
        standard: 'ASCE_7_22',
        Cd: 5.0,
      });

      expect(report.stories[0].pDeltaCoefficient).toBeCloseTo(0.0286, 3);
      expect(report.stories[0].pDeltaStatus).toBe('NEGLIGIBLE');
      expect(report.stories[0].pDeltaAmplificationFactor).toBe(1.0);
    });
  });

  describe('TorsionalIrregularityAuditor', () => {
    it('classifies torsionally regular diaphragms (ratio <= 1.20)', () => {
      const diaphragms: DiaphragmStoryDisplacement[] = [
        {
          storyId: 'story-1',
          storyName: 'Level 1',
          edge1Displacement_mm: 15.0,
          edge2Displacement_mm: 16.5,
          storyDimensionPerpendicular_m: 24.0,
        },
      ];

      const report = TorsionalIrregularityAuditor.audit(diaphragms, 'D');

      // delta_max = 16.5, delta_min = 15.0, avg = 15.75
      // ratio = 16.5 / 15.75 = 1.048 <= 1.20
      expect(report.governingRatio).toBeCloseTo(1.048, 2);
      expect(report.governingIrregularityType).toBe('NONE');
      expect(report.maxAmplificationAx).toBe(1.0);
      expect(report.hasType1a).toBe(false);
      expect(report.hasType1b).toBe(false);
      expect(report.permittedInSDC_E_F).toBe(true);
    });

    it('identifies Type 1a Torsional Irregularity and computes Ax amplification', () => {
      const diaphragms: DiaphragmStoryDisplacement[] = [
        {
          storyId: 'story-2',
          storyName: 'Level 2',
          edge1Displacement_mm: 20.0,
          edge2Displacement_mm: 10.0, // delta_max = 20, avg = 15 -> ratio = 1.333 (between 1.2 and 1.4)
          storyDimensionPerpendicular_m: 30.0,
        },
      ];

      const report = TorsionalIrregularityAuditor.audit(diaphragms, 'D');

      expect(report.governingRatio).toBeCloseTo(1.333, 2);
      expect(report.governingIrregularityType).toBe('TYPE_1A_TORSIONAL');
      expect(report.hasType1a).toBe(true);
      expect(report.hasType1b).toBe(false);

      // Ax = (delta_max / (1.2 * delta_avg))^2 = (20 / (1.2 * 15))^2 = (20 / 18)^2 = (1.1111)^2 = 1.235
      expect(report.maxAmplificationAx).toBeCloseTo(1.235, 2);
      expect(report.stories[0].accidentalEccentricityDesign_m).toBeCloseTo(0.05 * 30.0 * 1.235, 2);
    });

    it('identifies Type 1b Extreme Torsional Irregularity and enforces SDC E/F prohibition', () => {
      const diaphragms: DiaphragmStoryDisplacement[] = [
        {
          storyId: 'story-3',
          storyName: 'Level 3',
          edge1Displacement_mm: 35.0,
          edge2Displacement_mm: 11.0, // delta_max = 35, delta_min = 11, avg = 23 -> ratio = 35 / 23 = 1.522 > 1.40
          storyDimensionPerpendicular_m: 20.0,
        },
      ];

      const report = TorsionalIrregularityAuditor.audit(diaphragms, 'E');

      expect(report.governingRatio).toBeCloseTo(1.522, 2);
      expect(report.governingIrregularityType).toBe('TYPE_1B_EXTREME_TORSIONAL');
      expect(report.hasType1b).toBe(true);
      expect(report.permittedInSDC_E_F).toBe(false);
      expect(report.stories[0].isPermittedInSDC('E')).toBe(false);
      expect(report.stories[0].isPermittedInSDC('D')).toBe(true);

      // Ax = (35 / (1.2 * 23))^2 = (35 / 27.6)^2 = (1.268)^2 = 1.608
      expect(report.maxAmplificationAx).toBeCloseTo(1.608, 2);
      expect(report.summary).toContain('TYPE 1B EXTREME TORSIONAL IRREGULARITY');
    });

    it('caps Ax amplification factor at 3.0 maximum per ASCE 7-22 Section 12.8.4.3', () => {
      // Extreme eccentricity leading to huge ratio
      const ax = TorsionalIrregularityAuditor.calculateAx(100.0, 40.0);
      // (100 / (1.2 * 40))^2 = (100 / 48)^2 = 2.083^2 = 4.34 -> capped at 3.0
      expect(ax).toBe(3.0);
    });
  });
});
