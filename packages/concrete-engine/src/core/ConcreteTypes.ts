/**
 * ConcreteTypes.ts
 *
 * Core domain types, material databases, and geometric definitions for
 * Reinforced Concrete (RC) design across ACI 318-19, Eurocode 2 (EN 1992-1-1), and IS 456.
 */

export type DesignStandard = 'ACI_318_19' | 'EUROCODE_2' | 'IS_456';

export type ConcreteGradeName =
  | 'C3000' | 'C4000' | 'C5000' | 'C6000' | 'C8000' // US Imperial / ASTM C39
  | 'C20/25' | 'C25/30' | 'C30/37' | 'C35/45' | 'C40/50' | 'C50/60' // Eurocode 2
  | 'M20' | 'M25' | 'M30' | 'M35' | 'M40' | 'M50'; // IS 456

export interface ConcreteMaterial {
  name: ConcreteGradeName;
  standard: DesignStandard;
  /** Specified compressive cylinder strength f'c / fck (MPa) */
  fc_MPa: number;
  /** Characteristic cube strength fck,cube (MPa) - for EC2 / IS 456 */
  fc_cube_MPa?: number;
  /** Modulus of Elasticity Ec (MPa) */
  Ec_MPa: number;
  /** Modulus of rupture / tensile tensile strength fr / fctm (MPa) */
  fr_MPa: number;
  /** Strain at peak compressive stress eps_c0 */
  eps_c0: number;
  /** Ultimate usable compressive strain eps_cu (e.g. 0.003 ACI, 0.0035 EC2) */
  eps_cu: number;
  /** Mass density (kg/m3) - typically 2400-2500 for normal weight */
  density_kg_m3: number;
}

export type RebarSizeName =
  // Imperial bar designations
  | '#3' | '#4' | '#5' | '#6' | '#7' | '#8' | '#9' | '#10' | '#11' | '#14' | '#18'
  // Metric bar designations
  | 'T8' | 'T10' | 'T12' | 'T16' | 'T20' | 'T25' | 'T28' | 'T32' | 'T36' | 'T40';

export interface RebarBarSize {
  name: RebarSizeName;
  /** Nominal bar diameter (mm) */
  diameter_mm: number;
  /** Nominal cross-sectional area (mm²) */
  area_mm2: number;
  /** Nominal unit mass (kg/m) */
  mass_kg_m: number;
}

export type RebarGradeName =
  | 'Grade40' | 'Grade60' | 'Grade75' | 'Grade80' // ASTM A615 / A706
  | 'B500B' | 'B500C' // EN 10080 / EC2
  | 'Fe415' | 'Fe500' | 'Fe550'; // IS 1786

export interface RebarMaterial {
  name: RebarGradeName;
  /** Specified yield strength fy or fyk (MPa) */
  fy_MPa: number;
  /** Specified ultimate tensile strength fu (MPa) */
  fu_MPa: number;
  /** Modulus of Elasticity Es (MPa) - standard 200,000 MPa */
  Es_MPa: number;
  /** Yield strain eps_y = fy / Es */
  eps_y: number;
  /** Characteristic strain at maximum force eps_uk */
  eps_uk: number;
  /** Strain hardening ratio k = (ft / fy)k */
  k_hardening: number;
}

