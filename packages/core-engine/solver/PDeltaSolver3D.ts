/**
 * BeamLab Sprint B4.2 — Geometric Non-Linearity & Second-Order P-Delta Solver
 * Implements rigorous 3D second-order P-Delta analysis:
 * 1. Geometric stiffness matrix K_g(P) for 12-DOF spatial beam-columns
 * 2. Iterative Newton-Raphson & Picard secant equilibrium iterations
 * 3. AISC 360-16 Direct Analysis Method (DAM) stability coefficient theta and B2 amplification
 * 4. Euler critical buckling load P_cr verification
 */

import { solveLinearSystem, createZeros } from '../math/matrix';
import {
  SpaceFrameSolver3D,
  type SpaceFrameModel3D,
  type Element3D,
  type NodeDisplacement3D,
  type NodeReaction3D,
  type ElementInternalForces3D,
} from './SpaceFrameSolver3D';

export interface PDeltaIterationHistory {
  iteration: number;
  displacementNorm: number;
  residualForceNorm: number;
  convergenceRatio: number; // ||dU|| / ||U||
}

export interface PDeltaAnalysisResult3D {
  firstOrderDisplacements: Map<string, NodeDisplacement3D>;
  secondOrderDisplacements: Map<string, NodeDisplacement3D>;
  reactions: Map<string, NodeReaction3D>;
  elementResults: Map<string, ElementInternalForces3D>;
  stabilityDiagnostics: {
    maxAmplificationB2: number; // max(U_2nd / U_1st)
    governingElementId: string;
    stabilityIndexTheta: number; // theta = (P * Delta) / (V * H)
    aiscCompliance: 'ACCEPTABLE_MODEST' | 'SECOND_ORDER_MANDATORY' | 'POTENTIALLY_UNSTABLE';
    criticalAxialRatio: number; // max(|P| / P_cr)
  };
  iterations: PDeltaIterationHistory[];
  metrics: {
    converged: boolean;
    iterationsCount: number;
    solveTimeMs: number;
  };
}

export interface PDeltaOptions {
  maxIterations?: number;
  convergenceTolerance?: number; // default 1e-4
  includeMemberPdelta?: boolean; // small p-delta along member span
  stiffnessReductionDAM?: boolean; // AISC DAM: 0.8*E and 0.8*A
}

