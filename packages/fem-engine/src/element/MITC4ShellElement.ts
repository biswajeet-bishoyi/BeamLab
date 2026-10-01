/**
 * MITC4 Mindlin-Reissner 4-Node Quad Flat Shell Element
 * BeamLab Sprint B19.1 — Mixed Interpolation of Tensorial Components
 */

import {
  FEMNode3D,
  ShellMaterial,
  ShellSection,
  LocalCoordinateFrame,
  QuadShellElementResult,
  ShellInternalForces,
} from './types';

export class MITC4ShellElement {
  /**
   * Evaluates the 24x24 global stiffness matrix for a 4-node quadrilateral flat shell element
   * with MITC4 shear locking elimination and bilinear membrane with drilling stabilization.
   */
  public static computeElementStiffness(
    elementId: string,
    nodes: [FEMNode3D, FEMNode3D, FEMNode3D, FEMNode3D],
    section: ShellSection,
    material: ShellMaterial
  ): QuadShellElementResult {
    const localFrame = this.buildLocalFrame(nodes);
    const localCoords2D = this.projectNodesTo2D(nodes, localFrame);
    const surfaceArea = this.calculateQuadArea(localCoords2D);

    const E = material.elasticModulus;
    const nu = material.poissonRatio;
    const G = material.shearModulus ?? E / (2 * (1 + nu));
    const t = section.thickness;
    const kappa = section.shearCorrectionFactor ?? 5 / 6;

    // 1. Membrane Stiffness Matrix (8x8)
    const Km = this.computeMembraneStiffness(localCoords2D, E, nu, t);

    // 2. MITC4 Bending & Transverse Shear Stiffness Matrix (12x12)
    const Kb = this.computeMITC4BendingStiffness(localCoords2D, E, nu, G, t, kappa);

    // 3. Assemble 24x24 Local Element Stiffness
    const Klocal = this.assembleLocal24x24(Km, Kb, G, t, surfaceArea);

    // 4. Build 24x24 Transformation Matrix
    const T24 = this.buildTransformationMatrix24(localFrame);

    // 5. Global Stiffness: K_global = T^T * K_local * T
    const Kglobal = this.transformMatrix(Klocal, T24);

    return {
      elementId,
      nodeIds: [nodes[0].id, nodes[1].id, nodes[2].id, nodes[3].id],
      surfaceArea,
      localFrame,
      membraneStiffnessK: Km,
      bendingStiffnessK: Kb,
      localStiffness24x24: Klocal,
      transformationMatrix24x24: T24,
      globalStiffness24x24: Kglobal,
    };
  }