/** Standard databases of concrete grades */
export const CONCRETE_DATABASE: Record<ConcreteGradeName, ConcreteMaterial> = {
  // US ASTM C39 / ACI 318
  C3000: {
    name: 'C3000',
    standard: 'ACI_318_19',
    fc_MPa: 20.68,
    Ec_MPa: 4700 * Math.sqrt(20.68), // 21376 MPa
    fr_MPa: 0.62 * Math.sqrt(20.68), // 2.82 MPa
    eps_c0: 0.002,
    eps_cu: 0.003,
    density_kg_m3: 2400,
  },
  C4000: {
    name: 'C4000',
    standard: 'ACI_318_19',
    fc_MPa: 27.58,
    Ec_MPa: 4700 * Math.sqrt(27.58), // 24683 MPa
    fr_MPa: 0.62 * Math.sqrt(27.58), // 3.26 MPa
    eps_c0: 0.002,
    eps_cu: 0.003,
    density_kg_m3: 2400,
  },
  C5000: {
    name: 'C5000',
    standard: 'ACI_318_19',
    fc_MPa: 34.47,
    Ec_MPa: 4700 * Math.sqrt(34.47), // 27595 MPa
    fr_MPa: 0.62 * Math.sqrt(34.47), // 3.64 MPa
    eps_c0: 0.002,
    eps_cu: 0.003,
    density_kg_m3: 2400,
  },
  C6000: {
    name: 'C6000',
    standard: 'ACI_318_19',
    fc_MPa: 41.37,
    Ec_MPa: 4700 * Math.sqrt(41.37), // 30230 MPa
    fr_MPa: 0.62 * Math.sqrt(41.37), // 3.99 MPa
    eps_c0: 0.002,
    eps_cu: 0.003,
    density_kg_m3: 2450,
  },
  C8000: {
    name: 'C8000',
    standard: 'ACI_318_19',
    fc_MPa: 55.16,
    Ec_MPa: 4700 * Math.sqrt(55.16), // 34907 MPa
    fr_MPa: 0.62 * Math.sqrt(55.16), // 4.60 MPa
    eps_c0: 0.002,
    eps_cu: 0.003,
    density_kg_m3: 2500,
  },

  // Eurocode 2 (EN 1992-1-1 Table 3.1)
  'C20/25': {
    name: 'C20/25',
    standard: 'EUROCODE_2',
    fc_MPa: 20.0,
    fc_cube_MPa: 25.0,
    Ec_MPa: 30000,
    fr_MPa: 2.2, // fctm
    eps_c0: 0.002, // eps_c2
    eps_cu: 0.0035, // eps_cu2
    density_kg_m3: 2450,
  },
  'C25/30': {
    name: 'C25/30',
    standard: 'EUROCODE_2',
    fc_MPa: 25.0,
    fc_cube_MPa: 30.0,
    Ec_MPa: 31000,
    fr_MPa: 2.6,
    eps_c0: 0.002,
    eps_cu: 0.0035,
    density_kg_m3: 2450,
  },
  'C30/37': {
    name: 'C30/37',
    standard: 'EUROCODE_2',
    fc_MPa: 30.0,
    fc_cube_MPa: 37.0,
    Ec_MPa: 33000,
    fr_MPa: 2.9,
    eps_c0: 0.002,
    eps_cu: 0.0035,
    density_kg_m3: 2450,
  },
  'C35/45': {
    name: 'C35/45',
    standard: 'EUROCODE_2',
    fc_MPa: 35.0,
    fc_cube_MPa: 45.0,
    Ec_MPa: 34000,
    fr_MPa: 3.2,
    eps_c0: 0.002,
    eps_cu: 0.0035,
    density_kg_m3: 2450,
  },
  'C40/50': {
    name: 'C40/50',
    standard: 'EUROCODE_2',
    fc_MPa: 40.0,
    fc_cube_MPa: 50.0,
    Ec_MPa: 35000,
    fr_MPa: 3.5,
    eps_c0: 0.002,
    eps_cu: 0.0035,
    density_kg_m3: 2500,
  },
  'C50/60': {
    name: 'C50/60',
    standard: 'EUROCODE_2',
    fc_MPa: 50.0,
    fc_cube_MPa: 60.0,
    Ec_MPa: 37000,
    fr_MPa: 4.1,
    eps_c0: 0.002,
    eps_cu: 0.0035,
    density_kg_m3: 2500,
  },

  // Indian Standard IS 456:2000
  M20: {
    name: 'M20',
    standard: 'IS_456',
    fc_MPa: 20.0,
    fc_cube_MPa: 20.0,
    Ec_MPa: 5000 * Math.sqrt(20.0), // 22360 MPa
    fr_MPa: 0.7 * Math.sqrt(20.0), // 3.13 MPa
    eps_c0: 0.002,
    eps_cu: 0.0035,
    density_kg_m3: 2500,
  },
  M25: {
    name: 'M25',
    standard: 'IS_456',
    fc_MPa: 25.0,
    fc_cube_MPa: 25.0,
    Ec_MPa: 5000 * Math.sqrt(25.0), // 25000 MPa
    fr_MPa: 0.7 * Math.sqrt(25.0), // 3.50 MPa
    eps_c0: 0.002,
    eps_cu: 0.0035,
    density_kg_m3: 2500,
  },
  M30: {
    name: 'M30',
    standard: 'IS_456',
    fc_MPa: 30.0,
    fc_cube_MPa: 30.0,
    Ec_MPa: 5000 * Math.sqrt(30.0), // 27386 MPa
    fr_MPa: 0.7 * Math.sqrt(30.0), // 3.83 MPa
    eps_c0: 0.002,
    eps_cu: 0.0035,
    density_kg_m3: 2500,
  },
  M35: {
    name: 'M35',
    standard: 'IS_456',
    fc_MPa: 35.0,
    fc_cube_MPa: 35.0,
    Ec_MPa: 5000 * Math.sqrt(35.0), // 29580 MPa
    fr_MPa: 0.7 * Math.sqrt(35.0), // 4.14 MPa
    eps_c0: 0.002,
    eps_cu: 0.0035,
    density_kg_m3: 2500,
  },
  M40: {
    name: 'M40',
    standard: 'IS_456',
    fc_MPa: 40.0,
    fc_cube_MPa: 40.0,
    Ec_MPa: 5000 * Math.sqrt(40.0), // 31622 MPa
    fr_MPa: 0.7 * Math.sqrt(40.0), // 4.43 MPa
    eps_c0: 0.002,
    eps_cu: 0.0035,
    density_kg_m3: 2500,
  },
  M50: {
    name: 'M50',
    standard: 'IS_456',
    fc_MPa: 50.0,
    fc_cube_MPa: 50.0,
    Ec_MPa: 5000 * Math.sqrt(50.0), // 35355 MPa
    fr_MPa: 0.7 * Math.sqrt(50.0), // 4.95 MPa
    eps_c0: 0.002,
    eps_cu: 0.0035,
    density_kg_m3: 2500,
  },
};

