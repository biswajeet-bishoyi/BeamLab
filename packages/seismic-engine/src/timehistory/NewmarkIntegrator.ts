/**
 * NewmarkIntegrator.ts
 *
 * Classical Newmark-beta step-by-step direct numerical integration engine
 * for SDOF and MDOF linear structural dynamic systems subject to base earthquake excitation.
 * Utilizes the unconditionally stable average acceleration formulation (gamma = 1/2, beta = 1/4).
 */

import { GroundMotionRecord } from './GroundMotionProcessor';

export interface SdofSystem {
  mass_kg: number;
  stiffness_N_m: number;
  dampingRatio: number; // e.g. 0.05
}

export interface MdofShearBuilding {
  storyMasses_kg: number[]; // From Level 1 up to Roof (N levels)
  storyStiffnesses_N_m: number[]; // Story lateral stiffness k_i (N levels)
  dampingRatio: number; // e.g. 0.05
}

export interface TimeHistoryStep {
  stepIndex: number;
  time_s: number;
  groundAcceleration_g: number;
  roofDisplacement_mm: number;
  displacements_mm: number[]; // Relative story displacements
  velocities_m_s: number[];
  accelerations_m_s2: number[]; // Total / relative accelerations
  baseShear_kN: number;
  storyShears_kN: number[];
  storyDrifts_percent: number[];
}

export interface TimeHistoryResult {
  duration_s: number;
  timeStep_s: number;
  totalSteps: number;
  peakRoofDisplacement_mm: number;
  peakBaseShear_kN: number;
  peakStoryDrift_percent: number;
  dynamicAmplificationFactor: number;
  steps: TimeHistoryStep[];
}

export class NewmarkIntegrator {
  private static readonly G_ACCEL = 9.80665;
  private readonly gamma = 0.5;
  private readonly beta = 0.25;

  /**
   * Solves an SDOF system subjected to ground motion record.
   */
  public solveSdof(system: SdofSystem, record: GroundMotionRecord): TimeHistoryResult {
    const m = system.mass_kg;
    const k = system.stiffness_N_m;
    const dt = record.timeStep_s;
    const xi = system.dampingRatio;

    const omega_n = Math.sqrt(k / m);
    const c = 2 * xi * m * omega_n;

    // Newmark coefficients
    const a0 = 1 / (this.beta * dt * dt);
    const a1 = this.gamma / (this.beta * dt);
    const a2 = 1 / (this.beta * dt);
    const a3 = 1 / (2 * this.beta) - 1;
    const a4 = this.gamma / this.beta - 1;
    const a5 = (dt / 2) * (this.gamma / this.beta - 2);

    // Effective stiffness
    const kHat = k + a0 * m + a1 * c;

    let u = 0;
    let v = 0;
    let a = 0;

    const steps: TimeHistoryStep[] = [];
    let maxU = 0;
    let maxBaseShear = 0;

    const nPoints = record.accelerations_g.length;

    for (let i = 0; i < nPoints; i++) {
      const ag_g = record.accelerations_g[i]!;
      const ag_ms2 = ag_g * NewmarkIntegrator.G_ACCEL;
      const t = i * dt;

      // Effective force P_hat(t+dt)
      // Pt = -m * ag(t)
      const Pt = -m * ag_ms2;
      const pHat = Pt + m * (a0 * u + a2 * v + a3 * a) + c * (a1 * u + a4 * v + a5 * a);

      const uNext = pHat / kHat;
      const aNext = a0 * (uNext - u) - a2 * v - a3 * a;
      const vNext = v + dt * ((1 - this.gamma) * a + this.gamma * aNext);

      u = uNext;
      v = vNext;
      a = aNext;

      const u_mm = u * 1000;
      const baseShear_kN = (k * Math.abs(u)) / 1000;

      if (Math.abs(u_mm) > maxU) maxU = Math.abs(u_mm);
      if (baseShear_kN > maxBaseShear) maxBaseShear = baseShear_kN;

      steps.push({
        stepIndex: i,
        time_s: Number(t.toFixed(3)),
        groundAcceleration_g: ag_g,
        roofDisplacement_mm: Number(u_mm.toFixed(3)),
        displacements_mm: [Number(u_mm.toFixed(3))],
        velocities_m_s: [Number(v.toFixed(4))],
        accelerations_m_s2: [Number(a.toFixed(3))],
        baseShear_kN: Number(baseShear_kN.toFixed(2)),
        storyShears_kN: [Number(baseShear_kN.toFixed(2))],
        storyDrifts_percent: [0],
      });
    }

    // Static peak response: u_static = m * PGA / k
    const uStatic_mm = ((m * record.peakGroundAcceleration_g * NewmarkIntegrator.G_ACCEL) / k) * 1000;
    const daf = uStatic_mm > 0 ? maxU / uStatic_mm : 1.0;

    return {
      duration_s: Number((nPoints * dt).toFixed(2)),
      timeStep_s: dt,
      totalSteps: nPoints,
      peakRoofDisplacement_mm: Number(maxU.toFixed(3)),
      peakBaseShear_kN: Number(maxBaseShear.toFixed(2)),
      peakStoryDrift_percent: 0,
      dynamicAmplificationFactor: Number(daf.toFixed(2)),
      steps,
    };
  }

