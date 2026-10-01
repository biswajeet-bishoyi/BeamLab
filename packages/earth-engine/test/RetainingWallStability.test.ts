import { describe, it, expect } from 'vitest';
import { RetainingWallStabilityEngine } from '../src/stability/RetainingWallStability';
import { SoilLayer } from '../src/types';

describe('RetainingWallStabilityEngine', () => {
  const backfill: SoilLayer = {
    id: 'backfill-1',
    name: 'Granular Backfill',
    depthTop: 0,
    depthBottom: 6,
    unitWeight: 18,
    frictionAngle: 32,
    cohesion: 0,
  };

  const foundation: SoilLayer = {
    id: 'found-1',
    name: 'Foundation Sand/Gravel',
    depthTop: 0,
    depthBottom: 10,
    unitWeight: 19,
    frictionAngle: 34,
    cohesion: 10,
  };

  it('evaluates stability of a standard cantilever retaining wall', () => {
    const res = RetainingWallStabilityEngine.analyzeStability({
      wall: {
        height: 4.5,
        baseThickness: 0.6,
        stemTopWidth: 0.3,
        stemBottomWidth: 0.5,
        toeWidth: 0.9,
        heelWidth: 1.8,
        soilDepthOverToe: 0.8,
      },
      backfillLayers: [backfill],
      foundationSoil: foundation,
      allowableBearingCapacity: 250, // kPa
    });

    expect(res.totalVerticalLoad).toBeGreaterThan(100);
    expect(res.safetyFactorOverturning).toBeGreaterThan(2.0);
    expect(res.safetyFactorSliding).toBeGreaterThan(1.5);
    expect(res.isWithinKern).toBe(true);
    expect(res.bearingPressureToe).toBeLessThan(250);
    expect(res.bearingPressureToe).toBeGreaterThan(0);
    expect(res.status.overturningPass).toBe(true);
    expect(res.status.slidingPass).toBe(true);
    expect(res.status.bearingPass).toBe(true);
  });

  it('incorporates shear key to enhance sliding safety factor', () => {
    const baseParams = {
      wall: {
        height: 5.0,
        baseThickness: 0.6,
        stemTopWidth: 0.35,
        stemBottomWidth: 0.5,
        toeWidth: 0.8,
        heelWidth: 1.5,
        soilDepthOverToe: 0.5,
      },
      backfillLayers: [backfill],
      foundationSoil: foundation,
      allowableBearingCapacity: 300,
    };

    const resNoKey = RetainingWallStabilityEngine.analyzeStability(baseParams);

    const resWithKey = RetainingWallStabilityEngine.analyzeStability({
      ...baseParams,
      wall: {
        ...baseParams.wall,
        shearKey: {
          depth: 0.6,
          width: 0.4,
          distanceFromToe: 1.0,
        },
      },
    });

    // Shear key adds passive resistance and vertical weight, boosting sliding safety factor
    expect(resWithKey.passiveResistanceToe).toBeGreaterThan(resNoKey.passiveResistanceToe);
    expect(resWithKey.safetyFactorSliding).toBeGreaterThan(resNoKey.safetyFactorSliding);
  });

  it('accurately computes stem base flexural and shear demands', () => {
    const res = RetainingWallStabilityEngine.analyzeStability({
      wall: {
        height: 4.0,
        baseThickness: 0.5,
        stemTopWidth: 0.3,
        stemBottomWidth: 0.45,
        toeWidth: 0.8,
        heelWidth: 1.6,
      },
      backfillLayers: [backfill],
      foundationSoil: foundation,
      allowableBearingCapacity: 220,
    });

    expect(res.stemBaseShear).toBeGreaterThan(0);
    expect(res.stemBaseMoment).toBeGreaterThan(0);
    // Moment M = 1/6 * Ka * gamma * H^3
    // For H = 4, gamma = 18, Ka ~ 0.3: M ~ 0.3 * 18 * 64 / 6 ~ 57.6 kNm/m
    expect(res.stemBaseMoment).toBeGreaterThan(30);
    expect(res.stemBaseMoment).toBeLessThan(120);
  });
});
