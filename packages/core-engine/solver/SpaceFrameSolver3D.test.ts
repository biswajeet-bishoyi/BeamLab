import { describe, it, expect } from 'vitest';
import {
  SpaceFrameSolver3D,
  type SpaceFrameModel3D,
  type Node3D,
  type Element3D,
} from './SpaceFrameSolver3D';

describe('SpaceFrameSolver3D — 12-DOF Spatial Frame Kernel', () => {
  it('solves 3D cantilever beam under vertical tip point load (Euler-Bernoulli bending)', () => {
    // 6m cantilever along X-axis, fixed at Node 1 (0, 0, 0), tip at Node 2 (6, 0, 0)
    // Vertical load Fz = -10,000 N at tip
    const L = 6.0;
    const E = 200e9; // 200 GPa
    const Iyy = 1.0e-4; // 10000 cm^4
    const Izz = 1.0e-4;
    const A = 0.01;
    const J = 2.0e-5;

    const node1: Node3D = {
      id: 'n1',
      x: 0,
      y: 0,
      z: 0,
      restraints: { Tx: true, Ty: true, Tz: true, Rx: true, Ry: true, Rz: true },
    };

    const node2: Node3D = {
      id: 'n2',
      x: L,
      y: 0,
      z: 0,
    };

    const elem: Element3D = {
      id: 'e1',
      startNodeId: 'n1',
      endNodeId: 'n2',
      section: { area: A, Iyy, Izz, J, Asy: 0, Asz: 0 }, // pure bending without shear lag
      material: { E, nu: 0.3 },
    };

    const model: SpaceFrameModel3D = {
      nodes: [node1, node2],
      elements: [elem],
      nodalLoads: [{ nodeId: 'n2', Fz: -10000 }],
    };

    const result = SpaceFrameSolver3D.solve(model);

    // 1. Analytical tip vertical deflection: delta = P * L^3 / (3 * E * Iyy)
    const expectedDefl = (-10000 * Math.pow(L, 3)) / (3 * E * Iyy); // -0.036 m = -36 mm
    const dispTip = result.displacements.get('n2')!;
    expect(dispTip.dz).toBeCloseTo(expectedDefl, 5);

    // 2. Analytical tip rotation: theta = P * L^2 / (2 * E * Iyy)
    const expectedTheta = (-10000 * Math.pow(L, 2)) / (2 * E * Iyy);
    expect(dispTip.ry).toBeCloseTo(-expectedTheta, 5);

    // 3. Reactions at fixed base
    const r1 = result.reactions.get('n1')!;
    expect(r1.Fz).toBeCloseTo(10000, 2); // balances 10 kN downward
    expect(r1.My).toBeCloseTo(-60000, 2); // balances applied moment P * L = +60 kNm about Y

    // 4. Global equilibrium
    expect(result.equilibriumAudit.isEquilibrated).toBe(true);
  });

  it('solves 3D cantilever beam under pure tip torsion (Saint-Venant J)', () => {
    const L = 5.0;
    const E = 200e9;
    const nu = 0.3;
    const G = E / (2 * (1 + nu)); // 76.92 GPa
    const J = 2.5e-5; // m^4
    const T = 8000; // 8 kN*m torque about longitudinal X axis

    const node1: Node3D = {
      id: 'n1',
      x: 0,
      y: 0,
      z: 0,
      restraints: { Tx: true, Ty: true, Tz: true, Rx: true, Ry: true, Rz: true },
    };

    const node2: Node3D = {
      id: 'n2',
      x: L,
      y: 0,
      z: 0,
    };

    const elem: Element3D = {
      id: 'e1',
      startNodeId: 'n1',
      endNodeId: 'n2',
      section: { area: 0.01, Iyy: 1e-4, Izz: 1e-4, J },
      material: { E, nu },
    };

    const model: SpaceFrameModel3D = {
      nodes: [node1, node2],
      elements: [elem],
      nodalLoads: [{ nodeId: 'n2', Mx: T }],
    };

    const result = SpaceFrameSolver3D.solve(model);

    // Analytical twist angle: theta_x = T * L / (G * J)
    const expectedTwist = (T * L) / (G * J);
    const dispTip = result.displacements.get('n2')!;
    expect(dispTip.rx).toBeCloseTo(expectedTwist, 5);

    // Reaction torque at base
    const r1 = result.reactions.get('n1')!;
    expect(r1.Mx).toBeCloseTo(-T, 2);
    expect(result.equilibriumAudit.isEquilibrated).toBe(true);
  });

  it('solves 3D spatial L-frame with combined bending and torsion coupling', () => {
    // Member 1: along X from (0,0,0) to (4,0,0)
    // Member 2: along Y from (4,0,0) to (4,3,0)
    // Node 1 is fixed. Node 3 has vertical out-of-plane load Fz = -5,000 N
    const node1: Node3D = {
      id: 'n1',
      x: 0,
      y: 0,
      z: 0,
      restraints: { Tx: true, Ty: true, Tz: true, Rx: true, Ry: true, Rz: true },
    };
    const node2: Node3D = { id: 'n2', x: 4, y: 0, z: 0 };
    const node3: Node3D = { id: 'n3', x: 4, y: 3, z: 0 };

    const elem1: Element3D = {
      id: 'e1',
      startNodeId: 'n1',
      endNodeId: 'n2',
      section: { area: 0.01, Iyy: 1e-4, Izz: 1e-4, J: 2e-5 },
      material: { E: 200e9, nu: 0.3 },
    };

    const elem2: Element3D = {
      id: 'e2',
      startNodeId: 'n2',
      endNodeId: 'n3',
      section: { area: 0.01, Iyy: 1e-4, Izz: 1e-4, J: 2e-5 },
      material: { E: 200e9, nu: 0.3 },
    };

    const model: SpaceFrameModel3D = {
      nodes: [node1, node2, node3],
      elements: [elem1, elem2],
      nodalLoads: [{ nodeId: 'n3', Fz: -5000 }],
    };

    const result = SpaceFrameSolver3D.solve(model);

    // Tip node 3 deflects downward
    const disp3 = result.displacements.get('n3')!;
    expect(disp3.dz).toBeLessThan(0);

    // Fixed reaction at node 1
    const r1 = result.reactions.get('n1')!;
    expect(r1.Fz).toBeCloseTo(5000, 2); // balances vertical load
    // Moment about X: load at y=3m produces torque T_x = 5000 * 3 = 15,000 Nm
    expect(Math.abs(r1.Mx)).toBeCloseTo(15000, 1);

    expect(result.equilibriumAudit.isEquilibrated).toBe(true);
  });
});
