/**
 * Exact Catenary & Parabolic Cable Geometry Engine
 * BeamLab Sprint B18.1 — Catenary Kinematics, Arc Length & Support Reactions
 */

import {
  CableMaterial,
  CableCrossSection,
  CableSupportNode,
  CatenaryProfileResult,
  CableProfileStation,
} from './types';

export class CatenaryGeometryEngine {
  /**
   * Solves exact catenary geometry given horizontal tension H and self-weight line load w.
   */
  public static solveCatenaryByTension(
    supportA: CableSupportNode,
    supportB: CableSupportNode,
    section: CableCrossSection,
    material: CableMaterial,
    horizontalTension: number,
    numStations: number = 51
  ): CatenaryProfileResult {
    const span = Math.abs(supportB.x - supportA.x);
    if (span <= 0) {
      throw new Error('Horizontal span L between cable supports must be strictly positive.');
    }
    const levelDiff = supportB.y - supportA.y; // h = y_B - y_A
    const chordLen = Math.hypot(span, levelDiff);
    const chordAngle = Math.atan2(levelDiff, span);
    const w = section.unitWeight; // N/m

    if (horizontalTension <= 0) {
      throw new Error('Horizontal tension H must be positive.');
    }
    if (w <= 0) {
      throw new Error('Cable unit weight w must be positive.');
    }

    const c = horizontalTension / w; // Catenary parameter in meters

    // Exact closed-form solution for vertex x_v
    // Using hyperbolic identity: 2 * sinh(L / 2c) * sinh((L - 2 x_v) / 2c) = h / c
    const sinhHalfSpan = Math.sinh(span / (2 * c));
    const u = (levelDiff / c) / (2 * sinhHalfSpan);
    const asinhU = Math.asinh(u);
    const xVertex = span / 2 - c * asinhU;
    const yVertex = supportA.y - c * (Math.cosh(xVertex / c) - 1);

    // Stressed total arc length: exact closed form
    const stressedLength = Math.sqrt(
      levelDiff * levelDiff + Math.pow(2 * c * Math.sinh(span / (2 * c)), 2)
    );

    // Vertical reactions at supports (upward reaction on cable from anchor)
    // T_A = H * cosh(x_v / c), V_A = H * sinh(x_v / c)
    const vReactionStart = horizontalTension * Math.sinh(xVertex / c);
    const vReactionEnd = horizontalTension * Math.sinh((span - xVertex) / c);

    const tensionStart = Math.hypot(horizontalTension, vReactionStart);
    const tensionEnd = Math.hypot(horizontalTension, vReactionEnd);
    const maxTension = Math.max(tensionStart, tensionEnd);
    const minTension = horizontalTension; // Occurs at lowest tangent slope point

    // Maximum vertical sag measured from chord line
    // Slope of chord is m = h / L. Sag is max where dy/dx = m => sinh((x - x_v)/c) = m
    const xMaxSag = Math.max(0, Math.min(span, xVertex + c * Math.asinh(levelDiff / span)));
    const yCableAtMaxSag = supportA.y + c * (Math.cosh((xMaxSag - xVertex) / c) - Math.cosh(xVertex / c));
    const yChordAtMaxSag = supportA.y + (levelDiff / span) * xMaxSag;
    const maxSag = Math.abs(yChordAtMaxSag - yCableAtMaxSag);
    const sagRatio = maxSag / span;

    // Elastic elongation: delta_L = int (T(s) / (E * A)) ds
    // T_avg approximation with high accuracy
    const tAvg = horizontalTension * (1 + (16 / 3) * Math.pow(sagRatio, 2));
    const elasticElongation = (tAvg * stressedLength) / (material.elasticModulus * section.metallicArea);
    const unstressedLength = stressedLength - elasticElongation;

    // Station sampling along the span
    const stations: CableProfileStation[] = [];
    const n = Math.max(numStations, 11);
    for (let i = 0; i < n; i++) {
      const xi = (span * i) / (n - 1);
      const yi = supportA.y + c * (Math.cosh((xi - xVertex) / c) - Math.cosh(xVertex / c));
      const zi = supportA.z !== undefined && supportB.z !== undefined
        ? supportA.z + ((supportB.z - supportA.z) * i) / (n - 1)
        : 0;

      // Arc length from start to xi
      const arcFromStart = c * (Math.sinh((xi - xVertex) / c) + Math.sinh(xVertex / c));
      const slope = Math.sinh((xi - xVertex) / c);
      const tangentAngle = Math.atan(slope);
      const vShear = horizontalTension * slope;
      const tLocal = Math.hypot(horizontalTension, vShear);

      stations.push({
        x: supportA.x + xi,
        y: yi,
        z: zi,
        arcLengthFromStart: arcFromStart,
        tangentAngleRad: tangentAngle,
        tension: tLocal,
        horizontalTension,
        verticalShear: vShear,
      });
    }

    return {
      span,
      levelDifference: levelDiff,
      chordLength: chordLen,
      chordAngleRad: chordAngle,
      horizontalTension,
      maxTension,
      minTension,
      tensionAtStart: tensionStart,
      tensionAtEnd: tensionEnd,
      verticalReactionStart: vReactionStart,
      verticalReactionEnd: vReactionEnd,
      sag: maxSag,
      sagRatio,
      catenaryParameter: c,
      vertexX: xVertex,
      vertexY: yVertex,
      stressedLength,
      elasticElongation,
      unstressedLength,
      stations,
    };
  }

