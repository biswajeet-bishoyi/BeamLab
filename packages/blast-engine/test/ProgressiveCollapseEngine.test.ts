import { describe, it, expect } from 'vitest';
import { ProgressiveCollapseEngine } from '../src/collapse/ProgressiveCollapseEngine';

describe('ProgressiveCollapseEngine', () => {
  it('evaluates exterior column removal in a reinforced concrete moment frame', () => {
    const res = ProgressiveCollapseEngine.evaluateAlternatePath({
      scenarioId: 'EXT-COL-01',
      removedColumnId: 'C-E2',
      columnLocation: 'exterior-middle',
      tributaryGravityLoadKN: 600, // 600 kN
      spanBeamCapacityKNm: 450, // 450 kNm
      beamLengthM: 6.0,
      dynamicAmplificationFactor: 1.5,
    });

    expect(res.dynamicAmplifiedDemandKNm).toBeGreaterThan(0);
    expect(res.demandCapacityRatio).toBeGreaterThan(0);
    expect(res.catenaryTensionDemandKN).toBeGreaterThan(0);
    expect(typeof res.collapsePrevented).toBe('boolean');
    expect(['flexural', 'shear', 'catenary-rupture', 'adequate-redistribution']).toContain(res.failureMechanism);
  });

  it('detects failure when beam flexural capacity is insufficient under DAF', () => {
    const res = ProgressiveCollapseEngine.evaluateAlternatePath({
      scenarioId: 'CORNER-COL-FAIL',
      removedColumnId: 'C-1A',
      columnLocation: 'corner',
      tributaryGravityLoadKN: 800,
      spanBeamCapacityKNm: 100, // critically low capacity
      beamLengthM: 7.0,
      dynamicAmplificationFactor: 2.0,
    });

    expect(res.demandCapacityRatio).toBeGreaterThan(2.0);
    expect(res.collapsePrevented).toBe(false);
  });
});
