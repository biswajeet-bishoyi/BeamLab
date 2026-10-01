/**
 * ResponseSpectrumGenerator.ts
 *
 * Codified and custom response spectra generator supporting:
 * - ASCE 7-22 / IBC 2024 (Multi-period design response spectrum)
 * - Eurocode 8 / EN 1998-1:2004 (Type 1 & Type 2 Elastic & Design Spectra)
 * - IS 1893:2016 Part 1 (Zones II-V, Soil Types I, II, III)
 * - Arbitrary user-defined piecewise response spectra with logarithmic/linear interpolation
 * - Damping correction factors across variable viscous damping ratios
 */

export type SeismicStandard = 'ASCE_7_22' | 'EUROCODE_8' | 'IS_1893_2016' | 'USER_DEFINED';

export interface SpectrumPoint {
  period_s: number;
  spectralAcceleration_g: number;
}

export interface Asce7Options {
  Sds: number; // Short-period design spectral acceleration (g)
  Sd1: number; // 1-second design spectral acceleration (g)
  Tl?: number; // Long-period transition period in seconds (default 8.0s)
  R?: number;  // Response modification coefficient (default 1.0 for elastic)
  Ie?: number; // Seismic importance factor (default 1.0)
  dampingRatio?: number; // default 0.05 (5%)
}

export type EurocodeGroundType = 'A' | 'B' | 'C' | 'D' | 'E';
export type EurocodeSpectrumType = 'TYPE_1' | 'TYPE_2';

export interface Eurocode8Options {
  groundType: EurocodeGroundType;
  spectrumType?: EurocodeSpectrumType; // default TYPE_1
  ag_g: number; // Design ground acceleration on Type A ground (in g)
  q?: number;   // Behavior factor (default 1.0 for elastic)
  dampingRatio?: number; // default 0.05
  isDesignSpectrum?: boolean; // true for design spectrum (incorporating q), false for elastic
}

export type Is1893Zone = 'II' | 'III' | 'IV' | 'V';
export type Is1893SoilType = 'I' | 'II' | 'III'; // I: Rock/Hard, II: Medium, III: Soft

export interface Is1893Options {
  zone: Is1893Zone;
  soilType: Is1893SoilType;
  R?: number; // Response reduction factor (default 1.0 for elastic, e.g. 5.0 for SMRF)
  I?: number; // Importance factor (default 1.0)
  dampingRatio?: number; // default 0.05
}

export interface UserDefinedPoint {
  period_s: number;
  Sa_g: number;
}

export class ResponseSpectrumGenerator {
  /**
   * Computes damping correction factor eta for damping ratio xi.
   * eta = sqrt(10 / (5 + xi_percent)) >= 0.55
   */
  public static getDampingFactor(dampingRatio: number = 0.05): number {
    const xi_pct = dampingRatio * 100;
    const eta = Math.sqrt(10 / (5 + xi_pct));
    return Math.max(0.55, eta);
  }

  /**
   * Computes ASCE 7-22 design spectral acceleration Sa(T) in g.
   */
  public static getAsce7Sa(T: number, options: Asce7Options): number {
    const Sds = options.Sds;
    const Sd1 = options.Sd1;
    const Tl = options.Tl ?? 8.0;
    const R = options.R ?? 1.0;
    const Ie = options.Ie ?? 1.0;
    const damping = options.dampingRatio ?? 0.05;

    if (Sds <= 0 || Sd1 <= 0) return 0;

    const T0 = 0.2 * (Sd1 / Sds);
    const Ts = Sd1 / Sds;

    let Sa_elastic = 0;
    if (T < T0) {
      Sa_elastic = Sds * (0.4 + 0.6 * (T / T0));
    } else if (T <= Ts) {
      Sa_elastic = Sds;
    } else if (T <= Tl) {
      Sa_elastic = Sd1 / Math.max(1e-4, T);
    } else {
      Sa_elastic = (Sd1 * Tl) / (Math.max(1e-4, T) ** 2);
    }

    // Apply damping adjustment if damping differs from 5%
    if (Math.abs(damping - 0.05) > 1e-4) {
      const eta = this.getDampingFactor(damping);
      Sa_elastic *= eta;
    }

    // Reduce by (R / Ie)
    const reduction = R / Ie;
    const Sa_design = Sa_elastic / reduction;

    // ASCE 7 lower bound check: Sa >= 0.044 * Sds * Ie
    const minSa = (0.044 * Sds * Ie) / reduction;
    return Math.max(minSa, Sa_design);
  }

