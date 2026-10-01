/**
 * BeamLab B1.4 — Comprehensive Member Result
 */

import { MemberForceSeries } from './ForceResult';
import { MemberMomentSeries } from './MomentResult';
import { MemberStressSeries } from './StressResult';
import { MemberStrainSeries } from './StrainResult';
import { Vector3D } from './ResultTypes';

export interface MemberDeflectionStation {
  readonly position: number; // [0.0, 1.0]
  readonly distance: number; // [m]
  readonly deflection: Vector3D; // [m] in member local coordinates (dx, dy, dz)
  readonly deflectionMagnitude: number;
}

export interface MemberDeflectionSeries {
  readonly stations: MemberDeflectionStation[];
  readonly maxDeflection: number; // [m] peak magnitude
  readonly maxDeflectionPosition: number;
}

export interface MemberResult {
  readonly memberId: string;
  readonly length: number;
  readonly forces: MemberForceSeries;
  readonly moments: MemberMomentSeries;
  readonly deflections: MemberDeflectionSeries;
  readonly stresses?: MemberStressSeries;
  readonly strains?: MemberStrainSeries;

  /** Governing extreme values for design checks */
  readonly extremes: {
    readonly maxBendingMoment: number; // |M_max| [N·m]
    readonly maxShearForce: number;    // |V_max| [N]
    readonly maxAxialForce: number;    // |P_max| [N]
    readonly maxDeflection: number;    // |delta_max| [m]
    readonly maxStress?: number;       // von Mises [Pa]
  };
}

export function createMemberResult(
  memberId: string,
  length: number,
  forces: MemberForceSeries,
  moments: MemberMomentSeries,
  deflections: MemberDeflectionSeries,
  stresses?: MemberStressSeries,
  strains?: MemberStrainSeries,
): MemberResult {
  const maxBendingMoment = Math.max(
    Math.abs(moments.maxBendingZ),
    Math.abs(moments.minBendingZ),
    Math.abs(moments.maxBendingY),
    Math.abs(moments.minBendingY),
  );

  const maxShearForce = Math.max(
    Math.abs(forces.maxShearY),
    Math.abs(forces.minShearY),
    Math.abs(forces.maxShearZ),
    Math.abs(forces.minShearZ),
  );

  const maxAxialForce = Math.max(
    Math.abs(forces.maxAxial),
    Math.abs(forces.minAxial),
  );

  return {
    memberId,
    length,
    forces,
    moments,
    deflections,
    stresses,
    strains,
    extremes: {
      maxBendingMoment,
      maxShearForce,
      maxAxialForce,
      maxDeflection: deflections.maxDeflection,
      maxStress: stresses?.peakVonMises,
    },
  };
}
