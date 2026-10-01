/**
 * BeamLab Sprint B6.3 — Cross-Standard Design Code Benchmark & Comparative Engine
 * Evaluates identical structural members and internal action demands across international standards:
 * Eurocode 3 (EN 1993-1-1), AISC 360-16 (LRFD), and IS 800:2007.
 * Computes comparative utilization ratios, capacity disparities, and safety factor rationales.
 */

import type { DesignStandard } from '@beamlab/knowledge-platform';
import {
  CodeComplianceAuditor,
  type MemberAuditDemand,
  type MemberAuditResult,
} from '../engine/CodeComplianceAuditor';

export interface CrossCodeComparisonResult {
  elementId: string;
  memberSummary: {
    sectionName: string;
    materialName: string;
    length: number;
    fyMPa: number;
  };
  demands: {
    NedKN: number;
    Vz_edKN: number;
    My_edKNm: number;
  };
  resultsByStandard: Record<DesignStandard, MemberAuditResult | null>;
  comparativeSummary: {
    eurocode3UC: number;
    aisc360UC: number;
    is800UC: number;
    mostConservativeStandard: DesignStandard;
    leastConservativeStandard: DesignStandard;
    maxDisparityPercent: number; // Disparity between most and least conservative
    governingLimitStateByCode: Record<DesignStandard, string>;
  };
  safetyFactorComparison: {
    flexureFactor: { EC3: string; AISC: string; IS800: string; explanation: string };
    shearFactor: { EC3: string; AISC: string; IS800: string; explanation: string };
    compressionFactor: { EC3: string; AISC: string; IS800: string; explanation: string };
  };
  engineeringInsight: string;
}

export interface BucklingComparisonPoint {
  slendernessRatio: number; // L / r (e.g. 20 to 180)
  lambda_bar: number; // non-dimensional slenderness
  chi_EC3: number; // Eurocode 3 curve b
  chi_AISC: number; // AISC 360 Chapter E (Fcr / Fy)
  chi_IS800: number; // IS 800:2007 Table 7 curve b
}

export class CrossCodeBenchmarkEngine {
  /**
   * Compares a member's structural capacity and utilization across Eurocode 3, AISC 360-16, and IS 800:2007.
   */
  public static compareMember(
    baseDemand: Omit<MemberAuditDemand, 'designCode'>
  ): CrossCodeComparisonResult {
    const ec3Result = CodeComplianceAuditor.auditMember({
      ...baseDemand,
      designCode: 'EUROCODE_3',
    });

    const aiscResult = CodeComplianceAuditor.auditMember({
      ...baseDemand,
      designCode: 'AISC_360_16',
    });

    const is800Result = CodeComplianceAuditor.auditMember({
      ...baseDemand,
      designCode: 'IS_800_2007',
    });

    const ucEC3 = ec3Result.maxUtilizationRatio;
    const ucAISC = aiscResult.maxUtilizationRatio;
    const ucIS800 = is800Result.maxUtilizationRatio;

    const ucs: Array<{ standard: DesignStandard; uc: number }> = [
      { standard: 'EUROCODE_3' as const, uc: ucEC3 },
      { standard: 'AISC_360_16' as const, uc: ucAISC },
      { standard: 'IS_800_2007' as const, uc: ucIS800 },
    ].sort((a, b) => b.uc - a.uc); // descending order: highest UC = most conservative

    const mostConservative = ucs[0]!.standard;
    const leastConservative = ucs[ucs.length - 1]!.standard;
    const minUC = ucs[ucs.length - 1]!.uc;
    const maxUC = ucs[0]!.uc;
    const disparity = minUC > 0 ? ((maxUC - minUC) / minUC) * 100 : 0;

    const insight =
      ucAISC > ucEC3
        ? `AISC 360-16 results in a higher utilization ratio (${ucAISC.toFixed(2)} vs ${ucEC3.toFixed(2)} under EC3) primarily due to the resistance factor phi_b = 0.90, which introduces a 10% capacity reduction compared to Eurocode 3's gamma_M0 = 1.0.`
        : `Eurocode 3 yields a utilization ratio of ${ucEC3.toFixed(2)} compared to ${ucAISC.toFixed(2)} under AISC 360-16 and ${ucIS800.toFixed(2)} under IS 800:2007.`;

    return {
      elementId: baseDemand.elementId,
      memberSummary: {
        sectionName: baseDemand.member.section.name,
        materialName: baseDemand.member.material.name,
        length: baseDemand.member.length,
        fyMPa: baseDemand.member.material.fy / 1e6,
      },
      demands: {
        NedKN: baseDemand.forces.Ned / 1e3,
        Vz_edKN: baseDemand.forces.Vz_ed / 1e3,
        My_edKNm: baseDemand.forces.My_ed / 1e3,
      },
      resultsByStandard: {
        EUROCODE_3: ec3Result,
        AISC_360_16: aiscResult,
        IS_800_2007: is800Result,
        EUROCODE_8: null,
        ASCE_7_16: null,
      },
      comparativeSummary: {
        eurocode3UC: ucEC3,
        aisc360UC: ucAISC,
        is800UC: ucIS800,
        mostConservativeStandard: mostConservative,
        leastConservativeStandard: leastConservative,
        maxDisparityPercent: Number(disparity.toFixed(1)),
        governingLimitStateByCode: {
          EUROCODE_3: ec3Result.governingCheck.clauseTitle,
          AISC_360_16: aiscResult.governingCheck.clauseTitle,
          IS_800_2007: is800Result.governingCheck.clauseTitle,
          EUROCODE_8: 'N/A',
          ASCE_7_16: 'N/A',
        },
      },
      safetyFactorComparison: {
        flexureFactor: {
          EC3: 'gamma_M0 = 1.00',
          AISC: 'phi_b = 0.90 (1/phi = 1.11)',
          IS800: 'gamma_m0 = 1.10',
          explanation:
            'Eurocode 3 uses unity safety factor on yield for cross-section flexure; AISC and IS 800 incorporate a ~10% safety margin.',
        },
        shearFactor: {
          EC3: 'gamma_M0 = 1.00 (Av * fy / sqrt(3))',
          AISC: 'phi_v = 0.90 (0.60 * Fy * Aw)',
          IS800: 'gamma_m0 = 1.10 (Av * fy / (sqrt(3) * 1.10))',
          explanation:
            'AISC utilizes Tresca shear approximation 0.60*Fy, whereas Eurocode 3 and IS 800 apply von Mises fy / sqrt(3) = 0.577*fy.',
        },
        compressionFactor: {
          EC3: 'gamma_M1 = 1.00 (Buckling curves a0, a, b, c, d)',
          AISC: 'phi_c = 0.90 (Single column curve Eq. E3-2/E3-3)',
          IS800: 'gamma_m0 = 1.10 (Perry-Robertson curves a, b, c, d)',
          explanation:
            'Eurocode 3 and IS 800 categorize profiles into distinct buckling curves based on h/b ratio and manufacturing method; AISC 360 uses a unified exponential column curve.',
        },
      },
      engineeringInsight: insight,
    };
  }

