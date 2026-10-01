import { TendonGeometryResult } from '../tendon/TendonProfileEngine.js';

export interface LoadBalancingInput {
  geometry: TendonGeometryResult;
  averageEffectiveForceKn: number; // P_eff
  deadLoadKnPerM: number;          // Beam self-weight + superimposed dead load
  liveLoadKnPerM?: number;         // Service live load
}

export interface LoadBalancingResult {
  balancedUniformLoadKnPerM: number; // w_bal (kN/m)
  anchorForces: {
    startAxialCompressionKn: number;
    startEccentricMomentKnm: number; // M_start = P_eff * e_start
    endAxialCompressionKn: number;
    endEccentricMomentKnm: number;   // M_end = P_eff * e_end
  };
  netLoads: {
    netDeadLoadKnPerM: number;       // w_dead - w_bal
    netServiceLoadKnPerM: number;    // (w_dead + w_live) - w_bal
    deadLoadBalancedPercentage: number; // (w_bal / w_dead) * 100%
  };
  engineeringAssessment: {
    balanceRatio: number;
    classification: 'under-balanced' | 'moderately-balanced' | 'well-balanced' | 'full-balanced' | 'over-balanced';
    recommendation: string;
  };
}

export class LoadBalancingEngine {
  public static calculateBalancedLoads(input: LoadBalancingInput): LoadBalancingResult {
    const { geometry, averageEffectiveForceKn: Peff, deadLoadKnPerM: wDead } = input;
    const wLive = input.liveLoadKnPerM ?? 0;
    const L = geometry.spanLengthM;

    let wBalKnPerM = 0;

    if (geometry.profileType === 'parabolic') {
      // For parabolic tendon with midspan sag d (in m):
      // Chord elevation at midspan:
      const at0 = geometry.evaluateAt(0);
      const atMid = geometry.evaluateAt(L / 2);
      const atEnd = geometry.evaluateAt(L);
      const chordMidMm = (at0.yMm + atEnd.yMm) / 2;
      const sagM = (chordMidMm - atMid.yMm) / 1000;

      // w_bal = 8 * P_eff * sag / L^2
      wBalKnPerM = (8 * Peff * sagM) / (L * L);
    } else if (geometry.profileType === 'harped') {
      // Equivalent uniform load having equal midspan moment:
      // M_mid_kink = P_eff * sag => w_bal * L^2 / 8 = P_eff * sag => w_bal = 8 * P_eff * sag / L^2
      const at0 = geometry.evaluateAt(0);
      const atMid = geometry.evaluateAt(L / 2);
      const atEnd = geometry.evaluateAt(L);
      const chordMidMm = (at0.yMm + atEnd.yMm) / 2;
      const sagM = (chordMidMm - atMid.yMm) / 1000;
      wBalKnPerM = (8 * Peff * sagM) / (L * L);
    } else {
      // Reverse continuous parabolic:
      // Midspan region sag from inflection points:
      const atMid = geometry.evaluateAt(L / 2);
      const sagM = geometry.drapeMm / 1000;
      wBalKnPerM = (8 * Peff * sagM) / (L * L);
    }

    // Anchor forces:
    const at0 = geometry.evaluateAt(0);
    const atEnd = geometry.evaluateAt(L);

    const startAxial = Peff * Math.cos(at0.slopeRad);
    // Moment in kNm = kN * (mm / 1000)
    // Positive e (above cgc) creates negative sag moment, negative e (below cgc) creates hogging moment:
    const startEccentricMomentKnm = (Peff * at0.eccentricityMm) / 1000;
    const endAxial = Peff * Math.cos(atEnd.slopeRad);
    const endEccentricMomentKnm = (Peff * atEnd.eccentricityMm) / 1000;

    const netDeadLoad = wDead - wBalKnPerM;
    const netServiceLoad = (wDead + wLive) - wBalKnPerM;
    const deadLoadBalancedPct = wDead > 0 ? (wBalKnPerM / wDead) * 100 : 100;

    let classification: 'under-balanced' | 'moderately-balanced' | 'well-balanced' | 'full-balanced' | 'over-balanced';
    let recommendation: string;

    if (deadLoadBalancedPct < 50) {
      classification = 'under-balanced';
      recommendation = 'Balanced load is under 50% of dead load. Beam will experience downward deflection under sustained dead weight.';
    } else if (deadLoadBalancedPct < 70) {
      classification = 'moderately-balanced';
      recommendation = 'Moderate dead load balance. Acceptable if live-to-dead load ratio is high and deflection limits are satisfied.';
    } else if (deadLoadBalancedPct <= 100) {
      classification = 'well-balanced';
      recommendation = 'Target design window (70% - 100% dead load balanced). Near-zero long-term deflection under sustained service dead load.';
    } else if (deadLoadBalancedPct <= 120) {
      classification = 'full-balanced';
      recommendation = '100% - 120% dead load balanced. Eliminates dead load sag with slight upward camber.';
    } else {
      classification = 'over-balanced';
      recommendation = 'Over-balanced (>120% dead load). Watch for excessive upward camber under initial self-weight conditions.';
    }

    return {
      balancedUniformLoadKnPerM: Math.round(wBalKnPerM * 100) / 100,
      anchorForces: {
        startAxialCompressionKn: Math.round(startAxial * 10) / 10,
        startEccentricMomentKnm: Math.round(startEccentricMomentKnm * 10) / 10,
        endAxialCompressionKn: Math.round(endAxial * 10) / 10,
        endEccentricMomentKnm: Math.round(endEccentricMomentKnm * 10) / 10,
      },
      netLoads: {
        netDeadLoadKnPerM: Math.round(netDeadLoad * 100) / 100,
        netServiceLoadKnPerM: Math.round(netServiceLoad * 100) / 100,
        deadLoadBalancedPercentage: Math.round(deadLoadBalancedPct * 10) / 10,
      },
      engineeringAssessment: {
        balanceRatio: Math.round((wBalKnPerM / (wDead || 1)) * 1000) / 1000,
        classification,
        recommendation,
      },
    };
  }
}
