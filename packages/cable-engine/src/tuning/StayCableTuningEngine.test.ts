import { describe, it, expect } from 'vitest';
import { StayCableTuningEngine } from './StayCableTuningEngine';
import { StayCableDefinition, DeckStationPoint } from './types';
import { STANDARD_CABLE_MATERIALS, STANDARD_CABLE_SECTIONS } from '../catenary/CableCatalog';
import { ErnstModulusEngine } from '../ernst/ErnstModulusEngine';

describe('Sprint B18.3 — Stay Cable Initial Tension Optimization & Tuning Engine', () => {
  const matPws = STANDARD_CABLE_MATERIALS.BRIDGE_STRAND_1860;
  const secStay80 = STANDARD_CABLE_SECTIONS[3]; // breaking load = 8.65 MN

  // Setup 4 stay cables: 2 side span backstays (S1, S2) and 2 main span forestays (M1, M2)
  const cables: StayCableDefinition[] = [
    {
      id: 'STAY_S2',
      name: 'Outer Backstay S2',
      geometry: ErnstModulusEngine.createGeometry('S2', -100, 0, 0, 75), // span 100m, height 75m
      section: secStay80,
      material: matPws,
      deckAttachmentIndex: 0,
      towerAttachmentHeight: 75,
    },
    {
      id: 'STAY_S1',
      name: 'Inner Backstay S1',
      geometry: ErnstModulusEngine.createGeometry('S1', -50, 0, 0, 50), // span 50m, height 50m
      section: secStay80,
      material: matPws,
      deckAttachmentIndex: 1,
      towerAttachmentHeight: 50,
    },
    {
      id: 'STAY_M1',
      name: 'Inner Fore-stay M1',
      geometry: ErnstModulusEngine.createGeometry('M1', 50, 0, 0, 50), // span 50m, height 50m
      section: secStay80,
      material: matPws,
      deckAttachmentIndex: 2,
      towerAttachmentHeight: 50,
    },
    {
      id: 'STAY_M2',
      name: 'Outer Fore-stay M2',
      geometry: ErnstModulusEngine.createGeometry('M2', 100, 0, 0, 75), // span 100m, height 75m
      section: secStay80,
      material: matPws,
      deckAttachmentIndex: 3,
      towerAttachmentHeight: 75,
    },
  ];

  it('computes initial tensions via Zero-Displacement Rigid Support Method', () => {
    const deadLoadPerMeter = 85_000; // 85 kN/m (deck concrete + steel box girder + surfacing)
    const tributaryLengths = [25, 25, 25, 25]; // 25m tributary for each stay

    const tuningItems = StayCableTuningEngine.solveZeroDisplacementTensions(
      cables,
      deadLoadPerMeter,
      tributaryLengths
    );

    expect(tuningItems.length).toBe(4);

    tuningItems.forEach((item, idx) => {
      // Required tributary dead load vertical lift = 85,000 * 25 = 2.125 MN
      expect(item.verticalLiftForce).toBeCloseTo(2_125_000, -2);
      expect(item.optimalTension).toBeGreaterThan(item.verticalLiftForce);

      // Verify stress is in allowable PTI envelope: 0.15 to 0.45 of f_pu
      expect(item.stressRatioGuts).toBeGreaterThanOrEqual(0.15);
      expect(item.stressRatioGuts).toBeLessThanOrEqual(0.45);
      expect(item.safetyFactor).toBeGreaterThanOrEqual(2.2); // Safety factor >= 2.22 (1 / 0.45)
    });

    // Check symmetry: S1 and M1 should have identical tensions and horizontal forces
    expect(tuningItems[1].optimalTension).toBeCloseTo(tuningItems[2].optimalTension, 1);
    expect(tuningItems[0].optimalTension).toBeCloseTo(tuningItems[3].optimalTension, 1);

    // Tower net horizontal force from inner stays should cancel by symmetry
    const netInnerTowerHoriz = tuningItems[1].horizontalForce - tuningItems[2].horizontalForce;
    expect(Math.abs(netInnerTowerHoriz)).toBeLessThan(1.0);
  });

  it('optimizes stay tensions to eliminate deck dead load bending moments', () => {
    // 5 Evaluation stations along main span girder
    const stations: DeckStationPoint[] = [
      { id: 'st_0', x: 20, deadLoadMoment: 12_000, deadLoadDeflection: 0.08 },
      { id: 'st_1', x: 40, deadLoadMoment: 24_000, deadLoadDeflection: 0.18 },
      { id: 'st_2', x: 60, deadLoadMoment: 28_000, deadLoadDeflection: 0.22 },
      { id: 'st_3', x: 80, deadLoadMoment: 20_000, deadLoadDeflection: 0.15 },
      { id: 'st_4', x: 100, deadLoadMoment: 8_000, deadLoadDeflection: 0.05 },
    ];

    // Influence matrices: Unit tension in M1 and M2 produces upward counteracting (negative) moment
    const momentMatrix: number[][] = [
      [-0.004, -0.001],
      [-0.008, -0.003],
      [-0.006, -0.007],
      [-0.002, -0.009],
      [-0.001, -0.004],
    ];

    const deflMatrix: number[][] = [
      [-3e-8, -1e-8],
      [-6e-8, -2e-8],
      [-5e-8, -5e-8],
      [-2e-8, -6e-8],
      [-1e-8, -3e-8],
    ];

    const optResult = StayCableTuningEngine.optimizeStayTensions(
      [cables[2], cables[3]], // Main span cables M1, M2
      stations,
      momentMatrix,
      deflMatrix,
      { maxIterations: 100 }
    );

    expect(optResult.converged).toBe(true);
    expect(optResult.cables.length).toBe(2);
    expect(optResult.totalPrestressTension).toBeGreaterThan(0);

    // Bending moments should be substantially relieved
    expect(optResult.maxMomentReductionPercent).toBeGreaterThan(50);
    expect(optResult.maxDeflectionReductionPercent).toBeGreaterThan(50);
  });

  it('throws an error if input arrays have mismatched lengths', () => {
    expect(() => {
      StayCableTuningEngine.solveZeroDisplacementTensions(cables, 50000, [10, 20]);
    }).toThrow(/Mismatch: cables count/);
  });
});
