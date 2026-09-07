/**
 * IsolatedFooting.test.ts
 *
 * Unit tests for Shallow Spread & Eccentric Isolated Pad Footing Design Engine:
 * - Concentric and eccentric soil pressure distribution
 * - Kern limit verification and partial uplift mechanics
 * - One-way (beam) shear checks at distance d
 * - Two-way (punching) shear checks at d/2 perimeter
 * - Flexural reinforcement sizing and detailing checks across ACI 318, EC2, and IS 456
 */

import { describe, it, expect } from 'vitest';
import {
  IsolatedFootingEngine,
  PadFootingDimensions,
  ColumnStubDimensions,
  FootingMaterialProperties,
  FootingAppliedLoads,
} from './IsolatedFootingEngine';

describe('Spread & Eccentric Isolated Pad Footing Design Engine', () => {
  const engine = new IsolatedFootingEngine();

  const standardDimensions: PadFootingDimensions = {
    width_m: 2.4, // B
    length_m: 2.4, // L
    thickness_m: 0.60, // H
    cover_m: 0.075,
  };

  const standardColumn: ColumnStubDimensions = {
    width_m: 0.45,
    length_m: 0.45,
  };

  const standardMaterials: FootingMaterialProperties = {
    fc_MPa: 30.0, // C30 / 4350 psi
    fy_MPa: 420.0, // Grade 60
    concreteDensity_kN_m3: 24.0,
  };

  it('calculates uniform soil pressure under concentric axial load', () => {
    const concentricLoads: FootingAppliedLoads = {
      P_kN: 1200.0,
      Mx_kNm: 0,
      My_kNm: 0,
    };

    const result = engine.designFooting(
      standardDimensions,
      standardColumn,
      standardMaterials,
      concentricLoads,
      'ACI_318_19'
    );

    // Self weight = 2.4 * 2.4 * 0.60 * 24 = 82.944 kN
    expect(result.selfWeight_kN).toBeCloseTo(82.9, 1);
    // Total P = 1200 + 82.9 = 1282.9 kN
    // q = 1282.9 / (2.4 * 2.4) = 222.7 kPa
    expect(result.soilPressures.qMax_kPa).toBeCloseTo(222.7, 1);
    expect(result.soilPressures.qMin_kPa).toBeCloseTo(222.7, 1);
    expect(result.soilPressures.isFullContact).toBe(true);
    expect(result.soilPressures.eccentricityX_m).toBe(0);
    expect(result.soilPressures.eccentricityY_m).toBe(0);
  });

  it('calculates trapezoidal pressure distribution within the kern boundary', () => {
    // Kern limit for B = 2.4m is B/6 = 0.40m
    // Total P ~ 1283 kN, My = 250 kNm -> ex = 250 / 1283 = 0.195m < 0.40m
    const kernLoads: FootingAppliedLoads = {
      P_kN: 1200.0,
      Mx_kNm: 0,
      My_kNm: 250.0,
    };

    const result = engine.designFooting(
      standardDimensions,
      standardColumn,
      standardMaterials,
      kernLoads,
      'ACI_318_19'
    );

    expect(result.soilPressures.isFullContact).toBe(true);
    expect(result.soilPressures.qMax_kPa).toBeGreaterThan(result.soilPressures.qAvg_kPa);
    expect(result.soilPressures.qMin_kPa).toBeGreaterThan(0);
    expect(result.soilPressures.eccentricityX_m).toBeCloseTo(0.195, 2);
    expect(result.soilPressures.upliftAreaRatio).toBe(0);
  });

  it('handles large eccentricities with partial base uplift beyond the kern', () => {
    // Large moment causing ex > B/6 (ex > 0.40m)
    const largeMomentLoads: FootingAppliedLoads = {
      P_kN: 800.0,
      Mx_kNm: 0,
      My_kNm: 400.0, // ex = 400 / (800 + 83) = 0.453m > 0.40m
    };

    const result = engine.designFooting(
      standardDimensions,
      standardColumn,
      standardMaterials,
      largeMomentLoads,
      'ACI_318_19'
    );

    expect(result.soilPressures.isFullContact).toBe(false);
    expect(result.soilPressures.qMin_kPa).toBe(0);
    expect(result.soilPressures.upliftAreaRatio).toBeGreaterThan(0);
    expect(result.soilPressures.qMax_kPa).toBeGreaterThan(result.soilPressures.qAvg_kPa);
  });

  it('verifies one-way beam shear capacity at distance d from column face', () => {
    const loads: FootingAppliedLoads = {
      P_kN: 1500.0,
      Mx_kNm: 0,
      My_kNm: 0,
    };

    const result = engine.designFooting(
      standardDimensions,
      standardColumn,
      standardMaterials,
      loads,
      'ACI_318_19'
    );

    // Effective depth d = 0.60 - 0.075 - 0.008 = 0.517m
    expect(result.effectiveDepth_m).toBeCloseTo(0.517, 3);
    // Overhang = (2.4 - 0.45)/2 = 0.975m
    // Shear span = 0.975 - 0.517 = 0.458m
    expect(result.oneWayShearX.criticalSectionDistance_m).toBeCloseTo(0.517, 3);
    expect(result.oneWayShearX.Vu_kN).toBeGreaterThan(0);
    expect(result.oneWayShearX.phiVc_kN).toBeGreaterThan(result.oneWayShearX.Vu_kN);
    expect(result.oneWayShearX.status).toBe('PASS');
  });

  it('verifies two-way punching shear on d/2 perimeter', () => {
    const loads: FootingAppliedLoads = {
      P_kN: 1600.0,
      Mx_kNm: 0,
      My_kNm: 0,
    };

    const result = engine.designFooting(
      standardDimensions,
      standardColumn,
      standardMaterials,
      loads,
      'ACI_318_19'
    );

    // Column = 0.45m x 0.45m, d = 0.517m -> critX = critY = 0.45 + 0.517 = 0.967m
    // b0 = 4 * 0.967 = 3.868m
    expect(result.twoWayPunching.criticalPerimeter_b0_m).toBeCloseTo(3.868, 2);
    expect(result.twoWayPunching.Vup_kN).toBeLessThan(loads.P_kN); // Soil pressure deduction
    expect(result.twoWayPunching.phiVc_kN).toBeGreaterThan(1500);
    expect(result.twoWayPunching.status).toBe('PASS');
  });

  it('calculates flexural moment and sizes bottom reinforcement mesh', () => {
    const loads: FootingAppliedLoads = {
      P_kN: 1400.0,
      Mx_kNm: 0,
      My_kNm: 0,
    };

    const result = engine.designFooting(
      standardDimensions,
      standardColumn,
      standardMaterials,
      loads,
      'ACI_318_19'
    );

    expect(result.flexureX.Mu_kNm).toBeGreaterThan(100);
    expect(result.flexureX.AsRequired_mm2).toBeGreaterThan(0);
    expect(result.flexureX.AsProvided_mm2).toBeGreaterThanOrEqual(result.flexureX.AsMin_mm2);
    expect(result.flexureX.barCount).toBeGreaterThanOrEqual(4);
    expect(result.flexureX.barSpacing_mm).toBeLessThan(300);
    expect(result.flexureX.status).toBe('PASS');
  });

  it('supports Eurocode 2 and IS 456 design rules', () => {
    const loads: FootingAppliedLoads = {
      P_kN: 1200.0,
      Mx_kNm: 50,
      My_kNm: 50,
    };

    const resEC2 = engine.designFooting(
      standardDimensions,
      standardColumn,
      standardMaterials,
      loads,
      'EUROCODE_2'
    );
    expect(resEC2.codeUsed).toBe('EUROCODE_2');
    expect(resEC2.overallStatus).toBe('PASS');

    const resIS = engine.designFooting(
      standardDimensions,
      standardColumn,
      standardMaterials,
      loads,
      'IS_456'
    );
    expect(resIS.codeUsed).toBe('IS_456');
    expect(resIS.overallStatus).toBe('PASS');
  });
});
