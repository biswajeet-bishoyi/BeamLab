/**
 * BeamLab Sprint B3.1 — Member Internal Force & Station Evaluation Engine
 * Calculates continuous stations along 3D members for SFD, BMD, Axial, Torsion, and Deflection.
 * Locates critical stations: peak moments, zero-shear crossings, inflection points, and extrema.
 */

export interface StationResult {
  /** Distance from start node [m] */
  x: number;
  /** Normalized position [0.0, 1.0] */
  t: number;
  /** Axial force [kN] (positive = tension, negative = compression) */
  N: number;
  /** Shear force along major local axis y [kN] */
  Vy: number;
  /** Shear force along minor local axis z [kN] */
  Vz: number;
  /** Bending moment about major axis z [kNm] */
  Mz: number;
  /** Bending moment about minor axis y [kNm] */
  My: number;
  /** Torsional moment about longitudinal axis [kNm] */
  T: number;
  /** Transverse deflection magnitude [mm] */
  deflection: number;
  /** Deflection vector (dx, dy, dz) in local coordinates [mm] */
  deflectionLocal: { dy: number; dz: number };
}

export interface CriticalPoint {
  type: 'max_moment' | 'min_moment' | 'zero_shear' | 'inflection_point' | 'max_shear' | 'max_axial' | 'max_deflection';
  label: string;
  x: number;
  value: number;
  unit: string;
}

export interface MemberEvaluationResult {
  memberId: string;
  memberName: string;
  memberType: 'Beam' | 'Column' | 'Brace' | 'Truss' | 'Strut' | 'Purlin' | 'Rafter' | 'Custom';
  length: number;
  sectionDesignation: string;
  materialGrade: string;
  stations: StationResult[];
  criticalPoints: CriticalPoint[];
  extremes: {
    maxMz: number;
    minMz: number;
    maxVy: number;
    minVy: number;
    maxN: number;
    minN: number;
    maxDeflection: number;
  };
}

export interface MemberLoadingParameters {
  length: number;
  axialStart?: number; // [kN]
  axialEnd?: number;   // [kN]
  udlY?: number;       // [kN/m]
  udlZ?: number;       // [kN/m]
  pointLoads?: Array<{ x: number; Py?: number; Pz?: number; Px?: number }>;
  startMoments?: { Mz?: number; My?: number; T?: number }; // [kNm]
  endMoments?: { Mz?: number; My?: number; T?: number };   // [kNm]
  startShears?: { Vy?: number; Vz?: number };             // [kN]
  E?: number;          // [GPa]
  Iyy?: number;        // [m^4]
  Izz?: number;        // [m^4]
  A?: number;          // [m^2]
}

