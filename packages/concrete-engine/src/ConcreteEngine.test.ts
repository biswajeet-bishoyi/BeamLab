import { describe, it, expect } from 'vitest';
import {
  CONCRETE_DATABASE,
  REBAR_DATABASE,
  REBAR_GRADES,
  ConcreteConstitutiveModel,
  RebarConstitutiveModel,
  FiberSection,
  FiberSectionAnalyzer,
} from './index';

describe('Phase B9.1: Concrete Domain Model & Fiber Section Core', () => {
  describe('Material Databases', () => {
    it('provides valid concrete grades across ACI 318, Eurocode 2, and IS 456', () => {
      expect(CONCRETE_DATABASE['C4000'].fc_MPa).toBeCloseTo(27.58, 1);
      expect(CONCRETE_DATABASE['C4000'].eps_cu).toBe(0.003);

      expect(CONCRETE_DATABASE['C30/37'].fc_MPa).toBe(30.0);
      expect(CONCRETE_DATABASE['C30/37'].eps_cu).toBe(0.0035);

      expect(CONCRETE_DATABASE['M30'].fc_MPa).toBe(30.0);
      expect(CONCRETE_DATABASE['M30'].density_kg_m3).toBe(2500);
    });

    it('provides standard rebar bar dimensions and areas', () => {
      // Metric T16 and T25
      expect(REBAR_DATABASE['T16'].diameter_mm).toBe(16.0);
      expect(REBAR_DATABASE['T16'].area_mm2).toBeCloseTo(201.1, 1);

      expect(REBAR_DATABASE['T25'].diameter_mm).toBe(25.0);
      expect(REBAR_DATABASE['T25'].area_mm2).toBeCloseTo(490.9, 1);

      // Imperial #4 and #8
      expect(REBAR_DATABASE['#4'].diameter_mm).toBeCloseTo(12.7, 1);
      expect(REBAR_DATABASE['#8'].diameter_mm).toBeCloseTo(25.4, 1);
      expect(REBAR_DATABASE['#8'].area_mm2).toBeCloseTo(506.7, 1);
    });

    it('provides standard rebar steel grades with elastic modulus and yield limits', () => {
      const gr60 = REBAR_GRADES['Grade60'];
      expect(gr60.fy_MPa).toBeCloseTo(413.7, 1);
      expect(gr60.Es_MPa).toBe(200000);
      expect(gr60.eps_y).toBeCloseTo(413.7 / 200000, 5);

      const b500b = REBAR_GRADES['B500B'];
      expect(b500b.fy_MPa).toBe(500.0);
      expect(b500b.eps_uk).toBe(0.05);
    });
  });

  describe('Concrete Constitutive Models', () => {
    it('computes ACI 318-19 Whitney beta1 factor accurately across strength ranges', () => {
      // fc <= 28 MPa => beta1 = 0.85
      const model4000 = new ConcreteConstitutiveModel(CONCRETE_DATABASE['C4000']);
      expect(model4000.beta1_aci).toBeCloseTo(0.85, 2);

      // fc = 41.37 MPa => beta1 = 0.85 - 0.05*(41.37 - 27.58)/6.89 = 0.75
      const model6000 = new ConcreteConstitutiveModel(CONCRETE_DATABASE['C6000']);
      expect(model6000.beta1_aci).toBeCloseTo(0.75, 2);

      // fc = 55.16 MPa => beta1 = 0.65 minimum
      const model8000 = new ConcreteConstitutiveModel(CONCRETE_DATABASE['C8000']);
      expect(model8000.beta1_aci).toBeCloseTo(0.65, 2);
    });

    it('evaluates Eurocode 2 parabolic-rectangular stress curve', () => {
      const c30 = CONCRETE_DATABASE['C30/37'];
      const modelEC2 = new ConcreteConstitutiveModel(c30);

      // Tension strain gives zero stress
      expect(modelEC2.evaluateStress(-0.001).stress_MPa).toBe(0);

      // Ascending parabolic region: eps = 0.001 (half of eps_c2 = 0.002)
      // bracket = 1 - (1 - 0.5)^2 = 0.75
      // fcd = 0.85 * 30 / 1.5 = 17 MPa
      // expected stress = 17 * 0.75 = 12.75 MPa
      const stressHalf = modelEC2.evaluateStress(0.001).stress_MPa;
      expect(stressHalf).toBeCloseTo(12.75, 1);

      // Plateau: eps = 0.0025 (between eps_c2 and eps_cu2) => fcd = 17 MPa
      const stressPlateau = modelEC2.evaluateStress(0.0025).stress_MPa;
      expect(stressPlateau).toBeCloseTo(17.0, 1);

      // Crushed beyond eps_cu2 = 0.0035 => 0 stress
      const stressCrushed = modelEC2.evaluateStress(0.004).stress_MPa;
      expect(stressCrushed).toBe(0);
      expect(modelEC2.evaluateStress(0.004).isCrushed).toBe(true);
    });

    it('models Kent-Park unconfined vs confined concrete core behavior', () => {
      const c4000 = CONCRETE_DATABASE['C4000'];
      const model = new ConcreteConstitutiveModel(c4000, 1.25); // 25% confinement strength enhancement

      const unconfinedPeak = model.evaluateStress(0.002, false).stress_MPa;
      const confinedPeak = model.evaluateStress(0.002 * (1 + 5 * 0.25), true).stress_MPa;

      expect(unconfinedPeak).toBeCloseTo(c4000.fc_MPa, 0.5);
      expect(confinedPeak).toBeCloseTo(c4000.fc_MPa * 1.25, 0.5);
      expect(confinedPeak).toBeGreaterThan(unconfinedPeak);
    });
  });

  describe('Rebar Constitutive Models', () => {
    it('evaluates elastic-plastic rebar stress in tension and compression', () => {
      const gr60 = REBAR_GRADES['Grade60'];
      const model = new RebarConstitutiveModel(gr60, false);

      // Elastic tension: eps = 0.001 => sigma = 200,000 * 0.001 = 200 MPa
      const resTension = model.evaluateStress(0.001);
      expect(resTension.stress_MPa).toBeCloseTo(200.0, 1);
      expect(resTension.hasYielded).toBe(false);

      // Plastic yield tension: eps = 0.005 => sigma = 413.7 MPa
      const resYield = model.evaluateStress(0.005);
      expect(resYield.stress_MPa).toBeCloseTo(413.7, 1);
      expect(resYield.hasYielded).toBe(true);

      // Compression yield: eps = -0.005 => sigma = -413.7 MPa
      const resComp = model.evaluateStress(-0.005);
      expect(resComp.stress_MPa).toBeCloseTo(-413.7, 1);
      expect(resComp.hasYielded).toBe(true);
    });

    it('evaluates bilinear strain hardening rebar model', () => {
      const b500c = REBAR_GRADES['B500C']; // fy = 500, fu = 575
      const model = new RebarConstitutiveModel(b500c, true);

      const resHardened = model.evaluateStress(0.03); // Post-yield strain
      expect(resHardened.stress_MPa).toBeGreaterThan(500.0);
      expect(resHardened.stress_MPa).toBeLessThanOrEqual(575.0);
    });
  });

  describe('Fiber Section Discretization & Rebar Layout', () => {
    it('creates a rectangular fiber section with matching gross properties', () => {
      const c30 = CONCRETE_DATABASE['C30/37'];
      const b = 300;
      const h = 500;
      const section = FiberSection.createRectangular(b, h, c30, 40, 15, 25);

      expect(section.geometry.grossArea_mm2).toBe(150000);
      expect(section.concreteFibers.length).toBe(15 * 25);

      const totalFiberArea = section.concreteFibers.reduce((sum, f) => sum + f.area_mm2, 0);
      expect(totalFiberArea).toBeCloseTo(150000, 1);
      expect(section.geometry.Igx_mm4).toBeCloseTo((300 * Math.pow(500, 3)) / 12, 1);
    });

    it('places rectangular perimeter rebar layout and computes steel area ratio', () => {
      const c30 = CONCRETE_DATABASE['C30/37'];
      const section = FiberSection.createRectangular(300, 500, c30, 40);

      section.addRectangularRebarLayout(
        40, // clear cover
        10, // tie diameter
        { count: 3, barSize: 'T20' }, // top bars
        { count: 3, barSize: 'T25' }, // bottom bars
        { count: 1, barSize: 'T16' }, // side bars per face (2 total)
        REBAR_GRADES['B500B']
      );

      // Total bars: 3 (top) + 3 (bot) + 2 (side) = 8 bars
      expect(section.rebarFibers.length).toBe(8);

      const expectedSteelArea = 3 * 314.2 + 3 * 490.9 + 2 * 201.1;
      expect(section.getTotalSteelArea_mm2()).toBeCloseTo(expectedSteelArea, 1);

      const steelRatio = section.getSteelRatio();
      expect(steelRatio).toBeCloseTo(expectedSteelArea / (300 * 500), 4);
      expect(steelRatio).toBeGreaterThan(0.01); // Standard 1-4% range
    });

    it('creates circular column section and places radial rebar layout', () => {
      const c4000 = CONCRETE_DATABASE['C4000'];
      const D = 450;
      const section = FiberSection.createCircular(D, c4000, 40, 8, 16);

      const expectedArea = (Math.PI * D * D) / 4;
      const totalFiberArea = section.concreteFibers.reduce((sum, f) => sum + f.area_mm2, 0);
      expect(totalFiberArea).toBeCloseTo(expectedArea, 0);

      // Add 8 #8 circular bars
      section.addCircularRebarLayout(40, 10, 8, '#8', REBAR_GRADES['Grade60']);
      expect(section.rebarFibers.length).toBe(8);
      expect(section.getTotalSteelArea_mm2()).toBeCloseTo(8 * 506.7, 1);
    });
  });

  describe('Fiber Section Analyzer & Force Integration', () => {
    it('computes pure axial compression capacity P0 matching ACI 318 Eq. 22.4.2.2', () => {
      const c4000 = CONCRETE_DATABASE['C4000']; // fc = 27.58 MPa
      const gr60 = REBAR_GRADES['Grade60']; // fy = 413.7 MPa
      const b = 400;
      const h = 400;
      const Ag = b * h; // 160,000 mm²
      const section = FiberSection.createRectangular(b, h, c4000, 40);

      // 4 #9 corner bars
      section.addRebar(-140, -140, '#9', gr60);
      section.addRebar(140, -140, '#9', gr60);
      section.addRebar(-140, 140, '#9', gr60);
      section.addRebar(140, 140, '#9', gr60);

      const Ast = 4 * 645.0; // 2580 mm²
      const Ac = Ag - Ast;
      const expectedP0 = (0.85 * 27.58 * Ac + 413.7 * Ast) / 1000; // kN

      const analyzer = new FiberSectionAnalyzer(section);
      const cap = analyzer.computePureAxialCompressionCapacity('ACI_318_19');

      expect(cap.P0_nominal_kN).toBeCloseTo(expectedP0, 0);
      expect(cap.phi).toBe(0.65); // tied column
      expect(cap.Pmax_design_kN).toBeCloseTo(0.65 * 0.80 * expectedP0, 0);
    });

    it('computes pure axial tension capacity Pt matching Ast * fy', () => {
      const c30 = CONCRETE_DATABASE['C30/37'];
      const gr60 = REBAR_GRADES['Grade60'];
      const section = FiberSection.createRectangular(300, 300, c30, 40);

      // 4 #8 bars
      section.addRebar(-100, -100, '#8', gr60);
      section.addRebar(100, -100, '#8', gr60);
      section.addRebar(-100, 100, '#8', gr60);
      section.addRebar(100, 100, '#8', gr60);

      const Ast = 4 * 506.7;
      const expectedPt = (Ast * gr60.fy_MPa) / 1000;

      const analyzer = new FiberSectionAnalyzer(section);
      const cap = analyzer.computePureAxialTensionCapacity();

      expect(cap.Pt_nominal_kN).toBeCloseTo(expectedPt, 1);
      expect(cap.Pt_design_kN).toBeCloseTo(0.90 * expectedPt, 1);
    });

    it('integrates flexural bending moment and solves neutral axis for pure flexure (P = 0)', () => {
      const c4000 = CONCRETE_DATABASE['C4000'];
      const gr60 = REBAR_GRADES['Grade60'];
      const b = 300;
      const h = 500;
      const section = FiberSection.createRectangular(b, h, c4000, 40, 20, 25);

      // Tension reinforcement: 3 #8 bars at bottom (y = -190 mm)
      section.addRebar(-80, -190, '#8', gr60, 'bottom');
      section.addRebar(0, -190, '#8', gr60, 'bottom');
      section.addRebar(80, -190, '#8', gr60, 'bottom');

      const analyzer = new FiberSectionAnalyzer(section);

      // Solve for neutral axis depth at P = 0 (pure flexure)
      const res = analyzer.solveNeutralAxisForAxialLoad(0, 0, 1.0);

      expect(Math.abs(res.P_kN)).toBeLessThanOrEqual(1.0);
      expect(res.Mx_kNm).toBeGreaterThan(150); // Standard beam moment capacity ~200-280 kNm
      expect(res.c_depth_mm).toBeGreaterThan(30);
      expect(res.c_depth_mm).toBeLessThan(250);
      expect(res.eps_s).toBeGreaterThan(0.005); // Tension controlled
    });
  });
});
