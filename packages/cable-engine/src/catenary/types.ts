/**
 * Cable Strand Domain & Tension Structures Type Definitions
 * BeamLab Sprint B18.1 — Catenary & Tension Geometry Core
 */

export interface CableMaterial {
  id: string;
  name: string;
  elasticModulus: number; // Pa (typically ~165-210 GPa for structural strand / wire rope)
  density: number; // kg/m^3 (typically ~7850 kg/m^3)
  tensileStrength: number; // Pa (f_u, typically 1570 - 1860 MPa)
  yieldStrength: number; // Pa (f_y, typically 0.85 * f_u)
  thermalExpansionCoefficient: number; // 1/K (typically 1.2e-5)
  fillFactor?: number; // Ratio of net steel area to gross circumscribed area (0.75 - 0.90 for locked coil)
}

export interface CableCrossSection {
  id: string;
  name: string;
  diameter: number; // m
  metallicArea: number; // m^2 (net steel area)
  unitWeight: number; // N/m (self-weight per meter length = metallicArea * density * g)
  breakingLoad: number; // N (minimum breaking load MBL / F_uk)
}

export interface CableSupportNode {
  id: string;
  x: number; // m (longitudinal chord axis)
  y: number; // m (vertical elevation)
  z?: number; // m (transverse horizontal axis)
  type: 'fixed_anchor' | 'pylon_saddle' | 'clevis_pin' | 'stay_anchor';
}

export interface CatenaryProfileResult {
  span: number; // m (horizontal distance between supports)
  levelDifference: number; // m (h = y_B - y_A)
  chordLength: number; // m (hypot(span, levelDifference))
  chordAngleRad: number; // rad
  horizontalTension: number; // N (H)
  maxTension: number; // N (T_max at highest support)
  minTension: number; // N (T_min at lowest point/vertex)
  tensionAtStart: number; // N (T_A)
  tensionAtEnd: number; // N (T_B)
  verticalReactionStart: number; // N (V_A upward)
  verticalReactionEnd: number; // N (V_B upward)
  sag: number; // m (maximum vertical distance between chord and cable curve)
  sagRatio: number; // sag / span
  catenaryParameter: number; // m (c = H / w)
  vertexX: number; // m (location of lowest point relative to start support)
  vertexY: number; // m (elevation of lowest point)
  stressedLength: number; // m (actual curve arc length L_s)
  elasticElongation: number; // m (stretch delta_L under tension)
  unstressedLength: number; // m (manufacturing cutting length L_0 = L_s - delta_L)
  stations: CableProfileStation[];
}

export interface CableProfileStation {
  x: number; // m
  y: number; // m
  z: number; // m
  arcLengthFromStart: number; // m (s)
  tangentAngleRad: number; // rad (slope angle dy/dx)
  tension: number; // N (local resultant tension T(x) = sqrt(H^2 + V(x)^2))
  horizontalTension: number; // N (H)
  verticalShear: number; // N (V(x))
}

export interface StandardCableStrandCatalog {
  strandType: 'parallel_wire_strand' | 'locked_coil_rope' | 'structural_spiral_strand' | 'seven_wire_pc_strand';
  diameters: number[]; // mm
  standardMaterials: CableMaterial[];
}
