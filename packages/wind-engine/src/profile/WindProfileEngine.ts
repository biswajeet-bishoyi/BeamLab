/**
 * WindProfileEngine.ts
 *
 * Codified atmospheric boundary layer wind velocity and pressure profile engine
 * supporting ASCE 7-22, Eurocode 1 (EN 1991-1-4:2005), and IS 875 (Part 3): 2015.
 */

export type WindStandard = 'ASCE_7_22' | 'EUROCODE_1' | 'IS_875_2015';

// ----------------------------------------------------
// ASCE 7-22 Types & Interfaces
// ----------------------------------------------------
export type AsceExposureCategory = 'B' | 'C' | 'D';

export interface Asce7WindOptions {
  basicWindSpeed_mps: number; // V: 3-second gust wind speed (m/s)
  exposureCategory: AsceExposureCategory;
  Kd?: number; // Wind directionality factor (default 0.85 for buildings)
  Kzt?: number; // Topographic factor (default 1.0)
  Ke?: number; // Ground elevation factor (default 1.0)
}

// ----------------------------------------------------
// Eurocode 1 (EN 1991-1-4) Types & Interfaces
// ----------------------------------------------------
export type EurocodeTerrainCategory = '0' | 'I' | 'II' | 'III' | 'IV';

export interface Eurocode1WindOptions {
  fundamentalBasicWindSpeed_mps: number; // v_b,0 in m/s
  terrainCategory: EurocodeTerrainCategory;
  cdir?: number; // Direction factor (default 1.0)
  cseason?: number; // Season factor (default 1.0)
  co?: number; // Orography factor (default 1.0)
  airDensity_kg_m3?: number; // rho (default 1.25 kg/m^3)
}

// ----------------------------------------------------
// IS 875 (Part 3): 2015 Types & Interfaces
// ----------------------------------------------------
export type Is875TerrainCategory = 1 | 2 | 3 | 4;

export interface Is875WindOptions {
  basicWindSpeed_mps: number; // V_b in m/s (e.g. 33, 39, 44, 47, 50, 55)
  terrainCategory: Is875TerrainCategory;
  k1_riskCoefficient?: number; // k1 (default 1.0 for 50-year design life)
  k3_topographyFactor?: number; // k3 (default 1.0)
  k4_cyclonicFactor?: number; // k4 (default 1.0)
}

// ----------------------------------------------------
// Unified Elevation Profile Point
// ----------------------------------------------------
export interface WindProfilePoint {
  height_m: number;
  velocity_mps: number;
  velocityPressure_N_m2: number; // Pa (N/m^2)
  velocityPressure_kN_m2: number; // kPa (kN/m^2)
  exposureCoefficient: number; // Kz (ASCE), cr (EC1), k2 (IS)
  turbulenceIntensity?: number; // Iv(z)
}

export class WindProfileEngine {
  /**
   * Calculates ASCE 7-22 velocity pressure exposure coefficient Kz at height z.
   * ASCE 7-22 Table 26.10-1.
   */
  public static getAsce7Kz(z_m: number, exposure: AsceExposureCategory): number {
    let alpha: number;
    let zg_m: number;
    let zmin_m: number;

    switch (exposure) {
      case 'B':
        alpha = 7.0;
        zg_m = 365.76;
        zmin_m = 9.14;
        break;
      case 'C':
        alpha = 9.5;
        zg_m = 274.32;
        zmin_m = 4.57;
        break;
      case 'D':
        alpha = 11.5;
        zg_m = 213.36;
        zmin_m = 2.13;
        break;
    }

    const effectiveZ = Math.max(zmin_m, Math.min(z_m, zg_m));
    const kz = 2.01 * Math.pow(effectiveZ / zg_m, 2 / alpha);
    return Number(kz.toFixed(3));
  }

  /**
   * Evaluates ASCE 7-22 velocity pressure qz at height z in N/m^2.
   * qz = 0.613 * Kz * Kzt * Kd * Ke * V^2 (SI units: m/s -> N/m^2).
   */
  public static getAsce7VelocityPressure(z_m: number, options: Asce7WindOptions): number {
    const Kz = this.getAsce7Kz(z_m, options.exposureCategory);
    const Kzt = options.Kzt ?? 1.0;
    const Kd = options.Kd ?? 0.85;
    const Ke = options.Ke ?? 1.0;
    const V = options.basicWindSpeed_mps;

    const qz = 0.613 * Kz * Kzt * Kd * Ke * (V * V);
    return Number(qz.toFixed(2));
  }

