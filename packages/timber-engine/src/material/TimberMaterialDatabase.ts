/**
 * Timber material grades and orthotropic material definitions.
 * Standards supported: NDS 2024 (ANSI/AWC), Eurocode 5 (EN 1995-1-1), IS 883:1994.
 */

export type TimberStandard = 'NDS' | 'EUROCODE_5' | 'IS_883';
export type WoodCategory = 'SOFTWOOD' | 'HARDWOOD' | 'GLULAM' | 'CLT_LAM';

export interface TimberGradeDefinition {
  id: string;
  name: string;
  category: WoodCategory;
  standard: TimberStandard;
  species: string;
  /** Characteristic/mean density (kg/m³) */
  density: number;
  /** Mean elastic modulus parallel to grain E_0,mean (MPa) */
  E0_mean: number;
  /** 5th percentile characteristic elastic modulus parallel E_0,05 (MPa) */
  E0_05: number;
  /** Mean elastic modulus perpendicular to grain E_90,mean (MPa) */
  E90_mean: number;
  /** Mean shear modulus parallel G_0,mean (MPa) */
  G0_mean: number;
  /** Mean rolling shear modulus G_90,mean (MPa) */
  G90_mean: number;
  /** Characteristic bending strength f_m,k or reference Fb (MPa) */
  fm_k: number;
  /** Characteristic tensile strength parallel f_t,0,k or reference Ft (MPa) */
  ft0_k: number;
  /** Characteristic tensile strength perpendicular f_t,90,k (MPa) */
  ft90_k: number;
  /** Characteristic compressive strength parallel f_c,0,k or reference Fc (MPa) */
  fc0_k: number;
  /** Characteristic compressive strength perpendicular f_c,90,k or reference Fc_perp (MPa) */
  fc90_k: number;
  /** Characteristic shear strength f_v,k or reference Fv (MPa) */
  fv_k: number;
  /** Characteristic rolling shear strength f_r,k or f_v,90 (MPa) */
  fr_k: number;
}

