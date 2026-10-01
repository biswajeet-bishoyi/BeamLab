/**
 * Lateral Earth Pressure Engine: Rankine, Coulomb, Surcharge & Water Pressures
 * @packageDocumentation
 */

import {
  SoilLayer,
  GroundWaterTable,
  SurchargeLoad,
  WallGeometryParams,
  PressurePoint,
  EarthPressureCoefficients,
  LateralPressureResult,
} from '../types';

export class LateralEarthPressureEngine {
  /**
   * Degrees to Radians conversion helper
   */
  private static toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  /**
   * Radians to Degrees conversion helper
   */
  private static toDeg(rad: number): number {
    return (rad * 180) / Math.PI;
  }

  /**
   * Compute Rankine earth pressure coefficients Ka, Kp, Ko
   */
  public static computeRankineCoefficients(
    phiDeg: number,
    betaDeg: number = 0,
    ocr: number = 1.0
  ): EarthPressureCoefficients {
    const phi = this.toRad(phiDeg);
    const beta = this.toRad(betaDeg);

    // Standard Jaky formula for Ko
    const Ko = (1 - Math.sin(phi)) * Math.sqrt(Math.max(1.0, ocr));

    if (Math.abs(betaDeg) < 1e-4) {
      // Horizontal backfill
      const Ka = Math.tan(Math.PI / 4 - phi / 2) ** 2;
      const Kp = Math.tan(Math.PI / 4 + phi / 2) ** 2;
      return { Ka, Kp, Ko };
    }

    // Sloping backfill Rankine formulation (beta <= phi)
    if (beta > phi) {
      throw new Error(`Backfill slope angle beta (${betaDeg}°) cannot exceed friction angle phi (${phiDeg}°)`);
    }

    const cosBeta = Math.cos(beta);
    const radTerm = Math.sqrt(Math.max(0, cosBeta ** 2 - Math.cos(phi) ** 2));

    const Ka = cosBeta * ((cosBeta - radTerm) / (cosBeta + radTerm));
    const Kp = cosBeta * ((cosBeta + radTerm) / (cosBeta - radTerm));

    return { Ka, Kp, Ko };
  }

  /**
   * Compute Coulomb earth pressure coefficients Ka, Kp
   * @param phiDeg Soil internal friction angle
   * @param deltaDeg Soil-wall friction angle
   * @param betaDeg Backfill slope inclination angle
   * @param thetaDeg Back of wall inclination from horizontal (90° = vertical)
   */
  public static computeCoulombCoefficients(
    phiDeg: number,
    deltaDeg: number = 0,
    betaDeg: number = 0,
    thetaDeg: number = 90
  ): EarthPressureCoefficients {
    const phi = this.toRad(phiDeg);
    const delta = this.toRad(deltaDeg);
    const beta = this.toRad(betaDeg);
    const theta = this.toRad(thetaDeg);

    // Active coefficient Ka
    const sinTheta = Math.sin(theta);
    const numKa = Math.sin(theta + phi) ** 2;
    const innerSqrtKa = Math.sqrt(
      Math.max(0, (Math.sin(phi + delta) * Math.sin(phi - beta)) / (Math.sin(theta - delta) * Math.sin(theta + beta)))
    );
    const denKa = sinTheta ** 2 * Math.sin(theta - delta) * (1 + innerSqrtKa) ** 2;
    const Ka = denKa !== 0 ? numKa / denKa : 0;

    // Passive coefficient Kp
    const numKp = Math.sin(theta - phi) ** 2;
    const innerSqrtKp = Math.sqrt(
      Math.max(0, (Math.sin(phi + delta) * Math.sin(phi + beta)) / (Math.sin(theta + delta) * Math.sin(theta + beta)))
    );
    const denKp = sinTheta ** 2 * Math.sin(theta + delta) * (1 - innerSqrtKp) ** 2;
    const Kp = denKp !== 0 ? numKp / denKp : 0;

    const Ko = 1 - Math.sin(phi);

    return { Ka, Kp, Ko };
  }

