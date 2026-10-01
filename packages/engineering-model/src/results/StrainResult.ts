/**
 * BeamLab B1.4 — Member Strain Results
 */

export interface StationStrainResult {
  readonly position: number; // [0.0, 1.0]
  readonly distance: number; // [m]
  readonly axialStrain: number; // dimensionless (m/m)
  readonly bendingStrainTop: number;
  readonly bendingStrainBottom: number;
  readonly shearStrain: number; // radians
  readonly equivalentStrain: number;
}

export interface MemberStrainSeries {
  readonly memberId: string;
  readonly stations: StationStrainResult[];
  readonly peakEquivalentStrain: number;
}

export function createMemberStrainSeries(
  memberId: string,
  stations: StationStrainResult[],
): MemberStrainSeries {
  let peakEquivalentStrain = 0;
  for (const st of stations) {
    if (Math.abs(st.equivalentStrain) > peakEquivalentStrain) {
      peakEquivalentStrain = Math.abs(st.equivalentStrain);
    }
  }
  return {
    memberId,
    stations,
    peakEquivalentStrain,
  };
}
