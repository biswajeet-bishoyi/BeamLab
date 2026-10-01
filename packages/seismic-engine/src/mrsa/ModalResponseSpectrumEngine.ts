/**
 * ModalResponseSpectrumEngine.ts
 *
 * Modal Response Spectrum Analysis (MRSA) Engine.
 * Evaluates spectral accelerations Sa(Tn), modal participation factors Gamma_n,
 * modal displacement fields, and story shears.
 * Enforces the 90% cumulative mass participation threshold per ASCE 7-22 and Eurocode 8.
 * Combines modal responses via CQC and SRSS.
 */

import { ModalCombinationEngine, ModalResponseItem } from '../modal/ModalCombinationEngine';

export interface DynamicMode {
  modeNumber: number;
  period_s: number;
  frequency_Hz: number;
  circularFrequency_rad_s: number;
  modalMass_kg?: number;
  effectiveMassX_kg: number;
  effectiveMassY_kg: number;
  effectiveMassZ_kg?: number;
  massParticipationRatioX: number; // 0 to 1 (e.g. 0.65 = 65%)
  massParticipationRatioY: number;
  massParticipationRatioZ?: number;
  dampingRatio?: number; // default 0.05
  modeShape?: Array<{
    nodeId: string;
    ux: number;
    uy: number;
    uz?: number;
  }>;
}

export interface ModalSpectralResponse {
  modeNumber: number;
  period_s: number;
  spectralAcceleration_g: number;
  spectralAcceleration_m_s2: number;
  modalBaseShear_kN: number;
  modalDisplacementPeak_mm: number;
}

export interface MrsaAnalysisResult {
  direction: 'X' | 'Y' | 'Z';
  totalSeismicWeight_kN: number;
  totalSeismicMass_kg: number;
  cumulativeMassParticipationRatio: number;
  satisfies90PercentThreshold: boolean;
  modalResponses: ModalSpectralResponse[];
  baseShearCQC_kN: number;
  baseShearSRSS_kN: number;
  peakDisplacementCQC_mm: number;
  peakDisplacementSRSS_mm: number;
}

export class ModalResponseSpectrumEngine {
  private static readonly G_ACCEL = 9.80665; // m/s^2

  /**
   * Performs Modal Response Spectrum Analysis for a specified direction of excitation.
   */
  public analyze(
    modes: DynamicMode[],
    totalSeismicWeight_kN: number,
    spectrumEvaluator: (period_s: number) => number, // returns Sa in g
    direction: 'X' | 'Y' | 'Z' = 'X'
  ): MrsaAnalysisResult {
    if (!modes || modes.length === 0) {
      throw new Error('MRSA requires at least one dynamic mode.');
    }

    const totalMass_kg = (totalSeismicWeight_kN * 1000) / ModalResponseSpectrumEngine.G_ACCEL;

    // 1. Calculate mass participation and spectral response per mode
    let cumMassRatio = 0;
    const modalShearItems: ModalResponseItem[] = [];
    const modalDispItems: ModalResponseItem[] = [];
    const modalResponses: ModalSpectralResponse[] = [];

    for (const m of modes) {
      const partRatio =
        direction === 'X'
          ? m.massParticipationRatioX
          : direction === 'Y'
          ? m.massParticipationRatioY
          : m.massParticipationRatioZ ?? 0;

      cumMassRatio += partRatio;

      const Sa_g = spectrumEvaluator(m.period_s);
      const Sa_ms2 = Sa_g * ModalResponseSpectrumEngine.G_ACCEL;

      // Effective mass excited in this mode in this direction
      const effMass_kg =
        direction === 'X'
          ? m.effectiveMassX_kg
          : direction === 'Y'
          ? m.effectiveMassY_kg
          : m.effectiveMassZ_kg ?? (partRatio * totalMass_kg);

      // Modal base shear V_bn = M*_n * Sa(Tn) (kN)
      const Vbn_kN = (effMass_kg * Sa_ms2) / 1000;

      // Peak modal SDOF spectral displacement: Sd = Sa / omega^2 (m)
      const omega = m.circularFrequency_rad_s > 0
        ? m.circularFrequency_rad_s
        : (2 * Math.PI) / Math.max(1e-4, m.period_s);

      const Sd_m = Sa_ms2 / (omega * omega);
      const Sd_mm = Sd_m * 1000;

      modalResponses.push({
        modeNumber: m.modeNumber,
        period_s: Number(m.period_s.toFixed(4)),
        spectralAcceleration_g: Number(Sa_g.toFixed(4)),
        spectralAcceleration_m_s2: Number(Sa_ms2.toFixed(3)),
        modalBaseShear_kN: Number(Vbn_kN.toFixed(2)),
        modalDisplacementPeak_mm: Number(Sd_mm.toFixed(2)),
      });

      modalShearItems.push({
        modeIndex: m.modeNumber,
        period_s: m.period_s,
        dampingRatio: m.dampingRatio ?? 0.05,
        responseValue: Vbn_kN,
      });

      modalDispItems.push({
        modeIndex: m.modeNumber,
        period_s: m.period_s,
        dampingRatio: m.dampingRatio ?? 0.05,
        responseValue: Sd_mm,
      });
    }

    // 2. Combine modal responses via CQC & SRSS
    const baseShearCQC = ModalCombinationEngine.combineCQC(modalShearItems);
    const baseShearSRSS = ModalCombinationEngine.combineSRSS(modalShearItems);

    const peakDispCQC = ModalCombinationEngine.combineCQC(modalDispItems);
    const peakDispSRSS = ModalCombinationEngine.combineSRSS(modalDispItems);

    return {
      direction,
      totalSeismicWeight_kN: Number(totalSeismicWeight_kN.toFixed(1)),
      totalSeismicMass_kg: Number(totalMass_kg.toFixed(0)),
      cumulativeMassParticipationRatio: Number(cumMassRatio.toFixed(4)),
      satisfies90PercentThreshold: cumMassRatio >= 0.90,
      modalResponses,
      baseShearCQC_kN: Number(baseShearCQC.toFixed(2)),
      baseShearSRSS_kN: Number(baseShearSRSS.toFixed(2)),
      peakDisplacementCQC_mm: Number(peakDispCQC.toFixed(2)),
      peakDisplacementSRSS_mm: Number(peakDispSRSS.toFixed(2)),
    };
  }
}
