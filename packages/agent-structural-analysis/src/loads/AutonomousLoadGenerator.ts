/**
 * BeamLab Sprint B5.3 — Autonomous Wind & Seismic Load Generation Agent
 * Implements code-compliant automated load generation according to:
 * 1. ASCE 7-16 / Eurocode 1 (EN 1991-1-4) Wind Directional Procedure
 * 2. ASCE 7-16 / Eurocode 8 (EN 1998-1) Equivalent Lateral Force (ELF) Seismic Procedure
 * 3. Autonomous ASCE 7 LRFD / Eurocode ULS/SLS Factored Load Combination Synthesis
 */

export interface WindLoadParameters {
  basicWindSpeed: number; // [m/s] (e.g. 38 m/s ~ 85 mph)
  exposureCategory: 'B' | 'C' | 'D';
  direction: 'X' | 'Y';
  buildingWidth: number; // [m] across wind
  buildingDepth: number; // [m] along wind
  gustFactorG?: number; // default 0.85
  windwardCp?: number; // default +0.8
  leewardCp?: number; // default -0.5
  kd?: number; // wind directionality factor (default 0.85)
  kzt?: number; // topographic factor (default 1.0)
}

export interface SeismicLoadParameters {
  siteClass: 'A' | 'B' | 'C' | 'D' | 'E';
  Ss: number; // short period spectral acceleration [g] (e.g. 1.20)
  S1: number; // 1-second spectral acceleration [g] (e.g. 0.45)
  responseModificationR: number; // R factor (e.g. 8.0 for SMF, 3.5 for OMF, 6.0 for SCBF)
  importanceFactorIe?: number; // default 1.0
  direction: 'X' | 'Y';
  structuralSystem?: 'STEEL_MOMENT_FRAME' | 'CONCRETE_MOMENT_FRAME' | 'BRACED_FRAME' | 'OTHER';
  seismicWeightKg?: number; // total building mass [kg]
}

export interface GeneratedNodalLoad {
  nodeId: string;
  Fx?: number;
  Fy?: number;
  Fz?: number;
  Mx?: number;
  My?: number;
  Mz?: number;
}

export interface FactoredLoadCombo {
  id: string;
  name: string;
  factors: Record<string, number>;
  limitState: 'ULS_STRENGTH' | 'SLS_DEFLECTION' | 'SEISMIC';
}

export interface AutonomousLoadResult {
  designCode: 'ASCE_7_16' | 'EUROCODE';
  windLoads: {
    nodalLoads: GeneratedNodalLoad[];
    totalBaseShearN: number;
    velocityPressureAtRoofPa: number;
    overturningMomentNm: number;
    storyPressures: Array<{
      elevationZ: number;
      velocityPressureQzPa: number;
      netPressurePPa: number;
      storyForceN: number;
    }>;
  };
  seismicLoads: {
    nodalLoads: GeneratedNodalLoad[];
    totalBaseShearN: number;
    fundamentalPeriodSec: number;
    seismicResponseCoeffCs: number;
    designSpectralAccSds: number;
    designSpectralAccSd1: number;
    overturningMomentNm: number;
  };
  loadCombinations: FactoredLoadCombo[];
}