  /**
   * Computes Eurocode 8 (EN 1998-1) spectral acceleration in g.
   */
  public static getEurocode8Sa(T: number, options: Eurocode8Options): number {
    const ag = options.ag_g;
    const type = options.spectrumType ?? 'TYPE_1';
    const ground = options.groundType;
    const q = options.q ?? 1.0;
    const damping = options.dampingRatio ?? 0.05;
    const isDesign = options.isDesignSpectrum ?? false;

    // Soil parameters Table 3.2 (Type 1) and Table 3.3 (Type 2)
    let S = 1.0;
    let Tb = 0.15;
    let Tc = 0.40;
    let Td = 2.00;

    if (type === 'TYPE_1') {
      switch (ground) {
        case 'A': S = 1.0; Tb = 0.15; Tc = 0.40; Td = 2.0; break;
        case 'B': S = 1.2; Tb = 0.15; Tc = 0.50; Td = 2.0; break;
        case 'C': S = 1.15; Tb = 0.20; Tc = 0.60; Td = 2.0; break;
        case 'D': S = 1.35; Tb = 0.20; Tc = 0.80; Td = 2.0; break;
        case 'E': S = 1.40; Tb = 0.15; Tc = 0.50; Td = 2.0; break;
      }
    } else {
      switch (ground) {
        case 'A': S = 1.0; Tb = 0.05; Tc = 0.25; Td = 1.2; break;
        case 'B': S = 1.35; Tb = 0.05; Tc = 0.25; Td = 1.2; break;
        case 'C': S = 1.50; Tb = 0.10; Tc = 0.25; Td = 1.2; break;
        case 'D': S = 1.80; Tb = 0.10; Tc = 0.30; Td = 1.2; break;
        case 'E': S = 1.60; Tb = 0.05; Tc = 0.25; Td = 1.2; break;
      }
    }

    const eta = this.getDampingFactor(damping);

    if (!isDesign) {
      // Elastic spectrum Se(T)
      if (T < Tb) {
        return ag * S * (1 + (T / Tb) * (eta * 2.5 - 1));
      } else if (T <= Tc) {
        return ag * S * eta * 2.5;
      } else if (T <= Td) {
        return ag * S * eta * 2.5 * (Tc / Math.max(1e-4, T));
      } else {
        return ag * S * eta * 2.5 * ((Tc * Td) / (Math.max(1e-4, T) ** 2));
      }
    } else {
      // Design spectrum Sd(T) per EC8 Clause 3.2.2.5
      const beta = 0.2; // Lower bound factor
      let Sd = 0;
      if (T < Tb) {
        Sd = ag * S * (2 / 3 + (T / Tb) * (2.5 / q - 2 / 3));
      } else if (T <= Tc) {
        Sd = ag * S * (2.5 / q);
      } else if (T <= Td) {
        Sd = ag * S * (2.5 / q) * (Tc / Math.max(1e-4, T));
      } else {
        Sd = ag * S * (2.5 / q) * ((Tc * Td) / (Math.max(1e-4, T) ** 2));
      }
      return Math.max(beta * ag, Sd);
    }
  }

  /**
   * Computes IS 1893:2016 Part 1 design horizontal acceleration Ah(T) in g.
   * Ah = (Z / 2) * (I / R) * (Sa / g)
   */
  public static getIs1893Sa(T: number, options: Is1893Options): number {
    const zoneFactors: Record<Is1893Zone, number> = {
      II: 0.10,
      III: 0.16,
      IV: 0.24,
      V: 0.36,
    };
    const Z = zoneFactors[options.zone] ?? 0.16;
    const I = options.I ?? 1.0;
    const R = options.R ?? 1.0;
    const damping = options.dampingRatio ?? 0.05;

    let Sa_over_g = 1.0;
    const soil = options.soilType;

    if (soil === 'I') {
      // Rock / Hard soil
      if (T <= 0.10) {
        Sa_over_g = 1 + 15 * T;
      } else if (T <= 0.40) {
        Sa_over_g = 2.5;
      } else {
        Sa_over_g = 1.0 / Math.max(1e-4, T);
      }
    } else if (soil === 'II') {
      // Medium soil
      if (T <= 0.10) {
        Sa_over_g = 1 + 15 * T;
      } else if (T <= 0.55) {
        Sa_over_g = 2.5;
      } else {
        Sa_over_g = 1.36 / Math.max(1e-4, T);
      }
    } else {
      // Soft soil (III)
      if (T <= 0.10) {
        Sa_over_g = 1 + 15 * T;
      } else if (T <= 0.67) {
        Sa_over_g = 2.5;
      } else {
        Sa_over_g = 1.67 / Math.max(1e-4, T);
      }
    }

    // Damping factor
    const eta = this.getDampingFactor(damping);
    Sa_over_g *= eta;

    // Ah = (Z / 2) * (I / R) * (Sa / g)
    const Ah = (Z / 2) * (I / R) * Sa_over_g;
    return Ah;
  }

  /**
   * Evaluates piecewise user-defined response spectrum via linear interpolation.
   */
  public static getUserDefinedSa(T: number, points: UserDefinedPoint[]): number {
    if (!points || points.length === 0) return 0;
    const sorted = [...points].sort((a, b) => a.period_s - b.period_s);
    if (T <= sorted[0]!.period_s) return sorted[0]!.Sa_g;
    if (T >= sorted[sorted.length - 1]!.period_s) return sorted[sorted.length - 1]!.Sa_g;

    for (let i = 0; i < sorted.length - 1; i++) {
      const p1 = sorted[i]!;
      const p2 = sorted[i + 1]!;
      if (T >= p1.period_s && T <= p2.period_s) {
        const ratio = (T - p1.period_s) / (p2.period_s - p1.period_s);
        return p1.Sa_g + ratio * (p2.Sa_g - p1.Sa_g);
      }
    }
    return 0;
  }

  /**
   * Discretizes a response spectrum curve over [0, maxPeriod_s] for plotting.
   */
  public static generateCurve(
    evaluator: (T: number) => number,
    maxPeriod_s: number = 4.0,
    numPoints: number = 100
  ): SpectrumPoint[] {
    const points: SpectrumPoint[] = [];
    const step = maxPeriod_s / Math.max(1, numPoints - 1);
    for (let i = 0; i < numPoints; i++) {
      const T = Number((i * step).toFixed(4));
      const Sa = Number(evaluator(T).toFixed(5));
      points.push({ period_s: T, spectralAcceleration_g: Sa });
    }
    return points;
  }
}
