import type { Length, Force, ForcePerLength } from '../units/brands';

export interface Point2D {
  x: Length;
  y: Length;
}

export type SupportType = 'pin' | 'roller' | 'fixed';

export interface Support {
  id: string;
  type: SupportType;
  position: Length; // Distance from x=0
}

export type LoadType = 'point' | 'distributed' | 'moment';

export interface PointLoad {
  id: string;
  type: 'point';
  position: Length;
  magnitude: Force; // Negative is downward in SI
}

export interface DistributedLoad {
  id: string;
  type: 'distributed';
  startPosition: Length;
  endPosition: Length;
  magnitude: ForcePerLength;
}

export type StructuralLoad = PointLoad | DistributedLoad;

export interface Material {
  id: string;
  name: string;
  E: number; // Young's Modulus (Pa)
  density: number; // kg/m^3
}

export interface CrossSection {
  id: string;
  name: string;
  area: number; // m^2
  momentOfInertia: number; // m^4
  height: number; // m
}

export interface StructuralModel {
  span: Length;
  supports: Support[];
  loads: StructuralLoad[];
  material: Material;
  section: CrossSection;
}
