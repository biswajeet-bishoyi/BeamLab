import { describe, it, expect } from 'vitest';
import { PDeltaSolver3D } from './PDeltaSolver3D';
import type { SpaceFrameModel3D, Node3D, Element3D } from './SpaceFrameSolver3D';

describe('PDeltaSolver3D — Geometric Non-Linearity & P-Delta Solver', () => {
  it('solves vertical column under combined axial compression and lateral shear (P-Delta amplification)', () => {
    // 5m cantilever column along Z: Fixed at Node 1 (0, 0, 0), tip at Node 2 (0, 0, 5)
    // Lateral force Fx = 10,000 N at tip
    // Axial compression Fz = -394,800 N (~20% of P_cr)
    const L = 5.0;
    const E = 200e9;
    const I = 1.0e-4;
    const A = 0.01;
    const J = 2.0e-5;

    // Euler critical load for cantilever: P_cr = pi^2 * E * I / (4 * L^2)
    const P_cr = (Math.PI * Math.PI * E * I) / (4 * L * L); // ~1,973,920 N

    const node1: Node3D = {
      id: 'n1',
      x: 0,
      y: 0,
      z: 0,
      restraints: { Tx: true, Ty: true, Tz: true, Rx: true, Ry: true, Rz: true },
    };

    const node2: Node3D = {
      id: 'n2',
      x: 0,
      y: 0,
      z: L,
    };

    const elem: Element3D = {
      id: 'c1',
      startNodeId: 'n1',
      endNodeId: 'n2',
      section: { area: A, Iyy: I, Izz: I, J, Asy: 0, Asz: 0 },
      material: { E, nu: 0.3 },
    };

    const P_axial = -0.20 * P_cr; // -394,784 N
    const H_lateral = 10000; // 10 kN

    const model: SpaceFrameModel3D = {
      nodes: [node1, node2],
      elements: [elem],
      nodalLoads: [{ nodeId: 'n2', Fx: H_lateral, Fz: P_axial }],
    };

    const result = PDeltaSolver3D.solve(model, { convergenceTolerance: 1e-4 });

    expect(result.metrics.converged).toBe(true);
    expect(result.iterations.length).toBeGreaterThanOrEqual(1);

    // 1. 1st-order lateral displacement: Delta_1 = H * L^3 / (3 * E * I)
    const delta1_expected = (H_lateral * Math.pow(L, 3)) / (3 * E * I); // 0.020833 m
    const d1 = result.firstOrderDisplacements.get('n2')!;
    expect(d1.dx).toBeCloseTo(delta1_expected, 4);

    // 2. 2nd-order lateral displacement: Delta_2 should be amplified by ~1 / (1 - P/P_cr) = 1.25
    const d2 = result.secondOrderDisplacements.get('n2')!;
    expect(d2.dx).toBeGreaterThan(d1.dx);

    const ampRatio = d2.dx / d1.dx;
    // Classical approximate amplification factor B2 = 1 / (1 - P/P_cr) = 1 / 0.8 = 1.25
    expect(ampRatio).toBeGreaterThan(1.20);
    expect(ampRatio).toBeLessThan(1.30);

    // 3. Stability diagnostics
    expect(result.stabilityDiagnostics.stabilityIndexTheta).toBeGreaterThan(0.15);
    expect(result.stabilityDiagnostics.aiscCompliance).toBe('SECOND_ORDER_MANDATORY');
  });

  it('verifies tension stiffening decreases lateral deflection under axial tension', () => {
    // Column under axial tension (P > 0) stiffens the element against lateral deflection
    const L = 5.0;
    const E = 200e9;
    const I = 1.0e-4;
    const A = 0.01;
    const J = 2.0e-5;

    const node1: Node3D = {
      id: 'n1',
      x: 0,
      y: 0,
      z: 0,
      restraints: { Tx: true, Ty: true, Tz: true, Rx: true, Ry: true, Rz: true },
    };
    const node2: Node3D = { id: 'n2', x: 0, y: 0, z: L };
    const elem: Element3D = {
      id: 'c1',
      startNodeId: 'n1',
      endNodeId: 'n2',
      section: { area: A, Iyy: I, Izz: I, J },
      material: { E, nu: 0.3 },
    };

    const model: SpaceFrameModel3D = {
      nodes: [node1, node2],
      elements: [elem],
      nodalLoads: [{ nodeId: 'n2', Fx: 10000, Fz: 500000 }], // 500 kN tension
    };

    const result = PDeltaSolver3D.solve(model);
    expect(result.metrics.converged).toBe(true);

    const d1 = result.firstOrderDisplacements.get('n2')!;
    const d2 = result.secondOrderDisplacements.get('n2')!;

    // Under tension, second-order deflection is smaller than first-order
    expect(d2.dx).toBeLessThan(d1.dx);
  });
});