/** Standard database of rebar sizes */
export const REBAR_DATABASE: Record<RebarSizeName, RebarBarSize> = {
  // US Imperial
  '#3': { name: '#3', diameter_mm: 9.53, area_mm2: 71.3, mass_kg_m: 0.560 },
  '#4': { name: '#4', diameter_mm: 12.70, area_mm2: 126.7, mass_kg_m: 0.994 },
  '#5': { name: '#5', diameter_mm: 15.88, area_mm2: 198.0, mass_kg_m: 1.552 },
  '#6': { name: '#6', diameter_mm: 19.05, area_mm2: 285.0, mass_kg_m: 2.235 },
  '#7': { name: '#7', diameter_mm: 22.23, area_mm2: 387.9, mass_kg_m: 3.042 },
  '#8': { name: '#8', diameter_mm: 25.40, area_mm2: 506.7, mass_kg_m: 3.973 },
  '#9': { name: '#9', diameter_mm: 28.65, area_mm2: 645.0, mass_kg_m: 5.060 },
  '#10': { name: '#10', diameter_mm: 32.26, area_mm2: 819.0, mass_kg_m: 6.404 },
  '#11': { name: '#11', diameter_mm: 35.81, area_mm2: 1006.0, mass_kg_m: 7.907 },
  '#14': { name: '#14', diameter_mm: 43.00, area_mm2: 1452.0, mass_kg_m: 11.38 },
  '#18': { name: '#18', diameter_mm: 57.33, area_mm2: 2581.0, mass_kg_m: 20.24 },

  // Metric
  T8: { name: 'T8', diameter_mm: 8.0, area_mm2: 50.3, mass_kg_m: 0.395 },
  T10: { name: 'T10', diameter_mm: 10.0, area_mm2: 78.5, mass_kg_m: 0.617 },
  T12: { name: 'T12', diameter_mm: 12.0, area_mm2: 113.1, mass_kg_m: 0.888 },
  T16: { name: 'T16', diameter_mm: 16.0, area_mm2: 201.1, mass_kg_m: 1.58 },
  T20: { name: 'T20', diameter_mm: 20.0, area_mm2: 314.2, mass_kg_m: 2.47 },
  T25: { name: 'T25', diameter_mm: 25.0, area_mm2: 490.9, mass_kg_m: 3.85 },
  T28: { name: 'T28', diameter_mm: 28.0, area_mm2: 615.8, mass_kg_m: 4.83 },
  T32: { name: 'T32', diameter_mm: 32.0, area_mm2: 804.2, mass_kg_m: 6.31 },
  T36: { name: 'T36', diameter_mm: 36.0, area_mm2: 1017.9, mass_kg_m: 7.99 },
  T40: { name: 'T40', diameter_mm: 40.0, area_mm2: 1256.6, mass_kg_m: 9.86 },
};

