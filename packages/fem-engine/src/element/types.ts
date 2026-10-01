/**
 * Plate, Shell & Finite Element Continuum Types
 * BeamLab Sprint B19.1 — MITC4 Mindlin-Reissner Formulation
 */

export interface FEMNode3D {
  id: string;
  x: number;
  y: number;
  z: number;
}

export interface ShellMaterial {
  id: string;
  name: string;
  elasticModulus: number; // E (Pa)
  poissonRatio: number; // nu (dimensionless, e.g. 0.20 for concrete, 0.30 for steel)
  shearModulus?: number; // G = E / (2 * (1 + nu)) (Pa)
  density: number; // kg/m^3
}

export interface ShellSection {
  id: string;
  name: string;
  thickness: number; // t (meters)
  shearCorrectionFactor?: number; // kappa (default 5/6 = 0.8333 for isotropic rectangular cross-section)
}

export interface LocalCoordinateFrame {
  origin: [number, number, number];
  localX: [number, number, number]; // Unit vector along edge 1-2
  localY: [number, number, number]; // In-plane unit vector normal to localX
  localZ: [number, number, number]; // Out-of-plane normal unit vector
}

export interface QuadShellElementResult {
  elementId: string;
  nodeIds: [string, string, string, string];
  surfaceArea: number; // m^2
  localFrame: LocalCoordinateFrame;
  membraneStiffnessK: number[][]; // 8x8 local membrane
  bendingStiffnessK: number[][]; // 12x12 local MITC4 bending & shear
  localStiffness24x24: number[][]; // 24x24 local (including drilling DOF)
  transformationMatrix24x24: number[][]; // 24x24 coordinate rotation
  globalStiffness24x24: number[][]; // 24x24 global stiffness
}

export interface ShellInternalForces {
  /** In-plane membrane normal force N_xx (N/m) */
  nxx: number;
  /** In-plane membrane normal force N_yy (N/m) */
  nyy: number;
  /** In-plane membrane shear force N_xy (N/m) */
  nxy: number;
  /** Out-of-plane bending moment M_xx (Nm/m) */
  mxx: number;
  /** Out-of-plane bending moment M_yy (Nm/m) */
  myy: number;
  /** Out-of-plane twisting moment M_xy (Nm/m) */
  mxy: number;
  /** Transverse out-of-plane shear force Q_x / V_x (N/m) */
  vx: number;
  /** Transverse out-of-plane shear force Q_y / V_y (N/m) */
  vy: number;
}
