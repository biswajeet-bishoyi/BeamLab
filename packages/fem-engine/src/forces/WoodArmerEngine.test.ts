import { describe, it, expect } from 'vitest';
import { WoodArmerEngine } from './WoodArmerEngine';

describe('Sprint B19.3 — Wood-Armer Reinforcement Moments & Transverse Shear', () => {
  it('computes standard Wood-Armer bottom sagging design moments', () => {
    // Mxx = 45 kNm/m, Myy = 30 kNm/m, Mxy = 15 kNm/m
    const res = WoodArmerEngine.calculateWoodArmerMoments({
      mxx: 45,
      myy: 30,
      mxy: 15,
    });

    // Mxd_bottom = 45 + 15 = 60 kNm/m
    expect(res.mxdBottom).toBeCloseTo(60, 2);
    // Myd_bottom = 30 + 15 = 45 kNm/m
    expect(res.mydBottom).toBeCloseTo(45, 2);
    expect(res.governingCaseBottom).toBe('standard');
  });

  it('correctly shifts design moment when Mxd < 0 (x-adjusted case)', () => {
    // Mxx = -10 kNm/m (hogging), Myy = 50 kNm/m (sagging), Mxy = 8 kNm/m
    // Initial candidate: Mxd = -10 + 8 = -2 < 0 -> Triggers x-adjusted
    const res = WoodArmerEngine.calculateWoodArmerMoments({
      mxx: -10,
      myy: 50,
      mxy: 8,
    });

    // Mxd_bottom should be 0
    expect(res.mxdBottom).toBe(0);
    // Myd_bottom = Myy + Mxy^2 / |Mxx| = 50 + 64 / 10 = 56.4 kNm/m
    expect(res.mydBottom).toBeCloseTo(56.4, 2);
    expect(res.governingCaseBottom).toBe('x-adjusted');
  });

  it('evaluates pure twisting moment field with symmetrical orthogonal rebar demand', () => {
    // Pure torsion / twisting in slab corner: Mxx = 0, Myy = 0, Mxy = 25 kNm/m
    const res = WoodArmerEngine.calculateWoodArmerMoments({
      mxx: 0,
      myy: 0,
      mxy: 25,
    });

    // Bottom face demands 25 kNm/m in both X and Y directions
    expect(res.mxdBottom).toBeCloseTo(25, 2);
    expect(res.mydBottom).toBeCloseTo(25, 2);

    // Top face demands -25 kNm/m in both X and Y directions
    expect(res.mxdTop).toBeCloseTo(-25, 2);
    expect(res.mydTop).toBeCloseTo(-25, 2);
  });

  it('computes transverse out-of-plane shear and capacity', () => {
    const vx = 40; // 40 kN/m
    const vy = 30; // 30 kN/m
    const slabThickness = 0.25; // 250 mm slab

    const shear = WoodArmerEngine.calculateTransverseShear(vx, vy, slabThickness, 35);

    // Resultant shear = sqrt(40^2 + 30^2) = 50 kN/m
    expect(shear.vResultant).toBeCloseTo(50, 2);
    // d = 0.9 * 0.25 = 0.225 m
    // tau = 50,000 N / (1.0m * 0.225m) = 0.222 MPa
    expect(shear.shearStressMPa).toBeCloseTo(50 / (0.9 * 0.25 * 1000), 3);
    expect(shear.shearCapacityVcMPa).toBeGreaterThan(0.4);
    expect(shear.shearReinforcementRequired).toBe(false);
  });
});
