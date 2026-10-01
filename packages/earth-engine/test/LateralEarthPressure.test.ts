import { describe, it, expect } from 'vitest';
import { LateralEarthPressureEngine } from '../src/pressures/LateralEarthPressure';
import { SoilLayer } from '../src/types';

describe('LateralEarthPressureEngine', () => {
  it('calculates standard Rankine coefficients for phi = 30 deg', () => {
    const coeffs = LateralEarthPressureEngine.computeRankineCoefficients(30);
    expect(coeffs.Ka).toBeCloseTo(1 / 3, 3);
    expect(coeffs.Kp).toBeCloseTo(3.0, 3);
    expect(coeffs.Ko).toBeCloseTo(0.5, 3);
  });

  it('calculates sloping backfill Rankine coefficients', () => {
    const beta = 15;
    const phi = 30;
    const coeffs = LateralEarthPressureEngine.computeRankineCoefficients(phi, beta);
    // Ka increases with positive backfill slope angle
    expect(coeffs.Ka).toBeGreaterThan(1 / 3);
    expect(coeffs.Kp).toBeLessThan(3.0);
  });

  it('calculates Coulomb coefficients with wall friction', () => {
    const phi = 30;
    const delta = 20;
    const coeffs = LateralEarthPressureEngine.computeCoulombCoefficients(phi, delta, 0, 90);
    // Wall friction reduces active horizontal pressure compared to smooth Rankine
    expect(coeffs.Ka).toBeLessThan(0.35);
    expect(coeffs.Kp).toBeGreaterThan(3.0);
  });

  it('evaluates tension crack depth in cohesive soil', () => {
    const cohesiveLayer: SoilLayer = {
      id: 'clay-1',
      name: 'Stiff Clay',
      depthTop: 0,
      depthBottom: 6,
      unitWeight: 18,
      frictionAngle: 20,
      cohesion: 25,
    };

    const res = LateralEarthPressureEngine.analyze({
      wall: { height: 6 },
      layers: [cohesiveLayer],
      theory: 'rankine',
    });

    // z_c = 2*c / (gamma * sqrt(Ka))
    const Ka = Math.tan((Math.PI / 4) - (10 * Math.PI) / 180) ** 2;
    const expectedZc = (2 * 25) / (18 * Math.sqrt(Ka));
    expect(res.tensionCrackDepth).toBeCloseTo(expectedZc, 1);
  });

  it('integrates total active force and line of action accurately for granular soil', () => {
    const sand: SoilLayer = {
      id: 'sand-1',
      name: 'Medium Dense Sand',
      depthTop: 0,
      depthBottom: 5,
      unitWeight: 18,
      frictionAngle: 30,
      cohesion: 0,
    };

    const res = LateralEarthPressureEngine.analyze({
      wall: { height: 5 },
      layers: [sand],
      theory: 'rankine',
    });

    // Theoretical Pa = 0.5 * Ka * gamma * H^2 = 0.5 * (1/3) * 18 * 25 = 75 kN/m
    expect(res.totalActiveForce).toBeCloseTo(75, 0);
    // Theoretical arm = H / 3 = 5 / 3 = 1.667 m
    expect(res.activeForceLineOfAction).toBeCloseTo(5 / 3, 1);
  });

  it('correctly includes hydrostatic pore water pressure below water table', () => {
    const soil: SoilLayer = {
      id: 'soil-wt',
      name: 'Sand with WT',
      depthTop: 0,
      depthBottom: 6,
      unitWeight: 19,
      saturatedUnitWeight: 20,
      frictionAngle: 30,
      cohesion: 0,
    };

    const res = LateralEarthPressureEngine.analyze({
      wall: { height: 6 },
      layers: [soil],
      waterTable: { depth: 3 },
      theory: 'rankine',
    });

    expect(res.totalWaterForce).toBeGreaterThan(0);
    // Water acts on bottom 3m: Pw = 0.5 * 9.81 * 3^2 = 44.145 kN/m
    expect(res.totalWaterForce).toBeCloseTo(44.15, 0);
    // Line of action of water = 3 / 3 = 1.0 m from base
    expect(res.waterLineOfAction).toBeCloseTo(1.0, 1);
  });
});