  /**
   * Compute Boussinesq surcharge horizontal stress increment at depth z
   */
  public static computeSurchargeIncrement(
    z: number,
    wallHeight: number,
    surcharges: SurchargeLoad[],
    Ka: number
  ): number {
    let deltaSigmaH = 0;

    for (const s of surcharges) {
      if (s.type === 'uniform') {
        // Uniform infinite surcharge: delta sigma = Ka * q
        deltaSigmaH += Ka * s.magnitude;
      } else if (s.type === 'line') {
        // Line load q_L (kN/m) at distance x behind wall
        const x = Math.max(0.01, s.distanceFromWall);
        const H = Math.max(0.1, wallHeight);
        const m = x / H;
        const n = z / H;

        let inc = 0;
        if (m <= 0.4) {
          inc = (0.2 * (s.magnitude / H) * n) / (0.16 + n * n) ** 2;
        } else {
          inc = (1.28 * (s.magnitude / H) * (m * m) * n) / (m * m + n * n) ** 2;
        }
        deltaSigmaH += Math.max(0, inc);
      } else if (s.type === 'strip') {
        // Strip load q_s between x1 and x2
        const x1 = Math.max(0.01, s.distanceFromWall);
        const width = s.width ?? 1.0;
        const x2 = x1 + width;
        const qs = s.magnitude;

        // Angle subtended by strip load at depth z
        const alpha1 = Math.atan2(z, x2);
        const alpha2 = Math.atan2(z, x1);
        const betaAngle = alpha2 - alpha1;
        const alphaCenter = 0.5 * (alpha1 + alpha2);

        const inc = (2 * qs) / Math.PI * (betaAngle - Math.sin(betaAngle) * Math.cos(2 * alphaCenter));
        deltaSigmaH += Math.max(0, inc);
      }
    }

    return deltaSigmaH;
  }