  /**
   * Generates a comparative column buckling curve dataset across slenderness ratios (L/r = 20 to 180).
   */
  public static generateBucklingCurveComparison(
    fy = 355e6,
    E = 210e9,
    slendernessRatios = [20, 40, 60, 80, 100, 120, 140, 160, 180]
  ): BucklingComparisonPoint[] {
    return slendernessRatios.map((Lr) => {
      const Fe = (Math.PI ** 2 * E) / Lr ** 2;
      const lambda_bar = Math.sqrt(fy / Fe);

      // 1. Eurocode 3 (curve b, alpha = 0.34)
      const alpha_EC3 = 0.34;
      const phi_EC3 = 0.5 * (1 + alpha_EC3 * (lambda_bar - 0.2) + lambda_bar ** 2);
      const chi_EC3 = Math.min(1.0, 1.0 / (phi_EC3 + Math.sqrt(Math.max(0, phi_EC3 ** 2 - lambda_bar ** 2))));

      // 2. AISC 360 (Chapter E)
      const lambda_ratio = fy / Fe;
      const Fcr = lambda_ratio <= 2.25 ? Math.pow(0.658, lambda_ratio) * fy : 0.877 * Fe;
      const chi_AISC = (0.90 * Fcr) / fy; // factored reduction relative to Fy

      // 3. IS 800:2007 (Table 7 curve b, alpha = 0.34, gamma_m0 = 1.10)
      const phi_IS = 0.5 * (1 + alpha_EC3 * (lambda_bar - 0.2) + lambda_bar ** 2);
      const chi_IS_unfactored = Math.min(1.0, 1.0 / (phi_IS + Math.sqrt(Math.max(0, phi_IS ** 2 - lambda_bar ** 2))));
      const chi_IS800 = chi_IS_unfactored / 1.10; // includes gamma_m0 = 1.10

      return {
        slendernessRatio: Lr,
        lambda_bar: Number(lambda_bar.toFixed(2)),
        chi_EC3: Number(chi_EC3.toFixed(3)),
        chi_AISC: Number(chi_AISC.toFixed(3)),
        chi_IS800: Number(chi_IS800.toFixed(3)),
      };
    });
  }
}
