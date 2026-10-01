/**
 * Kingery-Bulmash & UFC 3-340-02 Blast Waveform Engine
 * Calculates Incident / Reflected Overpressure, Impulses, and Friedlander Pressure-Time Histories
 * @packageDocumentation
 */

import {
  ExplosiveType,
  ExplosiveProperties,
  BlastSourceParams,
  BlastWaveformParameters,
  TimePressurePoint,
} from '../types';

export const EXPLOSIVES_CATALOG: Record<ExplosiveType, ExplosiveProperties> = {
  TNT: {
    type: 'TNT',
    name: 'Trinitrotoluene (TNT)',
    tntEquivalentMass: 1.0,
    tntEquivalentImpulse: 1.0,
  },
  'Comp-B': {
    type: 'Comp-B',
    name: 'Composition B (60% RDX / 40% TNT)',
    tntEquivalentMass: 1.11,
    tntEquivalentImpulse: 1.10,
  },
  ANFO: {
    type: 'ANFO',
    name: 'Ammonium Nitrate / Fuel Oil',
    tntEquivalentMass: 0.82,
    tntEquivalentImpulse: 0.85,
  },
  C4: {
    type: 'C4',
    name: 'Composition C-4 (91% RDX)',
    tntEquivalentMass: 1.30,
    tntEquivalentImpulse: 1.25,
  },
  RDX: {
    type: 'RDX',
    name: 'Cyclotrimethylenetrinitramine (RDX)',
    tntEquivalentMass: 1.60,
    tntEquivalentImpulse: 1.45,
  },
  PETN: {
    type: 'PETN',
    name: 'Pentaerythritol Tetranitrate (PETN)',
    tntEquivalentMass: 1.28,
    tntEquivalentImpulse: 1.20,
  },
  Semtex: {
    type: 'Semtex',
    name: 'Semtex 1A / H',
    tntEquivalentMass: 1.25,
    tntEquivalentImpulse: 1.22,
  },
};

export class KingeryBulmashEngine {
  public static readonly P_ATM_KPA = 101.325; // Standard atmospheric pressure

  /**
   * Compute blast parameters from charge weight, standoff, and burst geometry
   */
  public static calculateWaveformParameters(params: BlastSourceParams): BlastWaveformParameters {
    const {
      chargeMass,
      explosiveType = 'TNT',
      standoffDistance: R,
      burstType = 'surface',
      angleIncidenceDeg = 0,
    } = params;

    const explosive = EXPLOSIVES_CATALOG[explosiveType] ?? EXPLOSIVES_CATALOG.TNT;
    let effectiveTNT = chargeMass * explosive.tntEquivalentMass;

    // Surface burst reflection ground enhancement factor (typically 1.8 for standard soil/concrete terrain)
    if (burstType === 'surface') {
      effectiveTNT *= 1.8;
    }

    const wCubeRoot = Math.cbrt(Math.max(0.01, effectiveTNT));
    const Z = Math.max(0.1, R / wCubeRoot); // Scaled distance (m/kg^(1/3))

    // Brode & Henrych unified incident peak overpressure (kPa)
    let Pso = 0;
    if (Z <= 1.0) {
      Pso = 975 / (Z ** 3) + 1455 / (Z ** 2) + 585 / Z - 24;
    } else if (Z <= 10.0) {
      Pso = 72 / (Z ** 3) + 180 / (Z ** 2) + 105 / Z;
    } else {
      Pso = 105 / Z;
    }
    Pso = Math.max(0.5, Pso);

    // Rankine-Hugoniot normal reflected pressure Pr
    const P0 = this.P_ATM_KPA;
    const normalPr = 2 * Pso * ((7 * P0 + 4 * Pso) / (7 * P0 + Pso));

    // Oblique angle of incidence adjustment
    const alphaRad = (angleIncidenceDeg * Math.PI) / 180;
    const cosAlpha = Math.cos(alphaRad);
    const Pr = Pso * (1 + cosAlpha) + (normalPr - 2 * Pso) * (cosAlpha ** 2);

    // Shock front velocity U (m/s)
    const acousticVelocity = 340; // m/s in standard air
    const U = acousticVelocity * Math.sqrt(1 + (6 * Pso) / (7 * P0));

    // Arrival time ta (ms)
    const ta = wCubeRoot * Math.max(0.2, 0.92 * (Z ** 1.35));

    // Positive phase duration td (ms)
    let tdScaled = 0;
    if (Z < 1.0) {
      tdScaled = 0.5 * Math.sqrt(Z);
    } else {
      tdScaled = (2.2 * Z) / (1 + 0.35 * (Z ** 1.8));
    }
    const td = Math.max(0.2, wCubeRoot * tdScaled);

    // Friedlander decay waveform factor b
    const b = Math.max(0.1, Math.min(3.5, 0.15 + 0.25 * Z));

    // Positive impulses Is, Ir (kPa·ms)
    // Integral_0^td [ (1 - t/td) e^(-b*t/td) dt ] = td * [ (b - 1 + e^(-b)) / b^2 ]
    const impulseFactor = (b - 1 + Math.exp(-b)) / (b * b);
    const Is = Pso * td * impulseFactor;
    const Ir = Pr * td * impulseFactor;

    return {
      scaledDistanceZ: Z,
      effectiveChargeMassTNT: effectiveTNT,
      peakIncidentPressure: Pso,
      peakReflectedPressure: Pr,
      shockArrivalTimestamp: ta,
      positivePhaseDuration: td,
      positiveIncidentImpulse: Is,
      positiveReflectedImpulse: Ir,
      shockVelocity: U,
      decayWaveformFactor: b,
    };
  }