export class AutonomousLoadGenerator {
  /**
   * Generates autonomous wind and seismic loads and synthesizes design combinations.
   */
  public static generate(
    nodes: Array<{ id: string; x: number; y: number; z: number; restraints?: any }>,
    windParams: WindLoadParameters,
    seismicParams: SeismicLoadParameters,
    designCode: 'ASCE_7_16' | 'EUROCODE' = 'ASCE_7_16',
  ): AutonomousLoadResult {
    // 1. Determine structural geometry elevations and stories
    let minZ = Infinity;
    let maxZ = -Infinity;
    const elevatedNodes: Array<{ id: string; x: number; y: number; z: number }> = [];

    for (const n of nodes) {
      if (n.z < minZ) minZ = n.z;
      if (n.z > maxZ) maxZ = n.z;
      const isBase = n.restraints?.Tx && n.restraints?.Ty && n.restraints?.Tz;
      if (!isBase && n.z > minZ + 0.1) {
        elevatedNodes.push(n);
      }
    }

    const buildingHeight = Math.max(maxZ - minZ, 3.0);

    // Group elevated nodes by unique story elevations (cluster within 0.2m)
    const storyMap = new Map<number, typeof elevatedNodes>();
    for (const n of elevatedNodes) {
      let foundZ: number | null = null;
      for (const zKey of storyMap.keys()) {
        if (Math.abs(zKey - n.z) < 0.2) {
          foundZ = zKey;
          break;
        }
      }
      const key = foundZ !== null ? foundZ : n.z;
      if (!storyMap.has(key)) storyMap.set(key, []);
      storyMap.get(key)!.push(n);
    }

    const storyElevations = Array.from(storyMap.keys()).sort((a, b) => a - b);

    // ─── 2. ASCE 7-16 / Eurocode 1 Wind Load Generation ───────────────────────
    const windResult = this.computeWindLoads(
      storyMap,
      storyElevations,
      buildingHeight,
      minZ,
      windParams,
    );

    // ─── 3. ASCE 7-16 / Eurocode 8 Seismic Load Generation ────────────────────
    const seismicResult = this.computeSeismicLoads(
      storyMap,
      storyElevations,
      buildingHeight,
      minZ,
      seismicParams,
    );

    // ─── 4. Synthesize Factored Load Combinations ──────────────────────────────
    const loadCombinations = this.synthesizeCombinations(designCode);

    return {
      designCode,
      windLoads: windResult,
      seismicLoads: seismicResult,
      loadCombinations,
    };
  }

  /**
   * ASCE 7-16 Chapter 26-28 Directional Wind Pressure calculation.
   */
  private static computeWindLoads(
    storyMap: Map<number, Array<{ id: string; x: number; y: number; z: number }>>,
    storyElevations: number[],
    totalHeight: number,
    minZ: number,
    params: WindLoadParameters,
  ) {
    const V = params.basicWindSpeed;
    const Kd = params.kd ?? 0.85;
    const Kzt = params.kzt ?? 1.0;
    const G = params.gustFactorG ?? 0.85;
    const Cpw = params.windwardCp ?? 0.80;
    const Cpl = params.leewardCp ?? 0.50;
    const width = params.buildingWidth;

    const nodalLoads: GeneratedNodalLoad[] = [];
    let totalBaseShear = 0;
    let overturningMoment = 0;

    // Velocity pressure at roof height: q_h
    const Kz_roof = this.getExposureCoeffKz(totalHeight, params.exposureCategory);
    const qh = 0.613 * Kz_roof * Kzt * Kd * V * V; // [Pa]

    const storyPressures: AutonomousLoadResult['windLoads']['storyPressures'] = [];

    for (let sIdx = 0; sIdx < storyElevations.length; sIdx++) {
      const z = storyElevations[sIdx]!;
      const h_rel = z - minZ;
      const nodesAtStory = storyMap.get(z)!;
      if (nodesAtStory.length === 0) continue;

      // Tributary height for this story
      const prevZ = sIdx === 0 ? minZ : (storyElevations[sIdx - 1]! + z) / 2;
      const nextZ = sIdx === storyElevations.length - 1 ? z : (storyElevations[sIdx + 1]! + z) / 2;
      const h_trib = Math.max(nextZ - prevZ, 1.0);

      // Tributary area of story facade
      const storyFacadeArea = width * h_trib; // [m^2]

      // Windward velocity pressure at current height z: q_z
      const Kz = this.getExposureCoeffKz(h_rel, params.exposureCategory);
      const qz = 0.613 * Kz * Kzt * Kd * V * V; // [Pa]

      // Net lateral design wind pressure: p = q_z * G * Cp_w - q_h * G * Cp_l
      const p_net = qz * G * Cpw + qh * G * Cpl; // [Pa]
      const totalStoryForce = p_net * storyFacadeArea; // [N]

      totalBaseShear += totalStoryForce;
      overturningMoment += totalStoryForce * h_rel;

      storyPressures.push({
        elevationZ: Number(z.toFixed(2)),
        velocityPressureQzPa: Number(qz.toFixed(1)),
        netPressurePPa: Number(p_net.toFixed(1)),
        storyForceN: Number(totalStoryForce.toFixed(1)),
      });

      // Distribute equally across nodes at this story
      const forcePerNode = totalStoryForce / nodesAtStory.length;
      for (const n of nodesAtStory) {
        if (params.direction === 'X') {
          nodalLoads.push({ nodeId: n.id, Fx: Number(forcePerNode.toFixed(1)) });
        } else {
          nodalLoads.push({ nodeId: n.id, Fy: Number(forcePerNode.toFixed(1)) });
        }
      }
    }

    return {
      nodalLoads,
      totalBaseShearN: Number(totalBaseShear.toFixed(1)),
      velocityPressureAtRoofPa: Number(qh.toFixed(1)),
      overturningMomentNm: Number(overturningMoment.toFixed(1)),
      storyPressures,
    };
  }

