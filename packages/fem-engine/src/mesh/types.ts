/**
 * 2D/3D Surface Mesh & Bandwidth Optimization Types
 * BeamLab Sprint B19.2 — Structured Quads & Reverse Cuthill-McKee
 */

import { FEMNode3D } from '../element/types';

export interface SurfaceQuadElement {
  id: string;
  nodeIds: [string, string, string, string];
  center: [number, number, number];
  area: number;
}

export interface PlanarPolygonBoundary {
  id: string;
  outline: [number, number][]; // Outer perimeter vertices in CCW order
  openings?: [number, number][][]; // Optional interior voids / cutouts
  targetElementSize: number; // Nominal mesh edge length (m)
  hardPoints?: [number, number][]; // Column anchor points that must be exact nodes
}

export interface SurfaceMeshModel {
  id: string;
  nodes: FEMNode3D[];
  elements: SurfaceQuadElement[];
  bandwidthBeforeRCM: number;
  bandwidthAfterRCM: number;
  nodeMapping: Record<string, string>; // originalId -> renumberedId
  totalArea: number;
}
