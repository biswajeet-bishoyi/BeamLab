import { describe, it, expect } from 'vitest';
import { GroundMotionProcessor } from './GroundMotionProcessor';
import {
  NewmarkIntegrator,
  SdofSystem,
  MdofShearBuilding,
} from './NewmarkIntegrator';

describe('Direct Integration Dynamic Time-History Analysis Engine', () => {
  const integrator = new NewmarkIntegrator();

  describe('GroundMotionProcessor', () => {
    it('loads historic records and scales to target PGA', () => {
      const elCentro = GroundMotionProcessor.getHistoricRecord('EL_CENTRO_1940');
      expect(elCentro.id).toBe('EL_CENTRO_1940');
      expect(elCentro.peakGroundAcceleration_g).toBe(0.319);
      expect(elCentro.accelerations_g.length).toBeGreaterThan(100);

      // Scale to 0.40g
      const scaled = GroundMotionProcessor.scaleToPGA(elCentro, 0.40);
      expect(scaled.peakGroundAcceleration_g).toBe(0.40);
      expect(Math.max(...scaled.accelerations_g.map(Math.abs))).toBeCloseTo(0.40, 2);
    });

    it('performs baseline drift correction', () => {
      const northridge = GroundMotionProcessor.getHistoricRecord('NORTHRIDGE_1994');
      const corrected = GroundMotionProcessor.baselineCorrect(northridge);
      const mean =
        corrected.accelerations_g.reduce((a, b) => a + b, 0) /
        corrected.accelerations_g.length;
      expect(Math.abs(mean)).toBeLessThan(1e-4);
    });
  });

  describe('NewmarkIntegrator', () => {
    it('integrates SDOF dynamic system under harmonic excitation near resonance', () => {
      // 1-Hz SDOF system: omega_n = 2 * pi = 6.283 rad/s
      // m = 1000 kg, k = m * omega_n^2 = 1000 * (4 * pi^2) = 39478.4 N/m
      const sdof: SdofSystem = {
        mass_kg: 1000,
        stiffness_N_m: 39478.4,
        dampingRatio: 0.05, // 5% viscous damping
      };

      const harmonicRecord = GroundMotionProcessor.generateSyntheticHarmonic(
        1.0, // 1 Hz excitation
        0.10, // 0.1g PGA
        4.0, // 4 seconds
        0.01 // dt = 0.01s
      );

      const result = integrator.solveSdof(sdof, harmonicRecord);

      expect(result.totalSteps).toBe(400);
      expect(result.peakRoofDisplacement_mm).toBeGreaterThan(0);
      expect(result.peakBaseShear_kN).toBeGreaterThan(0);
      // Near resonance with 5% damping, dynamic amplification should exceed 3.0
      expect(result.dynamicAmplificationFactor).toBeGreaterThan(3.0);
    });

    it('solves 3-story MDOF shear building under El Centro 1940 record', () => {
      const building: MdofShearBuilding = {
        storyMasses_kg: [150000, 150000, 120000], // 3 levels: L1, L2, Roof
        storyStiffnesses_N_m: [80000000, 65000000, 50000000], // N/m
        dampingRatio: 0.05,
      };

      const elCentro = GroundMotionProcessor.getHistoricRecord('EL_CENTRO_1940');
      const result = integrator.solveMdof(building, elCentro, 3.5);

      expect(result.totalSteps).toBe(elCentro.accelerations_g.length);
      expect(result.peakRoofDisplacement_mm).toBeGreaterThan(10); // > 10 mm
      expect(result.peakBaseShear_kN).toBeGreaterThan(100);       // > 100 kN
      expect(result.peakStoryDrift_percent).toBeGreaterThan(0);

      // Verify that roof displacement envelope exceeds level 1 displacement
      const maxL1 = Math.max(...result.steps.map(s => Math.abs(s.displacements_mm[0]!)));
      const maxRoof = Math.max(...result.steps.map(s => Math.abs(s.roofDisplacement_mm)));
      expect(maxRoof).toBeGreaterThan(maxL1);
    });
  });
});