  /**
   * Solves exact catenary geometry given target center-span sag f (or sag-to-span ratio).
   * Uses Newton-Raphson iteration on horizontal tension H.
   */
  public static solveCatenaryBySag(
    supportA: CableSupportNode,
    supportB: CableSupportNode,
    section: CableCrossSection,
    material: CableMaterial,
    targetSag: number,
    numStations: number = 51
  ): CatenaryProfileResult {
    const span = Math.abs(supportB.x - supportA.x);
    if (targetSag <= 0) {
      throw new Error('Target sag f must be strictly positive.');
    }
    const w = section.unitWeight;

    // Initial guess from parabolic cable theory: H_0 = w * L^2 / (8 * f)
    let H = (w * span * span) / (8 * targetSag);

    // Newton-Raphson iteration
    const maxIter = 50;
    const tolerance = 1e-8; // meters

    for (let iter = 0; iter < maxIter; iter++) {
      const res = this.solveCatenaryByTension(supportA, supportB, section, material, H, 11);
      const diff = res.sag - targetSag;

      if (Math.abs(diff) < tolerance) {
        break;
      }

      // Derivative d(sag)/dH ~ -sag / H
      const dSag_dH = -res.sag / H;
      H = H - diff / dSag_dH;
      if (H <= 0) {
        H = (w * span * span) / (8 * targetSag); // Clamp fallback
      }
    }

    return this.solveCatenaryByTension(supportA, supportB, section, material, H, numStations);
  }

  /**
   * Fast parabolic approximation for flat cables (f/L <= 0.1).
   * y_parab(x) = 4 * f * x * (L - x) / L^2 + (h * x / L)
   */
  public static solveParabolicApproximation(
    span: number,
    levelDifference: number,
    sag: number,
    unitWeight: number
  ): {
    horizontalTension: number;
    maxTension: number;
    arcLength: number;
  } {
    const H = (unitWeight * span * span) / (8 * sag);
    const maxSlope = (4 * sag) / span + Math.abs(levelDifference) / span;
    const maxTension = H * Math.sqrt(1 + maxSlope * maxSlope);
    const arcLength = span * (1 + (8 / 3) * Math.pow(sag / span, 2) + 0.5 * Math.pow(levelDifference / span, 2));

    return {
      horizontalTension: H,
      maxTension,
      arcLength,
    };
  }
}