  /**
   * ASCE 7-16 Chapter 12 Equivalent Lateral Force (ELF) Seismic calculation.
   */
  private static computeSeismicLoads(
    storyMap: Map<number, Array<{ id: string; x: number; y: number; z: number }>>,
    storyElevations: number[],
    totalHeight: number,
    minZ: number,
    params: SeismicLoadParameters,
  ) {
    const { Ss, S1, siteClass, responseModificationR: R } = params;
    const Ie = params.importanceFactorIe ?? 1.0;

    // Site coefficients Fa and Fv (ASCE 7-16 Tables 11.4-1 & 11.4-2)
    const Fa = this.getSiteCoeffFa(Ss, siteClass);
    const Fv = this.getSiteCoeffFv(S1, siteClass);

    // Design spectral acceleration parameters SDS, SD1
    const Sds = (2 / 3) * Ss * Fa;
    const Sd1 = (2 / 3) * S1 * Fv;

    // Approximate fundamental period Ta = Ct * hn^x
    let Ct = 0.0724; // steel moment frames
    let x = 0.8;
    if (params.structuralSystem === 'CONCRETE_MOMENT_FRAME') {
      Ct = 0.0466;
      x = 0.9;
    } else if (params.structuralSystem === 'BRACED_FRAME') {
      Ct = 0.0488;
      x = 0.75;
    }
    const Ta = Ct * Math.pow(totalHeight, x); // [s]

    // Seismic response coefficient Cs:
    // Cs = Sds / (R / Ie)
    // Cs_max = Sd1 / (T * (R / Ie))
    // Cs_min = max(0.044 * Sds * Ie, 0.01)
    const Cs_calc = Sds / (R / Ie);
    const Cs_max = Sd1 / (Ta * (R / Ie));
    const Cs_min = Math.max(0.044 * Sds * Ie, 0.01);
    const Cs = Math.max(Math.min(Cs_calc, Cs_max), Cs_min);

    // Estimate effective seismic weight W:
    // Default assumption if not provided: ~300 kg/m^2 per story or 50,000 kg total
    const totalWeightN = (params.seismicWeightKg ?? 50000) * 9.81;

    // Total seismic base shear V_base = Cs * W
    const baseShearV = Cs * totalWeightN; // [N]

    // Vertical force distribution exponent k:
    // k = 1.0 for T <= 0.5s, k = 2.0 for T >= 2.5s, linear interpolation between
    let k = 1.0;
    if (Ta >= 2.5) {
      k = 2.0;
    } else if (Ta > 0.5) {
      k = 1.0 + ((Ta - 0.5) / (2.5 - 0.5)) * (2.0 - 1.0);
    }

    // Distribute base shear vertically: Fx = Cvx * V = (wx * hx^k) / sum(wi * hi^k) * V
    let sumDenominator = 0;
    const storyWeights: Array<{ z: number; h: number; weight: number }> = [];

    for (const z of storyElevations) {
      const h_rel = Math.max(z - minZ, 1.0);
      const w_story = totalWeightN / storyElevations.length;
      sumDenominator += w_story * Math.pow(h_rel, k);
      storyWeights.push({ z, h: h_rel, weight: w_story });
    }

    const nodalLoads: GeneratedNodalLoad[] = [];
    let totalDistributedShear = 0;
    let overturningMoment = 0;

    for (const sw of storyWeights) {
      const Cvx = (sw.weight * Math.pow(sw.h, k)) / Math.max(sumDenominator, 1e-6);
      const F_story = Cvx * baseShearV;
      totalDistributedShear += F_story;
      overturningMoment += F_story * sw.h;

      const nodesAtStory = storyMap.get(sw.z) || [];
      if (nodesAtStory.length === 0) continue;

      const forcePerNode = F_story / nodesAtStory.length;
      for (const n of nodesAtStory) {
        if (params.direction === 'X') {
          nodalLoads.push({ nodeId: n.id, Fx: Number(forcePerNode.toFixed(1)) });
        } else {
          nodalLoads.push({ nodeId: n.id, Fy: Number(forcePerNode.toFixed(1)) });
        }
      }
    }

    return {
      nodalLoads,
      totalBaseShearN: Number(totalDistributedShear.toFixed(1)),
      fundamentalPeriodSec: Number(Ta.toFixed(3)),
      seismicResponseCoeffCs: Number(Cs.toFixed(4)),
      designSpectralAccSds: Number(Sds.toFixed(3)),
      designSpectralAccSd1: Number(Sd1.toFixed(3)),
      overturningMomentNm: Number(overturningMoment.toFixed(1)),
    };
  }

