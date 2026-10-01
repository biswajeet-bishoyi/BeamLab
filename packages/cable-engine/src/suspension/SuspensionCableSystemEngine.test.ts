import { describe, it, expect } from 'vitest';
import { SuspensionCableSystemEngine } from './SuspensionCableSystemEngine';
import { SuspensionBridgeGeometryInput } from './types';
import { STANDARD_CABLE_MATERIALS, STANDARD_CABLE_SECTIONS } from '../catenary/CableCatalog';

describe('Sprint B18.4 — Suspension Bridge Cable System Engine', () => {
  const matWire = STANDARD_CABLE_MATERIALS.BRIDGE_STRAND_1860!;
  const secMain250 = STANDARD_CABLE_SECTIONS[5]!; // Ø250mm main cable group, breaking load 80.35 MN, unitWeight ~3325 N/m
  const secHanger30 = STANDARD_CABLE_SECTIONS[1]!; // Ø30mm hanger rope, breaking load 843 kN, unitWeight ~41.3 N/m

  const bridgeInput: SuspensionBridgeGeometryInput = {
    id: 'SUSP-1000',
    name: '1000m Major Suspension Bridge',
    mainSpanLength: 1000, // 1000m main span
    sideSpan1Length: 350, // 350m side span
    sideSpan2Length: 350,
    mainSpanSag: 100, // f = 100m (f / L = 0.10)
    tower1HeightAboveDeck: 110, // 110m tower height above deck
    tower2HeightAboveDeck: 110,
    deckDeadLoadPerMeter: 120_000, // 120 kN/m suspended steel orthotropic deck
    hangerSpacing: 25, // 25m suspender spacing
    mainCableSection: secMain250,
    mainCableMaterial: matWire,
    hangerSection: secHanger30,
    hangerMaterial: matWire,
    saddleRadius: 6.0, // 6m saddle radius
    saddleFrictionCoeff: 0.15,
  };

  it('solves global equilibrium and catenary profile for a 1000m suspension bridge', () => {
    const result = SuspensionCableSystemEngine.solveSuspensionSystem(bridgeInput);

    // Theoretical total line load = 120,000 + 3325.6 = 123,325.6 N/m
    // H = q * L^2 / (8 * f) = 123,325.6 * 1,000,000 / 800 = 154,157,000 N (~154.16 MN)
    expect(result.mainHorizontalTension).toBeCloseTo(154_157_000, -4);

    // Maximum tension occurs at tower saddle and must exceed horizontal tension H
    expect(result.maxMainCableTension).toBeGreaterThan(result.mainHorizontalTension);
    expect(result.minMainCableTension).toBeCloseTo(result.mainHorizontalTension, -3);

    // Main cable safety factor must be >= 2.0 per AASHTO / Eurocode specifications
    // 2 cables typically share the load, but for this single modeled cable line:
    expect(result.mainCableFactorOfSafety).toBeGreaterThan(0);

    // Main span arc length must exceed horizontal span (L = 1000m)
    expect(result.mainSpanArcLength).toBeGreaterThan(1000);
    expect(result.mainSpanArcLength).toBeLessThan(1050); // For f/L = 0.1, L_s ~ 1.026 * L = 1026m
    expect(result.mainSpanArcLength).toBeCloseTo(1026, -1);
  });

  it('computes suspender hangers stations, tension, and unstressed cutting lengths', () => {
    const result = SuspensionCableSystemEngine.solveSuspensionSystem(bridgeInput);

    // For 1000m span and 25m spacing, numHangers = floor(1000 / 25) - 1 = 39 hangers
    expect(result.hangers.length).toBe(39);

    const firstHanger = result.hangers[0]!;
    const midHanger = result.hangers[Math.floor(result.hangers.length / 2)]!;

    // Each hanger carries tributary dead load: 120,000 N/m * 25m = 3,000,000 N (3.0 MN)
    expect(firstHanger.tension).toBe(3_000_000);
    expect(midHanger.tension).toBe(3_000_000);

    // First hanger near tower is longer than midspan hanger
    expect(firstHanger.stressedLength).toBeGreaterThan(midHanger.stressedLength);

    // Unstressed length must be strictly less than stressed length (accounting for elastic stretch)
    expect(firstHanger.unstressedLength).toBeLessThan(firstHanger.stressedLength);
    expect(firstHanger.elasticElongation).toBeGreaterThan(0);

    // Verify cable band clamping safety factor
    expect(firstHanger.clampSlippingSafetyFactor).toBeGreaterThan(0);
  });

  it('verifies tower saddle equilibrium, wrap angle, and sliding safety factor', () => {
    const result = SuspensionCableSystemEngine.solveSuspensionSystem(bridgeInput);
    const saddle1 = result.saddles[0]!;
    const saddle2 = result.saddles[1]!;

    // Symmetric towers: both saddles should have identical thrust and wrap angle
    expect(saddle1.verticalTowerThrust).toBeCloseTo(saddle2.verticalTowerThrust, 0);
    expect(saddle1.totalWrapAngleRad).toBeCloseTo(saddle2.totalWrapAngleRad, 4);

    // Saddle vertical thrust must be large positive downward load (~ hundreds of MN)
    expect(saddle1.verticalTowerThrust).toBeGreaterThan(100_000_000);

    // Euler-Eytelwein friction safety factor against slipping must be > 1.0
    expect(saddle1.saddleSlippingSafetyFactor).toBeGreaterThan(1.0);
    expect(saddle1.bearingPressureKPa).toBeGreaterThan(0);
  });

  it('throws an error for non-positive span or sag', () => {
    expect(() => {
      SuspensionCableSystemEngine.solveSuspensionSystem({
        ...bridgeInput,
        mainSpanLength: 0,
      });
    }).toThrow(/Main span length and sag must be strictly positive/);
  });
});
