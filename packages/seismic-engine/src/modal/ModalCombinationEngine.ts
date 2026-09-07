/**
 * ModalCombinationEngine.ts
 *
 * Implements Complete Quadratic Combination (CQC) with Der Kiureghian
 * cross-modal correlation coefficients, Square Root of Sum of Squares (SRSS),
 * and Spatial Directional combinations (100% + 30% orthogonal rule & SRSS).
 */

export interface ModalResponseItem {
  modeIndex: number;
  period_s: number;
  frequency_Hz?: number;
  angularFrequency_rad_s?: number;
  dampingRatio?: number; // default 0.05
  responseValue: number; // Displacements, base shears, moments, or member forces
}

export interface DirectionalCombinationResult {
  governingEnvelope: number;
  caseX: number; // |Rx| + 0.3|Ry| + 0.3|Rz|
  caseY: number; // 0.3|Rx| + |Ry| + 0.3|Rz|
  caseZ: number; // 0.3|Rx| + 0.3|Ry| + |Rz|
  srssCombination: number; // sqrt(Rx^2 + Ry^2 + Rz^2)
}

export class ModalCombinationEngine {
  /**
   * Computes the Der Kiureghian cross-modal correlation coefficient rho_ij.
   * r = omega_j / omega_i = T_i / T_j
   */
  public static computeRhoIJ(
    periodI: number,
    periodJ: number,
    dampingI: number = 0.05,
    dampingJ: number = 0.05
  ): number {
    if (periodI <= 0 || periodJ <= 0) return 0;
    if (Math.abs(periodI - periodJ) < 1e-6 && Math.abs(dampingI - dampingJ) < 1e-6) {
      return 1.0;
    }

    // omega_i = 2 * pi / T_i, omega_j = 2 * pi / T_j
    // r = omega_j / omega_i = T_i / T_j
    const r = periodI / periodJ;
    const xi_i = dampingI;
    const xi_j = dampingJ;

    const numerator = 8 * Math.sqrt(xi_i * xi_j) * (xi_i + r * xi_j) * Math.pow(r, 1.5);
    const denominator =
      Math.pow(1 - r * r, 2) +
      4 * xi_i * xi_j * r * (1 + r * r) +
      4 * (xi_i * xi_i + xi_j * xi_j) * r * r;

    if (denominator <= 1e-9) return 1.0;

    const rho = numerator / denominator;
    return Math.max(0, Math.min(1.0, rho));
  }

  /**
   * Generates the N x N cross-modal correlation matrix [rho_ij].
   */
  public static generateCorrelationMatrix(modes: ModalResponseItem[]): number[][] {
    const N = modes.length;
    const matrix: number[][] = Array.from({ length: N }, () => Array(N).fill(0));

    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        if (i === j) {
          matrix[i]![j] = 1.0;
        } else {
          const rho = this.computeRhoIJ(
            modes[i]!.period_s,
            modes[j]!.period_s,
            modes[i]!.dampingRatio ?? 0.05,
            modes[j]!.dampingRatio ?? 0.05
          );
          matrix[i]![j] = Number(rho.toFixed(5));
        }
      }
    }

    return matrix;
  }

  /**
   * Combines modal responses using Complete Quadratic Combination (CQC).
   * R_cqc = sqrt( sum_i sum_j r_i * rho_ij * r_j )
   */
  public static combineCQC(modes: ModalResponseItem[]): number {
    const N = modes.length;
    if (N === 0) return 0;
    if (N === 1) return Math.abs(modes[0]!.responseValue);

    const rhoMatrix = this.generateCorrelationMatrix(modes);
    let sumDouble = 0;

    for (let i = 0; i < N; i++) {
      const ri = modes[i]!.responseValue;
      for (let j = 0; j < N; j++) {
        const rj = modes[j]!.responseValue;
        const rho = rhoMatrix[i]![j]!;
        sumDouble += ri * rho * rj;
      }
    }

    return Math.sqrt(Math.max(0, sumDouble));
  }

  /**
   * Combines modal responses using Square Root of Sum of Squares (SRSS).
   * R_srss = sqrt( sum_i r_i^2 )
   */
  public static combineSRSS(modes: ModalResponseItem[]): number {
    if (modes.length === 0) return 0;
    const sumSquares = modes.reduce((acc, m) => acc + m.responseValue * m.responseValue, 0);
    return Math.sqrt(sumSquares);
  }

  /**
   * Evaluates 100% + 30% orthogonal directional combination rule and spatial SRSS.
   */
  public static combineDirectional(
    rx: number,
    ry: number,
    rz: number = 0
  ): DirectionalCombinationResult {
    const absX = Math.abs(rx);
    const absY = Math.abs(ry);
    const absZ = Math.abs(rz);

    const caseX = absX + 0.3 * absY + 0.3 * absZ;
    const caseY = 0.3 * absX + absY + 0.3 * absZ;
    const caseZ = 0.3 * absX + 0.3 * absY + absZ;

    const governing = Math.max(caseX, caseY, caseZ);
    const srss = Math.sqrt(rx * rx + ry * ry + rz * rz);

    return {
      governingEnvelope: Number(governing.toFixed(3)),
      caseX: Number(caseX.toFixed(3)),
      caseY: Number(caseY.toFixed(3)),
      caseZ: Number(caseZ.toFixed(3)),
      srssCombination: Number(srss.toFixed(3)),
    };
  }
}
