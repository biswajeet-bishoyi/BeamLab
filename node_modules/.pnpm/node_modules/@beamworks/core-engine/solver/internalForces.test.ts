import { describe, it, expect } from 'vitest';
import { computeInternalForces } from './internalForces';
import type { StructuralModel, PointLoad, Support } from '../model/types';
import type { ReactionResult } from './reactions';
import { toLength, toForce, toMoment } from '../units/brands';

describe('computeInternalForces', () => {
  it('computes correct shear and moment for a central point load', () => {
    const s1: Support = { id: 's1', type: 'pin', position: toLength(0) };
    const s2: Support = { id: 's2', type: 'roller', position: toLength(10) };
    const load: PointLoad = { id: 'l1', type: 'point', position: toLength(5), magnitude: toForce(-100) };

    const model: StructuralModel = {
      span: toLength(10),
      supports: [s1, s2],
      loads: [load],
    };

    const reactions: ReactionResult[] = [
      { supportId: 's1', fy: toForce(50), mz: toMoment(0) },
      { supportId: 's2', fy: toForce(50), mz: toMoment(0) },
    ];

    const results = computeInternalForces(model, reactions, 10);
    
    // There should be samples at 0, 5, 10, plus epsilon jumps around discontinuities.
    // Check midspan moment (should be PL/4 = 100 * 10 / 4 = 250)
    const midspan = results.find(r => Math.abs(r.x - 5) < 1e-9);
    expect(midspan).toBeDefined();
    expect(midspan?.m).toBeCloseTo(250);

    // Check shear just after the left support (should be +50)
    const justAfterSupport = results.find(r => r.x > 0 && r.x < 1e-4);
    expect(justAfterSupport?.v).toBeCloseTo(50);

    // Check shear just after the midspan load (should be 50 - 100 = -50)
    const justAfterMidspan = results.find(r => r.x > 5 && r.x < 5 + 1e-4);
    expect(justAfterMidspan?.v).toBeCloseTo(-50);
  });
});
