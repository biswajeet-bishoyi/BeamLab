/**
 * SoilBearing.test.ts
 *
 * Unit tests for Geotechnical Soil Stratigraphy, Bearing Capacity, and Settlement:
 * - Hydrostatic pore pressure and effective stress profile
 * - Bearing capacity factors (Meyerhof, Vesic, Hansen)
 * - Shape & depth correction factors
 * - Immediate elastic and consolidation settlements
 */

import { describe, it, expect } from 'vitest';
import { SoilStratigraphy, SoilStratigraphyProfile } from './SoilStratigraphy';
import { BearingCapacityEngine, FootingGeometry } from '../bearing/BearingCapacityEngine';

describe('Geotechnical Soil Domain & Bearing Capacity Core', () => {
  const sampleProfile: SoilStratigraphyProfile = {
    name: 'Standard Borehole BH-01',
    waterTableDepth_m: 2.0,
    layers: [
      {
        id: 'L1',
        name: 'Medium Dense Silty Sand',
        depthTop_m: 0,
        depthBottom_m: 2.0,
        dryUnitWeight_kN_m3: 18.0,
        saturatedUnitWeight_kN_m3: 19.5,
        cohesion_kPa: 5.0,
        frictionAngle_deg: 30.0,
        elasticModulus_MPa: 30.0,
        poissonRatio: 0.30,
        soilType: 'SAND',
      },
      {
        id: 'L2',
        name: 'Stiff Silty Clay',
        depthTop_m: 2.0,
        depthBottom_m: 6.0,
        dryUnitWeight_kN_m3: 17.0,
        saturatedUnitWeight_kN_m3: 19.0,
        cohesion_kPa: 45.0,
        frictionAngle_deg: 18.0,
        elasticModulus_MPa: 20.0,
        poissonRatio: 0.35,
        voidRatio: 0.75,
        compressionIndex: 0.22,
        soilType: 'CLAY',
      },
      {
        id: 'L3',
        name: 'Dense Sand & Gravel',
        depthTop_m: 6.0,
        depthBottom_m: 12.0,
        dryUnitWeight_kN_m3: 19.0,
        saturatedUnitWeight_kN_m3: 21.0,
        cohesion_kPa: 0,
        frictionAngle_deg: 36.0,
        elasticModulus_MPa: 60.0,
        poissonRatio: 0.28,
        soilType: 'GRAVEL',
      },
    ],
  };

  describe('SoilStratigraphy', () => {
    const stratigraphy = new SoilStratigraphy(sampleProfile);

    it('computes pore water pressure and effective vertical stress above and below water table', () => {
      // At depth 1.0 m (above water table at 2.0 m)
      expect(stratigraphy.getPoreWaterPressure(1.0)).toBe(0);
      expect(stratigraphy.getTotalVerticalStress(1.0)).toBeCloseTo(18.0, 1);
      expect(stratigraphy.getEffectiveVerticalStress(1.0)).toBeCloseTo(18.0, 1);

      // At depth 2.0 m (at water table interface)
      expect(stratigraphy.getPoreWaterPressure(2.0)).toBe(0);
      expect(stratigraphy.getTotalVerticalStress(2.0)).toBeCloseTo(36.0, 1);
      expect(stratigraphy.getEffectiveVerticalStress(2.0)).toBeCloseTo(36.0, 1);

      // At depth 4.0 m (2.0 m below water table)
      // u = 2.0 * 9.81 = 19.62 kPa
      expect(stratigraphy.getPoreWaterPressure(4.0)).toBeCloseTo(19.62, 2);
      // Total stress = 2m * 18.0 + 2m * 19.0 = 36.0 + 38.0 = 74.0 kPa
      expect(stratigraphy.getTotalVerticalStress(4.0)).toBeCloseTo(74.0, 1);
      // Effective stress = 74.0 - 19.62 = 54.38 kPa
      expect(stratigraphy.getEffectiveVerticalStress(4.0)).toBeCloseTo(54.38, 1);
    });

    it('computes depth-weighted average soil parameters within footing influence depth', () => {
      // Zone from 1.0m to 3.0m (straddling Layer 1 and Layer 2)
      const props = stratigraphy.getWeightedParameters(1.0, 3.0);
      // 1.0m in L1 (c=5, phi=30), 1.0m in L2 (c=45, phi=18)
      expect(props.cohesion_kPa).toBeCloseTo(25.0, 1);
      expect(props.frictionAngle_deg).toBeCloseTo(24.0, 1);
      expect(props.elasticModulus_MPa).toBeCloseTo(25.0, 1);
    });
  });

  describe('BearingCapacityEngine', () => {
    const engine = new BearingCapacityEngine();
    const stratigraphy = new SoilStratigraphy(sampleProfile);

    it('evaluates theoretical bearing capacity factors Nc, Nq, Ngamma', () => {
      // Pure cohesive clay (phi = 0)
      const phi0 = engine.computeFactors(0);
      expect(phi0.Nc).toBeCloseTo(5.14, 2);
      expect(phi0.Nq).toBeCloseTo(1.0, 2);
      expect(phi0.Ngamma).toBeCloseTo(0.0, 2);

      // Typical sand (phi = 30 deg)
      const phi30 = engine.computeFactors(30, 'VESIC');
      expect(phi30.Nq).toBeCloseTo(18.4, 0.5);
      expect(phi30.Nc).toBeCloseTo(30.14, 0.5);
      expect(phi30.Ngamma).toBeCloseTo(22.4, 1.0);
    });

    it('evaluates ultimate bearing capacity and allowable bearing pressure for shallow pad footing', () => {
      const footing: FootingGeometry = {
        width_m: 2.0,
        length_m: 2.5,
        embedmentDepth_m: 1.5,
      };

      const result = engine.evaluateBearingCapacity(stratigraphy, footing, {
        factorOfSafety: 3.0,
        appliedLoad_kN: 800,
      });

      expect(result.ultimateBearingCapacity_kPa).toBeGreaterThan(300);
      expect(result.allowableBearingPressure_kPa).toBeGreaterThan(100);
      expect(result.allowableBearingPressure_kPa).toBeLessThan(result.ultimateBearingCapacity_kPa);
      expect(result.effectiveOverburden_kPa).toBeCloseTo(27.0, 1); // 1.5m * 18 kN/m3
      expect(result.factors.sc).toBeGreaterThan(1.0);
      expect(result.factors.sq).toBeGreaterThan(1.0);
      expect(result.immediateSettlement_mm).toBeGreaterThan(0);
      expect(result.immediateSettlement_mm).toBeLessThan(50);
      expect(result.totalSettlement_mm).toBeGreaterThanOrEqual(result.immediateSettlement_mm);
    });
  });
});