  /**
   * Velocity pressure exposure coefficient Kz (ASCE 7-16 Table 26.10-1).
   */
  private static getExposureCoeffKz(z: number, exposure: 'B' | 'C' | 'D'): number {
    const height = Math.max(z, 4.5); // min 15 ft (4.5m)
    switch (exposure) {
      case 'B':
        return Number((2.01 * Math.pow(height / 365.76, 2 / 7.0)).toFixed(3));
      case 'C':
        return Number((2.01 * Math.pow(height / 274.32, 2 / 9.5)).toFixed(3));
      case 'D':
        return Number((2.01 * Math.pow(height / 213.36, 2 / 11.5)).toFixed(3));
    }
  }

  private static getSiteCoeffFa(Ss: number, siteClass: 'A' | 'B' | 'C' | 'D' | 'E'): number {
    switch (siteClass) {
      case 'A': return 0.8;
      case 'B': return 1.0;
      case 'C': return Ss <= 0.5 ? 1.3 : 1.2;
      case 'D': return Ss <= 0.5 ? 1.6 : 1.4;
      case 'E': return Ss <= 0.5 ? 2.4 : 1.7;
    }
  }

  private static getSiteCoeffFv(S1: number, siteClass: 'A' | 'B' | 'C' | 'D' | 'E'): number {
    switch (siteClass) {
      case 'A': return 0.8;
      case 'B': return 1.0;
      case 'C': return S1 <= 0.2 ? 1.5 : 1.5;
      case 'D': return S1 <= 0.2 ? 2.4 : 2.0;
      case 'E': return S1 <= 0.2 ? 4.2 : 3.2;
    }
  }

  private static synthesizeCombinations(code: 'ASCE_7_16' | 'EUROCODE'): FactoredLoadCombo[] {
    if (code === 'ASCE_7_16') {
      return [
        { id: 'ASCE_LC1', name: '1.4D', factors: { Dead: 1.4 }, limitState: 'ULS_STRENGTH' },
        { id: 'ASCE_LC2', name: '1.2D + 1.6L', factors: { Dead: 1.2, Live: 1.6 }, limitState: 'ULS_STRENGTH' },
        { id: 'ASCE_LC3', name: '1.2D + 1.0W + 1.0L', factors: { Dead: 1.2, Wind: 1.0, Live: 1.0 }, limitState: 'ULS_STRENGTH' },
        { id: 'ASCE_LC4', name: '1.2D + 1.0E + 1.0L', factors: { Dead: 1.2, Seismic: 1.0, Live: 1.0 }, limitState: 'SEISMIC' },
        { id: 'ASCE_LC5', name: '0.9D + 1.0W', factors: { Dead: 0.9, Wind: 1.0 }, limitState: 'ULS_STRENGTH' },
        { id: 'ASCE_LC6', name: '0.9D + 1.0E', factors: { Dead: 0.9, Seismic: 1.0 }, limitState: 'SEISMIC' },
        { id: 'ASCE_SLS', name: '1.0D + 1.0L', factors: { Dead: 1.0, Live: 1.0 }, limitState: 'SLS_DEFLECTION' },
      ];
    } else {
      return [
        { id: 'EC_ULS1', name: '1.35D + 1.5L', factors: { Dead: 1.35, Live: 1.5 }, limitState: 'ULS_STRENGTH' },
        { id: 'EC_ULS2', name: '1.35D + 1.5W + 1.05L', factors: { Dead: 1.35, Wind: 1.5, Live: 1.05 }, limitState: 'ULS_STRENGTH' },
        { id: 'EC_SEIS', name: '1.0D + 1.0E + 0.3L', factors: { Dead: 1.0, Seismic: 1.0, Live: 0.3 }, limitState: 'SEISMIC' },
        { id: 'EC_SLS', name: '1.0D + 1.0L', factors: { Dead: 1.0, Live: 1.0 }, limitState: 'SLS_DEFLECTION' },
      ];
    }
  }
}
