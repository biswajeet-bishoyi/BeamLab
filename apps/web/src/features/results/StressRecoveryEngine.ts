/**
 * BeamLab Sprint B3.3 — Cross-Section Stress Recovery & Fiber Engine
 * Computes 2D fiber stress fields (sigma_x, tau, sigma_vm), elastic strains,
 * neutral axis position/orientation, and extreme fiber states along structural members.
 */

export interface SectionDimensions {
  type: 'I' | 'CHS' | 'Box' | 'Angle' | 'Channel' | 'Solid';
  depth: number;      // [m] total height along local y
  width: number;      // [m] total flange width along local z
  tf?: number;        // [m] flange thickness
  tw?: number;        // [m] web thickness
  od?: number;        // [m] outer diameter for CHS
  t?: number;         // [m] wall thickness
  area: number;       // [m^2]
  Izz: number;        // [m^4] major axis inertia (bending about z)
  Iyy: number;        // [m^4] minor axis inertia (bending about y)
  J?: number;         // [m^4] torsional constant
}

export interface FiberPoint {
  y: number;          // [mm] offset along local y (depth)
  z: number;          // [mm] offset along local z (width)
  sigmaX: number;     // [MPa] normal stress (tension positive, compression negative)
  tau: number;        // [MPa] resultant shear stress
  vonMises: number;   // [MPa] equivalent Von Mises stress
  strainX: number;    // [microstrain = 1e-6]
  part: 'top_flange' | 'bottom_flange' | 'web' | 'wall' | 'core';
}

export interface CrossSectionStressState {
  memberId: string;
  stationX: number;   // [m]
  stationRatio: number; // [0.0, 1.0]
  sectionName: string;
  materialGrade: string;
  yieldStrength: number; // [MPa] e.g. 355
  fibers: FiberPoint[];
  neutralAxis: {
    angleDeg: number;  // inclination angle of neutral axis in degrees
    offsetY: number;   // [mm] shift along y from centroid due to axial force
    isWithinSection: boolean;
  };
  extremes: {
    maxTension: number;     // [MPa]
    maxCompression: number; // [MPa] (negative)
    maxShear: number;       // [MPa]
    maxVonMises: number;    // [MPa]
    yieldRatio: number;     // maxVonMises / fy
    isYielding: boolean;
  };
  criticalFibers: {
    topCenter: FiberPoint;
    bottomCenter: FiberPoint;
    webCenter: FiberPoint;
    flangeTipLeft: FiberPoint;
    flangeTipRight: FiberPoint;
  };
}

export class StressRecoveryEngine {
  /**
   * Resolves standard profile dimensions from section designation.
   */
  public static getSectionDimensions(sectionName: string): SectionDimensions {
    if (sectionName.includes('IPE 360')) {
      return {
        type: 'I',
        depth: 0.360,
        width: 0.170,
        tf: 0.0127,
        tw: 0.008,
        area: 7.27e-3,
        Izz: 1.627e-4,
        Iyy: 1.043e-5,
        J: 3.73e-7,
      };
    }

    if (sectionName.includes('W12x26')) {
      return {
        type: 'I',
        depth: 0.310,
        width: 0.165,
        tf: 0.0097,
        tw: 0.0058,
        area: 4.94e-3,
        Izz: 8.49e-5,
        Iyy: 7.20e-6,
        J: 1.25e-7,
      };
    }

    if (sectionName.includes('W16x31')) {
      return {
        type: 'I',
        depth: 0.403,
        width: 0.140,
        tf: 0.0112,
        tw: 0.0070,
        area: 5.88e-3,
        Izz: 1.56e-4,
        Iyy: 5.16e-6,
        J: 1.8e-7,
      };
    }

    if (sectionName.includes('CHS 168.3x8')) {
      const od = 0.1683;
      const t = 0.008;
      return {
        type: 'CHS',
        depth: od,
        width: od,
        od,
        t,
        area: 4.03e-3,
        Izz: 1.34e-5,
        Iyy: 1.34e-5,
        J: 2.68e-5,
      };
    }

    if (sectionName.includes('CHS 114.3x5')) {
      const od = 0.1143;
      const t = 0.005;
      return {
        type: 'CHS',
        depth: od,
        width: od,
        od,
        t,
        area: 1.72e-3,
        Izz: 2.58e-6,
        Iyy: 2.58e-6,
        J: 5.16e-6,
      };
    }

    // Default universal I-beam
    return {
      type: 'I',
      depth: 0.300,
      width: 0.150,
      tf: 0.010,
      tw: 0.007,
      area: 5.0e-3,
      Izz: 9.0e-5,
      Iyy: 6.0e-6,
      J: 1.5e-7,
    };
  }

