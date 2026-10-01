/**
 * Single Degree of Freedom (SDOF) Blast Dynamic Response Engine
 * Formulated per Biggs (1964) and DoD UFC 3-340-02
 * @packageDocumentation
 */

import {
  SDOFSystemParams,
  SDOFAnalysisResult,
  SDOFResponseHistoryPoint,
  BlastWaveformParameters,
} from '../types';
import { KingeryBulmashEngine } from '../waveforms/KingeryBulmash';

export class SDOFBlastEngine {
  /**
   * Determine Biggs / UFC 3-340-02 Load-Mass Factor K_LM
   */
  public static getLoadMassFactor(
    boundary: SDOFSystemParams['boundary'],
    isPlastic: boolean = false
  ): number {
    switch (boundary) {
      case 'simply-supported':
        return isPlastic ? 0.66 : 0.78;
      case 'fixed-fixed':
        return isPlastic ? 0.66 : 0.77;
      case 'cantilever':
        return isPlastic ? 0.50 : 0.66;
      case 'propped-cantilever':
      default:
        return isPlastic ? 0.60 : 0.75;
    }
  }

  /**
   * Solve nonlinear elasto-plastic SDOF dynamic response under blast overpressure
   */
  public static solveResponse(params: {
    system: SDOFSystemParams;
    blast: BlastWaveformParameters;
    totalSimulationTimeMs?: number;
    timeStepMs?: number;
  }): SDOFAnalysisResult {
    const { system, blast, timeStepMs = 0.05 } = params;

    const DIF = system.dynamicIncreaseFactor ?? 1.20;
    const dynamicYieldResistanceKN = system.yieldResistanceKN * DIF;
    const kKNm = system.elasticStiffnessKNm;

    // Yield displacement (m)
    const yYieldM = dynamicYieldResistanceKN / (kKNm > 0 ? kKNm : 1e4);
    const yYieldMm = yYieldM * 1000;

    // Tributary loaded surface area (m²)
    const tribWidth = system.width ?? 1.0;
    const loadedAreaM2 = system.spanLength * tribWidth;

    // SDOF mass transformation
    const kLM_el = this.getLoadMassFactor(system.boundary, false);
    const equivalentMassKg = kLM_el * system.totalMassKg;

    // Natural circular frequency and period
    // k in N/m = kKNm * 1000
    const omega = Math.sqrt((kKNm * 1000) / Math.max(1.0, equivalentMassKg));
    const TnMs = ((2 * Math.PI) / omega) * 1000;

    // Damping coefficient C = 2 * xi * omega * M_e
    const dampingRatio = system.dampingRatio ?? 0.02;
    const cDamping = 2 * dampingRatio * omega * equivalentMassKg;

    // Simulation duration
    const tEndMs = params.totalSimulationTimeMs ?? Math.max(blast.shockArrivalTimestamp + blast.positivePhaseDuration * 4, TnMs * 3.5);
    const dtSec = timeStepMs / 1000;

    // Numerical Integration (Explicit Central Difference with velocity Verlet scheme)
    let tMs = 0;
    let yM = 0; // displacement (m)
    let vMPerS = 0; // velocity (m/s)
    let maxYM = 0;

    const history: SDOFResponseHistoryPoint[] = [];
    const saveDecimation = Math.max(1, Math.round(0.2 / timeStepMs)); // save every ~0.2 ms
    let stepCount = 0;

    const numSteps = Math.ceil(tEndMs / timeStepMs);

    for (let step = 0; step <= numSteps; step++) {
      tMs = step * timeStepMs;

      // 1. Applied blast force F(t) in kN
      let PoverpressureKPa = 0;
      if (tMs >= blast.shockArrivalTimestamp && tMs <= blast.shockArrivalTimestamp + blast.positivePhaseDuration) {
        const tau = (tMs - blast.shockArrivalTimestamp) / blast.positivePhaseDuration;
        PoverpressureKPa = blast.peakReflectedPressure * (1 - tau) * Math.exp(-blast.decayWaveformFactor * tau);
      }
      const appliedForceKN = PoverpressureKPa * loadedAreaM2;
      const appliedForceN = appliedForceKN * 1000;

      // 2. Resistance function R(y) in kN
      let resistanceKN = 0;
      const absY = Math.abs(yM);
      if (absY <= yYieldM) {
        resistanceKN = kKNm * yM;
      } else {
        resistanceKN = Math.sign(yM) * dynamicYieldResistanceKN;
      }
      const resistanceN = resistanceKN * 1000;

      // 3. Acceleration in m/s²: a = (F - C*v - R) / M_e
      const dampingForceN = cDamping * vMPerS;
      const netForceN = appliedForceN - dampingForceN - resistanceN;
      const accelMPerS2 = netForceN / equivalentMassKg;

      // Track max displacement
      if (absY > maxYM) {
        maxYM = absY;
      }

      // Record point
      if (stepCount % saveDecimation === 0 || step === numSteps) {
        history.push({
          timeMs: Math.round(tMs * 100) / 100,
          displacementMm: yM * 1000,
          velocityMPerS: vMPerS,
          accelerationMPerS2: accelMPerS2,
          appliedForceKN,
          resistanceKN,
        });
      }
      stepCount++;

      // Velocity Verlet update
      yM += vMPerS * dtSec + 0.5 * accelMPerS2 * (dtSec ** 2);
      vMPerS += accelMPerS2 * dtSec;
    }

    const maxYMm = maxYM * 1000;
    const ductilityRatio = yYieldMm > 0 ? maxYMm / yYieldMm : 1.0;

    // Support rotation angle theta (degrees)
    const halfSpanM = Math.max(0.5, system.spanLength / 2);
    const supportRotationRad = Math.atan(maxYM / halfSpanM);
    const supportRotationDeg = (supportRotationRad * 180) / Math.PI;

    // Damage protection category per UFC 3-340-02 & ASCE 59-11
    let protectionLevel: 'low' | 'medium' | 'high' = 'high';
    if (ductilityRatio > 6.0 || supportRotationDeg > 4.0) {
      protectionLevel = 'low'; // High Damage / Low Protection
    } else if (ductilityRatio > 3.0 || supportRotationDeg > 2.0) {
      protectionLevel = 'medium'; // Moderate Damage
    } else {
      protectionLevel = 'high'; // Superficial Damage / High Protection
    }

    return {
      naturalPeriodMs: TnMs,
      equivalentMassKg,
      loadMassFactorKLM: kLM_el,
      maxDisplacementMm: maxYMm,
      yieldDisplacementMm: yYieldMm,
      ductilityRatio,
      supportRotationDeg,
      timeHistory: history,
      protectionLevel,
    };
  }
}