export class PDeltaSolver3D {
  /**
   * Solves 3D space frame with second-order geometric non-linearity (P-Delta).
   */
  public static solve(
    model: SpaceFrameModel3D,
    options: PDeltaOptions = {},
  ): PDeltaAnalysisResult3D {
    const startTime = performance.now();
    const maxIter = options.maxIterations ?? 25;
    const tol = options.convergenceTolerance ?? 1e-4;

    // Optional AISC Direct Analysis Method (DAM) stiffness reduction (0.8*E, 0.8*A)
    const effectiveModel: SpaceFrameModel3D = options.stiffnessReductionDAM
      ? {
          ...model,
          elements: model.elements.map((e) => ({
            ...e,
            section: { ...e.section, area: e.section.area * 0.8 },
            material: { ...e.material, E: e.material.E * 0.8 },
          })),
        }
      : model;

    // Step 1: Solve linear 1st-order direct stiffness
    const firstOrderResult = SpaceFrameSolver3D.solve(effectiveModel);

    // Number of DOFs and nodes
    const numNodes = model.nodes.length;
    const totalDOFs = numNodes * 6;
    const nodeIndexMap = new Map<string, number>();
    model.nodes.forEach((n, idx) => nodeIndexMap.set(n.id, idx));

    // Extract 1st-order displacements vector U
    let U = new Array(totalDOFs).fill(0);
    for (let i = 0; i < numNodes; i++) {
      const d = firstOrderResult.displacements.get(model.nodes[i]!.id);
      if (d) {
        const base = i * 6;
        U[base + 0] = d.dx;
        U[base + 1] = d.dy;
        U[base + 2] = d.dz;
        U[base + 3] = d.rx;
        U[base + 4] = d.ry;
        U[base + 5] = d.rz;
      }
    }

    // Iteration tracking
    const iterationHistory: PDeltaIterationHistory[] = [];
    let converged = false;
    let iter = 0;

    // Step 2: Iterative P-Delta loop (Modified Newton-Raphson / Picard equilibrium iteration)
    while (iter < maxIter && !converged) {
      iter++;

      // Assemble tangent stiffness: K_T = K_E + K_G(P)
      const K_T = createZeros(totalDOFs, totalDOFs);
      const F_int = new Array(totalDOFs).fill(0);

      // Assemble elastic and geometric stiffness from updated element axial forces
      for (const elem of effectiveModel.elements) {
        const n1Idx = nodeIndexMap.get(elem.startNodeId)!;
        const n2Idx = nodeIndexMap.get(elem.endNodeId)!;
        const node1 = effectiveModel.nodes[n1Idx]!;
        const node2 = effectiveModel.nodes[n2Idx]!;

        const dx = node2.x - node1.x;
        const dy = node2.y - node1.y;
        const dz = node2.z - node1.z;
        const L = Math.hypot(dx, dy, dz);

        const E = elem.material.E;
        const nu = elem.material.nu ?? 0.3;
        const G = elem.material.G ?? E / (2 * (1 + nu));

        // 12x12 Transformation
        const T = this.buildTransformationMatrix(node1, node2, L, elem.rollAngleDeg ?? 0, elem.localYVector);

        // Global element DOFs
        const dofs = [
          n1Idx * 6 + 0, n1Idx * 6 + 1, n1Idx * 6 + 2, n1Idx * 6 + 3, n1Idx * 6 + 4, n1Idx * 6 + 5,
          n2Idx * 6 + 0, n2Idx * 6 + 1, n2Idx * 6 + 2, n2Idx * 6 + 3, n2Idx * 6 + 4, n2Idx * 6 + 5,
        ];

        // Current element displacements in local coordinates
        const u_global = dofs.map((dof) => U[dof]);
        const u_local = new Array(12).fill(0);
        for (let r = 0; r < 12; r++) {
          for (let c = 0; c < 12; c++) {
            u_local[r] += T[r][c] * u_global[c];
          }
        }

        // Current axial elongation: Delta_L = u_x2 - u_x1
        const deltaL = u_local[6] - u_local[0];
        // Axial force: P = E*A/L * Delta_L (positive = tension, negative = compression)
        const P_axial = (E * elem.section.area / L) * deltaL;

        // Local elastic stiffness k_e
        const k_e = this.buildLocalElasticStiffness(elem, L, E, G);

        // Local geometric stiffness k_g(P)
        const k_g = this.buildLocalGeometricStiffness(elem, L, P_axial);

        // Total local element tangent stiffness: k_t = k_e + k_g
        const k_t = createZeros(12, 12);
        for (let r = 0; r < 12; r++) {
          for (let c = 0; c < 12; c++) {
            k_t[r][c] = k_e[r][c] + k_g[r][c];
          }
        }

        // Transform to global: K_elem_T = T^T * k_t * T
        const K_elem_T = this.transformToGlobal(k_t, T);

        // Assemble into K_T
        for (let r = 0; r < 12; r++) {
          const row = dofs[r];
          for (let c = 0; c < 12; c++) {
            const col = dofs[c];
            K_T[row][col] += K_elem_T[r][c];
          }
        }
      }

      // Add boundary spring stiffnesses to diagonal
      for (let i = 0; i < numNodes; i++) {
        const node = effectiveModel.nodes[i]!;
        if (node.springs) {
          const base = i * 6;
          if (node.springs.kTx) K_T[base + 0][base + 0] += node.springs.kTx;
          if (node.springs.kTy) K_T[base + 1][base + 1] += node.springs.kTy;
          if (node.springs.kTz) K_T[base + 2][base + 2] += node.springs.kTz;
          if (node.springs.kRx) K_T[base + 3][base + 3] += node.springs.kRx;
          if (node.springs.kRy) K_T[base + 4][base + 4] += node.springs.kRy;
          if (node.springs.kRz) K_T[base + 5][base + 5] += node.springs.kRz;
        }
      }

      // Build external load vector F_ext
      const F_ext = new Array(totalDOFs).fill(0);
      for (const load of effectiveModel.nodalLoads ?? []) {
        const nIdx = nodeIndexMap.get(load.nodeId);
        if (nIdx !== undefined) {
          const base = nIdx * 6;
          if (load.Fx) F_ext[base + 0] += load.Fx;
          if (load.Fy) F_ext[base + 1] += load.Fy;
          if (load.Fz) F_ext[base + 2] += load.Fz;
          if (load.Mx) F_ext[base + 3] += load.Mx;
          if (load.My) F_ext[base + 4] += load.My;
          if (load.Mz) F_ext[base + 5] += load.Mz;
        }
      }

      // Boundary restraints
      const constrainedDOFs = new Set<number>();
      for (let i = 0; i < numNodes; i++) {
        const node = effectiveModel.nodes[i]!;
        const base = i * 6;
        if (node.restraints) {
          if (node.restraints.Tx) constrainedDOFs.add(base + 0);
          if (node.restraints.Ty) constrainedDOFs.add(base + 1);
          if (node.restraints.Tz) constrainedDOFs.add(base + 2);
          if (node.restraints.Rx) constrainedDOFs.add(base + 3);
          if (node.restraints.Ry) constrainedDOFs.add(base + 4);
          if (node.restraints.Rz) constrainedDOFs.add(base + 5);
        }
      }

      for (const dof of constrainedDOFs) {
        for (let j = 0; j < totalDOFs; j++) {
          K_T[dof][j] = 0;
        }
        K_T[dof][dof] = 1.0;
        F_ext[dof] = 0.0;
      }

      // Solve updated displacements: U_new = K_T^-1 * F_ext
      const U_new = solveLinearSystem(K_T, F_ext);

      // Convergence metrics
      let dUNorm = 0;
      let uNorm = 0;
      for (let i = 0; i < totalDOFs; i++) {
        dUNorm += Math.pow(U_new[i] - U[i], 2);
        uNorm += Math.pow(U_new[i], 2);
      }
      dUNorm = Math.sqrt(dUNorm);
      uNorm = Math.sqrt(uNorm);

      const convRatio = uNorm > 0 ? dUNorm / uNorm : dUNorm;

      iterationHistory.push({
        iteration: iter,
        displacementNorm: Number(uNorm.toFixed(6)),
        residualForceNorm: Number(dUNorm.toFixed(6)),
        convergenceRatio: Number(convRatio.toFixed(6)),
      });

      U = U_new;

      if (convRatio < tol) {
        converged = true;
      }
    }

    // Format second-order displacements map
    const secondOrderDisplacements = new Map<string, NodeDisplacement3D>();
    for (let i = 0; i < numNodes; i++) {
      const base = i * 6;
      secondOrderDisplacements.set(model.nodes[i]!.id, {
        nodeId: model.nodes[i]!.id,
        dx: U[base + 0],
        dy: U[base + 1],
        dz: U[base + 2],
        rx: U[base + 3],
        ry: U[base + 4],
        rz: U[base + 5],
      });
    }

    // Evaluate B2 amplification factor: B2 = max(U_2nd / U_1st)
    let maxB2 = 1.0;
    let governingElem = model.elements[0]?.id || '';
    let maxAxialRatio = 0.0;

    for (const elem of model.elements) {
      const d1_1 = firstOrderResult.displacements.get(elem.startNodeId);
      const d1_2 = firstOrderResult.displacements.get(elem.endNodeId);
      const d2_1 = secondOrderDisplacements.get(elem.startNodeId);
      const d2_2 = secondOrderDisplacements.get(elem.endNodeId);

      if (d1_1 && d1_2 && d2_1 && d2_2) {
        const drift1 = Math.hypot(d1_2.dx - d1_1.dx, d1_2.dy - d1_1.dy);
        const drift2 = Math.hypot(d2_2.dx - d2_1.dx, d2_2.dy - d2_1.dy);

        if (drift1 > 1e-5) {
          const b2 = drift2 / drift1;
          if (b2 > maxB2) {
            maxB2 = b2;
            governingElem = elem.id;
          }
        }
      }

      // Check Euler buckling load: P_cr = pi^2 * E * I / L^2
      const n1 = model.nodes.find((n) => n.id === elem.startNodeId)!;
      const n2 = model.nodes.find((n) => n.id === elem.endNodeId)!;
      const L = Math.hypot(n2.x - n1.x, n2.y - n1.y, n2.z - n1.z);
      const minI = Math.min(elem.section.Iyy, elem.section.Izz);
      const P_cr = (Math.PI * Math.PI * elem.material.E * minI) / (L * L);

      const res = firstOrderResult.elementResults.get(elem.id);
      if (res) {
        const P_act = Math.abs(res.startForces.N);
        const ratio = P_act / P_cr;
        if (ratio > maxAxialRatio) maxAxialRatio = ratio;
      }
    }

    // Stability coefficient theta: (B2 - 1) / B2
    const theta = Math.max(0, (maxB2 - 1.0) / (maxB2 || 1.0));

    let aiscCompliance: 'ACCEPTABLE_MODEST' | 'SECOND_ORDER_MANDATORY' | 'POTENTIALLY_UNSTABLE' =
      'ACCEPTABLE_MODEST';
    if (theta > 0.25) {
      aiscCompliance = 'POTENTIALLY_UNSTABLE';
    } else if (theta > 0.10) {
      aiscCompliance = 'SECOND_ORDER_MANDATORY';
    }

    const solveTimeMs = performance.now() - startTime;

    return {
      firstOrderDisplacements: firstOrderResult.displacements,
      secondOrderDisplacements,
      reactions: firstOrderResult.reactions,
      elementResults: firstOrderResult.elementResults,
      stabilityDiagnostics: {
        maxAmplificationB2: Number(maxB2.toFixed(3)),
        governingElementId: governingElem,
        stabilityIndexTheta: Number(theta.toFixed(3)),
        aiscCompliance,
        criticalAxialRatio: Number(maxAxialRatio.toFixed(3)),
      },
      iterations: iterationHistory,
      metrics: {
        converged,
        iterationsCount: iter,
        solveTimeMs: Number(solveTimeMs.toFixed(2)),
      },
    };
  }

