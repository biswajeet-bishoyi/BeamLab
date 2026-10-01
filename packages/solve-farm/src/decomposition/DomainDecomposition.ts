/**
 * Distributed Domain Decomposition & Schur Complement Solver Engine
 * Substructuring for Parallel Cluster FEA (FETI / Dual Primal Methods)
 * @packageDocumentation
 */

import { SubdomainChunk } from '../types';

export class DomainDecompositionEngine {
  /**
   * Condense subdomain to interface boundary degrees of freedom (Schur Complement)
   * S^(s) = K_BB - K_BI * (K_II)^(-1) * K_IB
   */
  public static computeSchurComplement(params: {
    K_II: number[][]; // Interior-Interior stiffness block (n_I x n_I)
    K_IB: number[][]; // Interior-Boundary stiffness block (n_I x n_B)
    K_BB: number[][]; // Boundary-Boundary stiffness block (n_B x n_B)
    f_I: number[]; // Interior forces
    f_B: number[]; // Boundary forces
  }): {
    schurMatrix: number[][]; // S^(s)
    condensedForce: number[]; // f_cond^(s)
  } {
    const { K_II, K_IB, K_BB, f_I, f_B } = params;
    const nI = K_II.length;
    const nB = K_BB.length;

    // Invert K_II (for symmetric positive definite matrix, via Cholesky or Gaussian elimination)
    const invK_II = this.invertMatrix(K_II);

    // Temp1 = K_BI * invK_II  (where K_BI = K_IB^T)
    // Dimension: nB x nI
    const K_BI: number[][] = Array.from({ length: nB }, (_, r) =>
      Array.from({ length: nI }, (_, c) => K_IB[c]?.[r] ?? 0)
    );

    const K_BI_invK_II: number[][] = Array.from({ length: nB }, () => Array(nI).fill(0));
    for (let i = 0; i < nB; i++) {
      for (let j = 0; j < nI; j++) {
        let sum = 0;
        for (let k = 0; k < nI; k++) {
          sum += (K_BI[i]?.[k] ?? 0) * (invK_II[k]?.[j] ?? 0);
        }
        K_BI_invK_II[i]![j] = sum;
      }
    }

    // Subtraction term: Term2 = K_BI_invK_II * K_IB  (nB x nB)
    const term2: number[][] = Array.from({ length: nB }, () => Array(nB).fill(0));
    for (let i = 0; i < nB; i++) {
      for (let j = 0; j < nB; j++) {
        let sum = 0;
        for (let k = 0; k < nI; k++) {
          sum += (K_BI_invK_II[i]?.[k] ?? 0) * (K_IB[k]?.[j] ?? 0);
        }
        term2[i]![j] = sum;
      }
    }

    // S = K_BB - term2
    const schurMatrix: number[][] = Array.from({ length: nB }, (_, r) =>
      Array.from({ length: nB }, (_, c) => (K_BB[r]?.[c] ?? 0) - (term2[r]?.[c] ?? 0))
    );

    // Condensed force: f_cond = f_B - K_BI * (invK_II * f_I)
    const invK_II_fI: number[] = Array(nI).fill(0);
    for (let i = 0; i < nI; i++) {
      let sum = 0;
      for (let j = 0; j < nI; j++) {
        sum += (invK_II[i]?.[j] ?? 0) * (f_I[j] ?? 0);
      }
      invK_II_fI[i] = sum;
    }

    const condensedForce: number[] = Array(nB).fill(0);
    for (let i = 0; i < nB; i++) {
      let sum = 0;
      for (let j = 0; j < nI; j++) {
        sum += (K_BI[i]?.[j] ?? 0) * (invK_II_fI[j] ?? 0);
      }
      condensedForce[i] = (f_B[i] ?? 0) - sum;
    }

    return { schurMatrix, condensedForce };
  }

  /**
   * Back-substitute interface displacements to solve interior displacements
   * u_I = (K_II)^(-1) * (f_I - K_IB * u_B)
   */
  public static backSubstituteInterior(params: {
    K_II: number[][];
    K_IB: number[][];
    f_I: number[];
    u_B: number[];
  }): number[] {
    const { K_II, K_IB, f_I, u_B } = params;
    const nI = K_II.length;
    const nB = u_B.length;

    const invK_II = this.invertMatrix(K_II);

    // netF = f_I - K_IB * u_B
    const netF: number[] = Array(nI).fill(0);
    for (let i = 0; i < nI; i++) {
      let sum = 0;
      for (let j = 0; j < nB; j++) {
        sum += (K_IB[i]?.[j] ?? 0) * (u_B[j] ?? 0);
      }
      netF[i] = (f_I[i] ?? 0) - sum;
    }

    // u_I = invK_II * netF
    const u_I: number[] = Array(nI).fill(0);
    for (let i = 0; i < nI; i++) {
      let sum = 0;
      for (let j = 0; j < nI; j++) {
        sum += (invK_II[i]?.[j] ?? 0) * (netF[j] ?? 0);
      }
      u_I[i] = sum;
    }

    return u_I;
  }

  /**
   * Simple numerical matrix inverter for small/medium symmetric blocks
   */
  private static invertMatrix(M: number[][]): number[][] {
    const n = M.length;
    // Create augmented matrix [M | I]
    const A: number[][] = M.map((row, r) => [
      ...row,
      ...Array.from({ length: n }, (_, c) => (r === c ? 1 : 0)),
    ]);

    for (let i = 0; i < n; i++) {
      // Pivot
      let maxEl = Math.abs(A[i]?.[i] ?? 0);
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        const val = Math.abs(A[k]?.[i] ?? 0);
        if (val > maxEl) {
          maxEl = val;
          maxRow = k;
        }
      }

      const tmp = A[i]!;
      A[i] = A[maxRow]!;
      A[maxRow] = tmp;

      const pivot = A[i]?.[i] ?? 1e-12;
      const effectivePivot = Math.abs(pivot) < 1e-14 ? 1e-12 : pivot;

      for (let j = 0; j < 2 * n; j++) {
        A[i]![j] = (A[i]?.[j] ?? 0) / effectivePivot;
      }

      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = A[k]?.[i] ?? 0;
          for (let j = 0; j < 2 * n; j++) {
            A[k]![j] = (A[k]?.[j] ?? 0) - factor * (A[i]?.[j] ?? 0);
          }
        }
      }
    }

    // Extract inverted matrix from right half
    return A.map((row) => row.slice(n));
  }
}
