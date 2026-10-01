import { describe, it, expect } from 'vitest';
import { DeepExcavationEngine } from '../src/excavation/DeepExcavation';
import { SoilLayer } from '../src/types';

describe('DeepExcavationEngine', () => {
  const sand: SoilLayer = {
    id: 'sand',
    name: 'Dense Sand',
    depthTop: 0,
    depthBottom: 15,
    unitWeight: 19,
    frictionAngle: 34,
    cohesion: 0,
  };

  const clay: SoilLayer = {
    id: 'clay',
    name: 'Medium Clay',
    depthTop: 0,
    depthBottom: 15,
    unitWeight: 18,
    frictionAngle: 0,
    cohesion: 35,
    undrainedShearStrength: 35,
  };

  it('designs cantilever sheet pile wall embedment depth and section modulus', () => {
    const H = 4.0;
    const res = DeepExcavationEngine.designCantileverSheetPile({
      excavationDepth: H,
      soil: sand,
      steelYieldStrength: 355,
    });

    expect(res.calculatedEmbedmentDepth).toBeGreaterThan(0);
    expect(res.designEmbedmentDepth).toBeGreaterThan(res.calculatedEmbedmentDepth);
    expect(res.totalPileLength).toBeGreaterThan(H);
    expect(res.maxBendingMoment).toBeGreaterThan(0);
    expect(res.requiredSectionModulus).toBeGreaterThan(0);
    expect(res.zeroShearDepth).toBeGreaterThan(H);
  });

  it('designs anchored sheet pile with tieback geometry and forces', () => {
    const H = 6.0;
    const ha = 1.5;
    const res = DeepExcavationEngine.designAnchoredSheetPile({
      excavationDepth: H,
      anchorDepth: ha,
      soil: sand,
      anchorSpacing: 2.5,
      anchorInclination: 20,
    });

    expect(res.designEmbedmentDepth).toBeGreaterThan(0);
    expect(res.anchorTensionForce).toBeGreaterThan(0);
    expect(res.maxSpanMoment).toBeGreaterThan(0);
    expect(res.tieback.freeLength).toBeGreaterThanOrEqual(4.5);
    expect(res.tieback.bondLength).toBeGreaterThanOrEqual(3.0);
    expect(res.tieback.totalTiebackLength).toBeGreaterThanOrEqual(7.5);
  });

  it('computes Peck apparent pressure envelopes and strut loads for multi-strutted cut', () => {
    const H = 9.0;
    const struts = [2.0, 5.0, 7.5];

    // Sand envelope
    const resSand = DeepExcavationEngine.calculatePeckEnvelope({
      excavationDepth: H,
      soil: sand,
      strutLevels: struts,
      strutSpacing: 3.0,
    });

    expect(resSand.soilType).toBe('sand');
    expect(resSand.apparentPressure).toBeGreaterThan(15);
    expect(resSand.apparentPressure).toBeLessThan(60);
    expect(resSand.strutLoads).toHaveLength(3);
    for (const strut of resSand.strutLoads) {
      expect(strut.designStrutLoad).toBeGreaterThan(0);
      expect(strut.tributaryHeight).toBeGreaterThan(0);
    }

    // Clay envelope
    const resClay = DeepExcavationEngine.calculatePeckEnvelope({
      excavationDepth: H,
      soil: clay,
      strutLevels: struts,
      strutSpacing: 3.0,
    });

    expect(resClay.soilType).toBe('soft-medium-clay');
    expect(resClay.apparentPressure).toBeGreaterThan(0);
    expect(resClay.totalLateralLoad).toBeGreaterThan(0);
  });
});
