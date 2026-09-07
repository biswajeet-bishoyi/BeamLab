import { describe, it, expect } from 'vitest';
import {
  createNodeDisplacement,
  createSupportReaction,
  createNodeResult,
  createMemberForceSeries,
  createMemberMomentSeries,
  createMemberStressSeries,
  createMemberStrainSeries,
  createMemberResult,
  CanonicalAnalysisResult,
  ResultRegistry,
  ResultConvergenceRule,
  StationContinuityRule,
  StaticsEquilibriumRule,
  AnalysisCaseResult,
  EnvelopeResult,
  ModalResult,
  BucklingResult,
} from './index';
import { ValidationContext } from '../validation/ValidationEngine';

describe('B1.4 Results Domain — Unit Tests', () => {
  it('should construct node displacement and reaction results accurately', () => {
    const disp = createNodeDisplacement('n-1', 0.002, -0.015, 0, 0, 0, 0.004);
    expect(disp.nodeId).toBe('n-1');
    expect(disp.translation.x).toBe(0.002);
    expect(disp.translation.y).toBe(-0.015);
    expect(disp.translationMagnitude).toBeCloseTo(Math.sqrt(0.002 ** 2 + 0.015 ** 2), 6);
    expect(disp.rotationMagnitude).toBe(0.004);

    const rxn = createSupportReaction('n-1', 0, 45000, 0, 0, 0, 12000, 'sup-1');
    expect(rxn.force.fy).toBe(45000);
    expect(rxn.moment.mz).toBe(12000);
    expect(rxn.forceMagnitude).toBe(45000);
    expect(rxn.momentMagnitude).toBe(12000);

    const nodeRes = createNodeResult('n-1', disp, rxn);
    expect(nodeRes.nodeId).toBe('n-1');
    expect(nodeRes.reaction?.force.fy).toBe(45000);
  });

  it('should construct member force, moment, stress, and deflection results', () => {
    const forces = createMemberForceSeries('m-1', [
      { position: 0.0, distance: 0.0, axial: 1000, shearY: 25000, shearZ: 0 },
      { position: 0.5, distance: 2.5, axial: 1000, shearY: 0, shearZ: 0 },
      { position: 1.0, distance: 5.0, axial: 1000, shearY: -25000, shearZ: 0 },
    ]);
    expect(forces.maxShearY).toBe(25000);
    expect(forces.minShearY).toBe(-25000);
    expect(forces.maxAxial).toBe(1000);

    const moments = createMemberMomentSeries('m-1', [
      { position: 0.0, distance: 0.0, torsion: 0, momentY: 0, momentZ: 0 },
      { position: 0.5, distance: 2.5, torsion: 0, momentY: 0, momentZ: 31250 },
      { position: 1.0, distance: 5.0, torsion: 0, momentY: 0, momentZ: 0 },
    ]);
    expect(moments.maxBendingZ).toBe(31250);
    expect(moments.minBendingZ).toBe(0);

    const stresses = createMemberStressSeries('m-1', [
      { position: 0.0, distance: 0.0, axialStress: 1e6, bendingStressTop: -50e6, bendingStressBottom: 50e6, shearStress: 15e6, vonMisesMax: 56e6 },
      { position: 0.5, distance: 2.5, axialStress: 1e6, bendingStressTop: -120e6, bendingStressBottom: 120e6, shearStress: 0, vonMisesMax: 121e6 },
    ]);
    expect(stresses.peakVonMises).toBe(121e6);
    expect(stresses.peakBendingStress).toBe(120e6);

    const strains = createMemberStrainSeries('m-1', [
      { position: 0.0, distance: 0.0, axialStrain: 5e-6, bendingStrainTop: -2.5e-4, bendingStrainBottom: 2.5e-4, shearStrain: 1e-4, equivalentStrain: 2.6e-4 },
    ]);
    expect(strains.peakEquivalentStrain).toBe(2.6e-4);

    const deflections = {
      stations: [
        { position: 0.0, distance: 0.0, deflection: { x: 0, y: 0, z: 0 }, deflectionMagnitude: 0 },
        { position: 0.5, distance: 2.5, deflection: { x: 0, y: -0.0082, z: 0 }, deflectionMagnitude: 0.0082 },
        { position: 1.0, distance: 5.0, deflection: { x: 0, y: 0, z: 0 }, deflectionMagnitude: 0 },
      ],
      maxDeflection: 0.0082,
      maxDeflectionPosition: 0.5,
    };

    const memberRes = createMemberResult('m-1', 5.0, forces, moments, deflections, stresses, strains);
    expect(memberRes.length).toBe(5.0);
    expect(memberRes.extremes.maxBendingMoment).toBe(31250);
    expect(memberRes.extremes.maxShearForce).toBe(25000);
    expect(memberRes.extremes.maxDeflection).toBe(0.0082);
    expect(memberRes.extremes.maxStress).toBe(121e6);
  });

  it('should support modal and buckling results', () => {
    const modal: ModalResult = {
      analysisCaseId: 'case-modal-1',
      totalMassKg: 12500,
      governingMode: 1,
      fundamentalPeriodSec: 0.45,
      modes: [
        {
          modeNumber: 1,
          frequencyHz: 2.22,
          frequencyRadPerSec: 13.95,
          periodSec: 0.45,
          modalMassKg: 10200,
          participationFactorX: 0.85,
          participationFactorY: 0.05,
          participationFactorZ: 0.0,
          cumulativeMassRatioX: 0.816,
          cumulativeMassRatioY: 0.004,
          cumulativeMassRatioZ: 0.0,
          modeShape: [{ nodeId: 'n-1', eigenvector: { x: 1.0, y: 0.05, z: 0 } }],
        },
      ],
    };
    expect(modal.modes[0]?.frequencyHz).toBe(2.22);

    const buckling: BucklingResult = {
      analysisCaseId: 'case-buckling-1',
      criticalLoadFactor: 3.42,
      governingMode: 1,
      modes: [
        {
          modeNumber: 1,
          loadFactor: 3.42,
          modeShape: [{ nodeId: 'n-1', eigenvector: { x: 0, y: 1.0, z: 0 } }],
        },
      ],
    };
    expect(buckling.criticalLoadFactor).toBe(3.42);
  });

  it('should manage analysis result lifecycle states', () => {
    const res = new CanonicalAnalysisResult({
      id: 'res-1',
      name: 'Linear Static Solution',
      solverId: 'direct-stiffness-v1',
      solverVersion: '1.0.0',
      modelRevisionNumber: 2,
    });

    expect(res.status).toBe('Pending');

    res.markRunning();
    expect(res.status).toBe('Running');

    res.markCompleted({ executionTimeMs: 142 });
    expect(res.status).toBe('Completed');
    expect(res.convergence.executionTimeMs).toBe(142);

    res.invalidate('Member M-2 section geometry modified');
    expect(res.status).toBe('Invalidated');
    expect(res.invalidationReason).toContain('M-2');

    res.markSuperseded('res-2');
    expect(res.status).toBe('Superseded');
    expect(res.supersededById).toBe('res-2');
  });

  it('should register and query results in ResultRegistry', () => {
    const registry = new ResultRegistry();
    const res1 = new CanonicalAnalysisResult({
      id: 'res-1',
      name: 'Run 1',
      solverId: 'solver-a',
      solverVersion: '1.0.0',
      modelRevisionNumber: 1,
      status: 'Completed',
    });
    const res2 = new CanonicalAnalysisResult({
      id: 'res-2',
      name: 'Run 2',
      solverId: 'solver-a',
      solverVersion: '1.0.0',
      modelRevisionNumber: 2,
      status: 'Completed',
    });

    registry.register(res1);
    registry.register(res2, true);

    expect(registry.count).toBe(2);
    expect(registry.getActive()?.identity.id).toBe('res-2');
    expect(registry.getByStatus('Completed')).toHaveLength(2);

    registry.invalidateAll('Structural system updated');
    expect(registry.getByStatus('Invalidated')).toHaveLength(2);
  });

  it('should evaluate ResultConvergenceRule and StationContinuityRule', () => {
    const dummyContext: ValidationContext = { resolve: () => undefined };

    // 1. Convergence rule test
    const res = new CanonicalAnalysisResult({
      id: 'res-bad',
      name: 'Diverged Run',
      solverId: 'solver-nr',
      solverVersion: '1.0.0',
      modelRevisionNumber: 1,
      status: 'Completed',
      convergence: { converged: false, terminationReason: 'Max iterations exceeded' },
    });

    const convRule = new ResultConvergenceRule();
    const convDiags = convRule.evaluate(res, dummyContext);
    expect(convDiags).toHaveLength(1);
    expect(convDiags[0]?.code).toBe('RES-VAL-CONV001');

    // 2. Station continuity rule test
    const badForces = createMemberForceSeries('m-1', [
      { position: 0.8, distance: 4.0, axial: 0, shearY: 0, shearZ: 0 },
      { position: 0.2, distance: 1.0, axial: 0, shearY: 0, shearZ: 0 }, // non-monotonic!
    ]);
    const badMemberRes = createMemberResult(
      'm-1',
      5.0,
      badForces,
      createMemberMomentSeries('m-1', []),
      { stations: [], maxDeflection: 0, maxDeflectionPosition: 0 },
    );

    const caseRes: AnalysisCaseResult = {
      caseId: 'case-1',
      caseName: 'DL',
      category: 'LinearStatic',
      nodeResults: new Map(),
      memberResults: new Map([['m-1', badMemberRes]]),
      maxSystemDisplacement: { nodeId: 'n-1', magnitude: 0 },
      maxSystemMoment: { memberId: 'm-1', magnitude: 0 },
      maxSystemShear: { memberId: 'm-1', magnitude: 0 },
    };

    res.addCaseResult(caseRes);

    const stationRule = new StationContinuityRule();
    const stationDiags = stationRule.evaluate(res, dummyContext);
    expect(stationDiags).toHaveLength(1);
    expect(stationDiags[0]?.code).toBe('RES-VAL-STA001');
  });
});
