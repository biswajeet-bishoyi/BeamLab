import { TendonAssembly } from '../tendon/StrandCatalog.js';
import { TendonGeometryResult } from '../tendon/TendonProfileEngine.js';

export interface PrestressLossInput {
  tendon: TendonAssembly;
  geometry: TendonGeometryResult;
  // Short-term friction & seating
  curvatureFrictionMu?: number; // mu: typically 0.15 - 0.25 (metal duct) or 0.07 (unbonded)
  wobbleFrictionK?: number;     // k: typically 0.0010 - 0.0033 m^-1
  wedgeSlipMm?: number;         // Anchorage draw-in slip (typically 6 mm)
  jackingMode?: 'single-end' | 'both-ends';
  // Elastic shortening
  concreteStressAtCentroidTransferMpa?: number; // f_cgp (MPa)
  concreteModulusTransferMpa?: number;         // E_ci (MPa)
  isPretensioned?: boolean;
  // Long-term losses
  concreteModulusServiceMpa?: number;          // E_c (MPa)
  concreteStressAtCentroidDeadLoadMpa?: number; // f_cgs (MPa)
  relativeHumidityPercent?: number;            // RH (%)
  volumeToSurfaceRatioMm?: number;             // V/S (mm)
  creepFactorKcr?: number;                     // K_cr (1.6 for PT, 2.0 for pretensioned)
  shrinkageFactorKsh?: number;                 // K_sh (1.0 for standard mix)
  timeYears?: number;                          // Default 50 years
}

export interface ForceStation {
  xM: number;
  xRatio: number;
  forceBeforeSeatingKn: number;
  forceAfterSeatingKn: number;
  forceAtTransferKn: number;
  effectiveForceKn: number;
  effectiveStressMpa: number;
}

export interface PrestressLossReport {
  initialJackingForceKn: number;
  initialJackingStressMpa: number;
  shortTermLosses: {
    maxFrictionLossKn: number;
    anchorageSeatingLossAtAnchorKn: number;
    seatingInfluenceLengthM: number;
    elasticShorteningStressMpa: number;
    elasticShorteningForceKn: number;
    averageForceAtTransferKn: number;
    minForceAtTransferKn: number;
    maxForceAtTransferKn: number;
  };
  longTermLosses: {
    creepLossStressMpa: number;
    creepLossForceKn: number;
    shrinkageLossStressMpa: number;
    shrinkageLossForceKn: number;
    relaxationLossStressMpa: number;
    relaxationLossForceKn: number;
    totalLongTermStressMpa: number;
    totalLongTermForceKn: number;
  };
  effectiveSummary: {
    averageEffectiveForceKn: number;
    minEffectiveForceKn: number;
    maxEffectiveForceKn: number;
    averageEffectiveStressMpa: number;
    effectiveToJackingRatio: number;
    shortTermLossPercent: number;
    longTermLossPercent: number;
    totalLossPercent: number;
  };
  forceDistribution: ForceStation[];
}

