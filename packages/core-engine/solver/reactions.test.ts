import { describe, it, expect } from 'vitest';
import { solveDeterminateReactions } from './reactions';
import type { StructuralModel, PointLoad, Support } from '../model/types';
import { toLength, toForce } from '../units/brands';

describe('solveDeterminateReactions', () => {
  it('solves a simply supported beam with a central point load', () => {
    const s1: Support = { id: 's1', type: 'pin', position: toLength(0) };
    const s2: Support = { id: 's2', type: 'roller', position: toLength(10) };
    const load: PointLoad = { id: 'l1', type: 'point', position: toLength(5), magnitude: toForce(-100) }; // 100N downwards

    const model: StructuralModel = {
      span: toLength(10),
      supports: [s1, s2],
      loads: [load],
    };

    const result = solveDeterminateReactions(model);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.reactions).toHaveLength(2);
    
    const r1 = result.value.reactions.find(r => r.supportId === 's1');
    const r2 = result.value.reactions.find(r => r.supportId === 's2');
    
    expect(r1?.fy).toBeCloseTo(50); // Upward 50N
    expect(r2?.fy).toBeCloseTo(50); // Upward 50N
  });

  it('solves a cantilever beam with a point load at the free end', () => {
    const s1: Support = { id: 's1', type: 'fixed', position: toLength(0) };
    const load: PointLoad = { id: 'l1', type: 'point', position: toLength(10), magnitude: toForce(-100) };

    const model: StructuralModel = {
      span: toLength(10),
      supports: [s1],
      loads: [load],
    };

    const result = solveDeterminateReactions(model);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.reactions).toHaveLength(1);
    const r1 = result.value.reactions.find(r => r.supportId === 's1');
    
    expect(r1?.fy).toBeCloseTo(100); // Upward 100N
    expect(r1?.mz).toBeCloseTo(1000); // CCW moment 1000 N.m (since load at 10 creates CW moment of -100*10 = -1000)
  });
});
