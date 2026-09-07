/**
 * WinklerSubgradeEngine.ts
 *
 * Mat/Raft Foundation and Winkler Subgrade Soil-Structure Interaction (SSI) Engine.
 * Computes modulus of subgrade reaction ks (Bowles, Vesic, Terzaghi plate scaling),
 * discretizes mat foundations into compression-only elastic spring arrays,
 * performs tension cut-off non-linear iteration, and recovers contact pressure fields
 * and angular distortion metrics.
 */

export interface MatGeometry {
  readonly width_m: number; // B (dimension along X)
  readonly length_m: number; // L (dimension along Y)
  readonly thickness_m: number; // H (mat slab thickness)
  readonly concreteE_GPa?: number; // Ec (default 30 GPa)
}

export interface MatColumnLoad {
  readonly id: string;
  readonly x_m: number; // Coordinates relative to mat center (0,0)
  readonly y_m: number;
  readonly P_kN: number; // Axial force
  readonly Mx_kNm?: number; // Moment about X
  readonly My_kNm?: number; // Moment about Y
}

export interface ModulusSubgradeReactionOptions {
  readonly method?: 'BOWLES' | 'VESIC' | 'TERZAGHI_SAND' | 'TERZAGHI_CLAY';
  readonly allowableBearingPressure_kPa?: number; // For Bowles: ks = 40 * FS * q_all
  readonly factorOfSafety?: number; // default 3.0
  readonly soilEs_MPa?: number; // For Vesic
  readonly soilPoissonRatio?: number; // default 0.3
  readonly plateKs1_kN_m3?: number; // Plate load test ks1 on 0.3m plate
}

export interface MatSpringNode {
  readonly index: number;
  readonly x_m: number;
  readonly y_m: number;
  readonly tributaryArea_m2: number;
  readonly springStiffness_kN_m: number; // Kzi = ks * Ai
  readonly settlement_mm: number; // wi
  readonly contactPressure_kPa: number; // qi = ks * wi
  readonly isUplifted: boolean; // True if tension cut-off occurred
}

export interface MatSsiResult {
  readonly modulusSubgradeReaction_kN_m3: number; // ks
  readonly totalAppliedLoad_kN: number;
  readonly matSelfWeight_kN: number;
  readonly totalReaction_kN: number;
  readonly nodes: MatSpringNode[];
  readonly maxPressure_kPa: number;
  readonly minPressure_kPa: number;
  readonly avgPressure_kPa: number;
  readonly maxSettlement_mm: number;
  readonly minSettlement_mm: number;
  readonly avgSettlement_mm: number;
  readonly differentialSettlement_mm: number;
  readonly maxAngularDistortion: number; // beta = Delta S / L
  readonly upliftAreaPercentage: number;
  readonly iterationsToConverge: number;
}

export class WinklerSubgradeEngine {
  /**
   * Computes modulus of subgrade reaction ks (kN/m3).
   */
  computeModulusSubgradeReaction(
    mat: MatGeometry,
    options: ModulusSubgradeReactionOptions = {}
  ): number {
    const method = options.method ?? 'BOWLES';
    const B = Math.min(mat.width_m, mat.length_m);

    if (method === 'BOWLES') {
      const qall = options.allowableBearingPressure_kPa ?? 200.0;
      const fs = options.factorOfSafety ?? 3.0;
      // Bowles equation: ks = 40 * FS * q_all (kN/m3)
      return Number((40 * fs * qall).toFixed(0));
    }

    if (method === 'VESIC') {
      const Es = (options.soilEs_MPa ?? 30.0) * 1000; // kPa
      const nu = options.soilPoissonRatio ?? 0.30;
      const Ec = (mat.concreteE_GPa ?? 30.0) * 1e6; // kPa
      // Mat moment of inertia per unit width: I = (1 * H^3) / 12
      const I_mat = Math.pow(mat.thickness_m, 3) / 12;
      // Vesic formula: ks = 0.65 / B * (Es * B^4 / (Ec * I))^(1/12) * [Es / (1 - nu^2)]
      const flexuralRatio = (Es * Math.pow(B, 4)) / (Ec * I_mat);
      const ks = (0.65 / B) * Math.pow(Math.max(1, flexuralRatio), 1 / 12) * (Es / (1 - nu * nu));
      return Number(ks.toFixed(0));
    }

    if (method === 'TERZAGHI_SAND') {
      const ks1 = options.plateKs1_kN_m3 ?? 40000.0;
      // Terzaghi scaling for sand: ks = ks1 * ((B + 0.3) / (2B))^2
      const ks = ks1 * Math.pow((B + 0.3) / (2 * B), 2);
      return Number(ks.toFixed(0));
    }

    // TERZAGHI_CLAY
    const ks1 = options.plateKs1_kN_m3 ?? 30000.0;
    // Terzaghi scaling for clay: ks = ks1 * (0.3 / B)
    const ks = ks1 * (0.3 / B);
    return Number(ks.toFixed(0));
  }