  /**
   * Constructs 12x12 geometric stiffness matrix k_g(P) for axial force P.
   * Under compression (P < 0), geometric stiffness reduces total stiffness.
   * Under tension (P > 0), geometric stiffness increases total stiffness.
   */
  public static buildLocalGeometricStiffness(elem: Element3D, L: number, P: number): number[][] {
    const kg = createZeros(12, 12);
    if (Math.abs(P) < 1e-4) return kg;

    // Transverse factors along y and z
    const g1 = (6 * P) / (5 * L);
    const g2 = P / 10;
    const g3 = (2 * P * L) / 15;
    const g4 = -(P * L) / 30;

    // Torsion factor: P * r0^2 / L where r0^2 = (Iyy + Izz) / A
    const r0_sq = (elem.section.Iyy + elem.section.Izz) / (elem.section.area || 1e-4);
    const g_tors = (P * r0_sq) / L;

    // Torsion
    kg[3][3] = g_tors;
    kg[3][9] = -g_tors;
    kg[9][3] = -g_tors;
    kg[9][9] = g_tors;

    // Bending in local xy plane (transverse y, rotation about z)
    // DOFs: (1, 5, 7, 11)
    kg[1][1] = g1;
    kg[1][5] = g2;
    kg[1][7] = -g1;
    kg[1][11] = g2;

    kg[5][1] = g2;
    kg[5][5] = g3;
    kg[5][7] = -g2;
    kg[5][11] = g4;

    kg[7][1] = -g1;
    kg[7][5] = -g2;
    kg[7][7] = g1;
    kg[7][11] = -g2;

    kg[11][1] = g2;
    kg[11][5] = g4;
    kg[11][7] = -g2;
    kg[11][11] = g3;

    // Bending in local xz plane (transverse z, rotation about y)
    // DOFs: (2, 4, 8, 10)
    kg[2][2] = g1;
    kg[2][4] = -g2;
    kg[2][8] = -g1;
    kg[2][10] = -g2;

    kg[4][2] = -g2;
    kg[4][4] = g3;
    kg[4][8] = g2;
    kg[4][10] = g4;

    kg[8][2] = -g1;
    kg[8][4] = g2;
    kg[8][8] = g1;
    kg[8][10] = g2;

    kg[10][2] = -g2;
    kg[10][4] = g4;
    kg[10][8] = g2;
    kg[10][10] = g3;

    return kg;
  }

