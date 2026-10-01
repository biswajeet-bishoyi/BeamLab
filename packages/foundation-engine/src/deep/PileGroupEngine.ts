export interface PileLocation {
  id: string;
  x_m: number;
  y_m: number;
  diameter_m?: number;
  capacity_kN?: number;
}

export interface PileGroupGridConfig {
  rows: number; // m
  cols: number; // n
  spacingX_m: number;
  spacingY_m: number;
  pileDiameter_m: number;
  singlePileCapacity_kN: number;
}

export interface PileCapDimensions {
  length_m: number;    // L in Y or X
  width_m: number;     // B
  thickness_m: number; // H_cap
  concreteStrength_MPa?: number; // default 35
  rebarYield_MPa?: number;       // default 500
  concreteCover_mm?: number;     // default 75mm
  concreteUnitWeight_kN_m3?: number; // default 24.5
}

export interface PileCapColumn {
  cx_m: number; // column dimension in X
  cy_m: number; // column dimension in Y
  x_m?: number;  // column center X (default 0)
  y_m?: number;  // column center Y (default 0)
}

export interface PileGroupLoads {
  P_kN: number;
  Mx_kNm: number;
  My_kNm: number;
  Vx_kN?: number;
  Vy_kN?: number;
}

export interface IndividualPileReaction {
  id: string;
  x_m: number;
  y_m: number;
  serviceReaction_kN: number;
  factoredReaction_kN: number;
  capacity_kN: number;
  utilizationRatio: number;
  isTension: boolean;
}

export interface PileCapDesignResult {
  pilesCount: number;
  pileDiameter_m: number;
  groupEfficiencyConverseLabarre: number;
  capSelfWeight_kN: number;
  totalServiceLoad_kN: number;
  centerOfGravityPiles: { x_m: number; y_m: number };
  pileReactions: IndividualPileReaction[];
  maxPileReaction_kN: number;
  minPileReaction_kN: number;
  governingPileUtilization: number;
  hasTensionPiles: boolean;
  
  // Structural verifications
  effectiveDepth_m: number;
  oneWayShearX: {
    criticalDistance_m: number;
    shearDemand_kN: number;
    shearCapacity_kN: number;
    dcr: number;
    pass: boolean;
  };
  oneWayShearY: {
    criticalDistance_m: number;
    shearDemand_kN: number;
    shearCapacity_kN: number;
    dcr: number;
    pass: boolean;
  };
  punchingShearColumn: {
    perimeter_m: number;
    shearDemand_kN: number;
    shearCapacity_kN: number;
    dcr: number;
    pass: boolean;
  };
  punchingShearPile: {
    perimeter_m: number;
    shearDemand_kN: number;
    shearCapacity_kN: number;
    dcr: number;
    pass: boolean;
  };
  flexureAndTies: {
    momentUx_kNm: number;
    momentUy_kNm: number;
    tensionTieX_kN: number;
    tensionTieY_kN: number;
    requiredAsX_mm2: number;
    requiredAsY_mm2: number;
    providedBarDia_mm: number;
    barsCountX: number;
    spacingX_mm: number;
    barsCountY: number;
    spacingY_mm: number;
  };
  overallPass: boolean;
}

export class PileGroupEngine {
  /**
   * Generates a regular grid of piles centered at (0, 0).
   */
  public generateGrid(config: PileGroupGridConfig): PileLocation[] {
    const piles: PileLocation[] = [];
    const totalX = (config.cols - 1) * config.spacingX_m;
    const totalY = (config.rows - 1) * config.spacingY_m;
    const startX = -totalX / 2;
    const startY = -totalY / 2;

    let count = 1;
    for (let r = 0; r < config.rows; r++) {
      const y = startY + r * config.spacingY_m;
      for (let c = 0; c < config.cols; c++) {
        const x = startX + c * config.spacingX_m;
        piles.push({
          id: `P_${count++}`,
          x_m: Number(x.toFixed(3)),
          y_m: Number(y.toFixed(3)),
          diameter_m: config.pileDiameter_m,
          capacity_kN: config.singlePileCapacity_kN,
        });
      }
    }
    return piles;
  }

