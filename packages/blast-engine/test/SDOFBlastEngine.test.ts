import { describe, it, expect } from 'vitest';
import { SDOFBlastEngine } from '../src/sdof/SDOFBlastEngine';
import { KingeryBulmashEngine } from '../src/waveforms/KingeryBulmash';
import { SDOFSystemParams } from '../src/types';

describe('SDOFBlastEngine', () => {
  it('provides correct Biggs load-mass transformation factors', () => {
    expect(SDOFBlastEngine.getLoadMassFactor('simply-supported', false)).toBe(0.78);
    expect(SDOFBlastEngine.getLoadMassFactor('simply-supported', true)).toBe(0.66);
    expect(SDOFBlastEngine.getLoadMassFactor('fixed-fixed', false)).toBe(0.77);
    expect(SDOFBlastEngine.getLoadMassFactor('cantilever', false)).toBe(0.66);
  });

  it('solves dynamic response of a simply-supported RC beam under blast overpressure', () => {
    const blast = KingeryBulmashEngine.calculateWaveformParameters({
      chargeMass: 80,
      explosiveType: 'TNT',
      standoffDistance: 12,
      burstType: 'surface',
    });

    const beam: SDOFSystemParams = {
      memberType: 'beam',
      boundary: 'simply-supported',
      spanLength: 6.0,
      width: 1.0,
      totalMassKg: 2400, // 2.4 tons
      yieldResistanceKN: 450, // 450 kN
      elasticStiffnessKNm: 35000, // 35 MN/m
      dampingRatio: 0.02,
      dynamicIncreaseFactor: 1.20,
    };

    const res = SDOFBlastEngine.solveResponse({
      system: beam,
      blast,
    });

    expect(res.naturalPeriodMs).toBeGreaterThan(5);
    expect(res.naturalPeriodMs).toBeLessThan(150);
    expect(res.equivalentMassKg).toBeLessThan(beam.totalMassKg);
    expect(res.maxDisplacementMm).toBeGreaterThan(0);
    expect(res.ductilityRatio).toBeGreaterThan(0);
    expect(res.supportRotationDeg).toBeGreaterThan(0);
    expect(['low', 'medium', 'high']).toContain(res.protectionLevel);
    expect(res.timeHistory.length).toBeGreaterThan(20);
  });
});
