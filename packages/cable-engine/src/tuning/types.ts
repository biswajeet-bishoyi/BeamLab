/**
 * Stay Cable Initial Tension Optimization & Tuning Types
 * BeamLab Sprint B18.3 — Stay Force Tuning & Deck Moment Minimization
 */

import { CableStayGeometry } from '../ernst/types';
import { CableCrossSection, CableMaterial } from '../catenary/types';

export interface StayCableDefinition {
  id: string;
  name: string;
  geometry: CableStayGeometry;
  section: CableCrossSection;
  material: CableMaterial;
  deckAttachmentIndex: number; // Index in the deck node array
  towerAttachmentHeight: number; // Height on tower (m)
  minTensionRatio?: number; // Minimum tension as ratio of breaking load (default 0.15)
  maxTensionRatio?: number; // Maximum tension as ratio of breaking load (default 0.45)
}

export interface DeckStationPoint {
  id: string;
  x: number; // Longitudinal position along deck (m)
  deadLoadMoment: number; // Uncompensated dead load moment M0 (kNm)
  deadLoadDeflection: number; // Uncompensated dead load deflection d0 (m)
}

export interface StayTuningResultItem {
  cableId: string;
  optimalTension: number; // N
  optimalStress: number; // Pa
  stressRatioGuts: number; // sigma / f_pu
  breakingLoad: number; // N
  safetyFactor: number; // breakingLoad / optimalTension
  verticalLiftForce: number; // Vertical reaction component on deck (N)
  horizontalForce: number; // Horizontal component on tower (N)
}

export interface StayTuningOptimizationResult {
  converged: boolean;
  cables: StayTuningResultItem[];
  residualMoments: { x: number; originalMoment: number; compensatedMoment: number }[];
  residualDeflections: { x: number; originalDeflection: number; compensatedDeflection: number }[];
  maxMomentReductionPercent: number;
  maxDeflectionReductionPercent: number;
  totalPrestressTension: number; // Sum of all stay tensions (N)
}
