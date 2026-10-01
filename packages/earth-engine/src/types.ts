/**
 * Earth Retaining Structures & Deep Excavation Engine - Core Types
 * @packageDocumentation
 */

export interface SoilLayer {
  id: string;
  name: string;
  depthTop: number; // m from ground surface
  depthBottom: number; // m from ground surface
  unitWeight: number; // kN/m³ (total unit weight)
  saturatedUnitWeight?: number; // kN/m³ (if below water table, defaults to unitWeight)
  frictionAngle: number; // degrees (phi)
  cohesion: number; // kPa (c)
  dilationAngle?: number; // degrees (psi)
  atRestKo?: number; // manual Ko or computed via Jaky's formula (1 - sin phi)
  undrainedShearStrength?: number; // kPa (cu) for total stress clay analysis
}

export interface GroundWaterTable {
  depth: number; // m below ground surface
  unitWeightWater?: number; // kN/m³, defaults to 9.81
}

export type SurchargeType = 'uniform' | 'line' | 'strip';

export interface SurchargeLoad {
  id: string;
  type: SurchargeType;
  magnitude: number; // kPa for uniform/strip, kN/m for line
  distanceFromWall: number; // m from back of wall (x or x1)
  width?: number; // m (for strip load: x2 = distanceFromWall + width)
}

export interface WallGeometryParams {
  height: number; // m (total height of retaining wall / excavation)
  stemTopWidth?: number; // m
  stemBottomWidth?: number; // m
  baseWidth?: number; // m (toe + stemBottom + heel)
  baseThickness?: number; // m
  toeWidth?: number; // m
  heelWidth?: number; // m
  backfillSlopeAngle?: number; // degrees (beta: inclination of backfill slope above horizontal)
  wallBackFaceAngle?: number; // degrees (theta: wall inclination from horizontal, 90 = vertical)
  wallFrictionAngle?: number; // degrees (delta: soil-wall friction angle, typically 0.5 ~ 0.67 phi)
}

export interface PressurePoint {
  depth: number; // m from ground surface
  effectiveVerticalStress: number; // kPa (sigma'_v)
  porePressure: number; // kPa (u)
  activeHorizontalStress: number; // kPa (sigma'_a,h)
  passiveHorizontalStress: number; // kPa (sigma'_p,h)
  atRestHorizontalStress: number; // kPa (sigma'_0,h)
  surchargeHorizontalStress: number; // kPa (delta sigma_h)
  totalActiveHorizontalStress: number; // kPa (sigma_a,h + u + delta sigma_h)
}

export interface EarthPressureCoefficients {
  Ka: number; // Active earth pressure coefficient
  Kp: number; // Passive earth pressure coefficient
  Ko: number; // At-rest earth pressure coefficient
}

export interface LateralPressureResult {
  coefficients: EarthPressureCoefficients;
  tensionCrackDepth: number; // m
  pressureProfile: PressurePoint[];
  totalActiveForce: number; // kN/m
  activeForceLineOfAction: number; // m from base of wall
  activeMomentAboutBase: number; // kN·m/m
  totalPassiveForce: number; // kN/m
  passiveForceLineOfAction: number; // m from base
  passiveMomentAboutBase: number; // kN·m/m
  totalSurchargeForce: number; // kN/m
  surchargeLineOfAction: number; // m from base
  totalWaterForce: number; // kN/m
  waterLineOfAction: number; // m from base
}
