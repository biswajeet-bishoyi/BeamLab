import { describe, it, expect } from 'vitest';
import {
  CompositeMaterialFactory,
  EffectiveWidthEngine,
  TransformedSectionEngine,
} from './index';

describe('Sprint B15.1: Composite Material Domain & Transformed Section Engine', () => {
  it('should instantiate steel sections and concrete slabs with standard elastic moduli', () => {
    const w18x50 = CompositeMaterialFactory.getStandardSteelSection('W18x50');
    expect(w18x50.name).toBe('W18x50 (AISC)');
    expect(w18x50.d).toBe(457);
    expect(w18x50.Fy).toBe(345);
    expect(w18x50.Es).toBe(200000);

    const slab = CompositeMaterialFactory.createConcreteSlab(30, 130, 50, 2400);
    expect(slab.fc).toBe(30);
    expect(slab.totalThickness).toBe(130);
    expect(slab.toppingThickness).toBe(80);
    // Ec = 4700 * sqrt(30) = 25,742 MPa
    expect(slab.Ec).toBeCloseTo(25743, -1);
  });

  it('should compute AISC 360-22 effective flange width correctly for interior beams', () => {
    // 9m span (9000 mm), beams spaced at 3m (3000 mm)
    // Span limit: 9000 / 4 = 2250 mm
    // Spacing limit: 3000 mm
    // Governing is span limit: 2250 mm
    const res = EffectiveWidthEngine.computeAiscEffectiveWidth({
      spanLengthMm: 9000,
      spacingLeftMm: 3000,
      spacingRightMm: 3000,
      flangeWidthMm: 190,
      toppingThicknessMm: 80,
    });

    expect(res.beff).toBe(2250);
    expect(res.beffLeft).toBe(1125);
    expect(res.beffRight).toBe(1125);
    expect(res.governingCriterion).toBe('Span Limit (L / 4 total)');
  });

  it('should compute AISC 360-22 effective width for closely spaced beams governed by beam spacing', () => {
    // 12m span (12000 mm), closely spaced at 2m (2000 mm)
    // Span limit: 12000 / 4 = 3000 mm
    // Spacing limit: 2000 mm -> governing
    const res = EffectiveWidthEngine.computeAiscEffectiveWidth({
      spanLengthMm: 12000,
      spacingLeftMm: 2000,
      spacingRightMm: 2000,
      flangeWidthMm: 190,
      toppingThicknessMm: 80,
    });

    expect(res.beff).toBe(2000);
    expect(res.beffLeft).toBe(1000);
    expect(res.beffRight).toBe(1000);
  });

  it('should compute effective flange width for edge/perimeter beams with slab overhang', () => {
    // Edge beam: Interior spacing 3000 mm, Exterior cantilever overhang 600 mm
    const edgeRes = EffectiveWidthEngine.computeAiscEffectiveWidth({
      spanLengthMm: 10000,
      spacingLeftMm: 3000,
      spacingRightMm: 3000,
      flangeWidthMm: 190,
      toppingThicknessMm: 80,
      isEdgeBeam: true,
      edgeDistanceMm: 600,
    });

    expect(edgeRes.beffLeft).toBe(1250); // 10000 / 8 = 1250 mm < 1500 mm
    expect(edgeRes.beffRight).toBe(600);  // Cantilever overhang
    expect(edgeRes.beff).toBe(1850);
  });

  it('should evaluate Eurocode 4 effective width including b0 and shear lag', () => {
    const ec4Res = EffectiveWidthEngine.computeEurocode4EffectiveWidth({
      spanLengthMm: 8000,
      spacingLeftMm: 2800,
      spacingRightMm: 2800,
      flangeWidthMm: 170,
      toppingThicknessMm: 75,
    });

    // b0 = 170 mm
    // bei = min(8000 / 8, (2800 - 170) / 2) = min(1000, 1315) = 1000 mm
    // beff = 170 + 1000 + 1000 = 2170 mm
    expect(ec4Res.beff).toBe(2170);
  });

  it('should compute modular ratio and elastic transformed section properties', () => {
    const w18x50 = CompositeMaterialFactory.getStandardSteelSection('W18x50');
    const slab = CompositeMaterialFactory.createConcreteSlab(30, 130, 50, 2400);

    const n0 = TransformedSectionEngine.computeShortTermModularRatio(w18x50.Es, slab.Ec);
    // n0 = 200000 / 25743 = 7.77
    expect(n0).toBeCloseTo(7.77, 1);

    const nLong = TransformedSectionEngine.computeLongTermModularRatio(n0, 2.0);
    // nLong = 3 * n0 ~ 23.3
    expect(nLong).toBeCloseTo(n0 * 3, 1);

    const beff = 2250;
    const shortTermTr = TransformedSectionEngine.computeTransformedSection(w18x50, slab, beff, n0);

    // Neutral axis moves up towards concrete slab
    expect(shortTermTr.ybarTr).toBeGreaterThan(w18x50.d / 2);
    // Transformed moment of inertia significantly exceeds bare steel Ix
    expect(shortTermTr.Itr).toBeGreaterThan(w18x50.Ix * 2.0);
    expect(shortTermTr.StrBot).toBeGreaterThan(w18x50.Sx);
  });
});
