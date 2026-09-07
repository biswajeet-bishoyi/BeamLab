/**
 * Column Base Plate Domain Types & Specifications
 * Conforms to AISC Design Guide 1 (2nd Ed.): Base Plate and Anchor Rod Design
 * and ACI 318 / AISC 360-16 Chapter J.
 */

import { LimitStateResult, DesignStandard, DesignMethod } from '../core/ConnectionTypes';

export type AnchorRodGrade = 'F1554_GR36' | 'F1554_GR55' | 'F1554_GR105' | 'A307' | 'A325';

export interface AnchorRodProperties {
  grade: AnchorRodGrade;
  yieldStrength_MPa: number;
  ultimateStrength_MPa: number;
  nominalTensileStrength_MPa: number; // F_nt
  nominalShearStrength_MPa: number;   // F_nv
}

export const ANCHOR_ROD_DATABASE: Record<AnchorRodGrade, AnchorRodProperties> = {
  F1554_GR36: {
    grade: 'F1554_GR36',
    yieldStrength_MPa: 250,
    ultimateStrength_MPa: 400,
    nominalTensileStrength_MPa: 310, // 45 ksi
    nominalShearStrength_MPa: 186,   // 27 ksi
  },
  F1554_GR55: {
    grade: 'F1554_GR55',
    yieldStrength_MPa: 380,
    ultimateStrength_MPa: 515,
    nominalTensileStrength_MPa: 400, // 58 ksi
    nominalShearStrength_MPa: 240,
  },
  F1554_GR105: {
    grade: 'F1554_GR105',
    yieldStrength_MPa: 725,
    ultimateStrength_MPa: 860,
    nominalTensileStrength_MPa: 650, // 94 ksi
    nominalShearStrength_MPa: 390,
  },
  A307: {
    grade: 'A307',
    yieldStrength_MPa: 250,
    ultimateStrength_MPa: 415,
    nominalTensileStrength_MPa: 310,
    nominalShearStrength_MPa: 186,
  },
  A325: {
    grade: 'A325',
    yieldStrength_MPa: 635,
    ultimateStrength_MPa: 825,
    nominalTensileStrength_MPa: 620,
    nominalShearStrength_MPa: 372,
  },
};

export interface ColumnBasePlateConfig {
  connectionId: string;
  // Plate parameters
  plateLength_N_mm: number;   // N: dimension parallel to column depth d
  plateWidth_B_mm: number;    // B: dimension parallel to column flanges bf
  plateThickness_mm: number;  // t_p
  plateFy_MPa: number;
  plateFu_MPa: number;

  // Supported column
  columnDepth_d_mm: number;   // d
  columnFlangeWidth_bf_mm: number; // b_f
  columnFlangeThickness_tf_mm: number; // t_f
  columnWebThickness_tw_mm: number;    // t_w

  // Concrete foundation
  concreteStrength_fc_MPa: number; // f'_c
  pedestalLength_Nped_mm?: number; // Concrete footing/pedestal length
  pedestalWidth_Bped_mm?: number;  // Concrete footing/pedestal width

  // Anchor rods
  anchorGrade: AnchorRodGrade;
  anchorDiameter_mm: number;   // d_a
  anchorTensionRows: number;   // Typically 1 or 2 rows on tension side
  anchorsPerRow: number;       // Typically 2 (total 4 or 8 anchors)
  anchorDistanceToEdge_mm: number; // Distance from anchor centerline to plate edge
  anchorDistanceToColumn_mm?: number;

  // Friction coefficient between steel base plate and concrete / grout
  frictionCoefficient?: number; // mu (default 0.45 per AISC DG 1)
}

export interface ColumnBasePlateEvaluation {
  connectionId: string;
  standard: DesignStandard;
  method: DesignMethod;
  axialDemand_Pu_kN: number;
  momentDemand_Mu_kNm: number;
  shearDemand_Vu_kN: number;
  eccentricity_e_mm: number;
  criticalEccentricity_ecrit_mm: number;
  isLargeEccentricity: boolean;
  bearingLength_Y_mm: number;
  anchorTensionDemand_kN: number;
  requiredPlateThickness_mm: number;
  actualPlateThickness_mm: number;
  governingLimitState: string;
  pass: boolean;
  limitStateResults: LimitStateResult[];
}
