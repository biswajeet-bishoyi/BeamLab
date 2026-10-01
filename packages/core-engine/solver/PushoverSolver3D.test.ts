import { describe, it, expect } from 'vitest';
import {
  PushoverSolver3D,
  type SpaceFrameModel3D,
  type ElementHingeAssignment,
} from './PushoverSolver3D';

describe('PushoverSolver3D — ASCE 41-17 / FEMA 356 Non-Linear Pushover Engine', () => {
  it('correctly models plastic hinge formation and capacity curve on a cantilever column', () => {
    // Cantilever column of length L = 4.0 m
    // Elastic flexural stiffness: K_e = 3EI / L^3
    const E = 200e9; // 200 GPa
    const Izz = 8.3333e-5; // m^4
    const A = 0.01; // m^2
    const L = 4.0; // m
    const Mp = 200e3; // 200 kN*m

    // Theoretical yield base shear: Vy = Mp / L = 200,000 / 4 = 50,000 N (50 kN)
    // Theoretical yield displacement: Dy = Vy * L^3 / (3 * E * Izz) = 50,000 * 64 / (3 * 200e9 * 8.3333e-5) = 0.064 m (64 mm)

    const model: SpaceFrameModel3D = {
      nodes: [
        {
          id: 'N1',
          x: 0,
          y: 0,
          z: 0,
          restraints: { Tx: true, Ty: true, Tz: true, Rx: true, Ry: true, Rz: true },
        },
        {
          id: 'N2',
          x: 0,
          y: 0,
          z: L,
        },
      ],
      elements: [
        {
          id: 'COL1',
          startNodeId: 'N1',
          endNodeId: 'N2',
          section: {
            area: A,
            Iyy: Izz,
            Izz: Izz,
            J: 1e-4,
          },
          material: {
            E,
            nu: 0.3,
          },
        },
      ],
    };

    const hingeAssignments: ElementHingeAssignment[] = [
      {
        elementId: 'COL1',
        startHinge: {
          yieldMomentZ: Mp,
          yieldMomentY: Mp,
          strainHardeningRatio: 0.02,
          thetaYield: (Mp * L) / (6 * E * Izz),
          plasticRotations: { a: 0.03, b: 0.05, c: 0.2 },
          acceptanceCriteria: {
            thetaIO: 0.005,
            thetaLS: 0.02,
            thetaCP: 0.03,
          },
        },
      },
    ];

    // Push top node N2 to 0.10 m (beyond Dy = 0.064 m) in 25 steps
    const result = PushoverSolver3D.solve(model, {
      controlNodeId: 'N2',
      controlDirection: 'X',
      targetDisplacement: 0.10,
      numberOfSteps: 25,
      lateralLoadPattern: 'UNIFORM',
      hingeAssignments,
    });

    expect(result.metrics.converged).toBe(true);
    expect(result.steps.length).toBe(26); // step 0 + 25 steps

    // Verify first yield detection
    expect(result.firstYieldStep).toBeDefined();
    expect(result.firstYieldBaseShear).toBeDefined();
    expect(result.firstYieldDisplacement).toBeDefined();

    // Base shear near yield should be approximately 50 kN (+/- 5%)
    expect(result.firstYieldBaseShear!).toBeGreaterThan(45e3);
    expect(result.firstYieldBaseShear!).toBeLessThan(55e3);

    // Yield displacement should be near 0.064 m
    expect(result.firstYieldDisplacement!).toBeGreaterThan(0.055);
    expect(result.firstYieldDisplacement!).toBeLessThan(0.075);

    // Check post-yield slope: stiffness softens dramatically
    // Elastic slope: ~50 kN / 0.064 m = 781 kN/m
    // After yield, slope should be close to 2% strain hardening
    const stepPreYield = result.steps[result.firstYieldStep! - 1]!;
    const stepYield = result.steps[result.firstYieldStep!]!;
    const lastStep = result.steps[result.steps.length - 1]!;

    const elasticStiffness =
      (stepYield.baseShear - stepPreYield.baseShear) /
      (stepYield.controlDisplacement - stepPreYield.controlDisplacement);
    const postYieldStiffness =
      (lastStep.baseShear - stepYield.baseShear) /
      (lastStep.controlDisplacement - stepYield.controlDisplacement);

    expect(postYieldStiffness).toBeLessThan(elasticStiffness * 0.10); // at least 90% stiffness reduction

    // Verify plastic hinge status at the base
    const baseHingeAtEnd = lastStep.hingeStates.find(
      (h) => h.elementId === 'COL1' && h.location === 'start',
    );
    expect(baseHingeAtEnd).toBeDefined();
    expect(baseHingeAtEnd!.state).not.toBe('ELASTIC');
    expect(baseHingeAtEnd!.plasticRotation).toBeGreaterThan(0);

    // Verify bilinearization properties
    const bi = result.capacityCurve.bilinearization;
    expect(bi.effectiveYieldBaseShear).toBeGreaterThan(45e3);
    expect(bi.effectiveYieldBaseShear).toBeLessThan(55e3);
    expect(bi.ductilityFactor).toBeGreaterThan(1.2); // ductility achieved
    expect(bi.energyDissipated).toBeGreaterThan(1000); // positive dissipated hysteretic energy
  });

  it('evaluates sequential hinge yielding and performance level in a 2D/3D portal frame', () => {
    // 1-Bay 1-Story Frame:
    // Left column: (0,0,0) -> (0,0,3)
    // Right column: (4,0,0) -> (4,0,3)
    // Beam: (0,0,3) -> (4,0,3)
    const E = 200e9;
    const Icol = 1.0e-4;
    const Ibeam = 1.5e-4;
    const A = 0.01;
    const Mp = 150e3; // 150 kN*m

    const model: SpaceFrameModel3D = {
      nodes: [
        {
          id: 'N1',
          x: 0,
          y: 0,
          z: 0,
          restraints: { Tx: true, Ty: true, Tz: true, Rx: true, Ry: true, Rz: true },
        },
        {
          id: 'N2',
          x: 4,
          y: 0,
          z: 0,
          restraints: { Tx: true, Ty: true, Tz: true, Rx: true, Ry: true, Rz: true },
        },
        { id: 'N3', x: 0, y: 0, z: 3 },
        { id: 'N4', x: 4, y: 0, z: 3 },
      ],
      elements: [
        {
          id: 'COL1',
          startNodeId: 'N1',
          endNodeId: 'N3',
          section: { area: A, Iyy: Icol, Izz: Icol, J: 1e-4 },
          material: { E, nu: 0.3 },
        },
        {
          id: 'COL2',
          startNodeId: 'N2',
          endNodeId: 'N4',
          section: { area: A, Iyy: Icol, Izz: Icol, J: 1e-4 },
          material: { E, nu: 0.3 },
        },
        {
          id: 'BEAM1',
          startNodeId: 'N3',
          endNodeId: 'N4',
          section: { area: A, Iyy: Ibeam, Izz: Ibeam, J: 1e-4 },
          material: { E, nu: 0.3 },
        },
      ],
    };

    const hingeAssignments: ElementHingeAssignment[] = [
      {
        elementId: 'COL1',
        startHinge: { yieldMomentZ: Mp, strainHardeningRatio: 0.02 },
        endHinge: { yieldMomentZ: Mp, strainHardeningRatio: 0.02 },
      },
      {
        elementId: 'COL2',
        startHinge: { yieldMomentZ: Mp, strainHardeningRatio: 0.02 },
        endHinge: { yieldMomentZ: Mp, strainHardeningRatio: 0.02 },
      },
      {
        elementId: 'BEAM1',
        startHinge: { yieldMomentZ: Mp * 1.2, strainHardeningRatio: 0.02 },
        endHinge: { yieldMomentZ: Mp * 1.2, strainHardeningRatio: 0.02 },
      },
    ];

    const result = PushoverSolver3D.solve(model, {
      controlNodeId: 'N3',
      controlDirection: 'X',
      targetDisplacement: 0.08,
      numberOfSteps: 20,
      lateralLoadPattern: 'TRIANGULAR',
      hingeAssignments,
    });

    expect(result.metrics.converged).toBe(true);
    expect(result.capacityCurve.displacements.length).toBe(21);

    // Initial state: 100% elastic
    expect(result.steps[0]!.hingeSummary.elasticCount).toBe(6);

    // Final state: at least the column base hinges have yielded
    const finalStep = result.steps[result.steps.length - 1]!;
    expect(finalStep.hingeSummary.elasticCount).toBeLessThan(6);
    expect(
      finalStep.hingeSummary.yieldCount +
        finalStep.hingeSummary.ioCount +
        finalStep.hingeSummary.lsCount +
        finalStep.hingeSummary.cpCount,
    ).toBeGreaterThanOrEqual(2);

    // Structure performance level
    expect(['IMMEDIATE_OCCUPANCY', 'LIFE_SAFETY', 'COLLAPSE_PREVENTION']).toContain(
      result.overallPerformanceLevel,
    );

    // Bilinearization
    expect(result.capacityCurve.bilinearization.ductilityFactor).toBeGreaterThan(1.0);
    expect(result.capacityCurve.bilinearization.overstrengthFactor).toBeGreaterThanOrEqual(1.0);
  });
});
