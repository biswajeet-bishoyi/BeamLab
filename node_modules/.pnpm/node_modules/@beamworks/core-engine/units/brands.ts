// Brand trick for TS to ensure unit safety
declare const __brand: unique symbol;
export type Brand<K, T> = K & { [__brand]: T };

export type Length = Brand<number, 'Length'>; // meters (m)
export type Force = Brand<number, 'Force'>; // newtons (N)
export type Moment = Brand<number, 'Moment'>; // newton-meters (N·m)
export type ForcePerLength = Brand<number, 'ForcePerLength'>; // N/m
export type Stress = Brand<number, 'Stress'>; // pascals (Pa)

// Helper functions for SI conversion at boundaries
export const toLength = (valueInMeters: number): Length => valueInMeters as Length;
export const toForce = (valueInNewtons: number): Force => valueInNewtons as Force;
export const toMoment = (valueInNm: number): Moment => valueInNm as Moment;
export const toForcePerLength = (value: number): ForcePerLength => value as ForcePerLength;
export const toStress = (valueInPa: number): Stress => valueInPa as Stress;
