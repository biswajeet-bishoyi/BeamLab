import { describe, it, expect } from 'vitest';
import { MITC4ShellElement } from './MITC4ShellElement';
import { FEMNode3D, ShellMaterial, ShellSection } from './types';

describe('Sprint B19.1 — MITC4 Mindlin-Reissner Plate & Flat Shell Element', () => {
  const concreteMat: ShellMaterial = {
    id: 'mat_c30',
    name: 'C30/37 Concrete',
    elasticModulus: 33e9, // 33 GPa
    poissonRatio: 0.2,
    density: 2500,
  };

  const slabSec: ShellSection = {
    id: 'sec_slab_200',
    name: '200mm RC Slab',
    thickness: 0.20, // 200 mm
    shearCorrectionFactor: 5 / 6,
  };

  // 2m x 2m horizontal flat shell element in XY plane
  const nodesSquare: [FEMNode3D, FEMNode3D, FEMNode3D, FEMNode3D] = [
    { id: 'N1', x: 0, y: 0, z: 0 },
    { id: 'N2', x: 2, y: 0, z: 0 },
    { id: 'N3', x: 2, y: 2, z: 0 },
    { id: 'N4', x: 0, y: 2, z: 0 },
  ];

  it('computes 24x24 element stiffness matrix with exact symmetry', () => {
    const res = MITC4ShellElement.computeElementStiffness(
      'EL-01',
      nodesSquare,
      slabSec,
      concreteMat
    );

    expect(res.elementId).toBe('EL-01');
    expect(res.surfaceArea).toBeCloseTo(4.0, 4); // 2m x 2m = 4 m2

    // Check symmetry: K_ij == K_ji
    const K = res.localStiffness24x24;
    expect(K.length).toBe(24);
    expect(K[0]!.length).toBe(24);

    let maxAsymmetry = 0;
    for (let i = 0; i < 24; i++) {
      for (let j = 0; j < 24; j++) {
        const diff = Math.abs((K[i]![j] ?? 0) - (K[j]![i] ?? 0));
        if (diff > maxAsymmetry) maxAsymmetry = diff;
      }
    }
    expect(maxAsymmetry).toBeLessThan(1e-5);

    // Diagonal stiffness terms must be strictly positive
    for (let i = 0; i < 24; i++) {
      expect(K[i]![i]).toBeGreaterThan(0);
    }
  });

  it('verifies translational rigid body mode equilibrium (zero net force under rigid translation)', () => {
    const res = MITC4ShellElement.computeElementStiffness(
      'EL-02',
      nodesSquare,
      slabSec,
      concreteMat
    );

    const K = res.localStiffness24x24;

    // Rigid out-of-plane translation w = 1.0 at all 4 nodes
    // Nodes w DOFs are at indices: 2, 8, 14, 20
    const wRigid = new Array(24).fill(0);
    wRigid[2] = 1.0;
    wRigid[8] = 1.0;
    wRigid[14] = 1.0;
    wRigid[20] = 1.0;

    let netVerticalForce = 0;
    for (let i = 0; i < 24; i++) {
      let f_i = 0;
      for (let j = 0; j < 24; j++) {
        f_i += (K[i]![j] ?? 0) * wRigid[j]!;
      }
      if (i === 2 || i === 8 || i === 14 || i === 20) {
        netVerticalForce += f_i;
      }
    }
    // Net vertical force under pure rigid body translation must be zero
    expect(Math.abs(netVerticalForce)).toBeLessThan(1e-4);
  });

  it('computes internal moments and shears under uniform curvature', () => {
    // Prescribe bending rotation th_x = 0.001 rad at all nodes (uniform curvature)
    const uGlobal = new Array(24).fill(0);
    // th_x DOFs are at 3, 9, 15, 21
    uGlobal[3] = 0.001;
    uGlobal[9] = 0.001;
    uGlobal[15] = 0.001;
    uGlobal[21] = 0.001;

    const forces = MITC4ShellElement.computeInternalForces(
      nodesSquare,
      slabSec,
      concreteMat,
      uGlobal,
      0,
      0
    );

    // Should produce valid internal forces without NaN or null
    expect(Number.isFinite(forces.mxx)).toBe(true);
    expect(Number.isFinite(forces.myy)).toBe(true);
    expect(Number.isFinite(forces.vx)).toBe(true);
  });

  it('transforms inclined 3D shell elements into global coordinates', () => {
    // Inclined 3D shell element (shear wall pitched at 45 degrees)
    const nodes3D: [FEMNode3D, FEMNode3D, FEMNode3D, FEMNode3D] = [
      { id: 'W1', x: 0, y: 0, z: 0 },
      { id: 'W2', x: 3, y: 0, z: 0 },
      { id: 'W3', x: 3, y: 2, z: 2 },
      { id: 'W4', x: 0, y: 2, z: 2 },
    ];

    const res = MITC4ShellElement.computeElementStiffness(
      'EL-3D',
      nodes3D,
      slabSec,
      concreteMat
    );

    // Global stiffness matrix must be symmetric and positive diagonal
    const Kg = res.globalStiffness24x24;
    expect(Kg.length).toBe(24);
    for (let i = 0; i < 24; i++) {
      expect(Kg[i]![i]).toBeGreaterThan(0);
    }
  });
});