  /**
   * Discretizes mat and runs tension cut-off non-linear iterative soil-structure interaction.
   */
  analyzeMatFoundation(
    mat: MatGeometry,
    columnLoads: MatColumnLoad[],
    options: ModulusSubgradeReactionOptions & {
      gridDivisionsX?: number; // default 8
      gridDivisionsY?: number; // default 8
      concreteDensity_kN_m3?: number; // default 24
      maxIterations?: number; // default 15
    } = {}
  ): MatSsiResult {
    const ks = this.computeModulusSubgradeReaction(mat, options);
    const B = mat.width_m;
    const L = mat.length_m;
    const H = mat.thickness_m;
    const nx = options.gridDivisionsX ?? 8;
    const ny = options.gridDivisionsY ?? 8;
    const gammaC = options.concreteDensity_kN_m3 ?? 24.0;
    const maxIter = options.maxIterations ?? 15;

    const matSelfWeight_kN = B * L * H * gammaC;
    const totalColumnP = columnLoads.reduce((acc, c) => acc + c.P_kN, 0);
    const totalP = totalColumnP + matSelfWeight_kN;

    // Center of gravity of applied loads
    let sumPx = 0;
    let sumPy = 0;
    for (const col of columnLoads) {
      sumPx += col.P_kN * col.x_m;
      sumPy += col.P_kN * col.y_m;
    }
    const xbar = totalP > 0 ? sumPx / totalP : 0;
    const ybar = totalP > 0 ? sumPy / totalP : 0;

    // Grid spacing
    const dx = B / nx;
    const dy = L / ny;

    // Create grid nodes (coordinates from -B/2 to +B/2, -L/2 to +L/2)
    interface TempNode {
      x: number;
      y: number;
      area: number;
      active: boolean;
      settlement_m: number;
      pressure_kPa: number;
    }

    const rawNodes: TempNode[] = [];
    for (let i = 0; i <= nx; i++) {
      const x = -B / 2 + i * dx;
      for (let j = 0; j <= ny; j++) {
        const y = -L / 2 + j * dy;

        // Tributary area weighting
        const isCorner = (i === 0 || i === nx) && (j === 0 || j === ny);
        const isEdge = !isCorner && (i === 0 || i === nx || j === 0 || j === ny);
        const area = isCorner ? 0.25 * dx * dy : isEdge ? 0.5 * dx * dy : dx * dy;

        rawNodes.push({
          x,
          y,
          area,
          active: true,
          settlement_m: 0,
          pressure_kPa: 0,
        });
      }
    }

    // Tension cut-off iterative equilibrium:
    // For rigid/semi-rigid mat: w(x,y) = w0 + theta_x * (y - ybar) + theta_y * (x - xbar)
    let iter = 0;
    let converged = false;

    while (iter < maxIter && !converged) {
      iter++;

      // Active area & centroid
      let activeArea = 0;
      let activeIxx = 0;
      let activeIyy = 0;
      let activeIxy = 0;
      let activeAx = 0;
      let activeAy = 0;

      for (const node of rawNodes) {
        if (!node.active) continue;
        activeArea += node.area;
        activeAx += node.x * node.area;
        activeAy += node.y * node.area;
      }

      if (activeArea <= 0) break;

      const cX = activeAx / activeArea;
      const cY = activeAy / activeArea;

      for (const node of rawNodes) {
        if (!node.active) continue;
        const rx = node.x - cX;
        const ry = node.y - cY;
        activeIyy += rx * rx * node.area;
        activeIxx += ry * ry * node.area;
        activeIxy += rx * ry * node.area;
      }

      // Net moments about active centroid
      const netMx = totalP * (ybar - cY);
      const netMy = totalP * (xbar - cX);

      // Contact pressure distribution q(x,y) = P/A + My*rx/Iyy + Mx*ry/Ixx
      const basePressure = totalP / activeArea;
      let changedState = false;

      for (const node of rawNodes) {
        if (!node.active) {
          node.settlement_m = 0;
          node.pressure_kPa = 0;
          continue;
        }

        const rx = node.x - cX;
        const ry = node.y - cY;

        const pFlexX = activeIyy > 1e-4 ? (netMy * rx) / activeIyy : 0;
        const pFlexY = activeIxx > 1e-4 ? (netMx * ry) / activeIxx : 0;

        const q = basePressure + pFlexX + pFlexY;

        if (q < 0) {
          // Tension cut-off: deactivate spring
          node.active = false;
          node.pressure_kPa = 0;
          node.settlement_m = 0;
          changedState = true;
        } else {
          node.pressure_kPa = q;
          node.settlement_m = q / ks; // w = q / ks (m)
        }
      }

      if (!changedState) {
        converged = true;
      }
    }

    // Recover results
    const finalNodes: MatSpringNode[] = rawNodes.map((n, idx) => ({
      index: idx,
      x_m: Number(n.x.toFixed(3)),
      y_m: Number(n.y.toFixed(3)),
      tributaryArea_m2: Number(n.area.toFixed(4)),
      springStiffness_kN_m: Number((ks * n.area).toFixed(1)),
      settlement_mm: Number((n.settlement_m * 1000).toFixed(2)),
      contactPressure_kPa: Number(n.pressure_kPa.toFixed(1)),
      isUplifted: !n.active,
    }));

    const activeNodes = finalNodes.filter(n => !n.isUplifted);
    const pressures = activeNodes.map(n => n.contactPressure_kPa);
    const settlements = activeNodes.map(n => n.settlement_mm);

    const maxPressure = pressures.length > 0 ? Math.max(...pressures) : 0;
    const minPressure = finalNodes.length > 0 ? Math.min(...finalNodes.map(n => n.contactPressure_kPa)) : 0;
    const avgPressure = pressures.length > 0 ? pressures.reduce((a, b) => a + b, 0) / pressures.length : 0;

    const maxSettlement = settlements.length > 0 ? Math.max(...settlements) : 0;
    const minSettlement = finalNodes.length > 0 ? Math.min(...finalNodes.map(n => n.settlement_mm)) : 0;
    const avgSettlement = settlements.length > 0 ? settlements.reduce((a, b) => a + b, 0) / settlements.length : 0;
    const diffSettlement = maxSettlement - minSettlement;

    // Angular distortion = Delta S / diagonal length
    const matDiagonal = Math.sqrt(B * B + L * L);
    const angularDistortion = diffSettlement > 0 ? (diffSettlement / 1000) / matDiagonal : 0;

    const upliftedCount = finalNodes.filter(n => n.isUplifted).length;
    const upliftRatio = Number(((upliftedCount / finalNodes.length) * 100).toFixed(1));

    const totalReaction = finalNodes.reduce(
      (acc, n) => acc + n.contactPressure_kPa * n.tributaryArea_m2,
      0
    );

    return {
      modulusSubgradeReaction_kN_m3: ks,
      totalAppliedLoad_kN: totalColumnP,
      matSelfWeight_kN: Number(matSelfWeight_kN.toFixed(1)),
      totalReaction_kN: Number(totalReaction.toFixed(1)),
      nodes: finalNodes,
      maxPressure_kPa: Number(maxPressure.toFixed(1)),
      minPressure_kPa: Number(minPressure.toFixed(1)),
      avgPressure_kPa: Number(avgPressure.toFixed(1)),
      maxSettlement_mm: Number(maxSettlement.toFixed(2)),
      minSettlement_mm: Number(minSettlement.toFixed(2)),
      avgSettlement_mm: Number(avgSettlement.toFixed(2)),
      differentialSettlement_mm: Number(diffSettlement.toFixed(2)),
      maxAngularDistortion: Number(angularDistortion.toFixed(6)),
      upliftAreaPercentage: upliftRatio,
      iterationsToConverge: iter,
    };
  }
}
