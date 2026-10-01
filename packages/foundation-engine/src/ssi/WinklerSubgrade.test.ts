/**
 * WinklerSubgrade.test.ts
 *
 * Unit tests for Mat Foundations & Winkler Subgrade Soil-Structure Interaction (SSI):
 * - Subgrade reaction modulus ks (Bowles, Vesic, Terzaghi)
 * - Mat area discretization and vertical spring assembly
 * - Non-linear tension cut-off spring iteration
 * - Global vertical equilibrium and settlement contours
 */

import { describe, it, expect } from 'vitest';
import {
  WinklerSubgradeEngine,
  MatGeometry,
  MatColumnLoad,
} from './WinklerSubgradeEngine';

describe('Mat Foundations & Winkler Subgrade SSI Engine', () => {
  const engine = new WinklerSubgradeEngine();

  const standardMat: MatGeometry = {
    width_m: 10.0, // 10m x 10m
    length_m: 10.0,
    thickness_m: 0.80,
    concreteE_GPa: 32.0,
  };

  it('computes modulus of subgrade reaction across Bowles, Vesic, and Terzaghi methods', () => {
    // Bowles: ks = 40 * FS * q_all = 40 * 3.0 * 250 = 30,000 kN/m3
    const ksBowles = engine.computeModulusSubgradeReaction(standardMat, {
      method: 'BOWLES',
      allowableBearingPressure_kPa: 250,
      factorOfSafety: 3.0,
    });
    expect(ksBowles).toBe(30000);

    // Vesic: based on soil Es and mat flexural rigidity
    const ksVesic = engine.computeModulusSubgradeReaction(standardMat, {
      method: 'VESIC',
      soilEs_MPa: 40,
      soilPoissonRatio: 0.3,
    });
    expect(ksVesic).toBeGreaterThan(1000);
    expect(ksVesic).toBeLessThan(100000);

    // Terzaghi sand scaling from 300mm plate test
    const ksSand = engine.computeModulusSubgradeReaction(standardMat, {
      method: 'TERZAGHI_SAND',
      plateKs1_kN_m3: 50000,
    });
    expect(ksSand).toBeGreaterThan(0);
    expect(ksSand).toBeLessThan(50000);
  });

  it('evaluates uniform pressure distribution under symmetric 4-column loading', () => {
    // 4 columns at (+/- 3m, +/- 3m) with equal load 1500 kN each
    const cols: MatColumnLoad[] = [
      { id: 'C1', x_m: -3.0, y_m: -3.0, P_kN: 1500 },
      { id: 'C2', x_m: 3.0, y_m: -3.0, P_kN: 1500 },
      { id: 'C3', x_m: 3.0, y_m: 3.0, P_kN: 1500 },
      { id: 'C4', x_m: -3.0, y_m: 3.0, P_kN: 1500 },
    ];

    const result = engine.analyzeMatFoundation(standardMat, cols, {
      method: 'BOWLES',
      allowableBearingPressure_kPa: 200,
      factorOfSafety: 3.0,
      gridDivisionsX: 6,
      gridDivisionsY: 6,
    });

    // Total column P = 6000 kN
    // Mat self weight = 10 * 10 * 0.8 * 24 = 1920 kN
    // Total vertical load = 7920 kN
    expect(result.totalAppliedLoad_kN).toBe(6000);
    expect(result.matSelfWeight_kN).toBe(1920);
    expect(result.totalReaction_kN).toBeCloseTo(7920, 0);

    // Uniform contact without uplift
    expect(result.upliftAreaPercentage).toBe(0);
    expect(result.maxPressure_kPa).toBeCloseTo(result.minPressure_kPa, 0);
    expect(result.differentialSettlement_mm).toBeCloseTo(0, 1);
  });

  it('performs non-linear tension cut-off when excessive overturning produces uplift', () => {
    // Extreme eccentric load applied on the far right edge (x = 4.5m)
    const eccentricCols: MatColumnLoad[] = [
      { id: 'C_EDGE', x_m: 4.5, y_m: 0, P_kN: 8000 },
    ];

    const result = engine.analyzeMatFoundation(standardMat, eccentricCols, {
      method: 'BOWLES',
      allowableBearingPressure_kPa: 250,
      factorOfSafety: 3.0,
      gridDivisionsX: 6,
      gridDivisionsY: 6,
    });

    // Far edge should experience tension cut-off and uplift
    expect(result.upliftAreaPercentage).toBeGreaterThan(0);
    expect(result.minPressure_kPa).toBe(0);
    expect(result.maxPressure_kPa).toBeGreaterThan(result.avgPressure_kPa);

    // Some nodes must have isUplifted = true
    const upliftedNodes = result.nodes.filter(n => n.isUplifted);
    expect(upliftedNodes.length).toBeGreaterThan(0);
    expect(upliftedNodes[0]?.x_m).toBeLessThan(0); // Located on the left side!

    // Total equilibrium maintained on the active compressed nodes
    const totalP = 8000 + 1920; // 9920 kN
    expect(result.totalReaction_kN).toBeCloseTo(totalP, 0);
  });
});
