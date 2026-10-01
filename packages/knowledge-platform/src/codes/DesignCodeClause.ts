/**
 * BeamLab Sprint B6.1 — Codified Design Knowledge Model
 * Unified schema for international structural design codes (Eurocode, AISC, IS).
 */

export type DesignStandard =
  | 'EUROCODE_3'
  | 'EUROCODE_8'
  | 'AISC_360_16'
  | 'ASCE_7_16'
  | 'IS_800_2007';

export type LimitState =
  | 'ULTIMATE_STRENGTH'
  | 'SERVICEABILITY'
  | 'STABILITY_BUCKLING'
  | 'SEISMIC_DUCTILITY'
  | 'FATIGUE';

export type StructuralActionType =
  | 'AXIAL_TENSION'
  | 'AXIAL_COMPRESSION'
  | 'MAJOR_FLEXURE'
  | 'MINOR_FLEXURE'
  | 'SHEAR'
  | 'TORSION'
  | 'COMBINED_P_M'
  | 'LATERAL_TORSIONAL_BUCKLING'
  | 'DEFLECTION';

export interface ClauseEquationVariable {
  symbol: string;
  name: string;
  unit: string;
  description: string;
  defaultValue?: number;
}

export interface ClauseEquation {
  id: string;
  latex: string;
  description: string;
  variables: ClauseEquationVariable[];
}

export interface CodeClause {
  clauseId: string; // e.g. 'EC3_6_2_5', 'AISC_F2', 'IS800_8_2'
  standard: DesignStandard;
  sectionNumber: string; // e.g. '6.2.5', 'F2', '8.2.1'
  title: string;
  description: string;
  limitState: LimitState;
  applicableActions: StructuralActionType[];
  equations: ClauseEquation[];
  crossReferences: string[];
  safetyFactors: Record<string, number>; // e.g. { gamma_M0: 1.0, gamma_M1: 1.0 } or { phi: 0.90 }
  keywords: string[];
}