  /**
   * Solves an N-story MDOF shear building model.
   */
  public solveMdof(
    building: MdofShearBuilding,
    record: GroundMotionRecord,
    storyHeight_m: number = 3.5
  ): TimeHistoryResult {
    const N = building.storyMasses_kg.length;
    const dt = record.timeStep_s;

    // Mass matrix M and Stiffness matrix K
    const M: number[] = [...building.storyMasses_kg];
    const K: number[][] = Array.from({ length: N }, () => Array(N).fill(0));

    for (let i = 0; i < N; i++) {
      const ki = building.storyStiffnesses_N_m[i]!;
      const ki_plus_1 = i < N - 1 ? building.storyStiffnesses_N_m[i + 1]! : 0;
      K[i]![i] = ki + ki_plus_1;
      if (i > 0) {
        K[i]![i - 1] = -ki;
        K[i - 1]![i] = -ki;
      }
    }

    // Fundamental angular frequency approximation for Rayleigh damping:
    // Rayleigh C = alpha * M + beta * K
    const k1 = building.storyStiffnesses_N_m[0]!;
    const mTotal = M.reduce((a, b) => a + b, 0);
    const omega1 = Math.sqrt(k1 / mTotal);
    const omega2 = 3 * omega1;
    const xi = building.dampingRatio;

    const alphaR = (2 * xi * omega1 * omega2) / (omega1 + omega2);
    const betaR = (2 * xi) / (omega1 + omega2);

    // C matrix
    const C: number[][] = Array.from({ length: N }, () => Array(N).fill(0));
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const mPart = i === j ? alphaR * M[i]! : 0;
        C[i]![j] = mPart + betaR * K[i]![j]!;
      }
    }

    // Newmark coefficients
    const a0 = 1 / (this.beta * dt * dt);
    const a1 = this.gamma / (this.beta * dt);
    const a2 = 1 / (this.beta * dt);
    const a3 = 1 / (2 * this.beta) - 1;
    const a4 = this.gamma / this.beta - 1;
    const a5 = (dt / 2) * (this.gamma / this.beta - 2);

    // Effective stiffness matrix K_hat = K + a0 * M + a1 * C
    const KHat: number[][] = Array.from({ length: N }, () => Array(N).fill(0));
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const mTerm = i === j ? a0 * M[i]! : 0;
        KHat[i]![j] = K[i]![j]! + mTerm + a1 * C[i]![j]!;
      }
    }

    // Invert KHat for tridiagonal / small N using Gaussian elimination
    const invKHat = this.invertMatrix(KHat);

    let u = Array(N).fill(0);
    let v = Array(N).fill(0);
    let a = Array(N).fill(0);

    const steps: TimeHistoryStep[] = [];
    let maxRoofU = 0;
    let maxBaseShear = 0;
    let maxDriftPct = 0;

    const nPoints = record.accelerations_g.length;

    for (let stepIdx = 0; stepIdx < nPoints; stepIdx++) {
      const ag_g = record.accelerations_g[stepIdx]!;
      const ag_ms2 = ag_g * NewmarkIntegrator.G_ACCEL;
      const t = stepIdx * dt;

      // P_hat vector
      const pHat = Array(N).fill(0);
      for (let i = 0; i < N; i++) {
        // Pt[i] = -M[i] * ag
        const Pt_i = -M[i]! * ag_ms2;
        const mTerm = M[i]! * (a0 * u[i]! + a2 * v[i]! + a3 * a[i]!);

        let cTerm = 0;
        for (let j = 0; j < N; j++) {
          cTerm += C[i]![j]! * (a1 * u[j]! + a4 * v[j]! + a5 * a[j]!);
        }
        pHat[i] = Pt_i + mTerm + cTerm;
      }

      // uNext = invKHat * pHat
      const uNext = Array(N).fill(0);
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
          uNext[i] += invKHat[i]![j]! * pHat[j]!;
        }
      }

      // aNext, vNext
      const aNext = Array(N).fill(0);
      const vNext = Array(N).fill(0);
      for (let i = 0; i < N; i++) {
        aNext[i] = a0 * (uNext[i]! - u[i]!) - a2 * v[i]! - a3 * a[i]!;
        vNext[i] = v[i]! + dt * ((1 - this.gamma) * a[i]! + this.gamma * aNext[i]!);
      }

      u = uNext;
      v = vNext;
      a = aNext;

      const roofDisp_mm = u[N - 1]! * 1000;
      if (Math.abs(roofDisp_mm) > maxRoofU) maxRoofU = Math.abs(roofDisp_mm);

      // Base shear: Vb = k1 * u1
      const baseShear_kN = (building.storyStiffnesses_N_m[0]! * Math.abs(u[0]!)) / 1000;
      if (baseShear_kN > maxBaseShear) maxBaseShear = baseShear_kN;

      // Story drifts & story shears
      const storyDrifts: number[] = [];
      const storyShears: number[] = [];
      for (let i = 0; i < N; i++) {
        const prevU = i > 0 ? u[i - 1]! : 0;
        const delta_m = Math.abs(u[i]! - prevU);
        const driftPct = (delta_m / storyHeight_m) * 100;
        storyDrifts.push(Number(driftPct.toFixed(3)));
        if (driftPct > maxDriftPct) maxDriftPct = driftPct;

        const shear_kN = (building.storyStiffnesses_N_m[i]! * delta_m) / 1000;
        storyShears.push(Number(shear_kN.toFixed(2)));
      }

      steps.push({
        stepIndex: stepIdx,
        time_s: Number(t.toFixed(3)),
        groundAcceleration_g: ag_g,
        roofDisplacement_mm: Number(roofDisp_mm.toFixed(3)),
        displacements_mm: u.map(d => Number((d * 1000).toFixed(3))),
        velocities_m_s: v.map(vel => Number(vel.toFixed(4))),
        accelerations_m_s2: a.map(acc => Number(acc.toFixed(3))),
        baseShear_kN: Number(baseShear_kN.toFixed(2)),
        storyShears_kN: storyShears,
        storyDrifts_percent: storyDrifts,
      });
    }

    return {
      duration_s: Number((nPoints * dt).toFixed(2)),
      timeStep_s: dt,
      totalSteps: nPoints,
      peakRoofDisplacement_mm: Number(maxRoofU.toFixed(3)),
      peakBaseShear_kN: Number(maxBaseShear.toFixed(2)),
      peakStoryDrift_percent: Number(maxDriftPct.toFixed(3)),
      dynamicAmplificationFactor: 1.0,
      steps,
    };
  }

  /**
   * Gauss-Jordan elimination for matrix inversion.
   */
  private invertMatrix(A: number[][]): number[][] {
    const n = A.length;
    const augmented: number[][] = Array.from({ length: n }, (_, i) => [
      ...A[i]!,
      ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
    ]);

    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k]![i]!) > Math.abs(augmented[maxRow]![i]!)) {
          maxRow = k;
        }
      }
      // Swap rows
      const temp = augmented[i]!;
      augmented[i] = augmented[maxRow]!;
      augmented[maxRow] = temp;

      const pivot = augmented[i]![i]!;
      if (Math.abs(pivot) < 1e-12) continue;

      for (let j = 0; j < 2 * n; j++) {
        augmented[i]![j] /= pivot;
      }

      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = augmented[k]![i]!;
          for (let j = 0; j < 2 * n; j++) {
            augmented[k]![j] -= factor * augmented[i]![j]!;
          }
        }
      }
    }

    const inverse: number[][] = Array.from({ length: n }, (_, i) =>
      augmented[i]!.slice(n)
    );
    return inverse;
  }
}
