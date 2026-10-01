/**
 * Structural Steel Connection Design Domain Types & Primitives
 * Conforms to AISC 360-16 (Specification for Structural Steel Buildings) Chapter J
 * and Eurocode 3 EN 1993-1-8 (Design of Joints).
 */

export type DesignStandard = 'AISC_360_16' | 'EUROCODE_3';
export type DesignMethod = 'LRFD' | 'ASD';

export type BoltGrade = 'A325' | 'A490' | 'GRADE_4_6' | 'GRADE_8_8' | 'GRADE_10_9';

export interface BoltProperties {
  grade: BoltGrade;
  yieldStrength_MPa: number;      // f_yb or f_y
  ultimateStrength_MPa: number;   // f_ub or F_u
  nominalTensileStrength_MPa: number; // F_nt (AISC Table J3.2)
  nominalShearStrengthThreadsIncluded_MPa: number; // F_nv (threads included - N)
  nominalShearStrengthThreadsExcluded_MPa: number; // F_nv (threads excluded - X)
}

export type HoleType = 'STANDARD' | 'OVERSIZED' | 'SHORT_SLOT' | 'LONG_SLOT';

export type ThreadCondition = 'INCLUDED' | 'EXCLUDED';

export type SlipSurfaceClass = 'CLASS_A' | 'CLASS_B' | 'CLASS_C';

export type WeldType = 'FILLET' | 'CJP' | 'PJP';

export type WeldElectrode = 'E60XX' | 'E70XX' | 'E80XX';

export interface WeldProperties {
  electrode: WeldElectrode;
  tensileStrength_MPa: number; // F_EXX (415, 485, 550 MPa)
}

export interface SteelGradeProperties {
  name: string;
  yieldStrength_MPa: number; // F_y or f_y
  ultimateStrength_MPa: number; // F_u or f_u
  elasticModulus_MPa: number; // E = 200000 or 205000 MPa
  shearModulus_MPa: number; // G = 77000 to 81000 MPa
}

export interface Point2D {
  x: number; // mm
  y: number; // mm
}

export interface BoltInstance {
  id: string;
  x_mm: number;
  y_mm: number;
  diameter_mm: number;
  grossArea_mm2: number;
  tensileStressArea_mm2: number;
}

export interface BoltPattern {
  bolts: BoltInstance[];
  rows: number;
  cols: number;
  pitchY_mm: number;
  gageX_mm: number;
  edgeDistanceX_mm: number; // e_2
  edgeDistanceY_mm: number; // e_1
}

export interface CalculationStep {
  equationName: string;
  latexFormula: string;
  substitutedValues: string;
  resultValue: number;
  unit: string;
  citation: string;
  pass: boolean;
  utilization?: number;
}

export interface LimitStateResult {
  limitState: string;
  capacity_kN: number;
  demand_kN: number;
  utilization: number;
  pass: boolean;
  governingClause: string;
  steps: CalculationStep[];
}

export interface ConnectionDemand {
  shearForceY_kN: number;
  shearForceZ_kN?: number;
  axialForce_kN: number;
  bendingMomentZ_kNm: number;
  bendingMomentY_kNm?: number;
  torsion_kNm?: number;
}

export interface FilletWeldDefinition {
  id: string;
  legSize_mm: number; // w
  length_mm: number;  // L
  throat_mm?: number; // a = 0.7071 * w
  electrode: WeldElectrode;
  startPoint: Point2D;
  endPoint: Point2D;
  loadAngle_deg?: number; // theta: angle of load vector relative to longitudinal weld axis
}

