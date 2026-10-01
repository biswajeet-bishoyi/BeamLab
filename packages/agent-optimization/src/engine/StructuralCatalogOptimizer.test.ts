import { describe, it, expect } from 'vitest';
import {
  StructuralCatalogOptimizer,
  type MemberOptimizationRequest,
} from './StructuralCatalogOptimizer';

describe('Sprint B5.2 — Structural Catalog Optimization Agent', () => {
  it('optimizes over-designed beams by selecting lighter IPE profiles with >50% weight savings', () => {
    // 6m span beam currently using HEB 260 (93.0 kg/m -> 558 kg)
    // Applied design moment Mz = 120 kN*m, shear Vz = 80 kN
    const request: MemberOptimizationRequest = {
      elementId: 'BEAM_1',
      currentSection: 'HEB 260',
      length: 6.0,
      designDemand: {
        Ned: 0,
        Vy_ed: 0,
        Vz_ed: 80e3,
        Mz_ed: 120e3,
        My_ed: 0,
      },
      preferredSeries: 'IPE',
    };

    const result = StructuralCatalogOptimizer.optimizeStructure([request], {
      designCode: 'EUROCODE_3',
      steelGrade: 'S355',
      targetMaxUC: 0.95,
    });

    expect(result.allMembersCompliant).toBe(true);
    expect(result.members.length).toBe(1);

    const beam = result.members[0]!;
    expect(beam.status).toBe('OPTIMIZED');
    expect(beam.optimizedSection).not.toBe('HEB 260');

    // Should select a lighter IPE (e.g. IPE 220 or IPE 240)
    expect(beam.optimizedMassKg).toBeLessThan(beam.originalMassKg * 0.5); // >50% weight reduction
    expect(beam.massSavingsPercent).toBeGreaterThan(50);
    expect(beam.optimizedUC).toBeLessThanOrEqual(0.95);
  });

  it('upsizes overstressed members to restore code compliance', () => {
    // Highly stressed beam: Mz = 250 kN*m, currently assigned undersized IPE 160 (Wpl = 1.24e-4 -> Mc = 44 kN*m, UC ~ 5.7)
    const request: MemberOptimizationRequest = {
      elementId: 'BEAM_FAIL',
      currentSection: 'IPE 160',
      length: 5.0,
      designDemand: {
        Ned: 0,
        Vy_ed: 0,
        Vz_ed: 50e3,
        Mz_ed: 250e3,
        My_ed: 0,
      },
      preferredSeries: 'IPE',
    };

    const result = StructuralCatalogOptimizer.optimizeStructure([request], {
      designCode: 'EUROCODE_3',
      steelGrade: 'S355',
      targetMaxUC: 0.95,
    });

    const beam = result.members[0]!;
    expect(beam.status).toBe('UPSIZED_FOR_SAFETY');
    expect(beam.originalUC).toBeGreaterThan(1.0);
    expect(beam.optimizedUC).toBeLessThanOrEqual(0.95);
    expect(result.allMembersCompliant).toBe(true);
  });

  it('accounts for column flexural buckling slenderness under heavy axial compression', () => {
    // Column length 4m under Ned = 600 kN compression and Mz = 40 kN*m
    const request: MemberOptimizationRequest = {
      elementId: 'COL_1',
      currentSection: 'HEB 300',
      length: 4.0,
      designDemand: {
        Ned: 600e3,
        Vy_ed: 0,
        Vz_ed: 30e3,
        Mz_ed: 40e3,
        My_ed: 0,
      },
      preferredSeries: 'HEB',
    };

    const result = StructuralCatalogOptimizer.optimizeStructure([request], {
      designCode: 'EUROCODE_3',
      steelGrade: 'S355',
      targetMaxUC: 0.95,
    });

    const col = result.members[0]!;
    expect(col.optimizedUC).toBeLessThanOrEqual(0.95);
    // Should downsize from HEB 300 (117 kg/m) to a lighter HEB (e.g. HEB 160 or HEB 180)
    expect(col.optimizedMassKg).toBeLessThan(col.originalMassKg);
    expect(col.massSavingsKg).toBeGreaterThan(0);
  });

  it('optimizes multi-member portal frame structure and outputs cumulative metrics', () => {
    const requests: MemberOptimizationRequest[] = [
      {
        elementId: 'C1',
        currentSection: 'HEB 260',
        length: 4.0,
        designDemand: { Ned: 400e3, Vy_ed: 0, Vz_ed: 25e3, Mz_ed: 45e3, My_ed: 0 },
        preferredSeries: 'HEB',
      },
      {
        elementId: 'C2',
        currentSection: 'HEB 260',
        length: 4.0,
        designDemand: { Ned: 400e3, Vy_ed: 0, Vz_ed: 25e3, Mz_ed: 45e3, My_ed: 0 },
        preferredSeries: 'HEB',
      },
      {
        elementId: 'B1',
        currentSection: 'IPE 400',
        length: 6.0,
        designDemand: { Ned: 10e3, Vy_ed: 0, Vz_ed: 60e3, Mz_ed: 95e3, My_ed: 0 },
        preferredSeries: 'IPE',
      },
    ];

    const summary = StructuralCatalogOptimizer.optimizeStructure(requests, {
      designCode: 'EUROCODE_3',
      steelGrade: 'S355',
      targetMaxUC: 0.95,
    });

    expect(summary.allMembersCompliant).toBe(true);
    expect(summary.maxUtilizationRatio).toBeLessThanOrEqual(0.95);
    expect(summary.totalMassSavingsKg).toBeGreaterThan(0);
    expect(summary.overallSavingsPercent).toBeGreaterThan(20); // At least 20% total mass reduction
  });
});
