import { describe, it, expect } from 'vitest';
import {
  CONCRETE_DATABASE,
  REBAR_GRADES,
  FiberSection,
  BiaxialPMMInteractionEngine,
  ColumnSlendernessEngine,
  ColumnDetailingEngine,
} from '../index';

describe('Phase B9.3: 3D Biaxial P-M-M Interaction & Column Slenderness Engine', () => {
  const c4000 = CONCRETE_DATABASE['C4000']; // f'c = 27.58 MPa
  const gr60 = REBAR_GRADES['Grade60']; // fy = 413.7 MPa

  // Standard 400x400 mm column with 8 #8 bars (Ast = 4053.6 mm², rho = 2.53%)
  function createStandardColumn(): FiberSection {
    const section = FiberSection.createRectangular(400, 400, c4000, 40, 16, 16);
    // 3 top, 3 bot, 2 sides
    section.addRectangularRebarLayout(
      40,
      10,
      { count: 3, barSize: '#8' },
      { count: 3, barSize: '#8' },
      { count: 1, barSize: '#8' },
      gr60
    );
    return section;
  }

  describe('3D Biaxial P-M-M Surface Generation', () => {
    it('generates 3D failure surface with pure compression, balanced point, and pure tension', () => {
      const section = createStandardColumn();
      const surface = BiaxialPMMInteractionEngine.generate3DSurface(section, 8, 20);

      // Check pure compression
      expect(surface.pureCompression.P0_nominal_kN).toBeGreaterThan(4500);
      expect(surface.pureCompression.Pmax_design_kN).toBeLessThan(surface.pureCompression.P0_nominal_kN);
      expect(surface.pureCompression.phi).toBe(0.65);

      // Check pure tension
      expect(surface.pureTension.Pt_nominal_kN).toBeCloseTo((8 * 506.7 * 413.7) / 1000, 0);
      expect(surface.pureTension.phi).toBe(0.90);

      // Check slices
      expect(surface.slices.length).toBe(8);

      // CurveX balanced failure point
      expect(surface.balancedPointX).toBeDefined();
      if (surface.balancedPointX) {
        expect(surface.balancedPointX.Mnx_kNm).toBeGreaterThan(200);
        expect(surface.balancedPointX.Pn_kN).toBeGreaterThan(500);
      }
    });

    it('probes safe demand point inside 3D capacity surface', () => {
      const section = createStandardColumn();
      const surface = BiaxialPMMInteractionEngine.generate3DSurface(section, 8, 20);

      // Moderate demand: Pu = 1000 kN, Mux = 100 kNm, Muy = 80 kNm
      const res = BiaxialPMMInteractionEngine.probeDemand(surface, 1000, 100, 80);

      expect(res.Mu_resultant_kNm).toBeCloseTo(Math.sqrt(100 * 100 + 80 * 80), 1);
      expect(res.phiMn_resultant_kNm).toBeGreaterThan(res.Mu_resultant_kNm);
      expect(res.utilization).toBeLessThan(1.0);
      expect(res.status).toBe('PASS');
    });

    it('flags excessive demand exceeding 3D P-M-M capacity surface', () => {
      const section = createStandardColumn();
      const surface = BiaxialPMMInteractionEngine.generate3DSurface(section, 8, 20);

      // Extreme demand: Pu = 2500 kN with huge biaxial moments Mux = 300 kNm, Muy = 300 kNm
      const res = BiaxialPMMInteractionEngine.probeDemand(surface, 2500, 300, 300);

      expect(res.utilization).toBeGreaterThan(1.0);
      expect(res.status).toBe('FAIL');
    });
  });

  describe('Column Slenderness & Second-Order Effects', () => {
    it('identifies short column where slenderness effects can be neglected', () => {
      // 400x400 column, lu = 3000 mm (3.0 m), k = 1.0
      // r = 400 / sqrt(12) = 115.5 mm => lu/r = 3000 / 115.5 = 26.0 <= 34
      const res = ColumnSlendernessEngine.analyzeSlenderness({
        b_mm: 400,
        h_mm: 400,
        lu_mm: 3000,
        k_factor: 1.0,
        Pu_kN: 1200,
        M1_kNm: 60,
        M2_kNm: 80,
        concrete: c4000,
        rebar: gr60,
      });

      expect(res.isSlender).toBe(false);
      expect(res.delta_ns).toBe(1.0);
      expect(res.Mc_magnified_kNm).toBeCloseTo(80.0, 1);
      expect(res.status).toBe('PASS');
    });

    it('magnifies moments for slender column subject to second-order P-delta effects', () => {
      // 300x300 slender column, lu = 6000 mm (6.0 m), k = 1.0
      // r = 300 / sqrt(12) = 86.6 mm => lu/r = 6000 / 86.6 = 69.3 > 40 => Slender!
      const res = ColumnSlendernessEngine.analyzeSlenderness({
        b_mm: 300,
        h_mm: 300,
        lu_mm: 6000,
        k_factor: 1.0,
        Pu_kN: 500,
        M1_kNm: 20,
        M2_kNm: 40,
        concrete: c4000,
        rebar: gr60,
      });

      expect(res.isSlender).toBe(true);
      expect(res.delta_ns).toBeGreaterThan(1.10);
      expect(res.Mc_magnified_kNm).toBeGreaterThan(40.0);
      expect(res.status).toBe('PASS');
    });
  });

  describe('Column Detailing & Confinement Requirements', () => {
    it('verifies longitudinal rebar ratio and standard tie spacing', () => {
      // 400x400 mm, 8 #8 bars (Ast = 4053.6 mm², db = 25.4 mm), 10mm ties at 200 mm
      const res = ColumnDetailingEngine.analyzeDetailing({
        b_mm: 400,
        h_mm: 400,
        lu_mm: 3000,
        clearCover_mm: 40,
        numLongitudinalBars: 8,
        db_longitudinal_mm: 25.4,
        Ast_mm2: 8 * 506.7,
        d_tie_mm: 10,
        s_tie_mm: 200,
        concrete: c4000,
        tieRebar: gr60,
        isSeismicSpecialMomentFrame: true,
      });

      expect(res.rho_g).toBeCloseTo(4053.6 / 160000, 3); // 2.53%
      expect(res.s_max_standard_mm).toBeLessThanOrEqual(400);
      expect(res.lo_confinement_mm).toBeGreaterThanOrEqual(450);
      expect(res.so_confinement_mm).toBeLessThanOrEqual(150);
      expect(res.status).toBe('PASS');
    });

    it('flags column with insufficient longitudinal reinforcement ratio (< 1%)', () => {
      // 500x500 mm with only 4 #4 bars (Ast = 4 * 126.7 = 506.8 mm², rho = 0.20% < 1%)
      const res = ColumnDetailingEngine.analyzeDetailing({
        b_mm: 500,
        h_mm: 500,
        lu_mm: 3500,
        clearCover_mm: 40,
        numLongitudinalBars: 4,
        db_longitudinal_mm: 12.7,
        Ast_mm2: 4 * 126.7,
        d_tie_mm: 10,
        s_tie_mm: 300,
        concrete: c4000,
        tieRebar: gr60,
      });

      expect(res.status).toBe('FAIL');
      const rhoLimit = res.limitStates.find(ls => ls.limitStateName.includes('Minimum Longitudinal'));
      expect(rhoLimit?.status).toBe('FAIL');
    });
  });
});
