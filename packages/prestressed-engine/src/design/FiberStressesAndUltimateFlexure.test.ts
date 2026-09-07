import { describe, it, expect } from 'vitest';
import { StrandCatalog } from '../tendon/StrandCatalog.js';
import { FiberStressAuditor } from './FiberStressAuditor.js';
import { UltimateFlexuralCapacityEngine } from './UltimateFlexuralCapacityEngine.js';

describe('FiberStressAuditor', () => {
  const section = FiberStressAuditor.createRectangularSection(400, 800);
  const concrete = { fciMpa: 30, fcMpa: 45 };

  it('should compute geometric section properties for rectangular cross section', () => {
    expect(section.areaMm2).toBe(400 * 800);
    expect(section.inertiaMm4).toBeCloseTo((400 * Math.pow(800, 3)) / 12, 0);
    expect(section.cgcFromBottomMm).toBe(400);
    expect(section.cgcFromTopMm).toBe(400);
  });

  it('should verify transfer and service fiber stresses for a post-tensioned beam', () => {
    const Pi = 1600;   // kN at transfer
    const Peff = 1350; // kN at service
    const e = -250;    // mm (250 mm below centroid)
    const M0 = 180;    // kNm (self weight)
    const MD = 280;    // kNm (dead load)
    const MS = 520;    // kNm (dead + live load)

    const report = FiberStressAuditor.auditFiberStresses({
      section,
      concrete,
      transferForceKn: Pi,
      effectiveForceKn: Peff,
      eccentricityMm: e,
      selfWeightMomentKnm: M0,
      sustainedDeadMomentKnm: MD,
      totalServiceMomentKnm: MS,
    });

    // Transfer stage:
    // Allowable comp = 0.60 * 30 = 18 MPa
    expect(report.transferStage.allowableCompressionMpa).toBe(18);
    // Allowable tens = -0.25 * sqrt(30) = -1.37 MPa
    expect(report.transferStage.allowableTensionMpa).toBeCloseTo(-1.37, 2);
    expect(report.transferStage.topStressPass).toBe(true);
    expect(report.transferStage.bottomStressPass).toBe(true);

    // Service stage:
    // Allowable sustained comp = 0.45 * 45 = 20.25 MPa
    expect(report.serviceStage.allowableSustainedCompressionMpa).toBe(20.25);
    // Class U limit = -0.62 * sqrt(45) = -4.16 MPa
    expect(report.serviceStage.allowableClassUTensionMpa).toBeCloseTo(-4.16, 2);
    expect(report.serviceStage.crackClassification).toBe('Class U (Uncracked)');
    expect(report.serviceStage.serviceStressPass).toBe(true);
    expect(report.serviceStage.decompressionMomentKnm).toBeGreaterThan(0);
  });

  it('should accurately calculate T-beam cross section properties and neutral axis', () => {
    const tBeam = FiberStressAuditor.createTBeamSection(350, 900, 1200, 150);
    expect(tBeam.areaMm2).toBe(1200 * 150 + 350 * 750); // 180,000 + 262,500 = 442,500 mm^2
    expect(tBeam.cgcFromBottomMm).toBeGreaterThan(450); // T-beam cgc is shifted towards the wide flange
    expect(tBeam.cgcFromTopMm).toBeLessThan(450);
    expect(tBeam.sectionModulusBottomMm3).toBeGreaterThan(0);
  });
});

describe('UltimateFlexuralCapacityEngine', () => {
  const section = FiberStressAuditor.createRectangularSection(400, 800);
  const concrete = { fciMpa: 30, fcMpa: 40 };
  const tendon = StrandCatalog.createTendonAssembly({
    strandId: 'ASTM-A416-0.6',
    numberOfStrands: 12, // Aps = 12 * 140 = 1680 mm^2
    systemType: 'bonded',
    jackingStressRatio: 0.75,
  });

  it('should compute nominal flexural capacity Mn and design capacity phi*Mn for bonded tendons', () => {
    const dp = 650; // mm from top
    const Peff = 1600; // kN
    const Mu = 1200; // kNm

    const result = UltimateFlexuralCapacityEngine.calculateUltimateCapacity({
      section,
      concrete,
      tendon,
      effectivePrestressForceKn: Peff,
      tendonDepthFromTopMm: dp,
      mildRebar: {
        areaTensionMm2: 3 * 387, // 3 #7 bars
        depthTensionMm: 720,
        yieldStrengthMpa: 420,
      },
      factoredMomentDemandKnm: Mu,
    });

    // Strand stress at nominal capacity should be between fpe and fpu (1860 MPa):
    expect(result.stressInStrandAtNominalStrengthMpa).toBeGreaterThan(1200);
    expect(result.stressInStrandAtNominalStrengthMpa).toBeLessThanOrEqual(1860);

    // Stress block depth a:
    expect(result.stressBlockDepthMm).toBeGreaterThan(50);
    expect(result.stressBlockDepthMm).toBeLessThan(300);

    // Section should be ductile (tension-controlled or transition):
    expect(result.netTensileStrain).toBeGreaterThan(0.003);
    expect(result.strengthReductionFactorPhi).toBeGreaterThanOrEqual(0.75);

    // Design capacity:
    expect(result.nominalMomentCapacityKnm).toBeGreaterThan(1400);
    expect(result.designMomentCapacityAciKnm).toBeGreaterThan(Mu);
    expect(result.flexuralPass).toBe(true);
    expect(result.flexuralUtilization).toBeLessThan(1.0);
  });

  it('should compute unbonded tendon flexural capacity per ACI 318 Eq. 20.3.2.4.1', () => {
    const unbondedTendon = StrandCatalog.createTendonAssembly({
      strandId: 'ASTM-A416-0.5',
      numberOfStrands: 4,
      systemType: 'unbonded',
      jackingStressRatio: 0.75,
    });

    const result = UltimateFlexuralCapacityEngine.calculateUltimateCapacity({
      section,
      concrete,
      tendon: unbondedTendon,
      effectivePrestressForceKn: 400,
      tendonDepthFromTopMm: 600,
      factoredMomentDemandKnm: 300,
    });

    expect(result.stressInStrandAtNominalStrengthMpa).toBeGreaterThan(1000);
    expect(result.stressInStrandAtNominalStrengthMpa).toBeLessThanOrEqual(1674);
    expect(result.nominalMomentCapacityKnm).toBeGreaterThan(300);
  });
});
