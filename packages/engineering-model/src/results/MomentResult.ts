/**
 * BeamLab B1.4 — Member Internal Moment Results
 */

export interface InternalMomentSection {
  /** Normalized position along member span [0.0, 1.0] */
  readonly position: number;
  /** Distance from start node along length [m] */
  readonly distance: number;
  /** Torsional moment about longitudinal axis [N·m] */
  readonly torsion: number;
  /** Bending moment about local y axis [N·m] */
  readonly momentY: number;
  /** Bending moment about local z axis [N·m] */
  readonly momentZ: number;
}

export interface MemberMomentSeries {
  readonly memberId: string;
  readonly stations: InternalMomentSection[];
  readonly maxBendingZ: number;
  readonly minBendingZ: number;
  readonly maxBendingY: number;
  readonly minBendingY: number;
  readonly maxTorsion: number;
  readonly minTorsion: number;
}

export function createMemberMomentSeries(
  memberId: string,
  stations: InternalMomentSection[],
): MemberMomentSeries {
  let maxBendingZ = -Infinity;
  let minBendingZ = Infinity;
  let maxBendingY = -Infinity;
  let minBendingY = Infinity;
  let maxTorsion = -Infinity;
  let minTorsion = Infinity;

  for (const st of stations) {
    if (st.momentZ > maxBendingZ) maxBendingZ = st.momentZ;
    if (st.momentZ < minBendingZ) minBendingZ = st.momentZ;
    if (st.momentY > maxBendingY) maxBendingY = st.momentY;
    if (st.momentY < minBendingY) minBendingY = st.momentY;
    if (st.torsion > maxTorsion) maxTorsion = st.torsion;
    if (st.torsion < minTorsion) minTorsion = st.torsion;
  }

  return {
    memberId,
    stations,
    maxBendingZ: stations.length ? maxBendingZ : 0,
    minBendingZ: stations.length ? minBendingZ : 0,
    maxBendingY: stations.length ? maxBendingY : 0,
    minBendingY: stations.length ? minBendingY : 0,
    maxTorsion: stations.length ? maxTorsion : 0,
    minTorsion: stations.length ? minTorsion : 0,
  };
}
