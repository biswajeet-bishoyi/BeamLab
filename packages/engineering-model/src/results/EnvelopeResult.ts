/**
 * BeamLab B1.4 — Design Envelope Results
 */

import { ExtremeType } from './ResultTypes';

export interface EnvelopeStationValue {
  readonly position: number;
  readonly distance: number;
  readonly value: number;
  /** ID of the LoadCase or LoadCombination producing this extreme */
  readonly governingCaseId: string;
}

export interface MemberEnvelopeResult {
  readonly memberId: string;
  readonly extremeType: ExtremeType;
  /** Enveloped moment stations (M_z) */
  readonly momentZ: EnvelopeStationValue[];
  /** Enveloped shear stations (V_y) */
  readonly shearY: EnvelopeStationValue[];
  /** Enveloped axial stations (P) */
  readonly axial: EnvelopeStationValue[];
  /** Governing peak values */
  readonly peakMomentZ: EnvelopeStationValue;
  readonly peakShearY: EnvelopeStationValue;
  readonly peakAxial: EnvelopeStationValue;
}

export interface NodeEnvelopeResult {
  readonly nodeId: string;
  readonly extremeType: ExtremeType;
  readonly peakDisplacementMagnitude: number;
  readonly governingDisplacementCaseId: string;
  readonly peakReactionForceMagnitude?: number;
  readonly governingReactionCaseId?: string;
}

export interface EnvelopeResult {
  readonly envelopeId: string;
  readonly name: string;
  readonly extremeType: ExtremeType;
  readonly sourceCaseIds: string[];
  readonly memberEnvelopes: Map<string, MemberEnvelopeResult>;
  readonly nodeEnvelopes: Map<string, NodeEnvelopeResult>;
}