export const BOLT_DATABASE: Record<BoltGrade, BoltProperties> = {
  A325: {
    grade: 'A325',
    yieldStrength_MPa: 635,
    ultimateStrength_MPa: 825,
    nominalTensileStrength_MPa: 620, // 90 ksi
    nominalShearStrengthThreadsIncluded_MPa: 372, // 54 ksi
    nominalShearStrengthThreadsExcluded_MPa: 469, // 68 ksi
  },
  A490: {
    grade: 'A490',
    yieldStrength_MPa: 895,
    ultimateStrength_MPa: 1035,
    nominalTensileStrength_MPa: 780, // 113 ksi
    nominalShearStrengthThreadsIncluded_MPa: 469, // 68 ksi
    nominalShearStrengthThreadsExcluded_MPa: 579, // 84 ksi
  },
  GRADE_4_6: {
    grade: 'GRADE_4_6',
    yieldStrength_MPa: 240,
    ultimateStrength_MPa: 400,
    nominalTensileStrength_MPa: 300,
    nominalShearStrengthThreadsIncluded_MPa: 160,
    nominalShearStrengthThreadsExcluded_MPa: 200,
  },
  GRADE_8_8: {
    grade: 'GRADE_8_8',
    yieldStrength_MPa: 640,
    ultimateStrength_MPa: 800,
    nominalTensileStrength_MPa: 600,
    nominalShearStrengthThreadsIncluded_MPa: 380,
    nominalShearStrengthThreadsExcluded_MPa: 480,
  },
  GRADE_10_9: {
    grade: 'GRADE_10_9',
    yieldStrength_MPa: 900,
    ultimateStrength_MPa: 1000,
    nominalTensileStrength_MPa: 750,
    nominalShearStrengthThreadsIncluded_MPa: 475,
    nominalShearStrengthThreadsExcluded_MPa: 600,
  },
};

export const STANDARD_BOLT_GEOMETRY: Record<number, { grossArea_mm2: number; tensileStressArea_mm2: number; standardHole_mm: number }> = {
  12: { grossArea_mm2: 113.1, tensileStressArea_mm2: 84.3, standardHole_mm: 13 },
  16: { grossArea_mm2: 201.1, tensileStressArea_mm2: 157.0, standardHole_mm: 18 },
  20: { grossArea_mm2: 314.2, tensileStressArea_mm2: 245.0, standardHole_mm: 22 },
  22: { grossArea_mm2: 380.1, tensileStressArea_mm2: 303.0, standardHole_mm: 24 },
  24: { grossArea_mm2: 452.4, tensileStressArea_mm2: 353.0, standardHole_mm: 26 },
  27: { grossArea_mm2: 572.6, tensileStressArea_mm2: 459.0, standardHole_mm: 30 },
  30: { grossArea_mm2: 706.9, tensileStressArea_mm2: 561.0, standardHole_mm: 33 },
  36: { grossArea_mm2: 1017.9, tensileStressArea_mm2: 817.0, standardHole_mm: 39 },
};

export const WELD_DATABASE: Record<WeldElectrode, WeldProperties> = {
  E60XX: { electrode: 'E60XX', tensileStrength_MPa: 415 },
  E70XX: { electrode: 'E70XX', tensileStrength_MPa: 485 },
  E80XX: { electrode: 'E80XX', tensileStrength_MPa: 550 },
};

export const STEEL_DATABASE: Record<string, SteelGradeProperties> = {
  A36: { name: 'ASTM A36', yieldStrength_MPa: 250, ultimateStrength_MPa: 400, elasticModulus_MPa: 200000, shearModulus_MPa: 77000 },
  A572_50: { name: 'ASTM A572 Gr 50', yieldStrength_MPa: 345, ultimateStrength_MPa: 450, elasticModulus_MPa: 200000, shearModulus_MPa: 77000 },
  A992: { name: 'ASTM A992', yieldStrength_MPa: 345, ultimateStrength_MPa: 450, elasticModulus_MPa: 200000, shearModulus_MPa: 77000 },
  S275: { name: 'EN 10025-2 S275', yieldStrength_MPa: 275, ultimateStrength_MPa: 430, elasticModulus_MPa: 210000, shearModulus_MPa: 81000 },
  S355: { name: 'EN 10025-2 S355', yieldStrength_MPa: 355, ultimateStrength_MPa: 510, elasticModulus_MPa: 210000, shearModulus_MPa: 81000 },
  S460: { name: 'EN 10025-2 S460', yieldStrength_MPa: 460, ultimateStrength_MPa: 540, elasticModulus_MPa: 210000, shearModulus_MPa: 81000 },
};