export class MemberForceEvaluator {
  /**
   * Evaluates continuous internal force series along a member.
   * @param memberId Unique member identifier
   * @param name Descriptive name
   * @param type Structural classification
   * @param length Total member length [m]
   * @param section Cross-section designation
   * @param material Material grade
   * @param params Loading and boundary condition parameters
   * @param stationCount Number of evaluation stations (default 51)
   */
  public static evaluateMember(
    memberId: string,
    name: string,
    type: 'Beam' | 'Column' | 'Brace' | 'Truss' | 'Strut' | 'Purlin' | 'Rafter' | 'Custom',
    length: number,
    section: string,
    material: string,
    params: MemberLoadingParameters,
    stationCount: number = 51,
  ): MemberEvaluationResult {
    const L = Math.max(0.01, length);
    const stations: StationResult[] = [];
    const step = L / (stationCount - 1);

    const udlY = params.udlY ?? 0;
    const udlZ = params.udlZ ?? 0;
    const axialStart = params.axialStart ?? 0;
    const axialEnd = params.axialEnd ?? axialStart;
    const pointLoads = params.pointLoads ?? [];

    const startMz = params.startMoments?.Mz ?? 0;
    const endMz = params.endMoments?.Mz ?? 0;
    const startMy = params.startMoments?.My ?? 0;
    const endMy = params.endMoments?.My ?? 0;
    const startT = params.startMoments?.T ?? 0;

    // Determine start shear: from equilibrium sum(M_end) = 0 or direct input
    let startVy = params.startShears?.Vy;
    if (startVy === undefined) {
      // Equilibrium of simply-supported or beam element with end moments
      // M_end = M_start + V_start * L - udlY * L^2 / 2 - sum(P * (L - x_p))
      let pointLoadMoment = 0;
      for (const p of pointLoads) {
        if (p.Py) pointLoadMoment += p.Py * (L - p.x);
      }
      startVy = (endMz - startMz + (udlY * L * L) / 2 + pointLoadMoment) / L;
    }

    let startVz = params.startShears?.Vz;
    if (startVz === undefined) {
      let pointLoadMoment = 0;
      for (const p of pointLoads) {
        if (p.Pz) pointLoadMoment += p.Pz * (L - p.x);
      }
      startVz = (endMy - startMy + (udlZ * L * L) / 2 + pointLoadMoment) / L;
    }

    // Young's modulus and Moment of Inertia for deflection
    const E = (params.E ?? 210) * 1e6; // kN/m^2
    const Izz = params.Izz ?? 8.36e-5; // m^4 (default ~W12x26)
    const EI = Math.max(1e2, E * Izz);

    // Compute stations along span
    let maxMz = -Infinity;
    let minMz = Infinity;
    let maxVy = -Infinity;
    let minVy = Infinity;
    let maxN = -Infinity;
    let minN = Infinity;
    let maxDefl = 0;

    for (let i = 0; i < stationCount; i++) {
      const x = Math.min(L, i * step);
      const t = x / L;

      // 1. Axial force N(x): linear interpolation between start and end
      const N = axialStart + (axialEnd - axialStart) * t;

      // 2. Shear force Vy(x): V(x) = V_start - udlY * x - sum(P_i for x_i <= x)
      let Vy = startVy - udlY * x;
      for (const p of pointLoads) {
        if (p.Py && x >= p.x) {
          Vy -= p.Py;
        }
      }

      let Vz = startVz - udlZ * x;
      for (const p of pointLoads) {
        if (p.Pz && x >= p.x) {
          Vz -= p.Pz;
        }
      }

      // 3. Bending moment Mz(x): M(x) = M_start + V_start * x - udlY * x^2 / 2 - sum(P_i * (x - x_i))
      let Mz = startMz + startVy * x - (udlY * x * x) / 2;
      for (const p of pointLoads) {
        if (p.Py && x >= p.x) {
          Mz -= p.Py * (x - p.x);
        }
      }

      let My = startMy + startVz * x - (udlZ * x * x) / 2;
      for (const p of pointLoads) {
        if (p.Pz && x >= p.x) {
          My -= p.Pz * (x - p.x);
        }
      }

      // 4. Torsion: assume constant or linearly distributed
      const T = startT;

      // 5. Deflection: elastic curve integration (Hermite / beam theory)
      // w(x) in mm = [w_udl + w_end_moments] * 1000
      // For simply-supported base + end rotations:
      // w_udl(x) = (w * x / (24 EI)) * (L^3 - 2Lx^2 + x^3)
      const wUdl = udlY !== 0 ? (udlY * x * (L * L * L - 2 * L * x * x + x * x * x)) / (24 * EI) : 0;
      // Moment contribution: M1*(Lx - x^2)/(2EI) approx
      const wM = ((startMz * (1 - t) + endMz * t) * x * (L - x)) / (6 * EI);
      const deflectionY = (wUdl + wM) * 1000; // mm
      const deflectionMag = Math.abs(deflectionY);

      if (Mz > maxMz) maxMz = Mz;
      if (Mz < minMz) minMz = Mz;
      if (Vy > maxVy) maxVy = Vy;
      if (Vy < minVy) minVy = Vy;
      if (N > maxN) maxN = N;
      if (N < minN) minN = N;
      if (deflectionMag > maxDefl) maxDefl = deflectionMag;

      stations.push({
        x: Number(x.toFixed(3)),
        t: Number(t.toFixed(3)),
        N: Number(N.toFixed(2)),
        Vy: Number(Vy.toFixed(2)),
        Vz: Number(Vz.toFixed(2)),
        Mz: Number(Mz.toFixed(2)),
        My: Number(My.toFixed(2)),
        T: Number(T.toFixed(2)),
        deflection: Number(deflectionMag.toFixed(2)),
        deflectionLocal: {
          dy: Number(deflectionY.toFixed(2)),
          dz: 0,
        },
      });
    }

    // Detect critical points
    const criticalPoints: CriticalPoint[] = [];

    // 1. Max & Min Bending Moments
    let peakMIndex = 0;
    let minMIndex = 0;
    for (let i = 1; i < stations.length; i++) {
      if (stations[i]!.Mz > stations[peakMIndex]!.Mz) peakMIndex = i;
      if (stations[i]!.Mz < stations[minMIndex]!.Mz) minMIndex = i;
    }

    if (Math.abs(stations[peakMIndex]!.Mz) > 0.01) {
      criticalPoints.push({
        type: 'max_moment',
        label: 'M_max (Sagging)',
        x: stations[peakMIndex]!.x,
        value: stations[peakMIndex]!.Mz,
        unit: 'kNm',
      });
    }

    if (stations[minMIndex]!.Mz < -0.01 && minMIndex !== peakMIndex) {
      criticalPoints.push({
        type: 'min_moment',
        label: 'M_min (Hogging)',
        x: stations[minMIndex]!.x,
        value: stations[minMIndex]!.Mz,
        unit: 'kNm',
      });
    }

    // 2. Zero Shear Crossings (V = 0)
    for (let i = 0; i < stations.length - 1; i++) {
      const v1 = stations[i]!.Vy;
      const v2 = stations[i + 1]!.Vy;
      if ((v1 >= 0 && v2 < 0) || (v1 <= 0 && v2 > 0)) {
        const frac = Math.abs(v1) / (Math.abs(v1) + Math.abs(v2) + 1e-9);
        const xZero = stations[i]!.x + frac * (stations[i + 1]!.x - stations[i]!.x);
        criticalPoints.push({
          type: 'zero_shear',
          label: 'V = 0 (Peak Moment)',
          x: Number(xZero.toFixed(2)),
          value: 0,
          unit: 'kN',
        });
      }
    }

    // 3. Points of Inflection (M = 0)
    for (let i = 0; i < stations.length - 1; i++) {
      const m1 = stations[i]!.Mz;
      const m2 = stations[i + 1]!.Mz;
      if ((m1 > 0 && m2 < 0) || (m1 < 0 && m2 > 0)) {
        const frac = Math.abs(m1) / (Math.abs(m1) + Math.abs(m2) + 1e-9);
        const xZero = stations[i]!.x + frac * (stations[i + 1]!.x - stations[i]!.x);
        criticalPoints.push({
          type: 'inflection_point',
          label: 'M = 0 (Inflection Point)',
          x: Number(xZero.toFixed(2)),
          value: 0,
          unit: 'kNm',
        });
      }
    }

    // 4. Max Shear
    criticalPoints.push({
      type: 'max_shear',
      label: 'V_max',
      x: Math.abs(stations[0]!.Vy) >= Math.abs(stations[stations.length - 1]!.Vy) ? stations[0]!.x : stations[stations.length - 1]!.x,
      value: Math.max(Math.abs(maxVy), Math.abs(minVy)),
      unit: 'kN',
    });

    // 5. Max Deflection
    let maxDeflIndex = 0;
    for (let i = 1; i < stations.length; i++) {
      if (stations[i]!.deflection > stations[maxDeflIndex]!.deflection) maxDeflIndex = i;
    }
    criticalPoints.push({
      type: 'max_deflection',
      label: '\u03B4_max',
      x: stations[maxDeflIndex]!.x,
      value: stations[maxDeflIndex]!.deflection,
      unit: 'mm',
    });

    return {
      memberId,
      memberName: name,
      memberType: type,
      length: L,
      sectionDesignation: section,
      materialGrade: material,
      stations,
      criticalPoints,
      extremes: {
        maxMz: Number(maxMz.toFixed(2)),
        minMz: Number(minMz.toFixed(2)),
        maxVy: Number(maxVy.toFixed(2)),
        minVy: Number(minVy.toFixed(2)),
        maxN: Number(maxN.toFixed(2)),
        minN: Number(minN.toFixed(2)),
        maxDeflection: Number(maxDefl.toFixed(2)),
      },
    };
  }

