/**
 * VortexSheddingEngine.ts
 *
 * Cross-wind vortex shedding resonance, Strouhal frequency calculation,
 * critical lock-in velocity, Scruton mass-damping parameter, and peak dynamic amplitude.
 */

export interface VortexSheddingInput {
  crossSectionType: 'SQUARE' | 'RECTANGULAR' | 'CIRCULAR';
  crossWindDimension_b_m: number; // b: Width perpendicular to wind
  alongWindDimension_d_m: number; // d: Depth parallel to wind
  buildingHeight_m: number; // h
  fundamentalFrequency_Hz: number; // f1
  dampingRatio: number; // xi (e.g. 0.015)
  averageMassPerMeter_kg_m: number; // me: Equivalent mass per unit height (kg/m)
  designWindSpeed_mps: number; // 10-minute / hourly mean speed at roof
  airDensity_kg_m3?: number; // default 1.25 kg/m^3
}

export interface VortexSheddingResult {
  strouhalNumber: number; // St
  criticalVelocity_mps: number; // v_crit
  scrutonNumber: number; // Sc
  isLockInSusceptible: boolean; // v_crit <= 1.25 * designSpeed
  peakTransverseAmplitude_mm: number; // y_max
  relativeAmplitudeRatio: number; // y_max / b
  peakBaseCrossWindShear_kN: number;
  diagnostics: string[];
}

export class VortexSheddingEngine {
  /**
   * Evaluates Strouhal number St based on cross-section geometry.
   */
  public static getStrouhalNumber(
    type: 'SQUARE' | 'RECTANGULAR' | 'CIRCULAR',
    d_m: number,
    b_m: number
  ): number {
    if (type === 'CIRCULAR') return 0.18;

    const ratio = b_m > 0 ? d_m / b_m : 1.0;
    if (ratio <= 1.0) {
      return 0.12; // Square / broad face
    } else if (ratio <= 2.0) {
      return Number((0.12 - 0.03 * (ratio - 1.0)).toFixed(3)); // 0.12 down to 0.09
    } else {
      return 0.09;
    }
  }

  /**
   * Conducts complete vortex shedding lock-in and dynamic cross-wind resonance audit.
   */
  public static analyze(input: VortexSheddingInput): VortexSheddingResult {
    const {
      crossSectionType,
      crossWindDimension_b_m: b,
      alongWindDimension_d_m: d,
      buildingHeight_m: h,
      fundamentalFrequency_Hz: f1,
      dampingRatio: xi,
      averageMassPerMeter_kg_m: me,
      designWindSpeed_mps: vDesign,
      airDensity_kg_m3 = 1.25,
    } = input;

    const St = this.getStrouhalNumber(crossSectionType, d, b);

    // 1. Critical lock-in velocity: v_crit = (b * f1) / St
    const v_crit = (b * f1) / St;

    // 2. Scruton number: Sc = (2 * me * delta_s) / (rho * b^2)
    // delta_s = 2 * pi * xi (logarithmic decrement of damping)
    const delta_s = 2 * Math.PI * xi;
    const Sc = (2 * me * delta_s) / (airDensity_kg_m3 * (b * b));

    // 3. Susceptibility to aerodynamic lock-in resonance
    // Occurs if v_crit is within or near the design operational speed (<= 1.25 * vDesign)
    const isLockInSusceptible = v_crit <= 1.25 * vDesign && v_crit >= 3.0;

    // 4. Maximum cross-wind amplitude y_max
    // In resonance lock-in: y_max / b = (1 / St^2) * (c_lat / Sc)
    // For bluff bodies, c_lat ~ 0.20 - 0.50 (Eurocode 1 Annex E)
    const clat = crossSectionType === 'CIRCULAR' ? 0.20 : 0.40;
    let y_over_b = (1 / (St * St)) * (clat / Math.max(1.0, Sc));

    // Aerodynamic saturation limit: y_max / b is self-limiting and cannot exceed ~ 0.15
    y_over_b = Math.min(0.15, Math.max(0.001, y_over_b));

    const y_max_m = isLockInSusceptible ? y_over_b * b : 0.05 * y_over_b * b;
    const y_max_mm = y_max_m * 1000;

    // 5. Peak cross-wind dynamic base shear:
    // F_dyn = integral(m * (2*pi*f1)^2 * phi(z) * y_max)
    // For linear mode shape phi(z) = z/h, equivalent generalized force ~ 0.5 * me * h * (omega^2) * y_max
    const omega = 2 * Math.PI * f1;
    const peakCrossWindShear_N = 0.5 * me * h * (omega * omega) * y_max_m;
    const peakCrossWindShear_kN = peakCrossWindShear_N / 1000;

    const diagnostics: string[] = [];
    diagnostics.push(`Strouhal Number St = ${St.toFixed(3)}, Scruton Number Sc = ${Sc.toFixed(1)}.`);
    diagnostics.push(
      `Critical resonant wind speed v_crit = ${v_crit.toFixed(1)} m/s (Design wind speed = ${vDesign.toFixed(1)} m/s).`
    );

    if (isLockInSusceptible) {
      diagnostics.push(
        `WARNING: Structure is susceptible to cross-wind vortex shedding lock-in resonance (v_crit <= 1.25 * v_design).`
      );
      diagnostics.push(
        `Estimated peak transverse roof oscillation amplitude: ${y_max_mm.toFixed(1)} mm (y/b = ${(y_over_b * 100).toFixed(2)}%).`
      );
    } else {
      diagnostics.push(
        `Structure is safe from lock-in resonance within design envelope (v_crit > 1.25 * v_design).`
      );
    }

    return {
      strouhalNumber: St,
      criticalVelocity_mps: Number(v_crit.toFixed(2)),
      scrutonNumber: Number(Sc.toFixed(2)),
      isLockInSusceptible,
      peakTransverseAmplitude_mm: Number(y_max_mm.toFixed(1)),
      relativeAmplitudeRatio: Number(y_over_b.toFixed(4)),
      peakBaseCrossWindShear_kN: Number(peakCrossWindShear_kN.toFixed(1)),
      diagnostics,
    };
  }
}
