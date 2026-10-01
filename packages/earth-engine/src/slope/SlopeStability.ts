/**
 * Global Slope Stability Engine: Bishop's Simplified and Fellenius Methods of Slices
 * Critical Slip Surface Grid-Search Optimizer
 * @packageDocumentation
 */

import { SoilLayer } from '../types';

export interface SlopeProfilePoint {
  x: number; // m
  y: number; // m
}

export interface SliceResult {
  index: number;
  xMid: number; // m
  width: number; // m
  baseAngleRad: number; // radians (alpha)
  baseAngleDeg: number; // degrees
  baseArcLength: number; // m
  sliceHeight: number; // m
  sliceWeight: number; // kN/m
  porePressure: number; // kPa
  effectiveBaseNormal: number; // kN/m
  shearResistance: number; // kN/m
  drivingForce: number; // kN/m
}

export interface SlopeStabilityResult {
  method: 'bishop' | 'fellenius';
  factorOfSafety: number;
  criticalCircle: {
    xc: number;
    yc: number;
    radius: number;
  };
  totalDrivingMoment: number; // kN·m/m
  totalResistingMoment: number; // kN·m/m
  slices: SliceResult[];
  isSafe: boolean; // FS >= targetFS
}

export class SlopeStabilityEngine {
  /**
   * Interpolate ground elevation y at given x from a series of profile points
   */
  public static getGroundElevation(x: number, profile: SlopeProfilePoint[]): number {
    if (profile.length === 0) return 0;
    if (x <= profile[0]!.x) return profile[0]!.y;
    if (x >= profile[profile.length - 1]!.x) return profile[profile.length - 1]!.y;

    for (let i = 0; i < profile.length - 1; i++) {
      const p1 = profile[i]!;
      const p2 = profile[i + 1]!;
      if (x >= p1.x && x <= p2.x) {
        const t = (x - p1.x) / (p2.x - p1.x);
        return p1.y + t * (p2.y - p1.y);
      }
    }
    return profile[profile.length - 1]!.y;
  }

