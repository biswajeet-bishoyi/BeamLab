/**
 * Solves a system of linear equations Ax = b using Gaussian elimination with partial pivoting.
 * Modifies A and b in place.
 * Returns the solution vector x.
 */
export function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = b.length;

  for (let i = 0; i < n; i++) {
    // Partial pivoting
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) {
        maxRow = k;
      }
    }

    // Swap rows in A and b
    const tempRow = A[i];
    A[i] = A[maxRow];
    A[maxRow] = tempRow;
    
    const tempB = b[i];
    b[i] = b[maxRow];
    b[maxRow] = tempB;

    // Singular matrix check
    if (Math.abs(A[i][i]) < 1e-12) {
      throw new Error('Matrix is singular or ill-conditioned');
    }

    // Eliminate
    for (let k = i + 1; k < n; k++) {
      const factor = A[k][i] / A[i][i];
      b[k] -= factor * b[i];
      for (let j = i; j < n; j++) {
        A[k][j] -= factor * A[i][j];
      }
    }
  }

  // Back substitution
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = 0;
    for (let j = i + 1; j < n; j++) {
      sum += A[i][j] * x[j];
    }
    x[i] = (b[i] - sum) / A[i][i];
  }

  return x;
}

export function createZeros(n: number, m: number): number[][] {
  return Array.from({ length: n }, () => new Array(m).fill(0));
}