export const TIMBER_GRADES_DATABASE: Record<string, TimberGradeDefinition> = {
  // ─── Eurocode 5 / EN 338 Softwood Grades ────────────────────────────────
  'C16': {
    id: 'C16',
    name: 'C16 Softwood',
    category: 'SOFTWOOD',
    standard: 'EUROCODE_5',
    species: 'European Softwood (Spruce / Pine)',
    density: 370,
    E0_mean: 8000,
    E0_05: 5400,
    E90_mean: 270,
    G0_mean: 500,
    G90_mean: 50,
    fm_k: 16.0,
    ft0_k: 8.5,
    ft90_k: 0.4,
    fc0_k: 17.0,
    fc90_k: 2.2,
    fv_k: 3.2,
    fr_k: 1.0,
  },
  'C24': {
    id: 'C24',
    name: 'C24 Structural Softwood',
    category: 'SOFTWOOD',
    standard: 'EUROCODE_5',
    species: 'European Softwood (Nordic Spruce / Pine)',
    density: 420,
    E0_mean: 11000,
    E0_05: 7400,
    E90_mean: 370,
    G0_mean: 690,
    G90_mean: 69,
    fm_k: 24.0,
    ft0_k: 14.5,
    ft90_k: 0.4,
    fc0_k: 21.0,
    fc90_k: 2.5,
    fv_k: 4.0,
    fr_k: 1.25,
  },
  'C30': {
    id: 'C30',
    name: 'C30 High-Strength Softwood',
    category: 'SOFTWOOD',
    standard: 'EUROCODE_5',
    species: 'European Larch / Douglas Fir',
    density: 460,
    E0_mean: 12000,
    E0_05: 8000,
    E90_mean: 400,
    G0_mean: 750,
    G90_mean: 75,
    fm_k: 30.0,
    ft0_k: 18.0,
    ft90_k: 0.4,
    fc0_k: 24.0,
    fc90_k: 2.7,
    fv_k: 4.0,
    fr_k: 1.4,
  },

  // ─── Eurocode 5 / EN 14080 Glued Laminated Timber (Glulam) ─────────────
  'GL24h': {
    id: 'GL24h',
    name: 'GL24h Homogeneous Glulam',
    category: 'GLULAM',
    standard: 'EUROCODE_5',
    species: 'Engineered Spruce / Fir Glulam',
    density: 420,
    E0_mean: 11500,
    E0_05: 9600,
    E90_mean: 300,
    G0_mean: 650,
    G90_mean: 65,
    fm_k: 24.0,
    ft0_k: 19.2,
    ft90_k: 0.5,
    fc0_k: 24.0,
    fc90_k: 2.5,
    fv_k: 3.5,
    fr_k: 1.2,
  },
  'GL28h': {
    id: 'GL28h',
    name: 'GL28h Homogeneous Glulam',
    category: 'GLULAM',
    standard: 'EUROCODE_5',
    species: 'Engineered Nordic Pine / Spruce',
    density: 460,
    E0_mean: 12600,
    E0_05: 10500,
    E90_mean: 300,
    G0_mean: 650,
    G90_mean: 65,
    fm_k: 28.0,
    ft0_k: 22.3,
    ft90_k: 0.5,
    fc0_k: 28.0,
    fc90_k: 2.5,
    fv_k: 3.5,
    fr_k: 1.3,
  },
  'GL32h': {
    id: 'GL32h',
    name: 'GL32h Premium Glulam',
    category: 'GLULAM',
    standard: 'EUROCODE_5',
    species: 'High-Strength Laminated Timber',
    density: 480,
    E0_mean: 14200,
    E0_05: 11800,
    E90_mean: 300,
    G0_mean: 650,
    G90_mean: 65,
    fm_k: 32.0,
    ft0_k: 25.6,
    ft90_k: 0.5,
    fc0_k: 32.0,
    fc90_k: 2.5,
    fv_k: 3.5,
    fr_k: 1.4,
  },

  // ─── Eurocode 5 / EN 338 Hardwood Grades ────────────────────────────────
  'D30': {
    id: 'D30',
    name: 'D30 Hardwood (Oak / Ash)',
    category: 'HARDWOOD',
    standard: 'EUROCODE_5',
    species: 'European Oak / Sweet Chestnut',
    density: 640,
    E0_mean: 11000,
    E0_05: 9200,
    E90_mean: 730,
    G0_mean: 690,
    G90_mean: 70,
    fm_k: 30.0,
    ft0_k: 18.0,
    ft90_k: 0.6,
    fc0_k: 24.0,
    fc90_k: 8.0,
    fv_k: 4.0,
    fr_k: 1.5,
  },

  // ─── NDS 2024 (ANSI/AWC) Sawn Lumber & Glulam ───────────────────────────
  'DF_L_No1': {
    id: 'DF_L_No1',
    name: 'Douglas Fir-Larch No. 1',
    category: 'SOFTWOOD',
    standard: 'NDS',
    species: 'Douglas Fir-Larch',
    density: 500, // Specific gravity G = 0.50
    E0_mean: 11720, // 1,700,000 psi in MPa
    E0_05: 7900,
    E90_mean: 400,
    G0_mean: 730,
    G90_mean: 73,
    fm_k: 12.1, // Fb = 1750 psi ~ 12.1 MPa
    ft0_k: 7.2,  // Ft = 1050 psi ~ 7.2 MPa
    ft90_k: 0.5,
    fc0_k: 10.3, // Fc = 1500 psi ~ 10.3 MPa
    fc90_k: 4.3, // Fc_perp = 625 psi ~ 4.3 MPa
    fv_k: 1.24, // Fv = 180 psi ~ 1.24 MPa
    fr_k: 1.1,
  },
  'SP_No2': {
    id: 'SP_No2',
    name: 'Southern Pine No. 2',
    category: 'SOFTWOOD',
    standard: 'NDS',
    species: 'Southern Yellow Pine',
    density: 550, // Specific gravity G = 0.55
    E0_mean: 9650, // 1,400,000 psi in MPa
    E0_05: 6500,
    E90_mean: 350,
    G0_mean: 600,
    G90_mean: 60,
    fm_k: 8.6,  // Fb = 1250 psi ~ 8.6 MPa
    ft0_k: 5.2,  // Ft = 750 psi ~ 5.2 MPa
    ft90_k: 0.4,
    fc0_k: 9.3,  // Fc = 1350 psi ~ 9.3 MPa
    fc90_k: 3.9, // Fc_perp = 565 psi ~ 3.9 MPa
    fv_k: 1.21, // Fv = 175 psi ~ 1.21 MPa
    fr_k: 1.0,
  },
  'Glulam_24F_1_8E': {
    id: 'Glulam_24F_1_8E',
    name: 'Glulam 24F-1.8E Stress-Rated',
    category: 'GLULAM',
    standard: 'NDS',
    species: 'Structural Glulam (Balanced / Unbalanced)',
    density: 500,
    E0_mean: 12410, // 1,800,000 psi
    E0_05: 10300,
    E90_mean: 350,
    G0_mean: 690,
    G90_mean: 69,
    fm_k: 16.5, // 2400 psi ~ 16.5 MPa
    ft0_k: 8.3,  // 1200 psi
    ft90_k: 0.5,
    fc0_k: 13.1, // 1900 psi
    fc90_k: 4.5, // 650 psi
    fv_k: 1.83, // 265 psi
    fr_k: 1.25,
  },

  // ─── IS 883:1994 Indian Timber Species ──────────────────────────────────
  'Teak': {
    id: 'Teak',
    name: 'Teak (Tectona grandis)',
    category: 'HARDWOOD',
    standard: 'IS_883',
    species: 'Indian Teak (Group A Standard)',
    density: 650,
    E0_mean: 12000,
    E0_05: 9500,
    E90_mean: 600,
    G0_mean: 750,
    G90_mean: 75,
    fm_k: 16.8, // Allowable bending: 16.8 N/mm² (inside)
    ft0_k: 10.5,
    ft90_k: 0.6,
    fc0_k: 10.5, // Compression parallel: 10.5 N/mm²
    fc90_k: 4.6,  // Compression perp: 4.6 N/mm²
    fv_k: 1.4,
    fr_k: 1.2,
  },
  'Sal': {
    id: 'Sal',
    name: 'Sal (Shorea robusta)',
    category: 'HARDWOOD',
    standard: 'IS_883',
    species: 'Indian Sal (Group A Heavy Hardwood)',
    density: 850,
    E0_mean: 12700,
    E0_05: 10200,
    E90_mean: 700,
    G0_mean: 800,
    G90_mean: 80,
    fm_k: 19.6,
    ft0_k: 12.0,
    ft90_k: 0.7,
    fc0_k: 13.7,
    fc90_k: 6.4,
    fv_k: 1.6,
    fr_k: 1.4,
  },
  'Deodar': {
    id: 'Deodar',
    name: 'Deodar (Cedrus deodara)',
    category: 'SOFTWOOD',
    standard: 'IS_883',
    species: 'Himalayan Cedar (Group B Softwood)',
    density: 560,
    E0_mean: 9500,
    E0_05: 7000,
    E90_mean: 320,
    G0_mean: 580,
    G90_mean: 58,
    fm_k: 10.5,
    ft0_k: 7.0,
    ft90_k: 0.4,
    fc0_k: 7.0,
    fc90_k: 2.8,
    fv_k: 0.9,
    fr_k: 0.8,
  },
};

/**
 * Helper to retrieve timber grade definition or default to C24.
 */
export function getTimberGrade(id: string): TimberGradeDefinition {
  const grade = TIMBER_GRADES_DATABASE[id];
  if (!grade) {
    return TIMBER_GRADES_DATABASE['C24'];
  }
  return grade;
}
