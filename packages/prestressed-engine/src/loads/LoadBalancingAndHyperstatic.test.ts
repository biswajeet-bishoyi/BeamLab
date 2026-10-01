import { describe, it, expect } from 'vitest';
import { TendonProfileEngine } from '../tendon/TendonProfileEngine.js';
import { LoadBalancingEngine } from './LoadBalancingEngine.js';
import { HyperstaticPrestressEngine } from './HyperstaticPrestressEngine.js';

describe('LoadBalancingEngine', () => {
  const geometry = TendonProfileEngine.generateProfile({
    type: 'parabolic',
    spanLengthM: 16,
    yStartMm: 600,
    yMidMm: 100,
    yEndMm: 600,
    concreteCentroidYMm: 450,
  }, 25);

  const Peff = 1200; // kN
  const wDead = 25;  // kN/m

  it('should compute upward balanced load using 8*P*d/L^2 formula accurately', () => {
    // sag = (600+600)/2 - 100 = 500 mm = 0.5 m
    // w_bal = 8 * 1200 * 0.5 / 16^2 = 4800 / 256 = 18.75 kN/m
    const result = LoadBalancingEngine.calculateBalancedLoads({
      geometry,
      averageEffectiveForceKn: Peff,
      deadLoadKnPerM: wDead,
      liveLoadKnPerM: 12,
    });

    expect(result.balancedUniformLoadKnPerM).toBeCloseTo(18.75, 2);
    // Net dead load = 25 - 18.75 = 6.25 kN/m
    expect(result.netLoads.netDeadLoadKnPerM).toBeCloseTo(6.25, 2);
    // Dead load balanced % = 18.75 / 25 * 100 = 75%
    expect(result.netLoads.deadLoadBalancedPercentage).toBeCloseTo(75.0, 1);
    expect(result.engineeringAssessment.classification).toBe('well-balanced');
  });

  it('should compute anchor eccentric moments and axial compression', () => {
    const result = LoadBalancingEngine.calculateBalancedLoads({
      geometry,
      averageEffectiveForceKn: Peff,
      deadLoadKnPerM: wDead,
    });

    // Start anchor eccentricity: 600 - 450 = +150 mm
    // Anchor moment = 1200 * 0.15 = 180 kNm
    expect(result.anchorForces.startEccentricMomentKnm).toBeCloseTo(180, 1);
    expect(result.anchorForces.startAxialCompressionKn).toBeLessThanOrEqual(Peff);
  });
});

describe('HyperstaticPrestressEngine', () => {
  const geometry = TendonProfileEngine.generateProfile({
    type: 'parabolic',
    spanLengthM: 20,
    yStartMm: 700,
    yMidMm: 150,
    yEndMm: 700,
    concreteCentroidYMm: 500,
  }, 31);

  const Peff = 1500; // kN
  const loadBalancing = LoadBalancingEngine.calculateBalancedLoads({
    geometry,
    averageEffectiveForceKn: Peff,
    deadLoadKnPerM: 28,
    liveLoadKnPerM: 14,
  });

  it('should produce zero secondary moments (M2 = 0) for statically determinate simply supported beams', () => {
    const result = HyperstaticPrestressEngine.analyzePrestressMoments({
      boundaryCondition: 'simply-supported',
      geometry,
      loadBalancing,
      effectivePrestressForceKn: Peff,
      deadLoadMomentMidspanKnm: 1400, // 28 * 20^2 / 8 = 1400 kNm
      liveLoadMomentMidspanKnm: 700,
    });

    expect(result.isStaticallyDeterminate).toBe(true);
    expect(result.maxSecondaryMomentKnm).toBe(0);
    expect(result.midspanSecondaryMomentKnm).toBe(0);

    // Primary moment at midspan: -Peff * e_mid = -1500 * (150 - 500)/1000 = +525 kNm (sagging)
    const midStation = result.momentStations[15];
    expect(midStation.primaryMomentKnm).toBeCloseTo(525, 1);
    expect(midStation.totalPrestressMomentKnm).toBeCloseTo(525, 1);
  });

  it('should calculate non-zero secondary moments (M2) for continuous two-span beams', () => {
    const continuousGeom = TendonProfileEngine.generateProfile({
      type: 'reverse-parabolic',
      spanLengthM: 20,
      ySupportMm: 800,
      yMidMm: 150,
      concreteCentroidYMm: 500,
    }, 31);

    const contLoadBalancing = LoadBalancingEngine.calculateBalancedLoads({
      geometry: continuousGeom,
      averageEffectiveForceKn: Peff,
      deadLoadKnPerM: 28,
    });

    const result = HyperstaticPrestressEngine.analyzePrestressMoments({
      boundaryCondition: 'continuous-two-span',
      geometry: continuousGeom,
      loadBalancing: contLoadBalancing,
      effectivePrestressForceKn: Peff,
      deadLoadMomentMidspanKnm: 1400,
      liveLoadMomentMidspanKnm: 700,
    });

    expect(result.isStaticallyDeterminate).toBe(false);
    expect(Math.abs(result.maxSecondaryMomentKnm)).toBeGreaterThan(0);
    // Secondary moment at simple support (x = 0) must be 0:
    expect(result.momentStations[0].secondaryMomentKnm).toBe(0);
  });
});
