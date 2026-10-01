export type TendonProfileType = 'parabolic' | 'harped' | 'reverse-parabolic';

export interface ParabolicProfileInput {
  type: 'parabolic';
  spanLengthM: number;
  yStartMm: number;    // Tendon height above bottom at x = 0
  yMidMm: number;      // Tendon height above bottom at x = L/2 (lowest point / max drape)
  yEndMm: number;      // Tendon height above bottom at x = L
  concreteCentroidYMm: number; // c.g.c from bottom fiber
}

export interface HarpedProfileInput {
  type: 'harped';
  spanLengthM: number;
  yStartMm: number;
  yMidMm: number;
  yEndMm: number;
  holdDownFraction1?: number; // Station fraction of first hold-down (default 0.333)
  holdDownFraction2?: number; // Station fraction of second hold-down (default 0.667)
  concreteCentroidYMm: number;
}

export interface ReverseParabolicProfileInput {
  type: 'reverse-parabolic';
  spanLengthM: number;
  ySupportMm: number;        // Support crest height (top of beam minus cover)
  yMidMm: number;            // Midspan lowest sag height
  inflectionFraction?: number; // Inflection point location from support (default 0.15 * L)
  concreteCentroidYMm: number;
}

export type TendonProfileInput = 
  | ParabolicProfileInput 
  | HarpedProfileInput 
  | ReverseParabolicProfileInput;

export interface TendonStation {
  xM: number;                 // Distance from left anchor (m)
  xRatio: number;             // x / L
  yMm: number;                // Elevation above bottom soffit (mm)
  eccentricityMm: number;     // e(x) = y(x) - y_cgc (positive upwards, negative downwards)
  slopeRad: number;           // dy/dx (radians)
  slopeDeg: number;           // dy/dx (degrees)
  cumulativeAngleRad: number; // Cumulative absolute angular change alpha(x)
  curvatureMInv: number;      // d^2y/dx^2 (1/m)
}

export interface TendonGeometryResult {
  profileType: TendonProfileType;
  spanLengthM: number;
  concreteCentroidYMm: number;
  drapeMm: number;            // Difference between highest anchor and lowest point
  maxEccentricityMm: number;  // Absolute max |e(x)|
  midspanEccentricityMm: number; // e(L/2)
  totalAngularChangeRad: number; // alpha(L)
  totalAngularChangeDeg: number;
  stations: TendonStation[];
  evaluateAt: (xM: number) => TendonStation;
}

export class TendonProfileEngine {
  public static generateProfile(input: TendonProfileInput, numStations: number = 51): TendonGeometryResult {
    const L = input.spanLengthM;
    const yCgc = input.concreteCentroidYMm;
    const n = Math.max(11, numStations);

    let evaluator: (x: number) => { yMm: number; slopeRad: number; curvatureMInv: number };

    if (input.type === 'parabolic') {
      evaluator = this.createParabolicEvaluator(input);
    } else if (input.type === 'harped') {
      evaluator = this.createHarpedEvaluator(input);
    } else {
      evaluator = this.createReverseParabolicEvaluator(input);
    }

    // Discrete sampling along length to compute cumulative angular deviation alpha(x)
    const stations: TendonStation[] = [];
    let cumAngle = 0;
    let prevSlope = 0;

    for (let i = 0; i < n; i++) {
      const xM = (i / (n - 1)) * L;
      const { yMm, slopeRad, curvatureMInv } = evaluator(xM);

      if (i === 0) {
        prevSlope = slopeRad;
        cumAngle = 0;
      } else {
        cumAngle += Math.abs(slopeRad - prevSlope);
        prevSlope = slopeRad;
      }

      const eccentricityMm = yMm - yCgc;

      stations.push({
        xM,
        xRatio: xM / L,
        yMm,
        eccentricityMm,
        slopeRad,
        slopeDeg: (slopeRad * 180) / Math.PI,
        cumulativeAngleRad: cumAngle,
        curvatureMInv,
      });
    }

    const drapeMm = Math.max(...stations.map(s => s.yMm)) - Math.min(...stations.map(s => s.yMm));
    const maxEccentricityMm = Math.max(...stations.map(s => Math.abs(s.eccentricityMm)));
    const midStation = stations[Math.floor((n - 1) / 2)];
    const totalAngularChangeRad = stations[stations.length - 1].cumulativeAngleRad;

    const evaluateAt = (xM: number): TendonStation => {
      const clampedX = Math.max(0, Math.min(L, xM));
      const { yMm, slopeRad, curvatureMInv } = evaluator(clampedX);
      
      // Interpolate cumulative angle from closest stations
      const idx = (clampedX / L) * (n - 1);
      const low = Math.floor(idx);
      const high = Math.min(n - 1, Math.ceil(idx));
      const factor = idx - low;
      const interpolatedAngle = stations[low].cumulativeAngleRad + factor * (stations[high].cumulativeAngleRad - stations[low].cumulativeAngleRad);

      return {
        xM: clampedX,
        xRatio: clampedX / L,
        yMm,
        eccentricityMm: yMm - yCgc,
        slopeRad,
        slopeDeg: (slopeRad * 180) / Math.PI,
        cumulativeAngleRad: interpolatedAngle,
        curvatureMInv,
      };
    };

    return {
      profileType: input.type,
      spanLengthM: L,
      concreteCentroidYMm: yCgc,
      drapeMm,
      maxEccentricityMm,
      midspanEccentricityMm: midStation.eccentricityMm,
      totalAngularChangeRad,
      totalAngularChangeDeg: (totalAngularChangeRad * 180) / Math.PI,
      stations,
      evaluateAt,
    };
  }