  /**
   * Recovers full 2D fiber stress state for a member at a given station.
   */
  public static recoverStressState(
    memberId: string,
    stationX: number,
    stationRatio: number,
    sectionName: string,
    materialGrade: string,
    internalForces: {
      N: number;    // [kN] axial force
      Vy: number;   // [kN] major shear
      Vz?: number;  // [kN] minor shear
      Mz: number;   // [kNm] major moment
      My?: number;  // [kNm] minor moment
      T?: number;   // [kNm] torsion
    },
    fy: number = 355, // [MPa]
    E: number = 210e3, // [MPa]
  ): CrossSectionStressState {
    const dims = this.getSectionDimensions(sectionName);
    const N_N = internalForces.N * 1e3;          // Convert kN to N
    const Vy_N = internalForces.Vy * 1e3;        // Convert kN to N
    const Vz_N = (internalForces.Vz ?? 0) * 1e3; // Convert kN to N
    const Mz_Nm = internalForces.Mz * 1e3;       // Convert kNm to N·m
    const My_Nm = (internalForces.My ?? 0) * 1e3;// Convert kNm to N·m
    const T_Nm = (internalForces.T ?? 0) * 1e3;

    // Centroidal axial normal stress: sigma_axial = N / A
    const sigmaAxialPa = N_N / dims.area;

    // Discretize cross-section into fibers
    const fibers: FiberPoint[] = [];

    if (dims.type === 'I') {
      const d = dims.depth;
      const b = dims.width;
      const tf = dims.tf ?? 0.012;
      const tw = dims.tw ?? 0.008;

      // 1. Top Flange fibers (rows of fibers across width b)
      const flangeRows = 3;
      const flangeCols = 15;
      for (let r = 0; r < flangeRows; r++) {
        const y = d / 2 - (r + 0.5) * (tf / flangeRows);
        for (let c = 0; c < flangeCols; c++) {
          const z = -b / 2 + (c + 0.5) * (b / flangeCols);
          fibers.push(this.computeFiberStress(y, z, sigmaAxialPa, Mz_Nm, My_Nm, Vy_N, Vz_N, T_Nm, dims, 'top_flange', E));
        }
      }

      // 2. Bottom Flange fibers
      for (let r = 0; r < flangeRows; r++) {
        const y = -d / 2 + (r + 0.5) * (tf / flangeRows);
        for (let c = 0; c < flangeCols; c++) {
          const z = -b / 2 + (c + 0.5) * (b / flangeCols);
          fibers.push(this.computeFiberStress(y, z, sigmaAxialPa, Mz_Nm, My_Nm, Vy_N, Vz_N, T_Nm, dims, 'bottom_flange', E));
        }
      }

      // 3. Web fibers
      const webHeight = d - 2 * tf;
      const webRows = 20;
      const webCols = 3;
      for (let r = 0; r < webRows; r++) {
        const y = -webHeight / 2 + (r + 0.5) * (webHeight / webRows);
        for (let c = 0; c < webCols; c++) {
          const z = -tw / 2 + (c + 0.5) * (tw / webCols);
          fibers.push(this.computeFiberStress(y, z, sigmaAxialPa, Mz_Nm, My_Nm, Vy_N, Vz_N, T_Nm, dims, 'web', E));
        }
      }
    } else if (dims.type === 'CHS') {
      // Circular hollow tube fibers
      const od = dims.od ?? dims.depth;
      const t = dims.t ?? 0.006;
      const rMid = (od - t) / 2;
      const rings = 2;
      const angularSegments = 32;

      for (let ring = 0; ring < rings; ring++) {
        const r = rMid - t / 4 + (ring * t) / 2;
        for (let a = 0; a < angularSegments; a++) {
          const theta = (a / angularSegments) * 2 * Math.PI;
          const y = r * Math.cos(theta);
          const z = r * Math.sin(theta);
          fibers.push(this.computeFiberStress(y, z, sigmaAxialPa, Mz_Nm, My_Nm, Vy_N, Vz_N, T_Nm, dims, 'wall', E));
        }
      }
    }

    // Evaluate summary extrema
    let maxTens = 0;
    let maxComp = 0;
    let maxShear = 0;
    let maxVonMises = 0;

    for (const f of fibers) {
      if (f.sigmaX > maxTens) maxTens = f.sigmaX;
      if (f.sigmaX < maxComp) maxComp = f.sigmaX;
      if (f.tau > maxShear) maxShear = f.tau;
      if (f.vonMises > maxVonMises) maxVonMises = f.vonMises;
    }

    // Neutral Axis Calculation
    // sigma(y, z) = sigma_axial - Mz*y/Izz + My*z/Iyy = 0
    // When My = 0: y_NA = (sigma_axial * Izz) / Mz
    let angleDeg = 0;
    if (Math.abs(Mz_Nm) > 1e-3) {
      const slope = (My_Nm * dims.Izz) / (Mz_Nm * dims.Iyy + 1e-9);
      angleDeg = (Math.atan(slope) * 180) / Math.PI;
    }
    const offsetY_m = Math.abs(Mz_Nm) > 1e-2 ? (sigmaAxialPa * dims.Izz) / Mz_Nm : 0;
    const offsetY_mm = offsetY_m * 1000;
    const isWithinSection = Math.abs(offsetY_m) <= dims.depth / 2;

    // Extract critical fiber landmarks
    const d = dims.depth;
    const b = dims.width;
    const topCenter = this.computeFiberStress(d / 2, 0, sigmaAxialPa, Mz_Nm, My_Nm, Vy_N, Vz_N, T_Nm, dims, 'top_flange', E);
    const bottomCenter = this.computeFiberStress(-d / 2, 0, sigmaAxialPa, Mz_Nm, My_Nm, Vy_N, Vz_N, T_Nm, dims, 'bottom_flange', E);
    const webCenter = this.computeFiberStress(0, 0, sigmaAxialPa, Mz_Nm, My_Nm, Vy_N, Vz_N, T_Nm, dims, 'web', E);
    const flangeTipLeft = this.computeFiberStress(d / 2, -b / 2, sigmaAxialPa, Mz_Nm, My_Nm, Vy_N, Vz_N, T_Nm, dims, 'top_flange', E);
    const flangeTipRight = this.computeFiberStress(d / 2, b / 2, sigmaAxialPa, Mz_Nm, My_Nm, Vy_N, Vz_N, T_Nm, dims, 'top_flange', E);

    const yieldRatio = maxVonMises / fy;

    return {
      memberId,
      stationX: Number(stationX.toFixed(2)),
      stationRatio: Number(stationRatio.toFixed(2)),
      sectionName,
      materialGrade,
      yieldStrength: fy,
      fibers,
      neutralAxis: {
        angleDeg: Number(angleDeg.toFixed(1)),
        offsetY: Number(offsetY_mm.toFixed(1)),
        isWithinSection,
      },
      extremes: {
        maxTension: Number(maxTens.toFixed(1)),
        maxCompression: Number(maxComp.toFixed(1)),
        maxShear: Number(maxShear.toFixed(1)),
        maxVonMises: Number(maxVonMises.toFixed(1)),
        yieldRatio: Number(yieldRatio.toFixed(3)),
        isYielding: maxVonMises >= fy,
      },
      criticalFibers: {
        topCenter,
        bottomCenter,
        webCenter,
        flangeTipLeft,
        flangeTipRight,
      },
    };
  }

