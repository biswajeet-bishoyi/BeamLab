import { describe, it, expect } from 'vitest';
import { solveMatrixMethod } from './matrixSolver';
import type { StructuralModel, PointLoad, Support, DistributedLoad } from '../model/types';
import { toLength, toForce } from '../units/brands';

describe('solveMatrixMethod', () => {
  it('solves a simply supported beam', () => {
    // 10m beam, supports at 0 and 10, load at 5m (100N downwards)
    const s1: Support = { id: 's1', type: 'pin', position: toLength(0) };
    const s2: Support = { id: 's2', type: 'roller', position: toLength(10) };
    const load: PointLoad = { id: 'l1', type: 'point', position: toLength(5), magnitude: toForce(-100) };

    const model: StructuralModel = {
      span: toLength(10),
      supports: [s1, s2],
      loads: [load],
    };

    const result = solveMatrixMethod(model);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const r1 = result.value.reactions.find(r => r.supportId === 's1');
    const r2 = result.value.reactions.find(r => r.supportId === 's2');
    
    // By symmetry, reactions should be exactly 50N upwards.
    expect(r1?.fy).toBeCloseTo(50);
    expect(r2?.fy).toBeCloseTo(50);
    expect(r1?.mz).toBeCloseTo(0);
    expect(r2?.mz).toBeCloseTo(0);
  });

  it('solves a propped cantilever (statically indeterminate degree 1)', () => {
    // 10m beam, fixed at 0, roller at 10. Load of -100N at 5m.
    // Analytical reactions for P at midspan:
    // Ry_fixed = 11P / 16 = 11*100/16 = 68.75 N
    // Mz_fixed = 3PL / 16 = 3*100*10/16 = 187.5 Nm
    // Ry_roller = 5P / 16 = 5*100/16 = 31.25 N

    const s1: Support = { id: 's1', type: 'fixed', position: toLength(0) };
    const s2: Support = { id: 's2', type: 'roller', position: toLength(10) };
    const load: PointLoad = { id: 'l1', type: 'point', position: toLength(5), magnitude: toForce(-100) };

    const model: StructuralModel = {
      span: toLength(10),
      supports: [s1, s2],
      loads: [load],
    };

    const result = solveMatrixMethod(model);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const r1 = result.value.reactions.find(r => r.supportId === 's1');
    const r2 = result.value.reactions.find(r => r.supportId === 's2');

    expect(r1?.fy).toBeCloseTo(68.75);
    // Since load causes clockwise rotation, Mz reaction is counter-clockwise (positive).
    expect(r1?.mz).toBeCloseTo(187.5);
    expect(r2?.fy).toBeCloseTo(31.25);
  });

  it('solves a simply supported beam with a UDL', () => {
    // 10m beam, supports at 0 and 10. UDL of -10 N/m over the entire span.
    const s1: Support = { id: 's1', type: 'pin', position: toLength(0) };
    const s2: Support = { id: 's2', type: 'roller', position: toLength(10) };
    const load: DistributedLoad = { 
      id: 'l1', 
      type: 'distributed', 
      startPosition: toLength(0), 
      endPosition: toLength(10), 
      magnitude: toForce(-10) 
    };

    const model: StructuralModel = {
      span: toLength(10),
      supports: [s1, s2],
      loads: [load],
    };

    const result = solveMatrixMethod(model);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const r1 = result.value.reactions.find(r => r.supportId === 's1');
    const r2 = result.value.reactions.find(r => r.supportId === 's2');
    
    // wL/2 = 10 * 10 / 2 = 50N upwards each
    expect(r1?.fy).toBeCloseTo(50);
    expect(r2?.fy).toBeCloseTo(50);

    // Check max moment from internal forces (wL^2 / 8 = 10 * 100 / 8 = 125)
    const midspan = result.value.internalForces.find(p => Math.abs(p.x - 5) < 1e-6);
    expect(midspan?.m).toBeCloseTo(125);
  });
});
