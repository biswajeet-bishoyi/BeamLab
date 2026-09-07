import { describe, it, expect } from 'vitest';
import {
  TensionOnlySolver3D,
  type NonLinearModel3D,
  type NonLinearElement3D,
} from './TensionOnlySolver3D';
import type { Node3D } from './SpaceFrameSolver3D';

describe('TensionOnlySolver3D — Tension-Only & Compression-Only Non-Linear Solver', () => {
  it('solves X-braced frame under lateral shear: tension diagonal carries load, compression diagonal goes slack', () => {
    // 4m wide x 3m high bay in XZ plane (Y = 0)
    // Node 1: (0, 0, 0) pinned base
    // Node 2: (4, 0, 0) pinned base
    // Node 3: (0, 0, 3) top left
    // Node 4: (4, 0, 3) top right
    const node1: Node3D = {
      id: 'n1',
      x: 0,
      y: 0,
      z: 0,
      restraints: { Tx: true, Ty: true, Tz: true, Rx: true, Ry: true, Rz: true },
    };
    const node2: Node3D = {
      id: 'n2',
      x: 4,
      y: 0,
      z: 0,
      restraints: { Tx: true, Ty: true, Tz: true, Rx: true, Ry: true, Rz: true },
    };
    const node3: Node3D = { id: 'n3', x: 0, y: 0, z: 3 };
    const node4: Node3D = { id: 'n4', x: 4, y: 0, z: 3 };

    // Section for frame members (IPE 200 equivalent)
    const frameSection = { area: 0.003, Iyy: 1.4e-5, Izz: 1.4e-5, J: 5e-7 };
    // Slender rod cross-bracing (A = 200 mm^2)
    const braceSection = { area: 0.0002, Iyy: 1e-8, Izz: 1e-8, J: 1e-8 };

    const material = { E: 200e9, nu: 0.3 };

    // Columns & Beam
    const colL: NonLinearElement3D = {
      id: 'colL',
      startNodeId: 'n1',
      endNodeId: 'n3',
      section: frameSection,
      material,
      behaviorType: 'standard',
    };
    const colR: NonLinearElement3D = {
      id: 'colR',
      startNodeId: 'n2',
      endNodeId: 'n4',
      section: frameSection,
      material,
      behaviorType: 'standard',
    };
    const beamTop: NonLinearElement3D = {
      id: 'beamTop',
      startNodeId: 'n3',
      endNodeId: 'n4',
      section: frameSection,
      material,
      behaviorType: 'standard',
    };

    // Diagonal A (1 to 4: tension under +X push)
    const diagA: NonLinearElement3D = {
      id: 'diagA',
      startNodeId: 'n1',
      endNodeId: 'n4',
      section: braceSection,
      material,
      behaviorType: 'tension-only',
    };

    // Diagonal B (2 to 3: compression under +X push -> should go slack)
    const diagB: NonLinearElement3D = {
      id: 'diagB',
      startNodeId: 'n2',
      endNodeId: 'n3',
      section: braceSection,
      material,
      behaviorType: 'tension-only',
    };

    // Apply lateral force H = +20 kN at top node 3
    const H_lateral = 20000;
    const model: NonLinearModel3D = {
      nodes: [node1, node2, node3, node4],
      elements: [colL, colR, beamTop, diagA, diagB],
      nodalLoads: [{ nodeId: 'n3', Fx: H_lateral }],
    };

    const result = TensionOnlySolver3D.solve(model);

    expect(result.converged).toBe(true);
    expect(result.slackCount).toBe(1);

    const stateA = result.elementStates.get('diagA')!;
    const stateB = result.elementStates.get('diagB')!;

    // Diagonal A must be active in tension
    expect(stateA.isActive).toBe(true);
    expect(stateA.status).toBe('TENSION_ACTIVE');
    expect(stateA.axialForce).toBeGreaterThan(10000); // Takes majority of horizontal shear

    // Diagonal B must be deactivated (slack)
    expect(stateB.isActive).toBe(false);
    expect(stateB.status).toBe('SLACK_DEACTIVATED');
    expect(Math.abs(stateB.axialForce)).toBeLessThan(100); // Virtually zero force
  });

  it('correctly alternates active diagonal when lateral load direction is reversed', () => {
    // Same bay, but lateral force is -20 kN (pushing left)
    const node1: Node3D = {
      id: 'n1',
      x: 0,
      y: 0,
      z: 0,
      restraints: { Tx: true, Ty: true, Tz: true, Rx: true, Ry: true, Rz: true },
    };
    const node2: Node3D = {
      id: 'n2',
      x: 4,
      y: 0,
      z: 0,
      restraints: { Tx: true, Ty: true, Tz: true, Rx: true, Ry: true, Rz: true },
    };
    const node3: Node3D = { id: 'n3', x: 0, y: 0, z: 3 };
    const node4: Node3D = { id: 'n4', x: 4, y: 0, z: 3 };

    const frameSection = { area: 0.003, Iyy: 1.4e-5, Izz: 1.4e-5, J: 5e-7 };
    const braceSection = { area: 0.0002, Iyy: 1e-8, Izz: 1e-8, J: 1e-8 };
    const material = { E: 200e9, nu: 0.3 };

    const colL: NonLinearElement3D = { id: 'colL', startNodeId: 'n1', endNodeId: 'n3', section: frameSection, material };
    const colR: NonLinearElement3D = { id: 'colR', startNodeId: 'n2', endNodeId: 'n4', section: frameSection, material };
    const beamTop: NonLinearElement3D = { id: 'beamTop', startNodeId: 'n3', endNodeId: 'n4', section: frameSection, material };
    const diagA: NonLinearElement3D = { id: 'diagA', startNodeId: 'n1', endNodeId: 'n4', section: braceSection, material, behaviorType: 'tension-only' };
    const diagB: NonLinearElement3D = { id: 'diagB', startNodeId: 'n2', endNodeId: 'n3', section: braceSection, material, behaviorType: 'tension-only' };

    // Push left (-20 kN) at Node 4
    const model: NonLinearModel3D = {
      nodes: [node1, node2, node3, node4],
      elements: [colL, colR, beamTop, diagA, diagB],
      nodalLoads: [{ nodeId: 'n4', Fx: -20000 }],
    };

    const result = TensionOnlySolver3D.solve(model);

    expect(result.converged).toBe(true);

    const stateA = result.elementStates.get('diagA')!;
    const stateB = result.elementStates.get('diagB')!;

    // Now Diagonal B must be active in tension, and Diagonal A must be slack!
    expect(stateB.isActive).toBe(true);
    expect(stateB.status).toBe('TENSION_ACTIVE');
    expect(stateB.axialForce).toBeGreaterThan(10000);

    expect(stateA.isActive).toBe(false);
    expect(stateA.status).toBe('SLACK_DEACTIVATED');
  });
});