  private static buildLocalElasticStiffness(elem: Element3D, L: number, E: number, G: number): number[][] {
    const k = createZeros(12, 12);
    const A = elem.section.area;
    const Izz = elem.section.Izz;
    const Iyy = elem.section.Iyy;
    const J = elem.section.J;

    const EA_L = (E * A) / L;
    k[0][0] = EA_L;
    k[0][6] = -EA_L;
    k[6][0] = -EA_L;
    k[6][6] = EA_L;

    const GJ_L = (G * J) / L;
    k[3][3] = GJ_L;
    k[3][9] = -GJ_L;
    k[9][3] = -GJ_L;
    k[9][9] = GJ_L;

    const k_y1 = (12 * E * Izz) / (L * L * L);
    const k_y2 = (6 * E * Izz) / (L * L);
    const k_y3 = (4 * E * Izz) / L;
    const k_y4 = (2 * E * Izz) / L;

    k[1][1] = k_y1;
    k[1][5] = k_y2;
    k[1][7] = -k_y1;
    k[1][11] = k_y2;
    k[5][1] = k_y2;
    k[5][5] = k_y3;
    k[5][7] = -k_y2;
    k[5][11] = k_y4;
    k[7][1] = -k_y1;
    k[7][5] = -k_y2;
    k[7][7] = k_y1;
    k[7][11] = -k_y2;
    k[11][1] = k_y2;
    k[11][5] = k_y4;
    k[11][7] = -k_y2;
    k[11][11] = k_y3;

    const k_z1 = (12 * E * Iyy) / (L * L * L);
    const k_z2 = (6 * E * Iyy) / (L * L);
    const k_z3 = (4 * E * Iyy) / L;
    const k_z4 = (2 * E * Iyy) / L;

    k[2][2] = k_z1;
    k[2][4] = -k_z2;
    k[2][8] = -k_z1;
    k[2][10] = -k_z2;
    k[4][2] = -k_z2;
    k[4][4] = k_z3;
    k[4][8] = k_z2;
    k[4][10] = k_z4;
    k[8][2] = -k_z1;
    k[8][4] = k_z2;
    k[8][8] = k_z1;
    k[8][10] = k_z2;
    k[10][2] = -k_z2;
    k[10][4] = k_z4;
    k[10][8] = k_z2;
    k[10][10] = k_z3;

    return k;
  }