  /**
   * Analyze a single trial slip circle using Bishop's Simplified or Fellenius method
   */
  public static analyzeSlipCircle(params: {
    circle: { xc: number; yc: number; radius: number };
    groundProfile: SlopeProfilePoint[];
    soil: SoilLayer;
    waterTableY?: number; // horizontal water table elevation
    method?: 'bishop' | 'fellenius';
    numSlices?: number;
    gammaWater?: number;
  }): {
    factorOfSafety: number;
    slices: SliceResult[];
    totalDriving: number;
    totalResisting: number;
  } {
    const {
      circle,
      groundProfile,
      soil,
      waterTableY = -Infinity,
      method = 'bishop',
      numSlices = 30,
      gammaWater = 9.81,
    } = params;

    const { xc, yc, radius: R } = circle;

    // Determine intersection of circle with ground profile
    // Circle equation: (x - xc)^2 + (y - yc)^2 = R^2 => y_base(x) = yc - sqrt(R^2 - (x - xc)^2)
    // Find x range where y_base(x) is below ground elevation
    const xMinCircle = xc - R * 0.98;
    const xMaxCircle = xc + R * 0.98;

    let xLeft = xMaxCircle;
    let xRight = xMinCircle;

    const scanSteps = 100;
    const dxScan = (xMaxCircle - xMinCircle) / scanSteps;

    for (let i = 0; i <= scanSteps; i++) {
      const x = xMinCircle + i * dxScan;
      const radTerm = R * R - (x - xc) * (x - xc);
      if (radTerm <= 0) continue;
      const yBase = yc - Math.sqrt(radTerm);
      const yGround = this.getGroundElevation(x, groundProfile);

      if (yBase < yGround) {
        if (x < xLeft) xLeft = x;
        if (x > xRight) xRight = x;
      }
    }

    if (xRight <= xLeft + 0.1) {
      // Circle does not cut through the slope body
      return { factorOfSafety: 999, slices: [], totalDriving: 0, totalResisting: 0 };
    }

    const sliceWidth = (xRight - xLeft) / numSlices;
    const rawSlices: {
      xMid: number;
      width: number;
      baseAngleRad: number;
      baseArcLength: number;
      sliceHeight: number;
      weight: number;
      u: number;
    }[] = [];

    const phiRad = (soil.frictionAngle * Math.PI) / 180;
    const c = soil.cohesion;

    for (let i = 0; i < numSlices; i++) {
      const xMid = xLeft + (i + 0.5) * sliceWidth;
      const radTerm = R * R - (xMid - xc) * (xMid - xc);
      if (radTerm <= 0) continue;

      const yBase = yc - Math.sqrt(radTerm);
      const yGround = this.getGroundElevation(xMid, groundProfile);
      const height = Math.max(0, yGround - yBase);

      if (height <= 0.01) continue;

      // Base angle alpha: sin(alpha) = (xMid - xc) / R
      const sinAlpha = Math.max(-0.999, Math.min(0.999, (xMid - xc) / R));
      const alphaRad = Math.asin(sinAlpha);
      const cosAlpha = Math.cos(alphaRad);
      const arcLength = sliceWidth / (cosAlpha !== 0 ? cosAlpha : 1);

      // Pore water pressure at base
      const u = yBase < waterTableY ? (waterTableY - yBase) * gammaWater : 0;

      // Slice weight W = gamma * height * sliceWidth
      const weight = soil.unitWeight * height * sliceWidth;

      rawSlices.push({
        xMid,
        width: sliceWidth,
        baseAngleRad: alphaRad,
        baseArcLength: arcLength,
        sliceHeight: height,
        weight,
        u,
      });
    }

    if (rawSlices.length === 0) {
      return { factorOfSafety: 999, slices: [], totalDriving: 0, totalResisting: 0 };
    }

    // Sum of driving forces: sum(W * sin(alpha))
    let sumDriving = 0;
    for (const sl of rawSlices) {
      sumDriving += sl.weight * Math.sin(sl.baseAngleRad);
    }

    if (sumDriving <= 0) {
      // Slope is inherently stable in this trial
      return { factorOfSafety: 999, slices: [], totalDriving: 0, totalResisting: 0 };
    }

    let FS = 1.5; // Initial FS guess

    if (method === 'fellenius') {
      // Fellenius (Ordinary) Method:
      // FS = sum[ c * l + (W * cos(alpha) - u * l) * tan(phi) ] / sum[ W * sin(alpha) ]
      let sumResisting = 0;
      for (const sl of rawSlices) {
        const normalEff = Math.max(0, sl.weight * Math.cos(sl.baseAngleRad) - sl.u * sl.baseArcLength);
        sumResisting += c * sl.baseArcLength + normalEff * Math.tan(phiRad);
      }
      FS = Math.max(0.01, sumResisting / sumDriving);
    } else {
      // Bishop's Simplified Method (implicit iteration)
      // FS^(k+1) = (1 / sumDriving) * sum[ (c * b + (W - u * b) * tan(phi)) / m_alpha ]
      // m_alpha = cos(alpha) * (1 + tan(alpha) * tan(phi) / FS)
      for (let iter = 0; iter < 40; iter++) {
        let sumResisting = 0;
        for (const sl of rawSlices) {
          const tanAlpha = Math.tan(sl.baseAngleRad);
          const mAlpha = Math.cos(sl.baseAngleRad) * (1 + (tanAlpha * Math.tan(phiRad)) / FS);

          if (Math.abs(mAlpha) < 0.05) continue; // avoid singularity at steep base
          const numerator = c * sl.width + Math.max(0, sl.weight - sl.u * sl.width) * Math.tan(phiRad);
          sumResisting += numerator / mAlpha;
        }

        const nextFS = Math.max(0.01, sumResisting / sumDriving);
        if (Math.abs(nextFS - FS) < 1e-4) {
          FS = nextFS;
          break;
        }
        FS = 0.5 * (FS + nextFS); // damped iteration
      }
    }

    // Build detailed slice records
    const finalSlices: SliceResult[] = rawSlices.map((sl, idx) => {
      const normalEff = Math.max(0, sl.weight * Math.cos(sl.baseAngleRad) - sl.u * sl.baseArcLength);
      const shearRes = c * sl.baseArcLength + normalEff * Math.tan(phiRad);
      const driving = sl.weight * Math.sin(sl.baseAngleRad);

      return {
        index: idx + 1,
        xMid: sl.xMid,
        width: sl.width,
        baseAngleRad: sl.baseAngleRad,
        baseAngleDeg: (sl.baseAngleRad * 180) / Math.PI,
        baseArcLength: sl.baseArcLength,
        sliceHeight: sl.sliceHeight,
        sliceWeight: sl.weight,
        porePressure: sl.u,
        effectiveBaseNormal: normalEff,
        shearResistance: shearRes,
        drivingForce: driving,
      };
    });

    const totalDrivingMoment = sumDriving * R;
    const totalResistingMoment = sumDriving * FS * R;

    return {
      factorOfSafety: Math.min(20, Math.max(0.1, FS)),
      slices: finalSlices,
      totalDriving: totalDrivingMoment,
      totalResisting: totalResistingMoment,
    };
  }

