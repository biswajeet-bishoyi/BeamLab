/**
 * BeamLab B1.4 — Member Internal Force Results
 */

export interface InternalForceSection {
  /** Normalized position along member span [0.0, 1.0] */
  readonly position: number;
  /** Distance from start node along length [m] */
  readonly distance: number;
  /** Axial force: positive tension, negative compression [N] */
  readonly axial: number;
  /** Shear force along local y axis [N] */
  readonly shearY: number;
  /** Shear force along local z axis [N] */
  readonly shearZ: number;
}

export interface MemberForceSeries {
  readonly memberId: string;
  readonly stations: InternalForceSection[];
  readonly maxAxial: number;
  readonly minAxial: number;
  readonly maxShearY: number;
  readonly minShearY: number;
  readonly maxShearZ: number;
  readonly minShearZ: number;
}

export function createMemberForceSeries(
  memberId: string,
  stations: InternalForceSection[],
): MemberForceSeries {
  let maxAxial = -Infinity;
  let minAxial = Infinity;
  let maxShearY = -Infinity;
  let minShearY = Infinity;
  let maxShearZ = -Infinity;
  let minShearZ = Infinity;

  for (const st of stations) {
    if (st.axial > maxAxial) maxAxial = st.axial;
    if (st.axial < minAxial) minAxial = st.axial;
    if (st.shearY > maxShearY) maxShearY = st.shearY;
    if (st.shearY < minShearY) minShearY = st.shearY;
    if (st.shearZ > maxShearZ) maxShearZ = st.shearZ;
    if (st.shearZ < minShearZ) minShearZ = st.shearZ;
  }

  return {
    memberId,
    stations,
    maxAxial: stations.length ? maxAxial : 0,
    minAxial: stations.length ? minAxial : 0,
    maxShearY: stations.length ? maxShearY : 0,
    minShearY: stations.length ? minShearY : 0,
    maxShearZ: stations.length ? maxShearZ : 0,
    minShearZ: stations.length ? minShearZ : 0,
  };
}