  private static createParabolicEvaluator(input: ParabolicProfileInput) {
    const L = input.spanLengthM;
    const yStart = input.yStartMm;
    const yMid = input.yMidMm;
    const yEnd = input.yEndMm;

    // Chord midpoint:
    const yChordMid = (yStart + yEnd) / 2;
    // Sag distance from chord:
    const sag = yChordMid - yMid; // mm

    return (xM: number) => {
      const u = xM / L;
      // y(x) = yStart + (yEnd - yStart)*u - 4*sag*u*(1 - u)
      const yMm = yStart + (yEnd - yStart) * u - 4 * sag * u * (1 - u);
      // dy/dx (in mm/m) / 1000 => radians:
      // dy/dx = (yEnd - yStart)/L - (4*sag/L)*(1 - 2*u)
      const dyDx = ((yEnd - yStart) - 4 * sag * (1 - 2 * u)) / L / 1000;
      // d^2y/dx^2 = (8*sag/L^2) in mm/m^2 / 1000 => 1/m:
      const curvatureMInv = (8 * sag) / (L * L) / 1000;

      return { yMm, slopeRad: dyDx, curvatureMInv };
    };
  }

  private static createHarpedEvaluator(input: HarpedProfileInput) {
    const L = input.spanLengthM;
    const yStart = input.yStartMm;
    const yMid = input.yMidMm;
    const yEnd = input.yEndMm;
    const f1 = input.holdDownFraction1 ?? 0.333333;
    const f2 = input.holdDownFraction2 ?? 0.666667;
    const x1 = f1 * L;
    const x2 = f2 * L;

    return (xM: number) => {
      let yMm: number;
      let slopeRad: number;
      let curvatureMInv = 0;

      if (xM < x1) {
        const u = xM / x1;
        yMm = yStart + (yMid - yStart) * u;
        slopeRad = ((yMid - yStart) / x1) / 1000;
      } else if (xM <= x2) {
        yMm = yMid;
        slopeRad = 0;
      } else {
        const u = (xM - x2) / (L - x2);
        yMm = yMid + (yEnd - yMid) * u;
        slopeRad = ((yEnd - yMid) / (L - x2)) / 1000;
      }

      return { yMm, slopeRad, curvatureMInv };
    };
  }

  private static createReverseParabolicEvaluator(input: ReverseParabolicProfileInput) {
    const L = input.spanLengthM;
    const ySup = input.ySupportMm;
    const yMid = input.yMidMm;
    const infFrac = input.inflectionFraction ?? 0.15;
    const xInf = infFrac * L;
    const xMid = L / 2;

    // For smooth curvature match at inflection point xInf:
    // Support parabola (crest): y1(x) = ySup - a1 * x^2
    // Midspan parabola (sag): y2(x) = yMid + a2 * (xMid - x)^2
    // Continuity of y and dy/dx at x = xInf:
    // y1(xInf) = y2(xInf) and y1'(xInf) = y2'(xInf)
    // -2 * a1 * xInf = -2 * a2 * (xMid - xInf) => a1 * xInf = a2 * (xMid - xInf)
    // Total drop H = ySup - yMid = a1 * xInf^2 + a2 * (xMid - xInf)^2
    // a1 = a2 * (xMid - xInf) / xInf
    // H = a2 * (xMid - xInf) * xInf + a2 * (xMid - xInf)^2 = a2 * (xMid - xInf) * xMid
    // => a2 = H / [xMid * (xMid - xInf)]
    // => a1 = H / [xMid * xInf]
    const H = ySup - yMid;
    const a2 = H / (xMid * (xMid - xInf));
    const a1 = H / (xMid * xInf);

    return (xM: number) => {
      // Symmetrical about midspan:
      const xLocal = xM <= xMid ? xM : L - xM;
      const sign = xM <= xMid ? 1 : -1;

      let yMm: number;
      let slopeRad: number;
      let curvatureMInv: number;

      if (xLocal <= xInf) {
        yMm = ySup - a1 * xLocal * xLocal;
        slopeRad = (-2 * a1 * xLocal / 1000) * sign;
        curvatureMInv = (-2 * a1 / 1000) * sign;
      } else {
        const dx = xMid - xLocal;
        yMm = yMid + a2 * dx * dx;
        slopeRad = (2 * a2 * dx / 1000) * (xM <= xMid ? -1 : 1) * sign;
        curvatureMInv = (2 * a2 / 1000);
      }

      return { yMm, slopeRad, curvatureMInv };
    };
  }
}