  /**
   * Analyze complete lateral earth pressure profile and resultants
   */
  public static analyze(params: {
    wall: WallGeometryParams;
    layers: SoilLayer[];
    waterTable?: GroundWaterTable;
    surcharges?: SurchargeLoad[];
    theory?: 'rankine' | 'coulomb';
    numSteps?: number;
    allowTensionCrackWater?: boolean;
  }): LateralPressureResult {
    const {
      wall,
      layers,
      waterTable,
      surcharges = [],
      theory = 'rankine',
      numSteps = 50,
      allowTensionCrackWater = true,
    } = params;

    const H = wall.height;
    const gammaW = waterTable?.unitWeightWater ?? 9.81;
    const zw = waterTable ? Math.max(0, waterTable.depth) : Infinity;

    // Representative or top layer properties for coefficients
    const topLayer = layers[0] ?? {
      id: 'default',
      name: 'Default Soil',
      depthTop: 0,
      depthBottom: H,
      unitWeight: 18,
      frictionAngle: 30,
      cohesion: 0,
    };

    const beta = wall.backfillSlopeAngle ?? 0;
    const theta = wall.wallBackFaceAngle ?? 90;
    const delta = wall.wallFrictionAngle ?? (theory === 'coulomb' ? (2 / 3) * topLayer.frictionAngle : 0);

    const coeffs =
      theory === 'coulomb'
        ? this.computeCoulombCoefficients(topLayer.frictionAngle, delta, beta, theta)
        : this.computeRankineCoefficients(topLayer.frictionAngle, beta);

    // Tension crack depth for cohesive soils: zc = 2*c / (gamma * sqrt(Ka))
    let tensionCrackDepth = 0;
    if (topLayer.cohesion > 0 && coeffs.Ka > 0) {
      tensionCrackDepth = (2 * topLayer.cohesion) / (topLayer.unitWeight * Math.sqrt(coeffs.Ka));
      tensionCrackDepth = Math.min(H, Math.max(0, tensionCrackDepth));
    }

    const dz = H / numSteps;
    const profile: PressurePoint[] = [];

    let totalActiveForce = 0;
    let activeMomentAboutBase = 0;
    let totalPassiveForce = 0;
    let passiveMomentAboutBase = 0;
    let totalSurchargeForce = 0;
    let surchargeMomentAboutBase = 0;
    let totalWaterForce = 0;
    let waterMomentAboutBase = 0;

    for (let i = 0; i <= numSteps; i++) {
      const z = i * dz;

      // Find current soil layer
      const layer =
        layers.find((l) => z >= l.depthTop && z <= l.depthBottom) ??
        layers[layers.length - 1] ??
        topLayer;

      // Effective vertical stress calculation integrating through layers
      let sigmaV = 0;
      let currentZ = 0;
      for (const l of layers) {
        if (currentZ >= z) break;
        const layerEnd = Math.min(z, l.depthBottom);
        const thickness = Math.max(0, layerEnd - Math.max(currentZ, l.depthTop));
        if (thickness > 0) {
          const midZ = currentZ + thickness / 2;
          const isSubmerged = midZ >= zw;
          const gamma = isSubmerged ? (l.saturatedUnitWeight ?? l.unitWeight) - gammaW : l.unitWeight;
          sigmaV += gamma * thickness;
          currentZ = layerEnd;
        }
      }

      // Pore water pressure
      const u = z > zw ? (z - zw) * gammaW : 0;

      // Layer specific coefficients
      const layerCoeffs =
        theory === 'coulomb'
          ? this.computeCoulombCoefficients(layer.frictionAngle, delta, beta, theta)
          : this.computeRankineCoefficients(layer.frictionAngle, beta);

      // Active and passive horizontal effective stresses
      const c = layer.cohesion;
      const sigmaA = Math.max(0, layerCoeffs.Ka * sigmaV - 2 * c * Math.sqrt(layerCoeffs.Ka));
      const sigmaP = layerCoeffs.Kp * sigmaV + 2 * c * Math.sqrt(layerCoeffs.Kp);
      const sigma0 = layerCoeffs.Ko * sigmaV;

      // Surcharge increment
      const deltaSigmaH = this.computeSurchargeIncrement(z, H, surcharges, layerCoeffs.Ka);

      // Tension crack water pressure consideration
      let crackWater = 0;
      if (allowTensionCrackWater && z <= tensionCrackDepth && z > 0) {
        crackWater = z * gammaW;
      }

      const totalActiveH = sigmaA + u + deltaSigmaH + crackWater;

      profile.push({
        depth: z,
        effectiveVerticalStress: sigmaV,
        porePressure: u,
        activeHorizontalStress: sigmaA,
        passiveHorizontalStress: sigmaP,
        atRestHorizontalStress: sigma0,
        surchargeHorizontalStress: deltaSigmaH,
        totalActiveHorizontalStress: totalActiveH,
      });

      // Trapezoidal integration for resultants
      if (i > 0) {
        const prev = profile[i - 1]!;
        const arm = H - (z - dz / 2);

        // Active
        const dPa = 0.5 * (prev.activeHorizontalStress + sigmaA) * dz;
        totalActiveForce += dPa;
        activeMomentAboutBase += dPa * arm;

        // Passive
        const dPp = 0.5 * (prev.passiveHorizontalStress + sigmaP) * dz;
        totalPassiveForce += dPp;
        passiveMomentAboutBase += dPp * arm;

        // Surcharge
        const dPs = 0.5 * (prev.surchargeHorizontalStress + deltaSigmaH) * dz;
        totalSurchargeForce += dPs;
        surchargeMomentAboutBase += dPs * arm;

        // Water
        const dPw = 0.5 * (prev.porePressure + u) * dz;
        totalWaterForce += dPw;
        waterMomentAboutBase += dPw * arm;
      }
    }

    return {
      coefficients: coeffs,
      tensionCrackDepth,
      pressureProfile: profile,
      totalActiveForce,
      activeForceLineOfAction: totalActiveForce > 0 ? activeMomentAboutBase / totalActiveForce : H / 3,
      activeMomentAboutBase,
      totalPassiveForce,
      passiveForceLineOfAction: totalPassiveForce > 0 ? passiveMomentAboutBase / totalPassiveForce : H / 3,
      passiveMomentAboutBase,
      totalSurchargeForce,
      surchargeLineOfAction: totalSurchargeForce > 0 ? surchargeMomentAboutBase / totalSurchargeForce : H / 2,
      totalWaterForce,
      waterLineOfAction: totalWaterForce > 0 ? waterMomentAboutBase / totalWaterForce : (zw < H ? (H - zw) / 3 : 0),
    };
  }
}
