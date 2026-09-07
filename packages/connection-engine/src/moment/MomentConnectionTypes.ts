/**
 * Moment Connection Domain Types & Specifications
 * Covers Flush and Extended (4-Bolt, 8-Bolt) End-Plate Moment Connections
 * per AISC Design Guide 4, AISC Design Guide 16, AISC 358-16, AISC 360-16, and Eurocode 3 EN 1993-1-8.
 */

import {
  BoltGrade,
  WeldElectrode,
  DesignStandard,
  DesignMethod,
  LimitStateResult,
  ThreadCondition,
  HoleType,
} from '../core/ConnectionTypes';
import { BeamSectionGeometry } from '../shear/ShearConnectionTypes';

export type EndPlateType =
  | 'FLUSH'         // Bolts inside tension flange only (AISC DG 16)
  | 'EXTENDED_4E'   // 4-bolt unstiffened extended end-plate (1 row outside, 1 row inside tension flange)
  | 'EXTENDED_4ES'  // 4-bolt stiffened extended end-plate (with rib/gusset stiffener)
  | 'EXTENDED_8ES'; // 8-bolt stiffened extended end-plate (2 rows outside, 2 rows inside)

export interface ColumnSectionGeometry {
  id: string;
  name: string;
  depth_mm: number;           // d_c
  flangeWidth_mm: number;     // b_cf
  flangeThickness_mm: number; // t_cf
  webThickness_mm: number;    // t_cw
  rootRadius_mm: number;      // k_c or k_des
  yieldStrength_MPa: number;  // F_yc
  ultimateStrength_MPa: number; // F_uc
}

export interface EndPlateConfig {
  connectionId: string;
  endPlateType: EndPlateType;
  
  // End-plate plate parameters
  plateThickness_mm: number;  // t_p
  plateWidth_mm: number;      // b_p
  plateHeight_mm: number;     // h_p
  plateFy_MPa: number;
  plateFu_MPa: number;
  
  // Bolt layout
  boltGrade: BoltGrade;
  boltDiameter_mm: number;
  gageX_mm: number;           // g: horizontal distance between bolt vertical lines (typically 100 to 140 mm)
  pitchFlangeInside_mm: number; // p_fi: pitch from inside face of tension flange to inside bolt line (typically 38 to 50 mm)
  pitchFlangeOutside_mm?: number; // p_fo: pitch from outside face of tension flange to outside bolt line (for extended tabs, 38 to 50 mm)
  pitchOuterRows_mm?: number; // p_b: pitch between outside bolt rows (for 8ES)
  threadCondition: ThreadCondition;
  holeType: HoleType;
  
  // Connected members
  beam: BeamSectionGeometry;
  column: ColumnSectionGeometry;
  
  // Weld of beam to end-plate
  flangeWeldType: 'CJP' | 'FILLET';
  flangeFilletLeg_mm?: number;
  webWeldLeg_mm: number;
  weldElectrode: WeldElectrode;
  
  // Stiffeners & reinforcement (if present)
  hasContinuityPlates?: boolean;
  continuityPlateThickness_mm?: number;
  hasWebDoublerPlate?: boolean;
  webDoublerThickness_mm?: number;
  hasEndPlateStiffener?: boolean;
  stiffenerThickness_mm?: number;
  stiffenerLength_mm?: number;
}

export interface MomentConnectionEvaluation {
  connectionId: string;
  endPlateType: EndPlateType;
  standard: DesignStandard;
  method: DesignMethod;
  designMomentCapacity_kNm: number;
  appliedMomentDemand_kNm: number;
  designShearCapacity_kN: number;
  appliedShearDemand_kN: number;
  momentUtilization: number;
  shearUtilization: number;
  governingLimitState: string;
  pass: boolean;
  limitStateResults: LimitStateResult[];
}