  private static computeFiberStress(
    y: number, // [m]
    z: number, // [m]
    sigmaAxialPa: number,
    Mz_Nm: number,
    My_Nm: number,
    Vy_N: number,
    Vz_N: number,
    T_Nm: number,
    dims: SectionDimensions,
    part: 'top_flange' | 'bottom_flange' | 'web' | 'wall' | 'core',
    E: number,
  ): FiberPoint {
    // 1. Normal stress: sigma_x = N/A - Mz*y/Izz + My*z/Iyy
    const sigmaBendingMz = -(Mz_Nm * y) / dims.Izz;
    const sigmaBendingMy = (My_Nm * z) / dims.Iyy;
    const sigmaTotalPa = sigmaAxialPa + sigmaBendingMz + sigmaBendingMy;
    const sigmaX_MPa = sigmaTotalPa / 1e6;

    // 2. Shear stress:
    let tau_MPa = 0;
    if (dims.type === 'I') {
      const d = dims.depth;
      const tf = dims.tf ?? 0.012;
      const tw = dims.tw ?? 0.008;

      if (part === 'web') {
        // Parabolic web shear: tau(y) = (Vy * Q(y)) / (Izz * tw)
        // Q_web(y) = b*tf*(d/2 - tf/2) + tw/2 * ((d/2 - tf)^2 - y^2)
        const b = dims.width;
        const yMax = d / 2 - tf;
        const Q = b * tf * (d / 2 - tf / 2) + (tw / 2) * (yMax * yMax - y * y);
        const tauWebPa = Math.abs((Vy_N * Q) / (dims.Izz * tw));
        tau_MPa = tauWebPa / 1e6;
      } else {
        // Flange transverse shear from Vz + minor shear
        const tauFlangePa = Math.abs(Vz_N / (2 * dims.width * tf + 1e-9));
        tau_MPa = tauFlangePa / 1e6;
      }

      // Add torsional shear
      if (Math.abs(T_Nm) > 1e-2 && dims.J) {
        const tMax = Math.max(tf, tw);
        const tauTorsPa = Math.abs((T_Nm * tMax) / dims.J);
        tau_MPa = Math.sqrt(tau_MPa * tau_MPa + Math.pow(tauTorsPa / 1e6, 2));
      }
    } else {
      // Tube or solid
      const tauAvgPa = Math.abs(Vy_N / (dims.area / 2));
      tau_MPa = (tauAvgPa * 1.3) / 1e6;
    }

    // 3. Von Mises: sigma_vm = sqrt(sigma^2 + 3*tau^2)
    const vonMises_MPa = Math.sqrt(sigmaX_MPa * sigmaX_MPa + 3 * tau_MPa * tau_MPa);

    // 4. Strain: eps = sigma / E * 1e6 (microstrain)
    const strainX = (sigmaTotalPa / (E * 1e6)) * 1e6;

    return {
      y: Number((y * 1000).toFixed(1)),
      z: Number((z * 1000).toFixed(1)),
      sigmaX: Number(sigmaX_MPa.toFixed(1)),
      tau: Number(tau_MPa.toFixed(1)),
      vonMises: Number(vonMises_MPa.toFixed(1)),
      strainX: Number(strainX.toFixed(1)),
      part,
    };
  }
}
