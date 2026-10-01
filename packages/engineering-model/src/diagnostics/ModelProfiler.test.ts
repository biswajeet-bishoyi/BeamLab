import { describe, it, expect } from 'vitest';
import { EngineeringModel } from '../model/EngineeringModel';
import { ModelProfiler } from './ModelProfiler';

describe('B1.6 ModelProfiler', () => {
  it('analyzes degrees of freedom and memory footprint for a structural frame', () => {
    const model = new EngineeringModel('model-prof-01', { name: 'Portal Frame Test' });

    // Add nodes
    model.addNode('n1', 'Node 1', 0, 0, 0, 'struct-1');
    model.addNode('n2', 'Node 2', 6, 0, 0, 'struct-1');
    model.addNode('n3', 'Node 3', 6, 0, 3.5, 'struct-1');
    model.addNode('n4', 'Node 4', 0, 0, 3.5, 'struct-1');

    // Add material & section
    const mat = model.addMaterial('mat-s355', 'S355', 210e9, 81e9, 0.3, 7850, 'Steel');
    const sec = model.addSection('sec-ipe300', 'IPE 300', 5.38e-3, 6.04e-6, 8.36e-5, 2.01e-7);

    // Add members
    model.addMember('m1', 'Col 1', 'n1', 'n4', mat.identity.id, sec.identity.id, 'struct-1');
    model.addMember('m2', 'Beam 1', 'n4', 'n3', mat.identity.id, sec.identity.id, 'struct-1');
    model.addMember('m3', 'Col 2', 'n2', 'n3', mat.identity.id, sec.identity.id, 'struct-1');

    // Add 2 fixed supports (6 DOFs each = 12 restrained DOFs)
    const s1 = model.addSupport('sup1', 'Support 1', 'n1', 'struct-1');
    s1.restraints = { dx: true, dy: true, dz: true, rx: true, ry: true, rz: true };

    const s2 = model.addSupport('sup2', 'Support 2', 'n2', 'struct-1');
    s2.restraints = { dx: true, dy: true, dz: true, rx: true, ry: true, rz: true };

    const profile = model.profile();

    expect(profile.modelId).toBe('model-prof-01');
    expect(profile.objectCounts['Node']).toBe(4);
    expect(profile.objectCounts['Member']).toBe(3);
    expect(profile.objectCounts['Support']).toBe(2);

    // 4 nodes * 6 = 24 total DOFs
    expect(profile.dofMetrics.totalDofs).toBe(24);
    // 2 supports * 6 = 12 restrained DOFs
    expect(profile.dofMetrics.restrainedDofs).toBe(12);
    // 24 - 12 = 12 free DOFs
    expect(profile.dofMetrics.freeDofs).toBe(12);
    expect(profile.dofMetrics.hasSufficientRestraints).toBe(true);

    // Memory footprint
    expect(profile.memory.estimatedBytes).toBeGreaterThan(1024);
    expect(profile.memory.formattedSize).toContain('KB');

    // Health report
    expect(profile.health.score).toBeGreaterThanOrEqual(90);
    expect(profile.health.rating).toBe('Excellent');
  });

  it('detects kinematic instability and isolated nodes in health score', () => {
    const unstableModel = new EngineeringModel('model-unstable', { name: 'Unstable Frame' });

    // 3 nodes with NO supports and 1 isolated node
    unstableModel.addNode('n1', 'Node 1', 0, 0, 0, 'struct-1');
    unstableModel.addNode('n2', 'Node 2', 5, 0, 0, 'struct-1');
    unstableModel.addNode('n-isolated', 'Node Free', 10, 10, 10, 'struct-1');

    const mat = unstableModel.addMaterial('mat-1', 'S275', 210e9, 81e9, 0.3, 7850, 'Steel');
    const sec = unstableModel.addSection('sec-1', 'IPE 200', 2.85e-3, 1.42e-6, 1.94e-5, 6.98e-8);
    unstableModel.addMember('m1', 'Member 1', 'n1', 'n2', mat.identity.id, sec.identity.id, 'struct-1');

    const profile = unstableModel.profile();

    expect(profile.dofMetrics.restrainedDofs).toBe(0);
    expect(profile.dofMetrics.hasSufficientRestraints).toBe(false);
    expect(profile.health.score).toBeLessThan(90);
    expect(profile.health.issues.some(i => i.includes('unstable'))).toBe(true);
    expect(profile.health.issues.some(i => i.includes('isolated node'))).toBe(true);
  });
});
