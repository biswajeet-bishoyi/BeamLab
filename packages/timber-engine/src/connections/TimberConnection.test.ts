import { describe, it, expect } from 'vitest';
import {
  JohansenYieldEngine,
  FastenerGroupActionEngine,
  TimberFireCharringEngine,
} from './index';

describe('Sprint B14.4: Timber Fastener & Connection Yield Engine (EYM Johansen & Fire Charring)', () => {
  it('should compute characteristic fastener yield moment M_y,Rk accurately', () => {
    // 12 mm grade 4.6 bolt (fu_k = 400 MPa)
    const My_12 = JohansenYieldEngine.computeYieldMoment(12, 400);
    // My_Rk = 0.3 * 400 * 12^2.6 = 120 * 639.2 = 76,704 N*mm
    expect(My_12).toBeCloseTo(76704, -2);

    // 16 mm grade 8.8 bolt (fu_k = 800 MPa)
    const My_16 = JohansenYieldEngine.computeYieldMoment(16, 800);
    expect(My_16).toBeGreaterThan(My_12 * 2);
  });

  it('should evaluate wood embedment strength with Hankinson angle reduction', () => {
    // 12mm bolt in C24 softwood (density = 420 kg/m³)
    const fh0 = JohansenYieldEngine.computeEmbedmentStrength(12, 420, 0, 'BOLT');
    // fh0 = 0.082 * (1 - 0.01 * 12) * 420 = 0.082 * 0.88 * 420 = 30.3 MPa
    expect(fh0).toBeCloseTo(30.3, 1);

    // Perpendicular to grain (90 degrees)
    const fh90 = JohansenYieldEngine.computeEmbedmentStrength(12, 420, 90, 'BOLT');
    expect(fh90).toBeLessThan(fh0);
    expect(fh90).toBeGreaterThan(15.0);
  });

  it('should identify Johansen European Yield Model failure modes and ductility', () => {
    // Thick timber members with slender high-strength bolt (Mode IV expected: double plastic hinge)
    const ductileJoint = JohansenYieldEngine.evaluateSingleShearJoint({
      fastener: {
        type: 'BOLT',
        diameter: 12,
        fu_k: 800,
        length: 200,
        axialWithdrawalN: 8000,
      },
      t1: 100, // thick main member
      density1: 420,
      angleDeg1: 0,
      t2: 100, // thick side member
      density2: 420,
      angleDeg2: 0,
    });

    expect(ductileJoint.governingMode).toBe('MODE_IV');
    expect(ductileJoint.isDuctile).toBe(true);
    expect(ductileJoint.capacityN).toBeGreaterThan(5000);
    expect(ductileJoint.ropeEffectN).toBeGreaterThan(0);

    // Thin side member with thick stiff bolt (Mode I_s expected: wood crushing in thin side member)
    const brittleJoint = JohansenYieldEngine.evaluateSingleShearJoint({
      fastener: {
        type: 'DOWEL',
        diameter: 20,
        fu_k: 400,
        length: 120,
      },
      t1: 100,
      density1: 420,
      angleDeg1: 0,
      t2: 20, // very thin side member (20mm)
      density2: 420,
      angleDeg2: 0,
    });

    expect(brittleJoint.governingMode).toBe('MODE_I_s');
    expect(brittleJoint.isDuctile).toBe(false);
  });

  it('should compute fastener group effective number n_ef and check spacing rules', () => {
    const groupResult = FastenerGroupActionEngine.evaluateGroup(
      {
        fastenersPerRow: 4,
        numberOfRows: 2,
        diameter: 12,
        spacingAlongGrain: 80, // > 5*d = 60mm -> OK
        spacingPerpGrain: 40,  // > 3*d = 36mm -> OK
        endDistance: 90,       // > 7*d = 84mm -> OK
        edgeDistance: 40,      // > 3*d = 36mm -> OK
      },
      6500, // 6.5 kN per fastener
      0.80, // k_mod
      1.30, // gamma_M
      2     // Double shear
    );

    // 4 fasteners in row have n_ef < 4 due to group effect
    expect(groupResult.nef).toBeLessThan(4);
    expect(groupResult.nef).toBeGreaterThan(2.8);
    expect(groupResult.totalEffectiveFasteners).toBeGreaterThan(11);
    expect(groupResult.spacingChecks.allSpacingsOk).toBe(true);
    expect(groupResult.totalCapacityKN).toBeGreaterThan(40);
  });

  it('should model timber fire charring and residual bending resistance over time', () => {
    // 200 x 400 mm Glulam beam exposed to standard fire on 3 sides for 60 minutes
    const fire60 = TimberFireCharringEngine.evaluateFirePerformance({
      b: 200,
      d: 400,
      category: 'GLULAM',
      fireDurationMins: 60,
      exposureSides: 'THREE_SIDES',
      fm_k: 28.0,
    });

    // beta_0 = 0.65 mm/min; dchar0 = 0.65 * 60 = 39 mm
    expect(fire60.dchar0).toBeCloseTo(39, 1);
    // d_eff = 39 + 7 = 46 mm
    expect(fire60.deff).toBeCloseTo(46, 1);

    // Residual breadth: b_fi = 200 - 2 * 46 = 108 mm
    expect(fire60.b_fi).toBeCloseTo(108, 1);
    // Residual depth: d_fi = 400 - 46 = 354 mm
    expect(fire60.d_fi).toBeCloseTo(354, 1);

    expect(fire60.areaRetainedPercent).toBeGreaterThan(45);
    expect(fire60.fireBendingResistanceKNm).toBeGreaterThan(50);
    expect(fire60.hasIntegrity).toBe(true);
  });
});