export class PrestressLossAuditor {
  public static auditLosses(input: PrestressLossInput): PrestressLossReport {
    const { tendon, geometry } = input;
    const P0 = tendon.jackingForceKn;
    const fpi = tendon.jackingStressMpa;
    const Ap = tendon.totalAreaMm2;
    const Ep = tendon.elasticModulusMpa;
    const L = geometry.spanLengthM;

    // Default friction parameters based on duct type
    let defaultMu = 0.20;
    let defaultK = 0.0016;
    if (tendon.systemType === 'unbonded') {
      defaultMu = 0.07;
      defaultK = 0.0010;
    } else if (tendon.ductType === 'corrugated-plastic') {
      defaultMu = 0.14;
      defaultK = 0.0012;
    }

    const mu = input.curvatureFrictionMu ?? defaultMu;
    const k = input.wobbleFrictionK ?? defaultK;
    const deltaSlip = (input.wedgeSlipMm ?? 6.0) / 1000; // in meters
    const jackingMode = input.jackingMode ?? 'single-end';

    // 1. Friction loss along stations
    const rawFrictionStations = geometry.stations.map((st) => {
      const alpha = st.cumulativeAngleRad;
      const x = st.xM;
      // P(x) = P0 * exp(-(mu * alpha + k * x))
      const frictionRatioFromLeft = Math.exp(-(mu * alpha + k * x));
      let forceFromLeft = P0 * frictionRatioFromLeft;

      if (jackingMode === 'both-ends') {
        const xFromRight = L - x;
        const alphaFromRight = geometry.totalAngularChangeRad - alpha;
        const frictionRatioFromRight = Math.exp(-(mu * alphaFromRight + k * xFromRight));
        const forceFromRight = P0 * frictionRatioFromRight;
        return Math.max(forceFromLeft, forceFromRight);
      }

      return forceFromLeft;
    });

    const maxFrictionLossKn = P0 - Math.min(...rawFrictionStations);

    // 2. Anchorage seating loss (wedge slip)
    // Approximate friction gradient dP/dx (kN/m):
    const frictionDrop = P0 - rawFrictionStations[rawFrictionStations.length - 1];
    const pFrictionSlopeKnPerM = Math.max(0.1, frictionDrop / L);
    const pFrictionSlopeNPerM = pFrictionSlopeKnPerM * 1000;

    // Influence length L_set = sqrt( (delta_slip * Ep * Ap) / p_friction )
    // Ep in N/mm^2 = MPa, Ap in mm^2 => Ep * Ap in N.
    const EpApN = Ep * Ap;
    let LsetM = Math.sqrt((deltaSlip * EpApN) / pFrictionSlopeNPerM);
    LsetM = Math.min(LsetM, L); // cannot exceed member length

    // Force drop at jacking end due to seating:
    // Delta P_seat = 2 * p_friction * L_set
    const deltaPSeatAnchorKn = Math.min(P0 * 0.4, 2 * pFrictionSlopeKnPerM * LsetM);

    const seatedStations = rawFrictionStations.map((P_raw, idx) => {
      const x = geometry.stations[idx].xM;
      if (x < LsetM) {
        // Linear reduction from anchor to Lset
        const relief = deltaPSeatAnchorKn * (1 - x / LsetM);
        return Math.max(0, P_raw - relief);
      }
      return P_raw;
    });

    // 3. Elastic shortening loss
    const fcgp = input.concreteStressAtCentroidTransferMpa ?? 10.0; // MPa
    const Eci = input.concreteModulusTransferMpa ?? 28000;           // MPa
    const nTendons = tendon.numberOfStrands > 1 ? tendon.numberOfStrands : 1;

    let deltaFpEsMpa: number;
    if (input.isPretensioned) {
      deltaFpEsMpa = (Ep / Eci) * fcgp;
    } else {
      // Post-tensioned sequential stressing
      deltaFpEsMpa = ((nTendons - 1) / (2 * nTendons)) * (Ep / Eci) * fcgp;
    }
    const deltaPEsKn = (deltaFpEsMpa * Ap) / 1000;

    // Force at initial transfer
    const transferStations = seatedStations.map(P => Math.max(0, P - deltaPEsKn));
    const avgTransferKn = transferStations.reduce((a, b) => a + b, 0) / transferStations.length;
    const minTransferKn = Math.min(...transferStations);
    const maxTransferKn = Math.max(...transferStations);

    // 4. Long-term time-dependent losses (ACI 318 / PTI / AASHTO)
    const Ec = input.concreteModulusServiceMpa ?? 32000; // MPa
    const fcgs = input.concreteStressAtCentroidDeadLoadMpa ?? 4.0; // MPa
    const Kcr = input.creepFactorKcr ?? (input.isPretensioned ? 2.0 : 1.6);
    const Ksh = input.shrinkageFactorKsh ?? 1.0;
    const RH = Math.max(20, Math.min(100, input.relativeHumidityPercent ?? 70));
    const VS = Math.max(25, Math.min(250, input.volumeToSurfaceRatioMm ?? 75));

    // A. Concrete Creep Loss (MPa)
    const deltaFpCrMpa = Math.max(0, Kcr * (Ep / Ec) * (fcgp - fcgs));

    // B. Concrete Shrinkage Loss (MPa)
    // ACI formula: 8.2e-6 * Ksh * Ep * (1 - 0.06 * V/S / 25.4) * (100 - RH)
    const vsInches = VS / 25.4;
    const vsFactor = Math.max(0.2, 1 - 0.06 * vsInches);
    const deltaFpShMpa = Math.max(0, 8.2e-6 * Ksh * Ep * vsFactor * (100 - RH));

    // C. Steel Relaxation Loss (MPa) for low-relaxation strand
    // Over time t (hours) at transfer stress f_pi:
    // deltaFpRe = [log(24*t) / 45] * (f_pi / f_py - 0.55) * f_pi
    const timeHours = (input.timeYears ?? 50) * 365 * 24;
    const stressRatio = fpi / tendon.fpyMpa;
    let deltaFpReMpa = 0;
    if (stressRatio > 0.55) {
      deltaFpReMpa = (Math.log10(timeHours) / 45) * (stressRatio - 0.55) * fpi;
    }
    // Creep and shrinkage reduce relaxation by approximately 20%
    deltaFpReMpa = Math.max(10, deltaFpReMpa * 0.80);

    const totalLongTermStressMpa = deltaFpCrMpa + deltaFpShMpa + deltaFpReMpa;
    const totalLongTermForceKn = (totalLongTermStressMpa * Ap) / 1000;

    // Final effective prestress force distribution
    const effectiveStations: ForceStation[] = geometry.stations.map((st, idx) => {
      const pTrans = transferStations[idx];
      const pEff = Math.max(0, pTrans - totalLongTermForceKn);
      const sEff = (pEff * 1000) / Ap;

      return {
        xM: st.xM,
        xRatio: st.xRatio,
        forceBeforeSeatingKn: Math.round(rawFrictionStations[idx] * 10) / 10,
        forceAfterSeatingKn: Math.round(seatedStations[idx] * 10) / 10,
        forceAtTransferKn: Math.round(pTrans * 10) / 10,
        effectiveForceKn: Math.round(pEff * 10) / 10,
        effectiveStressMpa: Math.round(sEff * 10) / 10,
      };
    });

    const avgEffKn = effectiveStations.reduce((a, b) => a + b.effectiveForceKn, 0) / effectiveStations.length;
    const minEffKn = Math.min(...effectiveStations.map(s => s.effectiveForceKn));
    const maxEffKn = Math.max(...effectiveStations.map(s => s.effectiveForceKn));
    const avgEffStressMpa = (avgEffKn * 1000) / Ap;

    const shortTermLossPercent = ((P0 - avgTransferKn) / P0) * 100;
    const longTermLossPercent = ((avgTransferKn - avgEffKn) / P0) * 100;
    const totalLossPercent = ((P0 - avgEffKn) / P0) * 100;

    return {
      initialJackingForceKn: Math.round(P0 * 10) / 10,
      initialJackingStressMpa: Math.round(fpi * 10) / 10,
      shortTermLosses: {
        maxFrictionLossKn: Math.round(maxFrictionLossKn * 10) / 10,
        anchorageSeatingLossAtAnchorKn: Math.round(deltaPSeatAnchorKn * 10) / 10,
        seatingInfluenceLengthM: Math.round(LsetM * 100) / 100,
        elasticShorteningStressMpa: Math.round(deltaFpEsMpa * 10) / 10,
        elasticShorteningForceKn: Math.round(deltaPEsKn * 10) / 10,
        averageForceAtTransferKn: Math.round(avgTransferKn * 10) / 10,
        minForceAtTransferKn: Math.round(minTransferKn * 10) / 10,
        maxForceAtTransferKn: Math.round(maxTransferKn * 10) / 10,
      },
      longTermLosses: {
        creepLossStressMpa: Math.round(deltaFpCrMpa * 10) / 10,
        creepLossForceKn: Math.round(((deltaFpCrMpa * Ap) / 1000) * 10) / 10,
        shrinkageLossStressMpa: Math.round(deltaFpShMpa * 10) / 10,
        shrinkageLossForceKn: Math.round(((deltaFpShMpa * Ap) / 1000) * 10) / 10,
        relaxationLossStressMpa: Math.round(deltaFpReMpa * 10) / 10,
        relaxationLossForceKn: Math.round(((deltaFpReMpa * Ap) / 1000) * 10) / 10,
        totalLongTermStressMpa: Math.round(totalLongTermStressMpa * 10) / 10,
        totalLongTermForceKn: Math.round(totalLongTermForceKn * 10) / 10,
      },
      effectiveSummary: {
        averageEffectiveForceKn: Math.round(avgEffKn * 10) / 10,
        minEffectiveForceKn: Math.round(minEffKn * 10) / 10,
        maxEffectiveForceKn: Math.round(maxEffKn * 10) / 10,
        averageEffectiveStressMpa: Math.round(avgEffStressMpa * 10) / 10,
        effectiveToJackingRatio: Math.round((avgEffKn / P0) * 1000) / 1000,
        shortTermLossPercent: Math.round(shortTermLossPercent * 10) / 10,
        longTermLossPercent: Math.round(longTermLossPercent * 10) / 10,
        totalLossPercent: Math.round(totalLossPercent * 10) / 10,
      },
      forceDistribution: effectiveStations,
    };
  }
}
