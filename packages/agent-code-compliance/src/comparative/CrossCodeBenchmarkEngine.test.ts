import { describe, it, expect } from 'vitest';
import { CrossCodeBenchmarkEngine } from './CrossCodeBenchmarkEngine';

describe('Sprint B6.3 — Cross-Standard Design Code Benchmark & Comparative Engine', () => {
  const heb260 = {
    name: 'HEB 260',
    A: 11.84e-3, // 118.4 cm^2
    Av_z: 3.76e-3,
    W_pl_y: 1150e-6, // 1150 cm^3
    W_el_y: 1019e-6,
    W_pl_z: 426e-6,
    Iy: 149.2e-6,
    Iz: 51.35e-6,
    It: 123.8e-8,
    Iw: 728.9e-9,
  };

  const s355 = {
    name: 'S355',
    fy: 355e6,
    E: 210e9,
    G: 81e9,
  };

  it('compares flexural capacity and utilization across Eurocode 3, AISC 360-16, and IS 800:2007', () => {
    // 6m beam with design moment My = 280 kNm
    const comparison = CrossCodeBenchmarkEngine.compareMember({
      elementId: 'BEAM_COMPARISON_01',
      member: {
        length: 6.0,
        unbracedLengthLT: 0, // laterally supported
        section: heb260,
        material: s355,
      },
      forces: {
        Ned: 0,
        Vz_ed: 80e3, // 80 kN
        My_ed: 280e3, // 280 kNm
      },
    });

    expect(comparison.elementId).toBe('BEAM_COMPARISON_01');
    expect(comparison.demands.My_edKNm).toBe(280);

    const summary = comparison.comparativeSummary;
    // Eurocode 3: Mc_Rd = 1150e-6 * 355e6 / 1.0 = 408.25 kNm -> UC = 280 / 408.25 = 0.686
    expect(summary.eurocode3UC).toBeCloseTo(0.686, 2);

    // AISC 360-16: phi_b * Mn = 0.90 * 408.25 = 367.4 kNm -> UC = 280 / 367.4 = 0.762
    expect(summary.aisc360UC).toBeCloseTo(0.762, 2);

    // IS 800:2007: Md = 408.25 / 1.10 = 371.1 kNm -> UC = 280 / 371.1 = 0.755
    expect(summary.is800UC).toBeCloseTo(0.755, 2);

    // AISC and IS 800 are more conservative than Eurocode 3 due to explicit resistance factors
    expect(summary.leastConservativeStandard).toBe('EUROCODE_3');
    expect(summary.maxDisparityPercent).toBeGreaterThan(9.0); // ~11% disparity
    expect(comparison.engineeringInsight).toContain('phi_b = 0.90');
  });

  it('generates comparative column buckling reduction curves across slenderness spectrum', () => {
    const points = CrossCodeBenchmarkEngine.generateBucklingCurveComparison(355e6, 210e9);

    expect(points.length).toBe(9);

    // At low slenderness (L/r = 20), buckling reduction is near unity
    const lowSlenderness = points[0]!;
    expect(lowSlenderness.slendernessRatio).toBe(20);
    expect(lowSlenderness.chi_EC3).toBeGreaterThan(0.95);
    expect(lowSlenderness.chi_AISC).toBeCloseTo(0.89, 1);

    // At high slenderness (L/r = 140), Euler buckling severely reduces capacity across all codes
    const highSlenderness = points.find((p) => p.slendernessRatio === 140)!;
    expect(highSlenderness.chi_EC3).toBeLessThan(0.35);
    expect(highSlenderness.chi_AISC).toBeLessThan(0.35);
    expect(highSlenderness.chi_IS800).toBeLessThan(0.35);
  });
});