  /**
   * Calculates pile group efficiency using the Converse-Labarre formula.
   * eta = 1 - theta * [(n-1)*m + (m-1)*n] / [90 * m * n]
   */
  public calculateConverseLabarreEfficiency(
    rows: number,
    cols: number,
    diameter_m: number,
    spacing_m: number
  ): number {
    if (rows <= 1 && cols <= 1) return 1.0;
    const theta = Math.atan(diameter_m / spacing_m) * (180 / Math.PI);
    const m = rows;
    const n = cols;
    const eta = 1 - (theta * ((n - 1) * m + (m - 1) * n)) / (90 * m * n);
    return Math.max(0.5, Math.min(1.0, Number(eta.toFixed(3))));
  }

  /**
   * Analyzes pile reaction distribution under rigid pile cap and designs
   * pile cap structural limit states (shear, punching, and flexure/ties).
   */
  public analyzePileGroup(
    cap: PileCapDimensions,
    column: PileCapColumn,
    piles: PileLocation[],
    loads: PileGroupLoads,
    defaultPileCapacity_kN: number = 1000,
    defaultDiameter_m: number = 0.6
  ): PileCapDesignResult {
    const N = piles.length;
    if (N === 0) {
      throw new Error('Pile group must have at least one pile.');
    }

    const fck = cap.concreteStrength_MPa ?? 35;
    const fy = cap.rebarYield_MPa ?? 500;
    const cover_m = (cap.concreteCover_mm ?? 75) / 1000;
    const gammaC = cap.concreteUnitWeight_kN_m3 ?? 24.5;
    const d = cap.thickness_m - cover_m - 0.025 / 2; // effective depth

    // 1. Pile cap weight & net reactions
    const capVolume = cap.width_m * cap.length_m * cap.thickness_m;
    const capWeight = capVolume * gammaC;
    const totalP = loads.P_kN + capWeight;

    // Center of gravity of piles
    const sumX = piles.reduce((acc, p) => acc + p.x_m, 0);
    const sumY = piles.reduce((acc, p) => acc + p.y_m, 0);
    const cgX = sumX / N;
    const cgY = sumY / N;

    // Moments about CG of piles
    const colX = column.x_m ?? 0;
    const colY = column.y_m ?? 0;
    const netMx = loads.Mx_kNm + loads.P_kN * (colY - cgY);
    const netMy = loads.My_kNm + loads.P_kN * (colX - cgX);

    // Second moments of pile positions
    let Ipx = 0;
    let Ipy = 0;
    for (const p of piles) {
      const rx = p.x_m - cgX;
      const ry = p.y_m - cgY;
      Ipx += ry * ry;
      Ipy += rx * rx;
    }

    // Individual pile reactions
    const pileReactions: IndividualPileReaction[] = piles.map(p => {
      const rx = p.x_m - cgX;
      const ry = p.y_m - cgY;

      const pFlexY = Ipy > 1e-4 ? (netMy * rx) / Ipy : 0;
      const pFlexX = Ipx > 1e-4 ? (netMx * ry) / Ipx : 0;
      const serviceP = totalP / N + pFlexY + pFlexX;
      // Factored pile load (approximate 1.4 load factor for ultimate limit state)
      const factoredP = (1.4 * loads.P_kN + 1.2 * capWeight) / N + 1.4 * pFlexY + 1.4 * pFlexX;

      const cap_kN = p.capacity_kN ?? defaultPileCapacity_kN;
      const util = cap_kN > 0 ? serviceP / cap_kN : 0;

      return {
        id: p.id,
        x_m: p.x_m,
        y_m: p.y_m,
        serviceReaction_kN: Number(serviceP.toFixed(1)),
        factoredReaction_kN: Number(factoredP.toFixed(1)),
        capacity_kN: cap_kN,
        utilizationRatio: Number(util.toFixed(3)),
        isTension: serviceP < 0,
      };
    });

    const servReactions = pileReactions.map(p => p.serviceReaction_kN);
    const maxP = Math.max(...servReactions);
    const minP = Math.min(...servReactions);
    const maxUtil = Math.max(...pileReactions.map(p => p.utilizationRatio));
    const hasTension = minP < 0;

    // Group efficiency estimation
    const avgPileDia = piles[0]?.diameter_m ?? defaultDiameter_m;
    let etaGroup = 1.0;
    if (N >= 4) {
      const sqrtN = Math.round(Math.sqrt(N));
      if (sqrtN * sqrtN === N) {
        const spanX = Math.max(...piles.map(p => p.x_m)) - Math.min(...piles.map(p => p.x_m));
        const spacing = spanX > 0 ? spanX / (sqrtN - 1) : 3 * avgPileDia;
        etaGroup = this.calculateConverseLabarreEfficiency(sqrtN, sqrtN, avgPileDia, spacing);
      }
    }

    // 2. One-way shear at d from column face
    // In X direction: critical plane at x = colX + column.cx_m / 2 + d
    const critPlaneX = colX + column.cx_m / 2 + d;
    const pilesInShearX = pileReactions.filter(p => p.x_m >= critPlaneX - 0.05);
    const VuX = pilesInShearX.reduce((acc, p) => acc + Math.max(0, p.factoredReaction_kN), 0);
    // Capacity: phi * 0.17 * sqrt(f'c) * B * d (with phi = 0.75)
    const phiVc_X = 0.75 * 0.17 * Math.sqrt(fck) * 1000 * cap.length_m * d;
    const dcrShearX = phiVc_X > 0 ? VuX / phiVc_X : 0;

    // In Y direction: critical plane at y = colY + column.cy_m / 2 + d
    const critPlaneY = colY + column.cy_m / 2 + d;
    const pilesInShearY = pileReactions.filter(p => p.y_m >= critPlaneY - 0.05);
    const VuY = pilesInShearY.reduce((acc, p) => acc + Math.max(0, p.factoredReaction_kN), 0);
    const phiVc_Y = 0.75 * 0.17 * Math.sqrt(fck) * 1000 * cap.width_m * d;
    const dcrShearY = phiVc_Y > 0 ? VuY / phiVc_Y : 0;

    // 3. Two-way punching shear around column
    // Perimeter at d/2 from column face
    const b0_col = 2 * (column.cx_m + d) + 2 * (column.cy_m + d);
    // Piles inside critical perimeter relieve punching
    const halfCritX = (column.cx_m + d) / 2;
    const halfCritY = (column.cy_m + d) / 2;
    const pilesInsidePunch = pileReactions.filter(
      p => Math.abs(p.x_m - colX) <= halfCritX && Math.abs(p.y_m - colY) <= halfCritY
    );
    const relievedReaction = pilesInsidePunch.reduce((acc, p) => acc + p.factoredReaction_kN, 0);
    const Vup_col = Math.max(0, 1.4 * loads.P_kN - relievedReaction);
    // ACI 318 punching capacity: phi * 0.33 * sqrt(f'c) * b0 * d (phi = 0.75)
    const phiVcp_col = 0.75 * 0.33 * Math.sqrt(fck) * 1000 * b0_col * d;
    const dcrPunchCol = phiVcp_col > 0 ? Vup_col / phiVcp_col : 0;

    // 4. Punching shear of individual corner/edge pile through cap
    const b0_pile = Math.PI * (avgPileDia + d);
    const maxFactoredPileP = Math.max(...pileReactions.map(p => p.factoredReaction_kN));
    const phiVcp_pile = 0.75 * 0.33 * Math.sqrt(fck) * 1000 * b0_pile * d;
    const dcrPunchPile = phiVcp_pile > 0 ? maxFactoredPileP / phiVcp_pile : 0;

    // 5. Flexural Reinforcement & Strut-and-Tie Method
    // Moments at column face:
    const colRightFaceX = colX + column.cx_m / 2;
    const pilesRightOfFace = pileReactions.filter(p => p.x_m > colRightFaceX);
    const Mux = pilesRightOfFace.reduce((acc, p) => {
      const leverArm = p.x_m - colRightFaceX;
      return acc + Math.max(0, p.factoredReaction_kN) * leverArm;
    }, 0);

    const colTopFaceY = colY + column.cy_m / 2;
    const pilesAboveFace = pileReactions.filter(p => p.y_m > colTopFaceY);
    const Muy = pilesAboveFace.reduce((acc, p) => {
      const leverArm = p.y_m - colTopFaceY;
      return acc + Math.max(0, p.factoredReaction_kN) * leverArm;
    }, 0);

    // Strut-and-Tie tension force: T = Mu / (0.9 * d)
    const jd = 0.9 * d;
    const Tx = jd > 0 ? Mux / jd : 0;
    const Ty = jd > 0 ? Muy / jd : 0;

    // Minimum flexural reinforcement rho_min = 0.0018
    const As_min_X = 0.0018 * cap.length_m * cap.thickness_m * 1e6; // mm2
    const As_min_Y = 0.0018 * cap.width_m * cap.thickness_m * 1e6;  // mm2

    const phiFlex = 0.90;
    // Required As = max(Mu / (phi * fy * jd), T / (phi * fy), As_min)
    const As_calc_X = jd > 0 ? (Mux * 1e6) / (phiFlex * fy * jd * 1000) : 0;
    const As_tie_X = (Tx * 1e3) / (phiFlex * fy);
    const reqAsX = Math.max(As_calc_X, As_tie_X, As_min_X);

    const As_calc_Y = jd > 0 ? (Muy * 1e6) / (phiFlex * fy * jd * 1000) : 0;
    const As_tie_Y = (Ty * 1e3) / (phiFlex * fy);
    const reqAsY = Math.max(As_calc_Y, As_tie_Y, As_min_Y);

    // Bar layout (using 25mm diameter bars as standard for pile caps)
    const barDia = 25;
    const singleBarArea = (Math.PI * barDia * barDia) / 4;
    const barsCountX = Math.max(4, Math.ceil(reqAsX / singleBarArea));
    const spacingX = Math.floor(((cap.length_m * 1000 - 2 * (cap.concreteCover_mm ?? 75)) / (barsCountX - 1)));

    const barsCountY = Math.max(4, Math.ceil(reqAsY / singleBarArea));
    const spacingY = Math.floor(((cap.width_m * 1000 - 2 * (cap.concreteCover_mm ?? 75)) / (barsCountY - 1)));

    const overallPass =
      maxUtil <= 1.0 &&
      dcrShearX <= 1.0 &&
      dcrShearY <= 1.0 &&
      dcrPunchCol <= 1.0 &&
      dcrPunchPile <= 1.0;

    return {
      pilesCount: N,
      pileDiameter_m: avgPileDia,
      groupEfficiencyConverseLabarre: etaGroup,
      capSelfWeight_kN: Number(capWeight.toFixed(1)),
      totalServiceLoad_kN: Number(totalP.toFixed(1)),
      centerOfGravityPiles: { x_m: Number(cgX.toFixed(3)), y_m: Number(cgY.toFixed(3)) },
      pileReactions,
      maxPileReaction_kN: Number(maxP.toFixed(1)),
      minPileReaction_kN: Number(minP.toFixed(1)),
      governingPileUtilization: Number(maxUtil.toFixed(3)),
      hasTensionPiles: hasTension,

      effectiveDepth_m: Number(d.toFixed(3)),
      oneWayShearX: {
        criticalDistance_m: Number(critPlaneX.toFixed(3)),
        shearDemand_kN: Number(VuX.toFixed(1)),
        shearCapacity_kN: Number(phiVc_X.toFixed(1)),
        dcr: Number(dcrShearX.toFixed(3)),
        pass: dcrShearX <= 1.0,
      },
      oneWayShearY: {
        criticalDistance_m: Number(critPlaneY.toFixed(3)),
        shearDemand_kN: Number(VuY.toFixed(1)),
        shearCapacity_kN: Number(phiVc_Y.toFixed(1)),
        dcr: Number(dcrShearY.toFixed(3)),
        pass: dcrShearY <= 1.0,
      },
      punchingShearColumn: {
        perimeter_m: Number(b0_col.toFixed(3)),
        shearDemand_kN: Number(Vup_col.toFixed(1)),
        shearCapacity_kN: Number(phiVcp_col.toFixed(1)),
        dcr: Number(dcrPunchCol.toFixed(3)),
        pass: dcrPunchCol <= 1.0,
      },
      punchingShearPile: {
        perimeter_m: Number(b0_pile.toFixed(3)),
        shearDemand_kN: Number(maxFactoredPileP.toFixed(1)),
        shearCapacity_kN: Number(phiVcp_pile.toFixed(1)),
        dcr: Number(dcrPunchPile.toFixed(3)),
        pass: dcrPunchPile <= 1.0,
      },
      flexureAndTies: {
        momentUx_kNm: Number(Mux.toFixed(1)),
        momentUy_kNm: Number(Muy.toFixed(1)),
        tensionTieX_kN: Number(Tx.toFixed(1)),
        tensionTieY_kN: Number(Ty.toFixed(1)),
        requiredAsX_mm2: Math.ceil(reqAsX),
        requiredAsY_mm2: Math.ceil(reqAsY),
        providedBarDia_mm: barDia,
        barsCountX,
        spacingX_mm: spacingX,
        barsCountY,
        spacingY_mm: spacingY,
      },
      overallPass,
    };
  }
}
