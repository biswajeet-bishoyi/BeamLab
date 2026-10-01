import { describe, it, expect } from 'vitest';
import { CatenaryGeometryEngine } from './CatenaryGeometryEngine';
import { STANDARD_CABLE_MATERIALS, STANDARD_CABLE_SECTIONS } from './CableCatalog';
import { CableSupportNode } from './types';

describe('Sprint B18.1 — Catenary & Tension Geometry Engine', () => {
  const matWire = STANDARD_CABLE_MATERIALS.BRIDGE_STRAND_1860!;
  const secLocked50 = STANDARD_CABLE_SECTIONS.find(s => s.id === 'sec_locked_50mm')!;
  const secStay80 = STANDARD_CABLE_SECTIONS.find(s => s.id === 'sec_stay_80mm')!;

  it('solves horizontal symmetric catenary with exact midspan vertex', () => {
    const supportA: CableSupportNode = { id: 'A', x: 0, y: 10, type: 'fixed_anchor' };
    const supportB: CableSupportNode = { id: 'B', x: 100, y: 10, type: 'fixed_anchor' };
    const H = 250000; // 250 kN horizontal tension

    const res = CatenaryGeometryEngine.solveCatenaryByTension(
      supportA,
      supportB,
      secLocked50,
      matWire,
      H
    );

    expect(res.span).toBe(100);
    expect(res.levelDifference).toBe(0);
    expect(res.vertexX).toBeCloseTo(50, 4); // Exact midspan
    expect(res.verticalReactionStart).toBeCloseTo(res.verticalReactionEnd, 3);

    // Global vertical equilibrium: V_A + V_B must equal total cable weight w * L_s
    const totalWeight = secLocked50.unitWeight * res.stressedLength;
    expect(res.verticalReactionStart + res.verticalReactionEnd).toBeCloseTo(totalWeight, 2);

    // Max tension occurs at supports, min tension at vertex
    expect(res.maxTension).toBeGreaterThan(res.horizontalTension);
    expect(res.tensionAtStart).toBeCloseTo(res.maxTension, 2);
    expect(res.tensionAtEnd).toBeCloseTo(res.maxTension, 2);
    expect(res.minTension).toBe(H);

    // Unstressed length is strictly shorter than stressed length
    expect(res.unstressedLength).toBeLessThan(res.stressedLength);
    expect(res.elasticElongation).toBeGreaterThan(0);
  });

  it('solves inclined catenary with level difference accurately', () => {
    // 150m horizontal span with a 40m tower height difference
    const supportA: CableSupportNode = { id: 'A', x: 0, y: 0, type: 'stay_anchor' };
    const supportB: CableSupportNode = { id: 'B', x: 150, y: 40, type: 'pylon_saddle' };
    const H = 600000; // 600 kN

    const res = CatenaryGeometryEngine.solveCatenaryByTension(
      supportA,
      supportB,
      secStay80,
      matWire,
      H
    );

    expect(res.span).toBe(150);
    expect(res.levelDifference).toBe(40);
    expect(res.chordLength).toBeCloseTo(Math.hypot(150, 40), 4);

    // Higher support B must carry higher total tension than lower support A
    expect(res.tensionAtEnd).toBeGreaterThan(res.tensionAtStart);
    expect(res.maxTension).toBeCloseTo(res.tensionAtEnd, 2);

    // Global equilibrium check
    const totalWeight = secStay80.unitWeight * res.stressedLength;
    expect(res.verticalReactionStart + res.verticalReactionEnd).toBeCloseTo(totalWeight, 1);

    // Sampling stations
    expect(res.stations.length).toBe(51);
    expect(res.stations[0]!.x).toBe(0);
    expect(res.stations[50]!.x).toBe(150);
    expect(res.stations[50]!.y).toBeCloseTo(40, 2);
  });

  it('solves catenary by target sag using Newton-Raphson iteration', () => {
    const supportA: CableSupportNode = { id: 'A', x: 0, y: 50, type: 'pylon_saddle' };
    const supportB: CableSupportNode = { id: 'B', x: 200, y: 50, type: 'pylon_saddle' };
    const targetSag = 12.5; // 12.5m sag on a 200m span (sag ratio = 0.0625)

    const res = CatenaryGeometryEngine.solveCatenaryBySag(
      supportA,
      supportB,
      secLocked50,
      matWire,
      targetSag
    );

    expect(res.sag).toBeCloseTo(targetSag, 4);
    expect(res.sagRatio).toBeCloseTo(12.5 / 200, 4);
    expect(res.horizontalTension).toBeGreaterThan(0);
  });

  it('validates parabolic approximation against exact catenary for shallow sags', () => {
    const span = 120;
    const sag = 6; // f / L = 0.05 (shallow cable)
    const w = secLocked50.unitWeight;

    const supportA: CableSupportNode = { id: 'A', x: 0, y: 0, type: 'fixed_anchor' };
    const supportB: CableSupportNode = { id: 'B', x: span, y: 0, type: 'fixed_anchor' };

    const catRes = CatenaryGeometryEngine.solveCatenaryBySag(
      supportA,
      supportB,
      secLocked50,
      matWire,
      sag
    );

    const parabRes = CatenaryGeometryEngine.solveParabolicApproximation(span, 0, sag, w);

    // For f/L = 0.05, analytical catenary vs parabola difference is ~(4/3)*(f/L)^2 = 0.33%
    const hDiffRel = Math.abs(catRes.horizontalTension - parabRes.horizontalTension) / catRes.horizontalTension;
    expect(hDiffRel).toBeLessThan(0.005);

    // Arc length comparison within 0.1%
    const lDiffRel = Math.abs(catRes.stressedLength - parabRes.arcLength) / catRes.stressedLength;
    expect(lDiffRel).toBeLessThan(0.001);
  });
});