  /**
   * Generates realistic standard member results for any model preset.
   */
  public static getDemoModelEvaluations(preset: 'portal_frame' | 'space_truss' | 'building_slabs'): Map<string, MemberEvaluationResult> {
    const results = new Map<string, MemberEvaluationResult>();

    if (preset === 'portal_frame') {
      // 1. Rafter Left (6m span, UDL 12 kN/m gravity + point load 25 kN at crane point)
      results.set(
        'm_rafter1',
        this.evaluateMember('m_rafter1', 'Rafter Left', 'Rafter', 6.08, 'IPE 360', 'S355', {
          length: 6.08,
          axialStart: -48.5,
          axialEnd: -35.2,
          udlY: 14.5,
          startMoments: { Mz: -84.2 },
          endMoments: { Mz: 22.0 },
          pointLoads: [{ x: 3.04, Py: 28.0 }],
        }),
      );

      // 2. Rafter Right (6m span)
      results.set(
        'm_rafter2',
        this.evaluateMember('m_rafter2', 'Rafter Right', 'Rafter', 6.08, 'IPE 360', 'S355', {
          length: 6.08,
          axialStart: -35.2,
          axialEnd: -48.5,
          udlY: 14.5,
          startMoments: { Mz: 22.0 },
          endMoments: { Mz: -84.2 },
          pointLoads: [{ x: 3.04, Py: 28.0 }],
        }),
      );

      // 3. Column Left (4.5m tall, lateral wind 6.5 kN/m + axial 92 kN)
      results.set(
        'm_col1',
        this.evaluateMember('m_col1', 'Column Left', 'Column', 4.5, 'IPE 360', 'S355', {
          length: 4.5,
          axialStart: -95.4,
          axialEnd: -90.2,
          udlY: 6.5,
          startMoments: { Mz: 98.6 },
          endMoments: { Mz: -84.2 },
        }),
      );

      // 4. Column Right (4.5m tall, axial 88 kN)
      results.set(
        'm_col2',
        this.evaluateMember('m_col2', 'Column Right', 'Column', 4.5, 'IPE 360', 'S355', {
          length: 4.5,
          axialStart: -89.0,
          axialEnd: -84.1,
          udlY: -2.1,
          startMoments: { Mz: -65.2 },
          endMoments: { Mz: -84.2 },
        }),
      );

      // 5. Eaves Ties
      results.set(
        'm_eaves_tie1',
        this.evaluateMember('m_eaves_tie1', 'Eaves Tie L', 'Strut', 6.0, 'CHS 114.3x5', 'S355', {
          length: 6.0,
          axialStart: -22.4,
          axialEnd: -22.4,
          udlY: 0.5,
        }),
      );

      // 6. Wall Cross Braces
      results.set(
        'm_wall_brace1',
        this.evaluateMember('m_wall_brace1', 'Wall Cross Brace 1', 'Brace', 7.5, 'L 75x75x6', 'S355', {
          length: 7.5,
          axialStart: 42.8,
          axialEnd: 42.8,
          udlY: 0.2,
        }),
      );
    } else if (preset === 'space_truss') {
      // Space truss chords & diagonals (mainly axial)
      for (let i = 0; i < 4; i++) {
        // Bottom chords (Tension)
        results.set(
          `m_bchord_L_${i}`,
          this.evaluateMember(`m_bchord_L_${i}`, `BotChord-L${i}`, 'Truss', 3.0, 'CHS 168.3x8', 'S355', {
            length: 3.0,
            axialStart: 185.0 + i * 40.0,
            axialEnd: 185.0 + i * 40.0,
            udlY: 0.8,
          }),
        );
        results.set(
          `m_bchord_R_${i}`,
          this.evaluateMember(`m_bchord_R_${i}`, `BotChord-R${i}`, 'Truss', 3.0, 'CHS 168.3x8', 'S355', {
            length: 3.0,
            axialStart: 185.0 + i * 40.0,
            axialEnd: 185.0 + i * 40.0,
            udlY: 0.8,
          }),
        );
      }

      // Top chords (Compression)
      for (let i = 0; i < 3; i++) {
        results.set(
          `m_tchord_L_${i}`,
          this.evaluateMember(`m_tchord_L_${i}`, `TopChord-L${i}`, 'Truss', 3.0, 'CHS 168.3x8', 'S355', {
            length: 3.0,
            axialStart: -245.0,
            axialEnd: -245.0,
            udlY: 0.8,
          }),
        );
        results.set(
          `m_tchord_R_${i}`,
          this.evaluateMember(`m_tchord_R_${i}`, `TopChord-R${i}`, 'Truss', 3.0, 'CHS 168.3x8', 'S355', {
            length: 3.0,
            axialStart: -245.0,
            axialEnd: -245.0,
            udlY: 0.8,
          }),
        );
      }

      // Web diagonals (Tension / Compression alternating)
      for (let i = 0; i < 4; i++) {
        results.set(
          `m_diag_L1_${i}`,
          this.evaluateMember(`m_diag_L1_${i}`, `Diag-L1-${i}`, 'Truss', 3.5, 'CHS 114.3x5', 'S355', {
            length: 3.5,
            axialStart: (i % 2 === 0 ? 82.5 : -76.0),
            axialEnd: (i % 2 === 0 ? 82.5 : -76.0),
            udlY: 0.3,
          }),
        );
      }
    } else {
      // Building with slabs: primary floor girders (6m span, UDL 22 kN/m from tributary slab)
      for (let floor = 1; floor <= 2; floor++) {
        for (let bay = 1; bay <= 2; bay++) {
          const id = `m_b_x_${floor}_${bay}_0`;
          results.set(
            id,
            this.evaluateMember(id, `Girder-F${floor}-B${bay}`, 'Beam', 6.0, 'W16x31', 'A992', {
              length: 6.0,
              axialStart: -12.0,
              axialEnd: -12.0,
              udlY: 26.5,
              startMoments: { Mz: -78.0 },
              endMoments: { Mz: -78.0 },
              pointLoads: [{ x: 3.0, Py: 18.0 }],
            }),
          );
        }

        // Columns
        for (let col = 0; col < 6; col++) {
          const id = `m_c_${floor}_${col}`;
          results.set(
            id,
            this.evaluateMember(id, `Column-F${floor}-C${col}`, 'Column', 3.5, 'W12x65', 'A992', {
              length: 3.5,
              axialStart: -180.0 * (3 - floor),
              axialEnd: -175.0 * (3 - floor),
              udlY: 4.2,
              startMoments: { Mz: 42.0 },
              endMoments: { Mz: -38.0 },
            }),
          );
        }
      }
    }

    return results;
  }
}
