import { describe, it, expect } from 'vitest';
import { GirderDistributionEngine } from './GirderDistributionEngine.js';
import { BridgeDynamicForcesEngine } from '../dynamic/BridgeDynamicForcesEngine.js';

describe('GirderDistributionEngine & BridgeDynamicForcesEngine', () => {
  describe('AASHTO LRFD Girder Distribution Factors (LLDF)', () => {
    const bridgeProps = {
      spanLengthM: 25.0,
      girderSpacingM: 2.4,
      slabThicknessMm: 200.0,
      numberOfGirders: 5,
      girderAreaM2: 0.52,
      girderMomentOfInertiaM4: 0.125,
      girderDepthMm: 1600.0,
      deckConcreteFcMpa: 30.0,
      girderModulusGpa: 35.0, // Prestressed concrete or steel
      overhangWidthM: 1.0,
      skewAngleDeg: 0,
    };

    it('should compute valid interior girder moment and shear distribution factors', () => {
      const result = GirderDistributionEngine.calculateDistributionFactors(bridgeProps);

      expect(result.spanLengthM).toBe(25.0);
      expect(result.girderSpacingM).toBe(2.4);
      expect(result.longitudinalStiffnessKgM4).toBeGreaterThan(0.1);

      // Interior moment factors should be in typical range (0.4 to 0.7)
      expect(result.momentInteriorOneLane).toBeGreaterThan(0.35);
      expect(result.momentInteriorOneLane).toBeLessThan(0.70);
      expect(result.momentInteriorMultiLane).toBeGreaterThan(0.40);
      expect(result.momentInteriorMultiLane).toBeLessThan(0.80);
      expect(result.governingMomentInterior).toBeGreaterThanOrEqual(result.momentInteriorOneLane);

      // Interior shear factors
      expect(result.shearInteriorOneLane).toBeGreaterThan(0.5);
      expect(result.shearInteriorMultiLane).toBeGreaterThan(0.6);
      expect(result.governingShearInterior).toBeGreaterThan(0.6);

      // Without skew, correction factors should be 1.0
      expect(result.skewCorrectionFactorMoment).toBe(1.0);
      expect(result.skewCorrectionFactorShear).toBe(1.0);
    });

    it('should apply skew angle correction: reduce moment and amplify shear', () => {
      const skewedBridge = {
        ...bridgeProps,
        skewAngleDeg: 35.0, // 35 degrees skew
      };

      const result = GirderDistributionEngine.calculateDistributionFactors(skewedBridge);

      expect(result.skewAngleDeg).toBe(35.0);
      // Moment skew factor should reduce live load moment (C_skew < 1.0)
      expect(result.skewCorrectionFactorMoment).toBeLessThan(1.0);
      expect(result.skewCorrectionFactorMoment).toBeGreaterThanOrEqual(0.80);

      // Shear skew factor should amplify obtuse corner shear (C_skew > 1.0)
      expect(result.skewCorrectionFactorShear).toBeGreaterThan(1.0);
      expect(result.skewCorrectionFactorShear).toBeLessThanOrEqual(1.35);

      // Final design factors
      expect(result.designMomentFactorInterior).toBeLessThan(result.governingMomentInterior);
      expect(result.designShearFactorInterior).toBeGreaterThan(result.governingShearInterior);
    });
  });

  describe('BridgeDynamicForcesEngine', () => {
    it('should determine dynamic load allowances across AASHTO, Eurocode, and IRC', () => {
      const dynamics = BridgeDynamicForcesEngine.calculateDynamicImpact({
        spanLengthM: 25.0,
        bridgeMaterial: 'concrete',
        limitState: 'strength',
      });

      // AASHTO 33% IM for strength
      expect(dynamics.aashtoIM).toBe(0.33);

      // Eurocode Phi_2 for 25m span: 1.44 / sqrt(24.8) + 0.82 approx 1.11
      expect(dynamics.eurocodePhi).toBeGreaterThan(1.0);
      expect(dynamics.eurocodePhi).toBeLessThan(1.3);

      // IRC 6 impact: 4.5 / (6 + 25) = 4.5 / 31 = 0.145
      expect(dynamics.ircImpact).toBeCloseTo(0.145, 2);

      // Check fatigue limit state
      const fatigueDynamics = BridgeDynamicForcesEngine.calculateDynamicImpact({
        spanLengthM: 25.0,
        limitState: 'fatigue',
      });
      expect(fatigueDynamics.aashtoIM).toBe(0.15);
    });

    it('should compute centrifugal lateral force and overturning moment on curved bridges', () => {
      const result = BridgeDynamicForcesEngine.calculateCentrifugalForce({
        truckWeightKn: 319.0, // HL-93 truck
        designSpeedKph: 80.0, // 80 km/h
        curveRadiusM: 400.0,  // 400 m radius
        girderDepthMm: 1600.0,
        deckHeightAboveBearingMm: 250.0,
        numberOfLoadedLanes: 2,
      });

      expect(result.forceKn).toBeGreaterThan(0);
      expect(result.lateralAccelerationG).toBeGreaterThan(0.05); // a_c / g approx (22.22)^2 / (9.81 * 400) = 0.126 g
      expect(result.overturningMomentKNm).toBeGreaterThan(result.forceKn * 3.0); // arm > 3.65 m
      expect(result.multiPresenceFactor).toBe(1.00); // 2 lanes = 1.00
    });

    it('should compute AASHTO braking longitudinal force', () => {
      const result = BridgeDynamicForcesEngine.calculateBrakingForce({
        truckWeightKn: 319.0,
        laneLengthM: 25.0,
        laneLoadKnPerM: 9.3,
        numberOfLoadedLanes: 1,
      });

      // Criteria 1: 0.25 * 319 = 79.75 kN
      // Criteria 2: 0.05 * (319 + 9.3 * 25) = 0.05 * (319 + 232.5) = 0.05 * 551.5 = 27.57 kN
      // Governing with m = 1.20: 79.75 * 1.20 = 95.7 kN
      expect(result.forceKn).toBeCloseTo(95.7, 1);
      expect(result.governingCriteria).toContain('25% Design Truck');
      expect(result.momentAtBearingKNm).toBeGreaterThan(result.forceKn * 2.0);
    });
  });
});
