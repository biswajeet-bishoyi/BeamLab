/**
 * BeamLab B1.4 — Member Stress Results
 */

export interface StationStressResult {
  readonly position: number; // [0.0, 1.0]
  readonly distance: number; // [m]
  readonly axialStress: number; // [Pa = N/m^2]
  readonly bendingStressTop: number; // [Pa]
  readonly bendingStressBottom: number; // [Pa]
  readonly shearStress: number; // [Pa]
  readonly vonMisesMax: number; // [Pa]
}

export interface MemberStressSeries {
  readonly memberId: string;
  readonly stations: StationStressResult[];
  readonly peakVonMises: number;
  readonly peakAxialStress: number;
  readonly peakBendingStress: number;
  readonly peakShearStress: number;
}

export function createMemberStressSeries(
  memberId: string,
  stations: StationStressResult[],
): MemberStressSeries {
  let peakVonMises = 0;
  let peakAxialStress = 0;
  let peakBendingStress = 0;
  let peakShearStress = 0;

  for (const st of stations) {
    if (Math.abs(st.vonMisesMax) > peakVonMises) peakVonMises = Math.abs(st.vonMisesMax);
    if (Math.abs(st.axialStress) > peakAxialStress) peakAxialStress = Math.abs(st.axialStress);
    const maxBending = Math.max(Math.abs(st.bendingStressTop), Math.abs(st.bendingStressBottom));
    if (maxBending > peakBendingStress) peakBendingStress = maxBending;
    if (Math.abs(st.shearStress) > peakShearStress) peakShearStress = Math.abs(st.shearStress);
  }

  return {
    memberId,
    stations,
    peakVonMises,
    peakAxialStress,
    peakBendingStress,
    peakShearStress,
  };
}
