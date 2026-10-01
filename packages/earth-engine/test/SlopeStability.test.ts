import { describe, it, expect } from 'vitest';
import { SlopeStabilityEngine, SlopeProfilePoint } from '../src/slope/SlopeStability';
import { SoilLayer } from '../src/types';

describe('SlopeStabilityEngine', () => {
  // Simple 2:1 slope: toe at (0, 0), crest at (8, 4), crest plateau to (20, 4)
  const profile: SlopeProfilePoint[] = [
    { x: -5, y: 0 },
    { x: 0, y: 0 },
    { x: 8, y: 4 },
    { x: 20, y: 4 },
  ];

  const cPhiSoil: SoilLayer = {
    id: 'slope-soil',
    name: 'Firm Clay/Silt',
    depthTop: 0,
    depthBottom: 15,
    unitWeight: 19,
    frictionAngle: 25,
    cohesion: 15,
  };

  it('interpolates ground profile elevation correctly', () => {
    expect(SlopeStabilityEngine.getGroundElevation(-2, profile)).toBe(0);
    expect(SlopeStabilityEngine.getGroundElevation(4, profile)).toBeCloseTo(2, 2);
    expect(SlopeStabilityEngine.getGroundElevation(8, profile)).toBe(4);
    expect(SlopeStabilityEngine.getGroundElevation(15, profile)).toBe(4);
  });

  it('analyzes single trial slip circle with Bishop and Fellenius methods', () => {
    const trialCircle = { xc: 4, yc: 8, radius: 8 };

    const bishopRes = SlopeStabilityEngine.analyzeSlipCircle({
      circle: trialCircle,
      groundProfile: profile,
      soil: cPhiSoil,
      method: 'bishop',
    });

    const felleniusRes = SlopeStabilityEngine.analyzeSlipCircle({
      circle: trialCircle,
      groundProfile: profile,
      soil: cPhiSoil,
      method: 'fellenius',
    });

    expect(bishopRes.slices.length).toBeGreaterThan(10);
    expect(felleniusRes.slices.length).toBeGreaterThan(10);
    expect(bishopRes.factorOfSafety).toBeGreaterThan(1.0);
    // Bishop's method generally gives equal or slightly higher FS than Fellenius (which is conservative)
    expect(bishopRes.factorOfSafety).toBeGreaterThanOrEqual(felleniusRes.factorOfSafety * 0.95);
  });

  it('runs grid search to find critical slip circle and minimum factor of safety', () => {
    const res = SlopeStabilityEngine.findCriticalSlipCircle({
      groundProfile: profile,
      soil: cPhiSoil,
      method: 'bishop',
      targetFS: 1.3,
      grid: {
        xcMin: 2,
        xcMax: 8,
        ycMin: 5,
        ycMax: 10,
        radiusMin: 5,
        radiusMax: 10,
        steps: 4,
      },
    });

    expect(res.factorOfSafety).toBeGreaterThan(0.5);
    expect(res.criticalCircle.radius).toBeGreaterThan(0);
    expect(res.slices.length).toBeGreaterThan(0);
    expect(typeof res.isSafe).toBe('boolean');
  });
});
