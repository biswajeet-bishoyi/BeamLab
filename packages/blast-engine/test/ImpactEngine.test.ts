import { describe, it, expect } from 'vitest';
import { ImpactEngine } from '../src/impact/ImpactEngine';

describe('ImpactEngine', () => {
  it('evaluates missile impact on reinforced concrete wall per modified NDRC', () => {
    const res = ImpactEngine.evaluateImpact({
      projectileMassKg: 50, // 50 kg pipe missile
      initialVelocityMPerS: 60, // 60 m/s (~216 km/h)
      projectileDiameterM: 0.15, // 15 cm diameter
      noseShapeFactor: 1.0, // spherical nose
      targetMaterial: 'reinforced-concrete',
      targetThicknessM: 0.35, // 35 cm thick RC barrier
      concreteCompressiveStrengthMPa: 35,
    });

    expect(res.penetrationDepthM).toBeGreaterThan(0);
    expect(res.scabbingLimitThicknessM).toBeGreaterThan(0);
    expect(res.perforationLimitThicknessM).toBeGreaterThan(0);
    expect(typeof res.perforated).toBe('boolean');
    expect(typeof res.scabbingOccurs).toBe('boolean');
    expect(['superficial', 'cratering', 'scabbing', 'full-perforation']).toContain(res.damageLevel);
  });

  it('evaluates high-velocity fragment impact on structural steel plate per BRL', () => {
    const res = ImpactEngine.evaluateImpact({
      projectileMassKg: 2.0, // 2 kg steel fragment
      initialVelocityMPerS: 400, // 400 m/s
      projectileDiameterM: 0.04, // 4 cm
      targetMaterial: 'structural-steel',
      targetThicknessM: 0.02, // 20 mm plate
      steelYieldStrengthMPa: 355,
    });

    expect(res.perforationLimitThicknessM).toBeGreaterThan(0);
    expect(typeof res.perforated).toBe('boolean');
    expect(res.residualVelocityMPerS).toBeGreaterThanOrEqual(0);
  });
});
