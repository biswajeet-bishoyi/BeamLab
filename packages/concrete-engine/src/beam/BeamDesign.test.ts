import { describe, it, expect } from 'vitest';
import {
  CONCRETE_DATABASE,
  REBAR_GRADES,
  BeamFlexureEngine,
  BeamShearEngine,
  BeamServiceabilityEngine,
} from '../index';

describe('Phase B9.2: RC Beam Flexure, Shear & Serviceability Engine', () => {
  const c4000 = CONCRETE_DATABASE['C4000']; // f'c = 27.58 MPa
  const gr60 = REBAR_GRADES['Grade60']; // fy = 413.7 MPa
  const b500 = REBAR_GRADES['B500B']; // fy = 500 MPa

  describe('Beam Flexural Verification (ACI 318-19 & EC2)', () => {
    it('analyzes standard singly reinforced rectangular beam matching analytical values', () => {
      // Benchmark: b = 300 mm, d = 450 mm, h = 500 mm, 3 #8 bars (As = 1520.1 mm²)
      const res = BeamFlexureEngine.analyzeFlexure({
        bw_mm: 300,
        h_mm: 500,
        d_mm: 450,
        As_mm2: 1520.1,
        concrete: c4000,
        rebar: gr60,
        Mu_kNm: 200.0,
      });

      // Expected a = (1520.1 * 413.7) / (0.85 * 27.58 * 300) = 89.4 mm
      expect(res.a_mm).toBeCloseTo(89.4, 1);
      // Expected c = a / 0.85 = 105.2 mm
      expect(res.c_mm).toBeCloseTo(105.2, 1);
      // eps_t = 0.003 * (450 - 105.2) / 105.2 = 0.00983
      expect(res.eps_t).toBeGreaterThan(0.005);
      expect(res.sectionClassification).toBe('TENSION_CONTROLLED');
      expect(res.phi).toBe(0.90);

      // Mn = 1520.1 * 413.7 * (450 - 44.7) * 1e-6 = 254.87 kNm
      expect(res.Mn_kNm).toBeCloseTo(254.9, 1);
      // phi*Mn = 0.90 * 254.87 = 229.4 kNm
      expect(res.phiMn_kNm).toBeCloseTo(229.4, 1);

      expect(res.utilization).toBeCloseTo(200.0 / 229.4, 2);
      expect(res.status).toBe('PASS');
    });

    it('handles doubly reinforced beam with compression steel', () => {
      // Adding compression steel As' = 2 #8 bars = 1013.4 mm² at d' = 60 mm
      const res = BeamFlexureEngine.analyzeFlexure({
        bw_mm: 300,
        h_mm: 550,
        d_mm: 490,
        d_prime_mm: 60,
        As_mm2: 2500,
        As_prime_mm2: 1013.4,
        concrete: c4000,
        rebar: gr60,
        Mu_kNm: 350.0,
      });

      expect(res.fs_prime_MPa).toBeGreaterThan(0);
      expect(res.Mn_kNm).toBeGreaterThan(380);
      expect(res.status).toBe('PASS');
    });

    it('identifies flanged T-beam behavior when neutral axis enters web', () => {
      // Flanged T-beam: bf = 800 mm, hf = 50 mm, bw = 250 mm, d = 450 mm
      // Tension steel As = 3200 mm² so T = 1324 kN > Cf = 938 kN => a > hf
      const res = BeamFlexureEngine.analyzeFlexure({
        bw_mm: 250,
        h_mm: 500,
        d_mm: 450,
        bf_mm: 800,
        hf_mm: 50,
        As_mm2: 3200,
        concrete: c4000,
        rebar: gr60,
        Mu_kNm: 400.0,
      });

      expect(res.isFlangedBehavior).toBe(true);
      expect(res.a_mm).toBeGreaterThan(50.0);
      expect(res.Mn_kNm).toBeGreaterThan(450.0);
    });

    it('flags under-reinforced beam that fails minimum rebar requirement', () => {
      // Extremely low As = 100 mm²
      const res = BeamFlexureEngine.analyzeFlexure({
        bw_mm: 300,
        h_mm: 500,
        d_mm: 450,
        As_mm2: 100, // Below As_min ~ 450 mm²
        concrete: c4000,
        rebar: gr60,
        Mu_kNm: 20.0,
      });

      expect(res.status).toBe('FAIL');
      const minLimit = res.limitStates.find(ls => ls.limitStateName.includes('Minimum Flexural'));
      expect(minLimit?.status).toBe('FAIL');
    });
  });

  describe('Beam Shear Verification (ACI 318-19 & EC2)', () => {
    it('applies ACI 318-19 shear size effect factor lambda_s for deep vs shallow members', () => {
      // Shallow member: d = 250 mm => lambda_s = min(1.0, sqrt(2 / (1 + 0.004*250))) = 1.0
      const resShallow = BeamShearEngine.analyzeShear({
        bw_mm: 300,
        d_mm: 250,
        As_mm2: 800,
        Av_mm2: 157, // 2 legs of T10
        s_mm: 150,
        concrete: c4000,
        stirrupRebar: gr60,
        Vu_kN: 80.0,
      });
      expect(resShallow.lambda_s).toBe(1.0);

      // Deep member without minimum shear rebar: d = 1000 mm
      // lambda_s = sqrt(2 / (1 + 0.004*1000)) = sqrt(2 / 5) = 0.6325
      const resDeep = BeamShearEngine.analyzeShear({
        bw_mm: 400,
        d_mm: 1000,
        As_mm2: 2400,
        Av_mm2: 0, // No shear rebar
        s_mm: 0,
        concrete: c4000,
        stirrupRebar: gr60,
        Vu_kN: 100.0,
      });
      expect(resDeep.lambda_s).toBeCloseTo(0.6325, 3);
      expect(resDeep.Vc_kN).toBeGreaterThan(0);
    });

    it('verifies stirrup capacity Vs and maximum spacing s_max', () => {
      const bw = 300;
      const d = 450;
      const Av = 157; // 2 legs 10mm
      const s = 150;
      const res = BeamShearEngine.analyzeShear({
        bw_mm: bw,
        d_mm: d,
        As_mm2: 1500,
        Av_mm2: Av,
        s_mm: s,
        concrete: c4000,
        stirrupRebar: gr60,
        Vu_kN: 180.0,
      });

      // Expected Vs = Av * fyt * d / s = 157 * 413.7 * 450 / (150 * 1000) = 194.8 kN
      expect(res.Vs_kN).toBeCloseTo(194.8, 0.5);
      expect(res.s_max_mm).toBeLessThanOrEqual(d / 2);
      expect(res.status).toBe('PASS');
    });
  });

  describe('Beam Serviceability (Deflection & Cracking)', () => {
    it('computes cracking moment Mcr and Bischoff effective moment of inertia Ie', () => {
      const res = BeamServiceabilityEngine.analyzeServiceability({
        bw_mm: 300,
        h_mm: 500,
        d_mm: 450,
        clearCover_mm: 40,
        As_mm2: 1500,
        barSpacing_mm: 75,
        concrete: c4000,
        rebar: gr60,
        MD_kNm: 35.0,
        ML_kNm: 40.0,
      });

      expect(res.Mcr_kNm).toBeGreaterThan(30.0);
      expect(res.Mcr_kNm).toBeLessThan(60.0);

      // Total service moment Ma = 75 kNm > Mcr => Section is cracked!
      expect(res.Icr_mm4).toBeLessThan(res.Ig_mm4);
      expect(res.Ie_mm4).toBeGreaterThan(res.Icr_mm4);
      expect(res.Ie_mm4).toBeLessThanOrEqual(res.Ig_mm4);

      // Long term deflection factor lambda_delta ~ 2.0 without compression steel
      expect(res.lambda_delta).toBeCloseTo(2.0, 1);

      // Crack control checks
      expect(res.s_max_crack_mm).toBeGreaterThan(res.s_max_crack_mm > 75 ? 75 : 50);
      expect(res.wk_mm).toBeLessThan(0.30); // 0.3 mm standard limit
      expect(res.status).toBe('PASS');
    });
  });
});