/** Standard database of rebar steel grades */
export const REBAR_GRADES: Record<RebarGradeName, RebarMaterial> = {
  Grade40: {
    name: 'Grade40',
    fy_MPa: 275.8,
    fu_MPa: 413.7,
    Es_MPa: 200000,
    eps_y: 275.8 / 200000,
    eps_uk: 0.09,
    k_hardening: 1.25,
  },
  Grade60: {
    name: 'Grade60',
    fy_MPa: 413.7,
    fu_MPa: 620.5,
    Es_MPa: 200000,
    eps_y: 413.7 / 200000,
    eps_uk: 0.075,
    k_hardening: 1.20,
  },
  Grade75: {
    name: 'Grade75',
    fy_MPa: 517.1,
    fu_MPa: 689.5,
    Es_MPa: 200000,
    eps_y: 517.1 / 200000,
    eps_uk: 0.06,
    k_hardening: 1.15,
  },
  Grade80: {
    name: 'Grade80',
    fy_MPa: 551.6,
    fu_MPa: 724.0,
    Es_MPa: 200000,
    eps_y: 551.6 / 200000,
    eps_uk: 0.05,
    k_hardening: 1.15,
  },
  B500B: {
    name: 'B500B',
    fy_MPa: 500.0,
    fu_MPa: 540.0,
    Es_MPa: 200000,
    eps_y: 500.0 / 200000,
    eps_uk: 0.05,
    k_hardening: 1.08,
  },
  B500C: {
    name: 'B500C',
    fy_MPa: 500.0,
    fu_MPa: 575.0,
    Es_MPa: 200000,
    eps_y: 500.0 / 200000,
    eps_uk: 0.075,
    k_hardening: 1.15,
  },
  Fe415: {
    name: 'Fe415',
    fy_MPa: 415.0,
    fu_MPa: 485.0,
    Es_MPa: 200000,
    eps_y: 415.0 / 200000,
    eps_uk: 0.08,
    k_hardening: 1.12,
  },
  Fe500: {
    name: 'Fe500',
    fy_MPa: 500.0,
    fu_MPa: 545.0,
    Es_MPa: 200000,
    eps_y: 500.0 / 200000,
    eps_uk: 0.05,
    k_hardening: 1.08,
  },
  Fe550: {
    name: 'Fe550',
    fy_MPa: 550.0,
    fu_MPa: 585.0,
    Es_MPa: 200000,
    eps_y: 550.0 / 200000,
    eps_uk: 0.05,
    k_hardening: 1.06,
  },
};

/** Individual discrete concrete fiber in cross-section */
export interface ConcreteFiber {
  id: number;
  /** Centroid X relative to geometric origin (mm) */
  x_mm: number;
  /** Centroid Y relative to geometric origin (mm) */
  y_mm: number;
  /** Fiber cross-sectional area (mm²) */
  area_mm2: number;
  /** Flag for confined core vs unconfined cover concrete */
  isConfined: boolean;
}

/** Individual discrete steel rebar fiber in cross-section */
export interface RebarFiber {
  id: number;
  /** Bar center X (mm) */
  x_mm: number;
  /** Bar center Y (mm) */
  y_mm: number;
  /** Bar size designation */
  barSize: RebarSizeName;
  /** Bar area (mm²) */
  area_mm2: number;
  /** Bar diameter (mm) */
  diameter_mm: number;
  /** Rebar material grade */
  material: RebarMaterial;
  /** Role/Layer name: 'top', 'bottom', 'web_skin', 'corner', 'tie' */
  role?: string;
}

/** Section Resultant Force Vector */
export interface SectionResultantForce {
  /** Axial force P (kN) - Positive = Compression, Negative = Tension */
  P_kN: number;
  /** Bending moment Mx about X-axis (kNm) */
  Mx_kNm: number;
  /** Bending moment My about Y-axis (kNm) */
  My_kNm: number;
  /** Extreme concrete compressive strain eps_c */
  eps_c: number;
  /** Extreme steel tensile strain eps_s (at furthest rebar) */
  eps_s: number;
  /** Neutral axis angle theta (radians) */
  theta_rad: number;
  /** Neutral axis depth c (mm) normal to neutral axis */
  c_depth_mm: number;
}

/** Transparent step in engineering derivation */
export interface ConcreteCalculationStep {
  title: string;
  codeClause: string;
  formulaLatex: string;
  substitutionLatex: string;
  resultLatex: string;
  status: 'PASS' | 'FAIL' | 'INFO';
}

/** General limit state verification record */
export interface ConcreteLimitStateResult {
  limitStateName: string;
  codeClause: string;
  nominalCapacity: number;
  designCapacity: number;
  appliedDemand: number;
  utilization: number;
  units: string;
  governing: boolean;
  status: 'PASS' | 'FAIL';
  description: string;
}
