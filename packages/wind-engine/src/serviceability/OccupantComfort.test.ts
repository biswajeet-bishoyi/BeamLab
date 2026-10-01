/**
 * OccupantComfort.test.ts
 *
 * Unit tests for high-rise occupant comfort acceleration auditor (ISO 10137 / AIJ).
 */

import { describe, it, expect } from 'vitest';
import {
  OccupantComfortAuditor,
  ComfortAuditInput,
} from './OccupantComfortAuditor';

describe('OccupantComfortAuditor', () => {
  describe('Allowable Acceleration Limits (ISO 10137)', () => {
    it('evaluates stricter allowable limits for residential than office', () => {
      const res1yr = OccupantComfortAuditor.getAllowableAcceleration_mg(0.25, 'RESIDENTIAL', '1_YEAR');
      const off1yr = OccupantComfortAuditor.getAllowableAcceleration_mg(0.25, 'OFFICE', '1_YEAR');

      expect(res1yr).toBeLessThan(off1yr);
      expect(res1yr).toBeGreaterThanOrEqual(4.5);
      expect(off1yr).toBeLessThanOrEqual(12.0);
    });

    it('scales allowable limits with storm return period', () => {
      const res1yr = OccupantComfortAuditor.getAllowableAcceleration_mg(0.25, 'RESIDENTIAL', '1_YEAR');
      const res5yr = OccupantComfortAuditor.getAllowableAcceleration_mg(0.25, 'RESIDENTIAL', '5_YEAR');
      const res10yr = OccupantComfortAuditor.getAllowableAcceleration_mg(0.25, 'RESIDENTIAL', '10_YEAR');

      expect(res1yr).toBeLessThan(res5yr);
      expect(res5yr).toBeLessThan(res10yr);
    });
  });

  describe('Full Occupant Comfort Audit', () => {
    it('confirms comfort compliance for stiff mid-rise buildings', () => {
      const stiffInput: ComfortAuditInput = {
        buildingHeight_m: 40,
        crossWindWidth_m: 30,
        alongWindLength_m: 30,
        totalBuildingMass_tonnes: 15000,
        fundamentalFrequencyAlongWind_Hz: 0.9,
        fundamentalFrequencyCrossWind_Hz: 0.9,
        dampingRatio: 0.02,
        occupancyType: 'OFFICE',
        stormReturnPeriod: '1_YEAR',
        meanWindSpeedAtRoof_mps: 18,
        gustFactorG: 0.85,
        resonantFactorR: 0.15,
      };

      const result = OccupantComfortAuditor.audit(stiffInput);
      expect(result.isComfortCompliant).toBe(true);
      expect(result.peakHorizontalAcceleration_mg).toBeLessThan(result.allowableAcceleration_mg);
      expect(result.tmdMitigation.isTmdRecommended).toBe(false);
      expect(result.demandCapacityRatio).toBeLessThan(1.0);
    });

    it('identifies comfort non-compliance in slender towers and sizes Tuned Mass Damper (TMD)', () => {
      // 180m slender residential tower
      const slenderInput: ComfortAuditInput = {
        buildingHeight_m: 180,
        crossWindWidth_m: 28,
        alongWindLength_m: 28,
        totalBuildingMass_tonnes: 32000,
        fundamentalFrequencyAlongWind_Hz: 0.18,
        fundamentalFrequencyCrossWind_Hz: 0.18,
        dampingRatio: 0.012, // light steel/composite damping
        occupancyType: 'RESIDENTIAL',
        stormReturnPeriod: '1_YEAR',
        meanWindSpeedAtRoof_mps: 26,
        gustFactorG: 1.15,
        resonantFactorR: 0.85,
      };

      const result = OccupantComfortAuditor.audit(slenderInput);

      expect(result.peakHorizontalAcceleration_mg).toBeGreaterThan(result.allowableAcceleration_mg);
      expect(result.isComfortCompliant).toBe(false);
      expect(result.demandCapacityRatio).toBeGreaterThan(1.0);

      // TMD Recommendation verification
      const tmd = result.tmdMitigation;
      expect(tmd.isTmdRecommended).toBe(true);
      expect(tmd.requiredSupplementalDamping).toBeGreaterThan(0);
      expect(tmd.recommendedTmdMass_tonnes).toBeGreaterThan(50); // Significant TMD mass
      expect(tmd.optimalTmdFrequency_Hz).toBeLessThan(0.18); // Tuned slightly below structure frequency
      expect(result.recommendations.some(r => r.includes('Tuned Mass Damper'))).toBe(true);
    });
  });
});
