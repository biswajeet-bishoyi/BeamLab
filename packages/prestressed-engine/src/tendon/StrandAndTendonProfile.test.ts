import { describe, it, expect } from 'vitest';
import { StrandCatalog } from './StrandCatalog.js';
import { TendonProfileEngine } from './TendonProfileEngine.js';

describe('StrandCatalog & TendonAssembly', () => {
  it('should retrieve standard ASTM A416 strands with accurate properties', () => {
    const strand05 = StrandCatalog.getStrand('ASTM-A416-0.5');
    expect(strand05.nominalDiameterMm).toBe(12.7);
    expect(strand05.nominalAreaMm2).toBe(98.7);
    expect(strand05.fpuMpa).toBe(1860);
    expect(strand05.fpyMpa).toBe(1674);
    expect(strand05.elasticModulusMpa).toBe(195000);

    const strand06 = StrandCatalog.getStrand('ASTM-A416-0.6');
    expect(strand06.nominalDiameterMm).toBe(15.24);
    expect(strand06.nominalAreaMm2).toBe(140.0);
  });

  it('should create multi-strand bonded tendon assembly and verify ACI jacking stress limits', () => {
    const assembly = StrandCatalog.createTendonAssembly({
      strandId: 'ASTM-A416-0.6',
      numberOfStrands: 12,
      systemType: 'bonded',
      jackingStressRatio: 0.75,
    });

    expect(assembly.numberOfStrands).toBe(12);
    expect(assembly.totalAreaMm2).toBe(12 * 140.0);
    expect(assembly.jackingStressMpa).toBe(0.75 * 1860);
    expect(assembly.jackingForceKn).toBeCloseTo((0.75 * 1860 * 1680) / 1000, 1);
    // Allowable jacking stress: min(0.80 * 1860, 0.94 * 1674) = min(1488, 1573.5) = 1488 MPa
    expect(assembly.maxAllowableJackingStressMpa).toBe(1488);
    expect(assembly.compliance.jackingStressPass).toBe(true);
    expect(assembly.compliance.utilization).toBeCloseTo((0.75 * 1860) / 1488, 3);
  });

  it('should handle unbonded single mono-strand tendon for post-tensioned slabs', () => {
    const assembly = StrandCatalog.createTendonAssembly({
      strandId: 'ASTM-A416-0.5',
      numberOfStrands: 1,
      systemType: 'unbonded',
      jackingStressRatio: 0.80,
    });

    expect(assembly.totalAreaMm2).toBe(98.7);
    expect(assembly.ductType).toBe('greased-pe-sheath');
    expect(assembly.compliance.jackingStressPass).toBe(true);
  });
});

describe('TendonProfileEngine', () => {
  it('should generate symmetrical parabolic tendon profile and verify coordinates and curvature', () => {
    const spanLengthM = 15;
    const yStartMm = 600;
    const yMidMm = 100;
    const yEndMm = 600;
    const yCgc = 450;

    const result = TendonProfileEngine.generateProfile({
      type: 'parabolic',
      spanLengthM,
      yStartMm,
      yMidMm,
      yEndMm,
      concreteCentroidYMm: yCgc,
    }, 31);

    expect(result.profileType).toBe('parabolic');
    expect(result.spanLengthM).toBe(15);
    expect(result.drapeMm).toBe(500); // 600 - 100
    expect(result.midspanEccentricityMm).toBe(100 - 450); // -350 mm

    // Test stations: x = 0, x = 7.5, x = 15
    const at0 = result.evaluateAt(0);
    expect(at0.yMm).toBeCloseTo(600, 1);
    expect(at0.eccentricityMm).toBeCloseTo(150, 1);

    const atMid = result.evaluateAt(7.5);
    expect(atMid.yMm).toBeCloseTo(100, 1);
    expect(atMid.slopeRad).toBeCloseTo(0, 4); // Zero slope at apex/lowest point

    const atEnd = result.evaluateAt(15);
    expect(atEnd.yMm).toBeCloseTo(600, 1);

    // Analytical curvature for parabola: 8 * sag / L^2 = 8 * 0.5 / 15^2 = 4 / 225 = 0.017778 m^-1
    expect(atMid.curvatureMInv).toBeCloseTo(4 / 225, 4);

    // Total angular change for symmetric parabola: 4 * sag / L * 2 = 8 * 0.5 / 15 = 4 / 15 rad ~ 0.2667 rad
    expect(result.totalAngularChangeRad).toBeCloseTo(4 / 15, 2);
  });

  it('should generate harped tendon profile with hold-down inflection points', () => {
    const spanLengthM = 18;
    const result = TendonProfileEngine.generateProfile({
      type: 'harped',
      spanLengthM,
      yStartMm: 800,
      yMidMm: 150,
      yEndMm: 800,
      holdDownFraction1: 0.333333,
      holdDownFraction2: 0.666667,
      concreteCentroidYMm: 500,
    }, 37);

    expect(result.drapeMm).toBe(650);

    // Anchor:
    expect(result.evaluateAt(0).yMm).toBeCloseTo(800, 1);
    // Between hold-downs (x = 6m to 12m), flat trajectory at y = 150mm:
    expect(result.evaluateAt(9).yMm).toBeCloseTo(150, 1);
    expect(result.evaluateAt(9).slopeRad).toBeCloseTo(0, 4);
    // End anchor:
    expect(result.evaluateAt(18).yMm).toBeCloseTo(800, 1);
  });

  it('should generate reverse continuous parabola with support crest and midspan sag', () => {
    const spanLengthM = 20;
    const result = TendonProfileEngine.generateProfile({
      type: 'reverse-parabolic',
      spanLengthM,
      ySupportMm: 750,
      yMidMm: 100,
      inflectionFraction: 0.15,
      concreteCentroidYMm: 400,
    }, 41);

    expect(result.drapeMm).toBe(650);

    // Support crest:
    expect(result.evaluateAt(0).yMm).toBeCloseTo(750, 1);
    expect(result.evaluateAt(0).slopeRad).toBeCloseTo(0, 3);

    // Midspan sag:
    expect(result.evaluateAt(10).yMm).toBeCloseTo(100, 1);
    expect(result.evaluateAt(10).slopeRad).toBeCloseTo(0, 3);

    // Continuity: y at inflection point (x = 3m):
    const atInf = result.evaluateAt(3.0);
    expect(atInf.yMm).toBeGreaterThan(100);
    expect(atInf.yMm).toBeLessThan(750);
  });
});