  /**
   * Search for the critical slip circle with the minimum factor of safety (Grid Search)
   */
  public static findCriticalSlipCircle(params: {
    groundProfile: SlopeProfilePoint[];
    soil: SoilLayer;
    waterTableY?: number;
    method?: 'bishop' | 'fellenius';
    targetFS?: number;
    grid?: {
      xcMin: number;
      xcMax: number;
      ycMin: number;
      ycMax: number;
      radiusMin: number;
      radiusMax: number;
      steps?: number;
    };
  }): SlopeStabilityResult {
    const {
      groundProfile,
      soil,
      waterTableY,
      method = 'bishop',
      targetFS = 1.3,
      grid = {
        xcMin: 2,
        xcMax: 12,
        ycMin: 6,
        ycMax: 18,
        radiusMin: 6,
        radiusMax: 18,
        steps: 7,
      },
    } = params;

    const steps = grid.steps ?? 7;
    const dxc = (grid.xcMax - grid.xcMin) / Math.max(1, steps - 1);
    const dyc = (grid.ycMax - grid.ycMin) / Math.max(1, steps - 1);
    const dR = (grid.radiusMax - grid.radiusMin) / Math.max(1, steps - 1);

    let minFS = Infinity;
    let bestCircle = {
      xc: (grid.xcMin + grid.xcMax) / 2,
      yc: (grid.ycMin + grid.ycMax) / 2,
      radius: (grid.radiusMin + grid.radiusMax) / 2,
    };
    let bestResult: ReturnType<typeof SlopeStabilityEngine.analyzeSlipCircle> | null = null;

    for (let ix = 0; ix < steps; ix++) {
      const xc = grid.xcMin + ix * dxc;
      for (let iy = 0; iy < steps; iy++) {
        const yc = grid.ycMin + iy * dyc;
        for (let ir = 0; ir < steps; ir++) {
          const radius = grid.radiusMin + ir * dR;
          const circle = { xc, yc, radius };

          const res = this.analyzeSlipCircle({
            circle,
            groundProfile,
            soil,
            waterTableY,
            method,
            numSlices: 25,
          });

          if (res.slices.length > 0 && res.factorOfSafety < minFS) {
            minFS = res.factorOfSafety;
            bestCircle = circle;
            bestResult = res;
          }
        }
      }
    }

    if (!bestResult || minFS === Infinity) {
      // Fallback default circle
      bestResult = this.analyzeSlipCircle({
        circle: bestCircle,
        groundProfile,
        soil,
        waterTableY,
        method,
      });
      minFS = bestResult.factorOfSafety;
    }

    return {
      method,
      factorOfSafety: minFS,
      criticalCircle: bestCircle,
      totalDrivingMoment: bestResult.totalDriving,
      totalResistingMoment: bestResult.totalResisting,
      slices: bestResult.slices,
      isSafe: minFS >= targetFS,
    };
  }
}
