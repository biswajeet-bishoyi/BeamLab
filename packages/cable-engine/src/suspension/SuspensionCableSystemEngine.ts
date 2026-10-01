/**
 * Suspension Bridge Cable System Engine
 * BeamLab Sprint B18.4 — Main Cable, Hangers & Tower Saddles
 */

import {
  SuspensionBridgeGeometryInput,
  SuspensionSystemProfileResult,
  SuspenderHangerResult,
  TowerSaddleResult,
} from './types';

export class SuspensionCableSystemEngine {
  /**
   * Solves the complete static equilibrium of a suspension bridge cable system
   * including main cable catenary profile, suspender hanger forces/lengths,
   * tower saddle horizontal thrust/unbalance, and sliding safety factor.
   */
  public static solveSuspensionSystem(
    input: SuspensionBridgeGeometryInput
  ): SuspensionSystemProfileResult {
    const L = input.mainSpanLength;
    const f = input.mainSpanSag;
    if (L <= 0 || f <= 0) {
      throw new Error('Main span length and sag must be strictly positive.');
    }

    const qDeck = input.deckDeadLoadPerMeter;
    const wCable = input.mainCableSection.unitWeight;
    const qTotal = qDeck + wCable;

    // Horizontal tension in main span cable (exact parabolic/shallow catenary equilibrium)
    const H = (qTotal * L * L) / (8 * f);

    // Stressed arc length of main cable: L_s = L * (1 + 8/3 * (f/L)^2 - 32/5 * (f/L)^4)
    const sagRatio = f / L;
    const arcLengthMain = L * (1 + (8 / 3) * Math.pow(sagRatio, 2) - (32 / 5) * Math.pow(sagRatio, 4));

    // Tower 1 & 2 heights (averaging for symmetric elevation baseline)
    const Ht1 = input.tower1HeightAboveDeck;
    const Ht2 = input.tower2HeightAboveDeck;
    const minClearanceAboveDeck = 2.0; // Minimum clearance between cable vertex and deck at midspan (m)

    // Main span slope at tower saddles
    const tanThetaMain1 = (4 * f) / L + (Ht1 - Ht2) / L;
    const thetaMain1 = Math.atan(Math.abs(tanThetaMain1));
    const tanThetaMain2 = (4 * f) / L - (Ht1 - Ht2) / L;
    const thetaMain2 = Math.atan(Math.abs(tanThetaMain2));

    const tensionMainSaddle1 = H / Math.cos(thetaMain1);
    const tensionMainSaddle2 = H / Math.cos(thetaMain2);
    const maxMainTension = Math.max(tensionMainSaddle1, tensionMainSaddle2);
    const minMainTension = H;

    // Discretize suspender hangers
    const s = input.hangerSpacing;
    const numHangers = Math.max(1, Math.floor(L / s) - 1);
    const hangers: SuspenderHangerResult[] = [];
    const Eh = input.hangerMaterial.elasticModulus;
    const Ah = input.hangerSection.metallicArea;
    const hangerFpu = input.hangerMaterial.tensileStrength;

    let totalHangerWeight = 0;

    for (let k = 1; k <= numHangers; k++) {
      const x = k * s;
      // Cable elevation relative to deck: y(x) = Ht1 - (Ht1 - Ht2)*(x/L) - 4*f*(x/L)*(1 - x/L)
      const towerSlopeY = Ht1 - (Ht1 - Ht2) * (x / L);
      const sagY = 4 * f * (x / L) * (1 - x / L);
      const cableElevation = towerSlopeY - sagY;
      const deckElevation = 0; // Baseline deck at y = 0
      const stressedLength = Math.max(minClearanceAboveDeck, cableElevation - deckElevation);

      // Tributary deck dead load on hanger
      const hangerTension = qDeck * s;
      const hangerStress = hangerTension / Ah;
      const elasticElongation = (hangerTension * stressedLength) / (Eh * Ah);
      const unstressedLength = stressedLength - elasticElongation;

      // Cable band clamping safety factor
      // Clamping friction: F_clamp = mu * N_bolts (e.g. 4 x M24 Grade 10.9 bolts ~ 800 kN normal clamping)
      const boltPreload = 800_000; // 800 kN nominal clamping force
      const clampMu = 0.25;
      const clampResistance = clampMu * boltPreload;
      const clampSF = clampResistance / hangerTension;

      hangers.push({
        id: `HGR-${String(k).padStart(2, '0')}`,
        index: k,
        stationX: x,
        mainCableY: cableElevation,
        deckY: deckElevation,
        unstressedLength,
        stressedLength,
        tension: hangerTension,
        stress: hangerStress,
        stressRatioGuts: hangerStress / hangerFpu,
        elasticElongation,
        clampSlippingSafetyFactor: clampSF,
      });

      totalHangerWeight += stressedLength * input.hangerSection.unitWeight;
    }

    // Side span saddles equilibrium
    const Rs = input.saddleRadius ?? 5.0; // 5 meter saddle radius
    const muSaddle = input.saddleFrictionCoeff ?? 0.15;

    // Saddle 1 (Tower 1 / Side Span 1)
    const Ls1 = input.sideSpan1Length;
    const tanThetaSide1 = Ht1 / Ls1;
    const thetaSide1 = Math.atan(tanThetaSide1);
    const tensionSideSaddle1 = H / Math.cos(thetaSide1);
    const wrapAngle1 = thetaMain1 + thetaSide1;
    const vertThrust1 = tensionMainSaddle1 * Math.sin(thetaMain1) + tensionSideSaddle1 * Math.sin(thetaSide1);
    const horizUnbalance1 = Math.abs(tensionSideSaddle1 * Math.cos(thetaSide1) - tensionMainSaddle1 * Math.cos(thetaMain1));
    const tensionRatio1 = Math.max(tensionSideSaddle1, tensionMainSaddle1) / Math.min(tensionSideSaddle1, tensionMainSaddle1);
    const maxAllowableRatio1 = Math.exp(muSaddle * wrapAngle1);
    const slipSF1 = maxAllowableRatio1 / tensionRatio1;
    const bearingPressure1 = (vertThrust1 / (2 * Rs * input.mainCableSection.diameter)) / 1000; // kPa

    const saddle1: TowerSaddleResult = {
      towerId: 'TOWER-1',
      towerHeight: Ht1,
      mainSpanTensionAtSaddle: tensionMainSaddle1,
      sideSpanTensionAtSaddle: tensionSideSaddle1,
      mainSpanSlopeAngleRad: thetaMain1,
      sideSpanSlopeAngleRad: thetaSide1,
      totalWrapAngleRad: wrapAngle1,
      horizontalUnbalance: horizUnbalance1,
      verticalTowerThrust: vertThrust1,
      saddleSlippingSafetyFactor: slipSF1,
      saddleRadius: Rs,
      bearingPressureKPa: bearingPressure1,
    };

    // Saddle 2 (Tower 2 / Side Span 2)
    const Ls2 = input.sideSpan2Length;
    const tanThetaSide2 = Ht2 / Ls2;
    const thetaSide2 = Math.atan(tanThetaSide2);
    const tensionSideSaddle2 = H / Math.cos(thetaSide2);
    const wrapAngle2 = thetaMain2 + thetaSide2;
    const vertThrust2 = tensionMainSaddle2 * Math.sin(thetaMain2) + tensionSideSaddle2 * Math.sin(thetaSide2);
    const horizUnbalance2 = Math.abs(tensionSideSaddle2 * Math.cos(thetaSide2) - tensionMainSaddle2 * Math.cos(thetaMain2));
    const tensionRatio2 = Math.max(tensionSideSaddle2, tensionMainSaddle2) / Math.min(tensionSideSaddle2, tensionMainSaddle2);
    const maxAllowableRatio2 = Math.exp(muSaddle * wrapAngle2);
    const slipSF2 = maxAllowableRatio2 / tensionRatio2;
    const bearingPressure2 = (vertThrust2 / (2 * Rs * input.mainCableSection.diameter)) / 1000; // kPa

    const saddle2: TowerSaddleResult = {
      towerId: 'TOWER-2',
      towerHeight: Ht2,
      mainSpanTensionAtSaddle: tensionMainSaddle2,
      sideSpanTensionAtSaddle: tensionSideSaddle2,
      mainSpanSlopeAngleRad: thetaMain2,
      sideSpanSlopeAngleRad: thetaSide2,
      totalWrapAngleRad: wrapAngle2,
      horizontalUnbalance: horizUnbalance2,
      verticalTowerThrust: vertThrust2,
      saddleSlippingSafetyFactor: slipSF2,
      saddleRadius: Rs,
      bearingPressureKPa: bearingPressure2,
    };

    const totalCableWeight = arcLengthMain * wCable;
    const mainCableFactorOfSafety = input.mainCableSection.breakingLoad / maxMainTension;

    return {
      bridgeId: input.id,
      mainHorizontalTension: H,
      mainSpanArcLength: arcLengthMain,
      hangers,
      saddles: [saddle1, saddle2],
      totalMainCableWeight: totalCableWeight,
      totalHangerWeight,
      maxMainCableTension: maxMainTension,
      minMainCableTension: minMainTension,
      mainCableFactorOfSafety,
    };
  }
}