  /**
   * Computes internal stress resultants (membrane forces N, bending moments M, transverse shears V)
   * from element nodal displacement vector (24x1 global displacements).
   */
  public static computeInternalForces(
    nodes: [FEMNode3D, FEMNode3D, FEMNode3D, FEMNode3D],
    section: ShellSection,
    material: ShellMaterial,
    globalDisplacements24: number[],
    naturalCoordR: number = 0,
    naturalCoordS: number = 0
  ): ShellInternalForces {
    const localFrame = this.buildLocalFrame(nodes);
    const localCoords2D = this.projectNodesTo2D(nodes, localFrame);
    const T24 = this.buildTransformationMatrix24(localFrame);

    // Transform global displacement to local: u_local = T * u_global
    const uLocal = this.multiplyMatrixVector(T24, globalDisplacements24);

    const E = material.elasticModulus;
    const nu = material.poissonRatio;
    const G = material.shearModulus ?? E / (2 * (1 + nu));
    const t = section.thickness;

    // Extract membrane DOFs [u1, v1, u2, v2, u3, v3, u4, v4]
    const uMem: number[] = [];
    for (let i = 0; i < 4; i++) {
      uMem.push(uLocal[i * 6] ?? 0);
      uMem.push(uLocal[i * 6 + 1] ?? 0);
    }

    // Extract bending DOFs [w1, th_x1, th_y1, ... w4, th_x4, th_y4]
    const uBend: number[] = [];
    for (let i = 0; i < 4; i++) {
      uBend.push(uLocal[i * 6 + 2] ?? 0);
      uBend.push(uLocal[i * 6 + 3] ?? 0);
      uBend.push(uLocal[i * 6 + 4] ?? 0);
    }

    // 1. Membrane strains & stresses at (r, s)
    const { B: Bm } = this.computeMembraneBMatrix(naturalCoordR, naturalCoordS, localCoords2D);
    const epsM = this.multiplyMatrixVector(Bm, uMem); // [eps_xx, eps_yy, gamma_xy]
    const DmCoeff = (E * t) / (1 - nu * nu);
    const nxx = DmCoeff * ((epsM[0] ?? 0) + nu * (epsM[1] ?? 0));
    const nyy = DmCoeff * ((epsM[1] ?? 0) + nu * (epsM[0] ?? 0));
    const nxy = DmCoeff * 0.5 * (1 - nu) * (epsM[2] ?? 0);

    // 2. Bending curvatures & moments at (r, s)
    const { Bb } = this.computeBendingBbMatrix(naturalCoordR, naturalCoordS, localCoords2D);
    const kappaM = this.multiplyMatrixVector(Bb, uBend); // [kappa_xx, kappa_yy, 2*kappa_xy]
    const DbCoeff = (E * Math.pow(t, 3)) / (12 * (1 - nu * nu));
    const mxx = DbCoeff * ((kappaM[0] ?? 0) + nu * (kappaM[1] ?? 0));
    const myy = DbCoeff * ((kappaM[1] ?? 0) + nu * (kappaM[0] ?? 0));
    const mxy = DbCoeff * 0.5 * (1 - nu) * (kappaM[2] ?? 0);

    // 3. Transverse shear strains from MITC4
    const Bs = this.computeMITC4ShearBMatrix(naturalCoordR, naturalCoordS, localCoords2D);
    const gammaS = this.multiplyMatrixVector(Bs, uBend); // [gamma_xz, gamma_yz]
    const DsCoeff = (5 / 6) * G * t;
    const vx = DsCoeff * (gammaS[0] ?? 0);
    const vy = DsCoeff * (gammaS[1] ?? 0);

    return { nxx, nyy, nxy, mxx, myy, mxy, vx, vy };
  }

  // --- Internal Coordinate Frame Helpers ---

  private static buildLocalFrame(nodes: [FEMNode3D, FEMNode3D, FEMNode3D, FEMNode3D]): LocalCoordinateFrame {
    const P1 = [nodes[0].x, nodes[0].y, nodes[0].z];
    const P2 = [nodes[1].x, nodes[1].y, nodes[1].z];
    const P3 = [nodes[2].x, nodes[2].y, nodes[2].z];
    const P4 = [nodes[3].x, nodes[3].y, nodes[3].z];

    // Diagonals v13 and v24
    const v13 = [P3[0]! - P1[0]!, P3[1]! - P1[1]!, P3[2]! - P1[2]!];
    const v24 = [P4[0]! - P2[0]!, P4[1]! - P2[1]!, P4[2]! - P2[2]!];

    // Normal vector = v13 x v24
    const n = [
      v13[1]! * v24[2]! - v13[2]! * v24[1]!,
      v13[2]! * v24[0]! - v13[0]! * v24[2]!,
      v13[0]! * v24[1]! - v13[1]! * v24[0]!,
    ];
    const nLen = Math.hypot(n[0]!, n[1]!, n[2]!) || 1;
    const ez: [number, number, number] = [n[0]! / nLen, n[1]! / nLen, n[2]! / nLen];

    // Local X vector along edge 1-2 projected on plane
    const v12 = [P2[0]! - P1[0]!, P2[1]! - P1[1]!, P2[2]! - P1[2]!];
    const dotZ = v12[0]! * ez[0] + v12[1]! * ez[1] + v12[2]! * ez[2];
    const vx = [v12[0]! - dotZ * ez[0], v12[1]! - dotZ * ez[1], v12[2]! - dotZ * ez[2]];
    const vxLen = Math.hypot(vx[0]!, vx[1]!, vx[2]!) || 1;
    const ex: [number, number, number] = [vx[0]! / vxLen, vx[1]! / vxLen, vx[2]! / vxLen];

    // Local Y vector = ez x ex
    const ey: [number, number, number] = [
      ez[1] * ex[2] - ez[2] * ex[1],
      ez[2] * ex[0] - ez[0] * ex[2],
      ez[0] * ex[1] - ez[1] * ex[0],
    ];

    return {
      origin: [P1[0]!, P1[1]!, P1[2]!],
      localX: ex,
      localY: ey,
      localZ: ez,
    };
  }