  /**
   * Evaluates Eurocode 1 (EN 1991-1-4) peak velocity pressure qp(z) in N/m^2.
   * qp(z) = [1 + 7 * Iv(z)] * 0.5 * rho * vm(z)^2
   */
  public static getEurocode1PeakPressure(
    z_m: number,
    options: Eurocode1WindOptions
  ): {
    qp_N_m2: number;
    vm_mps: number;
    cr: number;
    Iv: number;
  } {
    const cdir = options.cdir ?? 1.0;
    const cseason = options.cseason ?? 1.0;
    const co = options.co ?? 1.0;
    const rho = options.airDensity_kg_m3 ?? 1.25;
    const vb = cdir * cseason * options.fundamentalBasicWindSpeed_mps;

    // Terrain parameters per Table 4.1
    let z0_m: number;
    let zmin_m: number;
    switch (options.terrainCategory) {
      case '0':
        z0_m = 0.003;
        zmin_m = 1.0;
        break;
      case 'I':
        z0_m = 0.01;
        zmin_m = 1.0;
        break;
      case 'II':
        z0_m = 0.05;
        zmin_m = 2.0;
        break;
      case 'III':
        z0_m = 0.3;
        zmin_m = 5.0;
        break;
      case 'IV':
        z0_m = 1.0;
        zmin_m = 10.0;
        break;
    }

    const z0_II = 0.05;
    const kr = 0.19 * Math.pow(z0_m / z0_II, 0.07);

    const effZ = Math.max(zmin_m, Math.min(z_m, 200.0));
    const cr = kr * Math.log(effZ / z0_m);
    const vm = cr * co * vb;

    // Turbulence intensity Iv(z) = kI / (co * ln(z/z0)) for z >= zmin
    const kI = 1.0;
    const Iv = kI / (co * Math.log(effZ / z0_m));

    // Peak velocity pressure qp(z) = (1 + 7*Iv) * 0.5 * rho * vm^2
    const qp = (1 + 7 * Iv) * 0.5 * rho * (vm * vm);

    return {
      qp_N_m2: Number(qp.toFixed(2)),
      vm_mps: Number(vm.toFixed(2)),
      cr: Number(cr.toFixed(3)),
      Iv: Number(Iv.toFixed(3)),
    };
  }

  /**
   * Evaluates IS 875 (Part 3): 2015 design wind speed Vz and design pressure pz at height z.
   * Vz = Vb * k1 * k2 * k3 * k4
   * pz = 0.6 * Vz^2 (N/m^2)
   */
  public static getIs875DesignPressure(
    z_m: number,
    options: Is875WindOptions
  ): {
    pz_N_m2: number;
    Vz_mps: number;
    k2: number;
  } {
    const k1 = options.k1_riskCoefficient ?? 1.0;
    const k3 = options.k3_topographyFactor ?? 1.0;
    const k4 = options.k4_cyclonicFactor ?? 1.0;
    const Vb = options.basicWindSpeed_mps;

    // k2 height factor based on Table 2 power-law / interpolation parameters
    // z <= 10m -> base value; increases with height
    let k2: number;
    const cat = options.terrainCategory;
    const zClamped = Math.max(0, Math.min(z_m, 500.0));

    if (cat === 1) {
      k2 = zClamped <= 10 ? 1.05 : 1.05 * Math.pow(zClamped / 10, 0.09);
    } else if (cat === 2) {
      k2 = zClamped <= 10 ? 1.0 : 1.0 * Math.pow(zClamped / 10, 0.14);
    } else if (cat === 3) {
      k2 = zClamped <= 10 ? 0.91 : 0.91 * Math.pow(zClamped / 10, 0.20);
    } else {
      k2 = zClamped <= 10 ? 0.80 : 0.80 * Math.pow(zClamped / 10, 0.28);
    }

    const Vz = Vb * k1 * k2 * k3 * k4;
    const pz = 0.6 * (Vz * Vz);

    return {
      pz_N_m2: Number(pz.toFixed(2)),
      Vz_mps: Number(Vz.toFixed(2)),
      k2: Number(k2.toFixed(3)),
    };
  }

  /**
   * Generates a discretized vertical wind profile from ground to total building height.
   */
  public static generateProfile(
    standard: WindStandard,
    maxHeight_m: number,
    step_m: number = 2.5,
    options: {
      asce?: Asce7WindOptions;
      eurocode?: Eurocode1WindOptions;
      is875?: Is875WindOptions;
    }
  ): WindProfilePoint[] {
    const points: WindProfilePoint[] = [];
    const numSteps = Math.ceil(maxHeight_m / step_m);

    for (let i = 0; i <= numSteps; i++) {
      const z = Number(Math.min(maxHeight_m, i * step_m).toFixed(2));

      if (standard === 'ASCE_7_22') {
        const opt = options.asce ?? { basicWindSpeed_mps: 45, exposureCategory: 'C' };
        const qz = this.getAsce7VelocityPressure(z, opt);
        const kz = this.getAsce7Kz(z, opt.exposureCategory);
        points.push({
          height_m: z,
          velocity_mps: opt.basicWindSpeed_mps,
          velocityPressure_N_m2: qz,
          velocityPressure_kN_m2: Number((qz / 1000).toFixed(3)),
          exposureCoefficient: kz,
        });
      } else if (standard === 'EUROCODE_1') {
        const opt = options.eurocode ?? { fundamentalBasicWindSpeed_mps: 26, terrainCategory: 'II' };
        const res = this.getEurocode1PeakPressure(z, opt);
        points.push({
          height_m: z,
          velocity_mps: res.vm_mps,
          velocityPressure_N_m2: res.qp_N_m2,
          velocityPressure_kN_m2: Number((res.qp_N_m2 / 1000).toFixed(3)),
          exposureCoefficient: res.cr,
          turbulenceIntensity: res.Iv,
        });
      } else {
        const opt = options.is875 ?? { basicWindSpeed_mps: 44, terrainCategory: 2 };
        const res = this.getIs875DesignPressure(z, opt);
        points.push({
          height_m: z,
          velocity_mps: res.Vz_mps,
          velocityPressure_N_m2: res.pz_N_m2,
          velocityPressure_kN_m2: Number((res.pz_N_m2 / 1000).toFixed(3)),
          exposureCoefficient: res.k2,
        });
      }

      if (z >= maxHeight_m) break;
    }

    return points;
  }
}
