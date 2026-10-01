/**
 * Suspension Bridge Cable System Engine Types
 * BeamLab Sprint B18.4 — Main Cable, Hangers & Tower Saddles
 */

import { CableCrossSection, CableMaterial } from '../catenary/types';

export interface SuspensionBridgeGeometryInput {
  id: string;
  name: string;
  mainSpanLength: number; // L_main (m)
  sideSpan1Length: number; // L_side1 (m)
  sideSpan2Length: number; // L_side2 (m)
  mainSpanSag: number; // f_main (m)
  tower1HeightAboveDeck: number; // H_tower1 (m)
  tower2HeightAboveDeck: number; // H_tower2 (m)
  deckDeadLoadPerMeter: number; // q_deck (N/m)
  hangerSpacing: number; // spacing between suspenders (m)
  mainCableSection: CableCrossSection;
  mainCableMaterial: CableMaterial;
  hangerSection: CableCrossSection;
  hangerMaterial: CableMaterial;
  saddleRadius?: number; // Tower saddle curvature radius R_s (m, default 5m)
  saddleFrictionCoeff?: number; // Friction coefficient mu (default 0.15)
}

export interface SuspenderHangerResult {
  id: string;
  index: number;
  stationX: number; // Longitudinal position from Tower 1 (m)
  mainCableY: number; // Elevation of cable clamp (m)
  deckY: number; // Elevation of deck pin (m)
  unstressedLength: number; // Fabricated length L_0 (m)
  stressedLength: number; // In-situ length L_s (m)
  tension: number; // Axial tension P_k (N)
  stress: number; // Stress sigma (Pa)
  stressRatioGuts: number; // sigma / f_pu
  elasticElongation: number; // delta L (m)
  clampSlippingSafetyFactor: number;
}

export interface TowerSaddleResult {
  towerId: string;
  towerHeight: number; // m
  mainSpanTensionAtSaddle: number; // N
  sideSpanTensionAtSaddle: number; // N
  mainSpanSlopeAngleRad: number; // theta_main
  sideSpanSlopeAngleRad: number; // theta_side
  totalWrapAngleRad: number; // theta_wrap = theta_main + theta_side
  horizontalUnbalance: number; // Delta H = H_side - H_main (N)
  verticalTowerThrust: number; // Total vertical downward force on tower pier (N)
  saddleSlippingSafetyFactor: number; // Euler-Eytelwein slipping check
  saddleRadius: number; // m
  bearingPressureKPa: number; // Radial contact pressure on saddle groove (kPa)
}

export interface SuspensionSystemProfileResult {
  bridgeId: string;
  mainHorizontalTension: number; // H (N)
  mainSpanArcLength: number; // m
  hangers: SuspenderHangerResult[];
  saddles: [TowerSaddleResult, TowerSaddleResult]; // Tower 1 & Tower 2 saddles
  totalMainCableWeight: number; // N
  totalHangerWeight: number; // N
  maxMainCableTension: number; // N (at tower top)
  minMainCableTension: number; // N (at midspan vertex)
  mainCableFactorOfSafety: number;
}