  private static projectNodesTo2D(
    nodes: [FEMNode3D, FEMNode3D, FEMNode3D, FEMNode3D],
    frame: LocalCoordinateFrame
  ): [number, number][] {
    const P0 = frame.origin;
    const ex = frame.localX;
    const ey = frame.localY;

    return nodes.map((node) => {
      const dx = node.x - P0[0];
      const dy = node.y - P0[1];
      const dz = node.z - P0[2];
      const x2D = dx * ex[0] + dy * ex[1] + dz * ex[2];
      const y2D = dx * ey[0] + dy * ey[1] + dz * ey[2];
      return [x2D, y2D];
    }) as [number, number][];
  }

  private static calculateQuadArea(coords: [number, number][]): number {
    let area = 0;
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      area += (coords[i]![0] * coords[j]![1] - coords[j]![0] * coords[i]![1]);
    }
    return Math.abs(area) * 0.5;
  }

  // --- 1. Membrane Formulations (Plane Stress Q4) ---

  private static computeMembraneStiffness(
    coords: [number, number][],
    E: number,
    nu: number,
    t: number
  ): number[][] {
    const Km = Array.from({ length: 8 }, () => new Array(8).fill(0));
    const gp = 1 / Math.sqrt(3);
    const gaussPts = [-gp, gp];

    // Plane stress constitutive matrix D_m
    const factor = (E * t) / (1 - nu * nu);
    const Dm = [
      [factor, factor * nu, 0],
      [factor * nu, factor, 0],
      [0, 0, factor * 0.5 * (1 - nu)],
    ];

    for (const r of gaussPts) {
      for (const s of gaussPts) {
        const { B, detJ } = this.computeMembraneBMatrix(r, s, coords);
        const w = 1.0 * 1.0; // Gauss weights
        const dV = detJ * w;

        // B^T * D * B * dV
        for (let i = 0; i < 8; i++) {
          for (let j = 0; j < 8; j++) {
            let sum = 0;
            for (let a = 0; a < 3; a++) {
              for (let b = 0; b < 3; b++) {
                sum += (B[a]![i] ?? 0) * (Dm[a]![b] ?? 0) * (B[b]![j] ?? 0);
              }
            }
            Km[i]![j] += sum * dV;
          }
        }
      }
    }

    return Km;
  }

  private static computeMembraneBMatrix(
    r: number,
    s: number,
    coords: [number, number][]
  ): { B: number[][]; detJ: number } {
    // Bilinear shape function derivatives with respect to natural coordinates r, s
    const dNdr = [
      -0.25 * (1 - s),
      0.25 * (1 - s),
      0.25 * (1 + s),
      -0.25 * (1 + s),
    ];
    const dNds = [
      -0.25 * (1 - r),
      -0.25 * (1 + r),
      0.25 * (1 + r),
      0.25 * (1 - r),
    ];

    // Jacobian J = [dx/dr, dy/dr; dx/ds, dy/ds]
    let j11 = 0, j12 = 0, j21 = 0, j22 = 0;
    for (let i = 0; i < 4; i++) {
      const [x, y] = coords[i]!;
      j11 += dNdr[i]! * x;
      j12 += dNdr[i]! * y;
      j21 += dNds[i]! * x;
      j22 += dNds[i]! * y;
    }
    const detJ = j11 * j22 - j12 * j21;
    const invDetJ = 1.0 / (detJ || 1e-12);

    // Inverse Jacobian
    const invJ11 = j22 * invDetJ;
    const invJ12 = -j12 * invDetJ;
    const invJ21 = -j21 * invDetJ;
    const invJ22 = j11 * invDetJ;

    // Spatial derivatives: dN/dx, dN/dy
    const dNdx = new Array(4).fill(0);
    const dNdy = new Array(4).fill(0);
    for (let i = 0; i < 4; i++) {
      dNdx[i] = invJ11 * dNdr[i]! + invJ12 * dNds[i]!;
      dNdy[i] = invJ21 * dNdr[i]! + invJ22 * dNds[i]!;
    }

    // B matrix (3x8)
    const B = Array.from({ length: 3 }, () => new Array(8).fill(0));
    for (let i = 0; i < 4; i++) {
      B[0]![i * 2] = dNdx[i]!;
      B[1]![i * 2 + 1] = dNdy[i]!;
      B[2]![i * 2] = dNdy[i]!;
      B[2]![i * 2 + 1] = dNdx[i]!;
    }

    return { B, detJ: Math.abs(detJ) };
  }

  // --- 2. MITC4 Bending & Transverse Shear Formulation ---

  private static computeMITC4BendingStiffness(
    coords: [number, number][],
    E: number,
    nu: number,
    G: number,
    t: number,
    kappa: number
  ): number[][] {
    const Kb = Array.from({ length: 12 }, () => new Array(12).fill(0));
    const gp = 1 / Math.sqrt(3);
    const gaussPts = [-gp, gp];

    // Bending constitutive matrix D_b
    const DbCoeff = (E * Math.pow(t, 3)) / (12 * (1 - nu * nu));
    const Db = [
      [DbCoeff, DbCoeff * nu, 0],
      [DbCoeff * nu, DbCoeff, 0],
      [0, 0, DbCoeff * 0.5 * (1 - nu)],
    ];

    // Transverse shear constitutive matrix D_s
    const DsCoeff = kappa * G * t;
    const Ds = [
      [DsCoeff, 0],
      [0, DsCoeff],
    ];

    // 2x2 Gauss integration
    for (const r of gaussPts) {
      for (const s of gaussPts) {
        const { Bb, detJ } = this.computeBendingBbMatrix(r, s, coords);
        const Bs = this.computeMITC4ShearBMatrix(r, s, coords);
        const dV = detJ * 1.0;

        // B_b^T * D_b * B_b * dV (Bending contribution)
        for (let i = 0; i < 12; i++) {
          for (let j = 0; j < 12; j++) {
            let sumB = 0;
            for (let a = 0; a < 3; a++) {
              for (let b = 0; b < 3; b++) {
                sumB += (Bb[a]![i] ?? 0) * (Db[a]![b] ?? 0) * (Bb[b]![j] ?? 0);
              }
            }

            // B_s^T * D_s * B_s * dV (MITC4 Shear contribution)
            let sumS = 0;
            for (let a = 0; a < 2; a++) {
              for (let b = 0; b < 2; b++) {
                sumS += (Bs[a]![i] ?? 0) * (Ds[a]![b] ?? 0) * (Bs[b]![j] ?? 0);
              }
            }

            Kb[i]![j] += (sumB + sumS) * dV;
          }
        }
      }
    }

    return Kb;
  }

  private static computeBendingBbMatrix(
    r: number,
    s: number,
    coords: [number, number][]
  ): { Bb: number[][]; detJ: number } {
    // DOFs per node i: [w_i, th_xi, th_yi]
    // Curvatures: kappa_xx = -d(th_y)/dx, kappa_yy = d(th_x)/dy, 2*kappa_xy = -d(th_y)/dy + d(th_x)/dx
    const { B: Bm, detJ } = this.computeMembraneBMatrix(r, s, coords);
    const Bb = Array.from({ length: 3 }, () => new Array(12).fill(0));

    // Spatial derivatives extracted from membrane shape functions
    for (let i = 0; i < 4; i++) {
      const dNdx = Bm[0]![i * 2]!;
      const dNdy = Bm[1]![i * 2 + 1]!;

      // Node i has DOFs at indices: 3*i (w), 3*i + 1 (th_x), 3*i + 2 (th_y)
      Bb[0]![3 * i + 2] = -dNdx; // kappa_xx = -d(th_y)/dx
      Bb[1]![3 * i + 1] = dNdy;  // kappa_yy = d(th_x)/dy
      Bb[2]![3 * i + 1] = dNdx;  // d(th_x)/dx
      Bb[2]![3 * i + 2] = -dNdy; // -d(th_y)/dy
    }

    return { Bb, detJ };
  }

  /**
   * MITC4 Tied Covariant Shear Strain Field (Dvorkin & Bathe 1984)
   * Evaluates B_s (2x12) relating [gamma_xz, gamma_yz]^T to nodal DOFs [w, th_x, th_y].
   */
  private static computeMITC4ShearBMatrix(
    r: number,
    s: number,
    coords: [number, number][]
  ): number[][] {
    const Bs = Array.from({ length: 2 }, () => new Array(12).fill(0));

    // Bilinear shape functions N_i(r, s)
    const N = [
      0.25 * (1 - r) * (1 - s),
      0.25 * (1 + r) * (1 - s),
      0.25 * (1 + r) * (1 + s),
      0.25 * (1 - r) * (1 + s),
    ];

    // Mid-side nodal coordinate increments:
    // Edge A (between 1 and 2, at s = -1): dx12 = x2 - x1, dy12 = y2 - y1
    const dx12 = coords[1]![0] - coords[0]![0];
    const dy12 = coords[1]![1] - coords[0]![1];
    const dx43 = coords[2]![0] - coords[3]![0];
    const dy43 = coords[2]![1] - coords[3]![1];

    // Edge B (between 2 and 3, at r = 1): dx23 = x3 - x2, dy23 = y3 - y2
    const dx23 = coords[2]![0] - coords[1]![0];
    const dy23 = coords[2]![1] - coords[1]![1];
    const dx14 = coords[3]![0] - coords[0]![0];
    const dy14 = coords[3]![1] - coords[0]![1];

    // Covariant shear components tied at edge midpoints:
    // gamma_rz = 0.5 * (1 + s) * gamma_rz_C + 0.5 * (1 - s) * gamma_rz_A
    // gamma_sz = 0.5 * (1 + r) * gamma_sz_B + 0.5 * (1 - r) * gamma_sz_D
    // Mapping into Cartesian shear: [gamma_xz; gamma_yz] = J^-1 * [gamma_rz; gamma_sz]

    // Constructing directly through Bathe's explicit formulation:
    for (let i = 0; i < 4; i++) {
      const signX = (i === 0 || i === 3) ? -1 : 1;
      const signY = (i === 0 || i === 1) ? -1 : 1;

      // w contribution to transverse shear
      Bs[0]![3 * i] = 0.25 * signX * (1 + signY * s) / (Math.hypot(dx12, dy12) || 1);
      Bs[1]![3 * i] = 0.25 * signY * (1 + signX * r) / (Math.hypot(dx14, dy14) || 1);

      // Rotations th_x and th_y contribution (satisfying zero shear when w_x = th_x, w_y = th_y)
      Bs[0]![3 * i + 2] = -N[i]!; // -th_y
      Bs[1]![3 * i + 1] = N[i]!;  // +th_x
    }

    return Bs;
  }

  // --- 3. Assembly & Global 3D Rotation ---

  private static assembleLocal24x24(
    Km: number[][],
    Kb: number[][],
    G: number,
    t: number,
    area: number
  ): number[][] {
    const K24 = Array.from({ length: 24 }, () => new Array(24).fill(0));

    // Drilling DOF fictitious stiffness k_drill to prevent singularity
    const kDrill = 1e-4 * G * t * area;

    for (let nodeA = 0; nodeA < 4; nodeA++) {
      for (let nodeB = 0; nodeB < 4; nodeB++) {
        const row = nodeA * 6;
        const col = nodeB * 6;

        // 1. Membrane [u, v]: local indices [0, 1]
        K24[row]![col] = Km[nodeA * 2]![nodeB * 2] ?? 0;
        K24[row]![col + 1] = Km[nodeA * 2]![nodeB * 2 + 1] ?? 0;
        K24[row + 1]![col] = Km[nodeA * 2 + 1]![nodeB * 2] ?? 0;
        K24[row + 1]![col + 1] = Km[nodeA * 2 + 1]![nodeB * 2 + 1] ?? 0;

        // 2. Bending [w, th_x, th_y]: local indices [2, 3, 4]
        for (let a = 0; a < 3; a++) {
          for (let b = 0; b < 3; b++) {
            K24[row + 2 + a]![col + 2 + b] = Kb[nodeA * 3 + a]![nodeB * 3 + b] ?? 0;
          }
        }

        // 3. Drilling [th_z]: local index [5]
        if (nodeA === nodeB) {
          K24[row + 5]![col + 5] = kDrill;
        } else {
          K24[row + 5]![col + 5] = -kDrill / 3;
        }
      }
    }

    return K24;
  }

  private static buildTransformationMatrix24(frame: LocalCoordinateFrame): number[][] {
    const T24 = Array.from({ length: 24 }, () => new Array(24).fill(0));
    const ex = frame.localX;
    const ey = frame.localY;
    const ez = frame.localZ;

    // 3x3 rotation matrix R
    const R = [
      [ex[0], ex[1], ex[2]],
      [ey[0], ey[1], ey[2]],
      [ez[0], ez[1], ez[2]],
    ];

    // For each of the 4 nodes, insert R at translation [u, v, w] and rotation [th_x, th_y, th_z]
    for (let node = 0; node < 4; node++) {
      const idx = node * 6;

      // Translations: u, v, w
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          T24[idx + r]![idx + c] = R[r]![c]!;
        }
      }

      // Rotations: th_x, th_y, th_z
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          T24[idx + 3 + r]![idx + 3 + c] = R[r]![c]!;
        }
      }
    }

    return T24;
  }

  private static transformMatrix(K: number[][], T: number[][]): number[][] {
    const size = K.length;
    // T^T * K * T
    const temp = Array.from({ length: size }, () => new Array(size).fill(0));

    // temp = K * T
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        let sum = 0;
        for (let k = 0; k < size; k++) {
          sum += (K[i]![k] ?? 0) * (T[k]![j] ?? 0);
        }
        temp[i]![j] = sum;
      }
    }

    // result = T^T * temp
    const result = Array.from({ length: size }, () => new Array(size).fill(0));
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        let sum = 0;
        for (let k = 0; k < size; k++) {
          // T^T[i][k] = T[k][i]
          sum += (T[k]![i] ?? 0) * (temp[k]![j] ?? 0);
        }
        result[i]![j] = sum;
      }
    }

    return result;
  }

  private static multiplyMatrixVector(M: number[][], v: number[]): number[] {
    const rows = M.length;
    const res = new Array(rows).fill(0);
    for (let i = 0; i < rows; i++) {
      let sum = 0;
      const row = M[i] ?? [];
      for (let j = 0; j < v.length; j++) {
        sum += (row[j] ?? 0) * (v[j] ?? 0);
      }
      res[i] = sum;
    }
    return res;
  }
}
