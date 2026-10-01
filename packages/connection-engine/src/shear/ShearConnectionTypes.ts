/**
 * Structural Steel Shear Connection Types & Configuration Models
 * Supports Single Plate (Shear Tab / Fin Plate) and Double Web Angle connections
 * per AISC 360-16 Chapter J / AISC 15th Ed. Manual Part 10 and Eurocode 3 EN 1993-1-8.
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

export type ShearConnectionType = 'SINGLE_PLATE' | 'DOUBLE_ANGLE';

export type SupportType = 'COLUMN_FLANGE' | 'COLUMN_WEB' | 'GIRDER_WEB';

export interface BeamSectionGeometry {
  id: string;
  name: string;
  depth_mm: number;           // d
  flangeWidth_mm: number;     // b_f
  flangeThickness_mm: number; // t_f
  webThickness_mm: number;    // t_w
  rootRadius_mm?: number;     // k_des or r
  yieldStrength_MPa: number;  // F_y
  ultimateStrength_MPa: number; // F_u
}

export interface CopedBeamGeometry {
  isTopCoped: boolean;
  topCopeDepth_mm?: number;    // d_ct
  topCopeLength_mm?: number;   // c_t
  isBottomCoped: boolean;
  bottomCopeDepth_mm?: number; // d_cb
  bottomCopeLength_mm?: number; // c_b
}

export interface SinglePlateConfig {
  connectionId: string;
  supportType: SupportType;
  // Plate parameters
  plateThickness_mm: number;  // t_p
  plateHeight_mm: number;     // h_p (length along beam web)
  plateWidth_mm: number;      // w_p
  plateFy_MPa: number;
  plateFu_MPa: number;
  
  // Bolt layout
  boltGrade: BoltGrade;
  boltDiameter_mm: number;
  boltRows: number;           // Number of vertical bolt rows (typically 2 to 12)
  boltColumns: number;        // Typically 1 (standard) or 2 (double line)
  pitchY_mm: number;          // Vertical spacing p (typically 75 mm / 3 in)
  gageX_mm?: number;          // Horizontal spacing g (for 2-column tabs, typically 75 mm)
  edgeDistanceTop_mm: number; // Vertical edge distance e_v (typically 32 to 40 mm / 1.25 to 1.5 in)
  edgeDistanceSide_mm: number;// Horizontal edge distance e_h (typically 32 to 40 mm)
  threadCondition: ThreadCondition;
  holeType: HoleType;
  
  // Distance from weld line (support face) to first bolt center line
  weldToBoltLine_a_mm: number; // 'a' dimension: <= 89 mm (3.5 in) for conventional, > 89 mm for extended
  
  // Weld to support (double fillet weld)
  weldLeg_mm: number;         // Fillet weld size w (typically 6 mm to 10 mm)
  weldElectrode: WeldElectrode;
  
  // Supported beam
  beam: BeamSectionGeometry;
  cope?: CopedBeamGeometry;
}

export interface DoubleAngleConfig {
  connectionId: string;
  supportType: SupportType;
  
  // Angle profile
  angleLeg1_mm: number;       // Leg attached to beam web
  angleLeg2_mm: number;       // Outstanding leg attached to support
  angleThickness_mm: number;  // t_a
  angleLength_mm: number;     // L_a
  angleFy_MPa: number;
  angleFu_MPa: number;
  
  // Fasteners in beam web (double shear)
  webBoltGrade: BoltGrade;
  webBoltDiameter_mm: number;
  webBoltRows: number;
  webBoltPitch_mm: number;
  webEdgeDistanceTop_mm: number;
  webEdgeDistanceEnd_mm: number; // Distance from beam end to bolt line
  
  // Fasteners / weld to support
  supportFastenerType: 'BOLTED' | 'WELDED';
  supportBoltGrade?: BoltGrade;
  supportBoltDiameter_mm?: number;
  supportBoltGage_mm?: number;
  supportWeldLeg_mm?: number;
  supportWeldElectrode?: WeldElectrode;
  
  // Supported beam
  beam: BeamSectionGeometry;
  cope?: CopedBeamGeometry;
}

export interface ShearConnectionEvaluation {
  connectionId: string;
  connectionType: ShearConnectionType;
  standard: DesignStandard;
  method: DesignMethod;
  designShearCapacity_kN: number;
  appliedShearDemand_kN: number;
  utilization: number;
  pass: boolean;
  governingLimitState: string;
  isConventionalTab?: boolean;
  limitStateResults: LimitStateResult[];
}
