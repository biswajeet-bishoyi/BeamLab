/**
 * FastenerGroupActionEngine: Evaluates group action factors, effective number of fasteners (n_ef),
 * spacing compliance, and multi-row connection capacity.
 */

export interface FastenerGroupConfig {
  /** Number of fasteners per row along the grain direction */
  fastenersPerRow: number;
  /** Number of parallel rows */
  numberOfRows: number;
  /** Fastener diameter d (mm) */
  diameter: number;
  /** Spacing along the grain a_1 (mm) */
  spacingAlongGrain: number;
  /** Spacing perpendicular to grain a_2 (mm) */
  spacingPerpGrain: number;
  /** Loaded end distance a_3 (mm) */
  endDistance: number;
  /** Edge distance a_4 (mm) */
  edgeDistance: number;
}

export interface FastenerGroupResult {
  /** Effective number of fasteners per row n_ef */
  nef: number;
  /** Total effective fasteners in group n_ef,total = rows * n_ef */
  totalEffectiveFasteners: number;
  /** Group efficiency ratio = n_ef / n */
  efficiencyRatio: number;
  /** Geometric spacing compliance */
  spacingChecks: {
    minSpacingAlongGrainMm: number;
    spacingAlongGrainOk: boolean;
    minSpacingPerpGrainMm: number;
    spacingPerpGrainOk: boolean;
    minEndDistanceMm: number;
    endDistanceOk: boolean;
    minEdgeDistanceMm: number;
    edgeDistanceOk: boolean;
    allSpacingsOk: boolean;
  };
  /** Total connection design capacity R_d (kN) */
  totalCapacityKN: number;
}

export class FastenerGroupActionEngine {
  /**
   * Eurocode 5 effective number of fasteners in a row parallel to grain (Clause 8.1.2.2).
   * n_ef = min(n, n^0.9 * (a_1 / (13 * d))^0.25)
   *
   * @param config Fastener group geometry
   * @param singleFastenerCapacityN Characteristic capacity per fastener per shear plane
   * @param kmod Modification factor
   * @param gammaM Material partial safety factor
   * @param shearPlanes Number of shear planes (1 for single shear, 2 for double shear)
   */
  static evaluateGroup(
    config: FastenerGroupConfig,
    singleFastenerCapacityN: number,
    kmod: number = 0.80,
    gammaM: number = 1.30,
    shearPlanes: number = 1
  ): FastenerGroupResult {
    const { fastenersPerRow, numberOfRows, diameter, spacingAlongGrain, spacingPerpGrain, endDistance, edgeDistance } = config;
    const n = fastenersPerRow;
    const d = diameter;

    // Eurocode 5 formula 8.34:
    // n_ef = min(n, n^0.9 * (a1 / (13 * d))^0.25)
    const ratio = spacingAlongGrain / (13 * d);
    const nefRaw = Math.pow(n, 0.9) * Math.pow(Math.max(0.1, ratio), 0.25);
    const nef = Math.min(n, nefRaw);
    const totalEffectiveFasteners = nef * numberOfRows * shearPlanes;
    const efficiencyRatio = nef / Math.max(1, n);

    // Minimum codified spacings (EN 1995-1-1 Table 8.2 & 8.4):
    // a1 >= 4*d for dowels/bolts
    const minSpacingAlongGrainMm = 5 * d;
    const spacingAlongGrainOk = spacingAlongGrain >= minSpacingAlongGrainMm;

    // a2 >= 3*d
    const minSpacingPerpGrainMm = 3 * d;
    const spacingPerpGrainOk = spacingPerpGrain >= minSpacingPerpGrainMm;

    // End distance a3 >= max(7*d, 80mm) for loaded end
    const minEndDistanceMm = Math.max(7 * d, 80);
    const endDistanceOk = endDistance >= minEndDistanceMm;

    // Edge distance a4 >= 3*d
    const minEdgeDistanceMm = 3 * d;
    const edgeDistanceOk = edgeDistance >= minEdgeDistanceMm;

    const allSpacingsOk = spacingAlongGrainOk && spacingPerpGrainOk && endDistanceOk && edgeDistanceOk;

    // Design capacity: R_d = totalEffective * (k_mod * F_v,Rk / gamma_M)
    const fvd = (kmod * singleFastenerCapacityN) / gammaM;
    const totalCapacityKN = (totalEffectiveFasteners * fvd) / 1000;

    return {
      nef,
      totalEffectiveFasteners,
      efficiencyRatio,
      spacingChecks: {
        minSpacingAlongGrainMm,
        spacingAlongGrainOk,
        minSpacingPerpGrainMm,
        spacingPerpGrainOk,
        minEndDistanceMm,
        endDistanceOk,
        minEdgeDistanceMm,
        edgeDistanceOk,
        allSpacingsOk,
      },
      totalCapacityKN,
    };
  }
}