  /**
   * Generate time-history curve using Friedlander modified exponential decay
   */
  public static generateTimeHistory(
    params: BlastWaveformParameters,
    totalTimeMs?: number,
    numSteps: number = 100
  ): TimePressurePoint[] {
    const {
      peakIncidentPressure: Pso,
      peakReflectedPressure: Pr,
      shockArrivalTimestamp: ta,
      positivePhaseDuration: td,
      decayWaveformFactor: b,
    } = params;

    const tEnd = totalTimeMs ?? ta + td * 2.5;
    const dt = tEnd / numSteps;
    const points: TimePressurePoint[] = [];

    const sampleTimes = new Set<number>();
    for (let i = 0; i <= numSteps; i++) {
      sampleTimes.add(Math.round(i * dt * 1000) / 1000);
    }
    sampleTimes.add(Math.round(ta * 1000) / 1000);
    sampleTimes.add(Math.round((ta + td) * 1000) / 1000);

    const sortedTimes = Array.from(sampleTimes).sort((a, b) => a - b);

    for (const t of sortedTimes) {
      if (t < ta) {
        // Before shock front arrival
        points.push({
          timeMs: t,
          incidentPressureKPa: 0,
          reflectedPressureKPa: 0,
        });
      } else if (t <= ta + td) {
        // Positive phase: P(t) = P_peak * (1 - tau) * exp(-b * tau)
        const tau = (t - ta) / td;
        const decay = (1 - tau) * Math.exp(-b * tau);
        points.push({
          timeMs: t,
          incidentPressureKPa: Math.max(0, Pso * decay),
          reflectedPressureKPa: Math.max(0, Pr * decay),
        });
      } else {
        // Negative phase (decaying suction up to -0.15 * Pso)
        const tauNeg = (t - (ta + td)) / (td * 1.5);
        if (tauNeg <= 1.0) {
          const negDecay = -0.15 * Math.sin(Math.PI * tauNeg) * Math.exp(-tauNeg);
          points.push({
            timeMs: t,
            incidentPressureKPa: Pso * negDecay,
            reflectedPressureKPa: Pr * negDecay,
          });
        } else {
          points.push({
            timeMs: t,
            incidentPressureKPa: 0,
            reflectedPressureKPa: 0,
          });
        }
      }
    }

    return points;
  }
}