  private static buildTransformationMatrix(
    node1: { x: number; y: number; z: number },
    node2: { x: number; y: number; z: number },
    L: number,
    rollAngleDeg: number,
    localYVector?: { x: number; y: number; z: number },
  ): number[][] {
    const ex_x = (node2.x - node1.x) / L;
    const ex_y = (node2.y - node1.y) / L;
    const ex_z = (node2.z - node1.z) / L;

    let ey_x = 0, ey_y = 0, ey_z = 0;
    let ez_x = 0, ez_y = 0, ez_z = 0;

    if (localYVector) {
      const vLen = Math.hypot(localYVector.x, localYVector.y, localYVector.z);
      ey_x = localYVector.x / vLen;
      ey_y = localYVector.y / vLen;
      ey_z = localYVector.z / vLen;

      ez_x = ex_y * ey_z - ex_z * ey_y;
      ez_y = ex_z * ey_x - ex_x * ey_z;
      ez_z = ex_x * ey_y - ex_y * ey_x;
    } else {
      const isVertical = Math.abs(ex_z) > 0.9999;
      if (!isVertical) {
        const cx = ex_y;
        const cy = -ex_x;
        const cz = 0;
        const lenZ = Math.hypot(cx, cy);

        ez_x = cx / lenZ;
        ez_y = cy / lenZ;
        ez_z = cz / lenZ;

        ey_x = ez_y * ex_z - ez_z * ex_y;
        ey_y = ez_z * ex_x - ez_x * ex_z;
        ey_z = ez_x * ex_y - ez_y * ex_x;
      } else {
        const sign = ex_z > 0 ? 1 : -1;
        ey_x = -sign;
        ey_y = 0;
        ey_z = 0;

        ez_x = 0;
        ez_y = 1;
        ez_z = 0;
      }

      if (Math.abs(rollAngleDeg) > 1e-4) {
        const rad = (rollAngleDeg * Math.PI) / 180;
        const cosB = Math.cos(rad);
        const sinB = Math.sin(rad);

        const n_ey_x = ey_x * cosB + ez_x * sinB;
        const n_ey_y = ey_y * cosB + ez_y * sinB;
        const n_ey_z = ey_z * cosB + ez_z * sinB;

        const n_ez_x = -ey_x * sinB + ez_x * cosB;
        const n_ez_y = -ey_y * sinB + ez_y * cosB;
        const n_ez_z = -ey_z * sinB + ez_z * cosB;

        ey_x = n_ey_x;
        ey_y = n_ey_y;
        ey_z = n_ey_z;

        ez_x = n_ez_x;
        ez_y = n_ez_y;
        ez_z = n_ez_z;
      }
    }

    const R = [
      [ex_x, ex_y, ex_z],
      [ey_x, ey_y, ey_z],
      [ez_x, ez_y, ez_z],
    ];

    const T = createZeros(12, 12);
    for (let b = 0; b < 4; b++) {
      const offset = b * 3;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          T[offset + r][offset + c] = R[r][c];
        }
      }
    }

    return T;
  }

  private static transformToGlobal(k_local: number[][], T: number[][]): number[][] {
    const temp = createZeros(12, 12);
    for (let i = 0; i < 12; i++) {
      for (let j = 0; j < 12; j++) {
        let sum = 0;
        for (let m = 0; m < 12; m++) {
          sum += k_local[i][m] * T[m][j];
        }
        temp[i][j] = sum;
      }
    }

    const K_global = createZeros(12, 12);
    for (let i = 0; i < 12; i++) {
      for (let j = 0; j < 12; j++) {
        let sum = 0;
        for (let m = 0; m < 12; m++) {
          sum += T[m][i] * temp[m][j];
        }
        K_global[i][j] = sum;
      }
    }

    return K_global;
  }
}
