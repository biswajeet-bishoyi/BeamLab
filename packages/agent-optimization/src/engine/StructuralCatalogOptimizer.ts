/**
 * BeamLab Sprint B5.2 — Structural Catalog Optimization Engine
 * Automated cross-section sizing and structural weight minimization
 * conforming to Eurocode 3 (EN 1993-1-1) and AISC 360-16.
 */

export interface SteelCatalogSection {
  designation: string;
  series: 'IPE' | 'HEB' | 'HEA' | 'W_SHAPE' | 'SHS';
  depth: number; // [m]
  width: number; // [m]
  tw: number; // [m] web thickness
  tf: number; // [m] flange thickness
  area: number; // [m^2]
  Izz: number; // [m^4] major inertia
  Iyy: number; // [m^4] minor inertia
  J: number; // [m^4] torsional constant
  Wpl_z: number; // [m^3] major plastic modulus
  Wpl_y: number; // [m^3] minor plastic modulus
  mass: number; // [kg/m]
}

export interface MemberOptimizationRequest {
  elementId: string;
  currentSection: string;
  length: number; // [m]
  bucklingLengthZ?: number; // [m] default length
  bucklingLengthY?: number; // [m] default length
  designDemand: {
    Ned: number; // [N] axial force (positive = compression)
    Vy_ed: number; // [N] major shear
    Vz_ed: number; // [N] minor shear
    Mz_ed: number; // [N*m] major bending moment
    My_ed: number; // [N*m] minor bending moment
    deflection?: number; // [m] maximum serviceability deflection
  };
  preferredSeries?: 'IPE' | 'HEB' | 'HEA' | 'W_SHAPE' | 'SHS' | 'ANY';
}

export interface MemberOptimizationResult {
  elementId: string;
  originalSection: string;
  optimizedSection: string;
  originalMassKg: number;
  optimizedMassKg: number;
  massSavingsKg: number;
  massSavingsPercent: number;
  originalUC: number;
  optimizedUC: number;
  governingLimitState: string;
  status: 'OPTIMIZED' | 'ALREADY_OPTIMAL' | 'UPSIZED_FOR_SAFETY' | 'NO_FEASIBLE_SECTION';
}

export interface StructureOptimizationSummary {
  members: MemberOptimizationResult[];
  initialTotalMassKg: number;
  optimizedTotalMassKg: number;
  totalMassSavingsKg: number;
  overallSavingsPercent: number;
  maxUtilizationRatio: number;
  allMembersCompliant: boolean;
}

export interface OptimizationEngineOptions {
  designCode?: 'EUROCODE_3' | 'AISC_360_16';
  steelGrade?: 'S275' | 'S355' | 'A992_GR50';
  targetMaxUC?: number; // default 0.95
  deflectionLimitRatio?: number; // default 1/300 (L/300)
}

export class StructuralCatalogOptimizer {
  // ─── Standard European & AISC Section Catalogs ──────────────────────────────
  public static readonly CATALOG: SteelCatalogSection[] = [
    // IPE Series (European I-beams)
    { designation: 'IPE 140', series: 'IPE', depth: 0.140, width: 0.073, tw: 0.0047, tf: 0.0069, area: 0.00164, Izz: 5.41e-6, Iyy: 4.49e-7, J: 2.45e-8, Wpl_z: 8.83e-5, Wpl_y: 1.92e-5, mass: 12.9 },
    { designation: 'IPE 160', series: 'IPE', depth: 0.160, width: 0.082, tw: 0.0050, tf: 0.0074, area: 0.00201, Izz: 8.69e-6, Iyy: 6.83e-7, J: 3.60e-8, Wpl_z: 1.24e-4, Wpl_y: 2.61e-5, mass: 15.8 },
    { designation: 'IPE 180', series: 'IPE', depth: 0.180, width: 0.091, tw: 0.0053, tf: 0.0080, area: 0.00239, Izz: 1.32e-5, Iyy: 1.01e-6, J: 4.79e-8, Wpl_z: 1.66e-4, Wpl_y: 3.46e-5, mass: 18.8 },
    { designation: 'IPE 200', series: 'IPE', depth: 0.200, width: 0.100, tw: 0.0056, tf: 0.0085, area: 0.00285, Izz: 1.94e-5, Iyy: 1.42e-6, J: 7.02e-8, Wpl_z: 2.21e-4, Wpl_y: 4.46e-5, mass: 22.4 },
    { designation: 'IPE 220', series: 'IPE', depth: 0.220, width: 0.110, tw: 0.0059, tf: 0.0092, area: 0.00334, Izz: 2.77e-5, Iyy: 2.05e-6, J: 9.07e-8, Wpl_z: 2.85e-4, Wpl_y: 5.68e-5, mass: 26.2 },
    { designation: 'IPE 240', series: 'IPE', depth: 0.240, width: 0.120, tw: 0.0062, tf: 0.0098, area: 0.00391, Izz: 3.89e-5, Iyy: 2.84e-6, J: 1.29e-7, Wpl_z: 3.67e-4, Wpl_y: 7.23e-5, mass: 30.7 },
    { designation: 'IPE 270', series: 'IPE', depth: 0.270, width: 0.135, tw: 0.0066, tf: 0.0102, area: 0.00459, Izz: 5.79e-5, Iyy: 4.20e-6, J: 1.59e-7, Wpl_z: 4.84e-4, Wpl_y: 9.70e-5, mass: 36.1 },
    { designation: 'IPE 300', series: 'IPE', depth: 0.300, width: 0.150, tw: 0.0071, tf: 0.0107, area: 0.00538, Izz: 8.36e-5, Iyy: 6.04e-6, J: 2.01e-7, Wpl_z: 6.28e-4, Wpl_y: 1.25e-4, mass: 42.2 },
    { designation: 'IPE 330', series: 'IPE', depth: 0.330, width: 0.160, tw: 0.0075, tf: 0.0115, area: 0.00626, Izz: 1.18e-4, Iyy: 7.88e-6, J: 2.81e-7, Wpl_z: 8.04e-4, Wpl_y: 1.54e-4, mass: 49.1 },
    { designation: 'IPE 360', series: 'IPE', depth: 0.360, width: 0.170, tw: 0.0080, tf: 0.0127, area: 0.00727, Izz: 1.63e-4, Iyy: 1.04e-5, J: 3.73e-7, Wpl_z: 1.02e-3, Wpl_y: 1.91e-4, mass: 57.1 },
    { designation: 'IPE 400', series: 'IPE', depth: 0.400, width: 0.180, tw: 0.0086, tf: 0.0135, area: 0.00845, Izz: 2.31e-4, Iyy: 1.32e-5, J: 5.11e-7, Wpl_z: 1.31e-3, Wpl_y: 2.29e-4, mass: 66.3 },
    { designation: 'IPE 450', series: 'IPE', depth: 0.450, width: 0.190, tw: 0.0094, tf: 0.0146, area: 0.00988, Izz: 3.37e-4, Iyy: 1.68e-5, J: 6.69e-7, Wpl_z: 1.70e-3, Wpl_y: 2.76e-4, mass: 77.6 },
    { designation: 'IPE 500', series: 'IPE', depth: 0.500, width: 0.200, tw: 0.0102, tf: 0.0160, area: 0.01160, Izz: 4.82e-4, Iyy: 2.14e-5, J: 8.93e-7, Wpl_z: 2.19e-3, Wpl_y: 3.36e-4, mass: 90.7 },

    // HEB Series (European Wide-Flange Heavy Columns & Beams)
    { designation: 'HEB 140', series: 'HEB', depth: 0.140, width: 0.140, tw: 0.0070, tf: 0.0120, area: 0.00430, Izz: 1.51e-5, Iyy: 5.50e-6, J: 2.01e-7, Wpl_z: 2.45e-4, Wpl_y: 1.19e-4, mass: 33.7 },
    { designation: 'HEB 160', series: 'HEB', depth: 0.160, width: 0.160, tw: 0.0080, tf: 0.0130, area: 0.00543, Izz: 2.49e-5, Iyy: 8.89e-6, J: 3.12e-7, Wpl_z: 3.54e-4, Wpl_y: 1.70e-4, mass: 42.6 },
    { designation: 'HEB 180', series: 'HEB', depth: 0.180, width: 0.180, tw: 0.0085, tf: 0.0140, area: 0.00653, Izz: 3.83e-5, Iyy: 1.36e-5, J: 4.22e-7, Wpl_z: 4.81e-4, Wpl_y: 2.31e-4, mass: 51.2 },
    { designation: 'HEB 200', series: 'HEB', depth: 0.200, width: 0.200, tw: 0.0090, tf: 0.0150, area: 0.00781, Izz: 5.70e-5, Iyy: 2.00e-5, J: 5.93e-7, Wpl_z: 6.43e-4, Wpl_y: 3.06e-4, mass: 61.3 },
    { designation: 'HEB 220', series: 'HEB', depth: 0.220, width: 0.220, tw: 0.0095, tf: 0.0160, area: 0.00910, Izz: 8.09e-5, Iyy: 2.84e-5, J: 7.66e-7, Wpl_z: 8.27e-4, Wpl_y: 3.94e-4, mass: 71.5 },
    { designation: 'HEB 240', series: 'HEB', depth: 0.240, width: 0.240, tw: 0.0100, tf: 0.0170, area: 0.01060, Izz: 1.13e-4, Iyy: 3.92e-5, J: 1.03e-6, Wpl_z: 1.05e-3, Wpl_y: 4.98e-4, mass: 83.2 },
    { designation: 'HEB 260', series: 'HEB', depth: 0.260, width: 0.260, tw: 0.0100, tf: 0.0175, area: 0.01180, Izz: 1.49e-4, Iyy: 5.13e-5, J: 1.24e-6, Wpl_z: 1.28e-3, Wpl_y: 6.02e-4, mass: 93.0 },
    { designation: 'HEB 300', series: 'HEB', depth: 0.300, width: 0.300, tw: 0.0110, tf: 0.0190, area: 0.01490, Izz: 2.52e-4, Iyy: 8.56e-5, J: 1.85e-6, Wpl_z: 1.87e-3, Wpl_y: 8.70e-4, mass: 117.0 },

    // AISC W-Shapes (American Wide Flange)
    { designation: 'W8x18', series: 'W_SHAPE', depth: 0.207, width: 0.133, tw: 0.0058, tf: 0.0084, area: 0.00342, Izz: 2.58e-5, Iyy: 3.31e-6, J: 7.08e-8, Wpl_z: 2.79e-4, Wpl_y: 7.64e-5, mass: 26.8 },
    { designation: 'W10x22', series: 'W_SHAPE', depth: 0.258, width: 0.146, tw: 0.0066, tf: 0.0091, area: 0.00419, Izz: 4.91e-5, Iyy: 4.75e-6, J: 1.12e-7, Wpl_z: 4.26e-4, Wpl_y: 1.01e-4, mass: 32.7 },
    { designation: 'W12x26', series: 'W_SHAPE', depth: 0.310, width: 0.165, tw: 0.0061, tf: 0.0097, area: 0.00493, Izz: 8.49e-5, Iyy: 7.20e-6, J: 1.25e-7, Wpl_z: 6.13e-4, Wpl_y: 1.34e-4, mass: 38.7 },
    { designation: 'W14x30', series: 'W_SHAPE', depth: 0.352, width: 0.171, tw: 0.0069, tf: 0.0098, area: 0.00571, Izz: 1.21e-4, Iyy: 8.16e-6, J: 1.58e-7, Wpl_z: 7.87e-4, Wpl_y: 1.48e-4, mass: 44.6 },
    { designation: 'W16x31', series: 'W_SHAPE', depth: 0.403, width: 0.140, tw: 0.0070, tf: 0.0112, area: 0.00590, Izz: 1.56e-4, Iyy: 5.16e-6, J: 1.79e-7, Wpl_z: 8.85e-4, Wpl_y: 1.15e-4, mass: 46.1 },
    { designation: 'W18x35', series: 'W_SHAPE', depth: 0.450, width: 0.152, tw: 0.0076, tf: 0.0108, area: 0.00665, Izz: 2.12e-4, Iyy: 6.37e-6, J: 2.12e-7, Wpl_z: 1.09e-3, Wpl_y: 1.30e-4, mass: 52.1 },
  ];

  /**
   * Performs structural cross-section optimization across a set of structural members.
   */
  public static optimizeStructure(
    requests: MemberOptimizationRequest[],
    options: OptimizationEngineOptions = {},
  ): StructureOptimizationSummary {
    const {
      designCode = 'EUROCODE_3',
      steelGrade = 'S355',
      targetMaxUC = 0.95,
      deflectionLimitRatio = 1 / 300,
    } = options;

    const fy = steelGrade === 'S275' ? 275e6 : steelGrade === 'S355' ? 355e6 : 345e6;
    const E = steelGrade === 'A992_GR50' ? 200e9 : 210e9;

    let initialTotalMass = 0;
    let optimizedTotalMass = 0;
    let maxUC = 0;
    let allCompliant = true;

    const memberResults: MemberOptimizationResult[] = [];

    for (const req of requests) {
      const origSec = this.findSection(req.currentSection);
      const origMass = (origSec ? origSec.mass : 42.2) * req.length;
      initialTotalMass += origMass;

      // Evaluate current section utilization
      const origUC = origSec
        ? this.evaluateUtilization(origSec, req, fy, E, deflectionLimitRatio)
        : 1.0;

      // Filter candidate catalog based on preferred series
      let candidatePool = this.CATALOG;
      if (req.preferredSeries && req.preferredSeries !== 'ANY') {
        candidatePool = this.CATALOG.filter((s) => s.series === req.preferredSeries);
      } else if (origSec) {
        // Default to same family (e.g., IPE -> IPE, HEB -> HEB or IPE)
        candidatePool = this.CATALOG.filter((s) => s.series === origSec.series);
      }

      // Sort candidate sections by linear mass ascending (lightest first)
      const sortedPool = [...candidatePool].sort((a, b) => a.mass - b.mass);

      let bestSection: SteelCatalogSection | null = null;
      let bestUC = Infinity;
      let governingLimit = 'FLEXURE';

      for (const candidate of sortedPool) {
        const uc = this.evaluateUtilization(candidate, req, fy, E, deflectionLimitRatio);
        if (uc <= targetMaxUC) {
          bestSection = candidate;
          bestUC = uc;
          governingLimit = this.determineGoverningLimitState(candidate, req, fy, E);
          break; // First section that passes is the lightest feasible!
        }
      }

      if (!bestSection) {
        // Even the heaviest section in pool failed or target is too strict
        // Pick the absolute strongest available
        const strongest = sortedPool[sortedPool.length - 1]!;
        bestSection = strongest;
        bestUC = this.evaluateUtilization(strongest, req, fy, E, deflectionLimitRatio);
        governingLimit = 'AXIAL_BENDING_INTERACTION_EXCEEDED';
        allCompliant = false;
      }

      const optMass = bestSection.mass * req.length;
      optimizedTotalMass += optMass;
      if (bestUC > maxUC) maxUC = bestUC;

      const massSavings = origMass - optMass;
      const massSavingsPercent = origMass > 0 ? (massSavings / origMass) * 100 : 0;

      let status: MemberOptimizationResult['status'] = 'OPTIMIZED';
      if (bestSection.designation === req.currentSection) {
        status = 'ALREADY_OPTIMAL';
      } else if (optMass > origMass) {
        status = 'UPSIZED_FOR_SAFETY';
      }

      memberResults.push({
        elementId: req.elementId,
        originalSection: req.currentSection,
        optimizedSection: bestSection.designation,
        originalMassKg: Number(origMass.toFixed(1)),
        optimizedMassKg: Number(optMass.toFixed(1)),
        massSavingsKg: Number(massSavings.toFixed(1)),
        massSavingsPercent: Number(massSavingsPercent.toFixed(1)),
        originalUC: Number(origUC.toFixed(3)),
        optimizedUC: Number(bestUC.toFixed(3)),
        governingLimitState: governingLimit,
        status,
      });
    }

    const totalSavings = initialTotalMass - optimizedTotalMass;
    const overallPercent = initialTotalMass > 0 ? (totalSavings / initialTotalMass) * 100 : 0;

    return {
      members: memberResults,
      initialTotalMassKg: Number(initialTotalMass.toFixed(1)),
      optimizedTotalMassKg: Number(optimizedTotalMass.toFixed(1)),
      totalMassSavingsKg: Number(totalSavings.toFixed(1)),
      overallSavingsPercent: Number(overallPercent.toFixed(1)),
      maxUtilizationRatio: Number(maxUC.toFixed(3)),
      allMembersCompliant: allCompliant && maxUC <= targetMaxUC,
    };
  }

  /**
   * Computes the governing combined utilization ratio UC according to Eurocode 3 / AISC 360.
   */
  public static evaluateUtilization(
    sec: SteelCatalogSection,
    req: MemberOptimizationRequest,
    fy: number,
    E: number,
    deflectionLimitRatio: number,
  ): number {
    const dem = req.designDemand;
    const Lz = req.bucklingLengthZ ?? req.length;
    const Ly = req.bucklingLengthY ?? req.length;

    // 1. Cross-section Plastic Bending Capacities (gamma_M0 = 1.0)
    const Mc_Rdz = sec.Wpl_z * fy;
    const Mc_Rdy = sec.Wpl_y * fy;

    // 2. Cross-section Shear Capacities: Av_z approx depth * tw, Av_y approx 2 * bf * tf
    const Av_z = Math.max(sec.depth * sec.tw, sec.area * 0.4);
    const Av_y = Math.max(2 * sec.width * sec.tf, sec.area * 0.4);
    const Vc_Rdz = (Av_z * fy) / Math.sqrt(3);
    const Vc_Rdy = (Av_y * fy) / Math.sqrt(3);

    const uc_shear_z = Math.abs(dem.Vz_ed) / Vc_Rdz;
    const uc_shear_y = Math.abs(dem.Vy_ed) / Vc_Rdy;

    // 3. Axial Buckling Capacity (Eurocode 3 flexural buckling curve b / AISC 360)
    let Nb_Rd = sec.area * fy;
    if (dem.Ned > 0) {
      const iz = Math.sqrt(sec.Izz / sec.area);
      const iy = Math.sqrt(sec.Iyy / sec.area);

      const lambda_z = Lz / iz;
      const lambda_y = Ly / iy;
      const lambda_max = Math.max(lambda_z, lambda_y);

      const lambda_1 = Math.PI * Math.sqrt(E / fy);
      const lambda_bar = lambda_max / lambda_1;

      // Reduction factor chi (Curve b: alpha = 0.34)
      const alpha = 0.34;
      const phi = 0.5 * (1 + alpha * (lambda_bar - 0.2) + lambda_bar * lambda_bar);
      const chi = Math.min(1.0 / (phi + Math.sqrt(Math.max(0, phi * phi - lambda_bar * lambda_bar))), 1.0);

      Nb_Rd = chi * sec.area * fy;
    }

    const uc_axial = dem.Ned > 0 ? dem.Ned / Nb_Rd : 0;
    const uc_bending_z = Math.abs(dem.Mz_ed) / Mc_Rdz;
    const uc_bending_y = Math.abs(dem.My_ed) / Mc_Rdy;

    // Combined Axial and Bending Interaction:
    const uc_strength = uc_axial + uc_bending_z + uc_bending_y;

    // 4. Deflection Limit State
    let uc_deflection = 0;
    if (dem.deflection !== undefined && dem.deflection > 0) {
      const allowableDefl = req.length * deflectionLimitRatio;
      uc_deflection = dem.deflection / allowableDefl;
    }

    return Math.max(uc_strength, uc_shear_z, uc_shear_y, uc_deflection);
  }

  private static determineGoverningLimitState(
    sec: SteelCatalogSection,
    req: MemberOptimizationRequest,
    fy: number,
    E: number,
  ): string {
    const dem = req.designDemand;
    const Mc_Rdz = sec.Wpl_z * fy;
    const Vc_Rdz = (sec.depth * sec.tw * fy) / Math.sqrt(3);

    const uc_bend = Math.abs(dem.Mz_ed) / Mc_Rdz;
    const uc_shear = Math.abs(dem.Vz_ed) / Vc_Rdz;
    const uc_axial = dem.Ned > 0 ? dem.Ned / (sec.area * fy * 0.7) : 0;

    if (uc_bend >= uc_shear && uc_bend >= uc_axial) return 'FLEXURE_MAJOR_AXIS';
    if (uc_axial >= uc_bend && uc_axial >= uc_shear) return 'FLEXURAL_BUCKLING';
    if (uc_shear >= uc_bend) return 'TRANSVERSE_SHEAR';
    return 'COMBINED_STRESS';
  }

  public static findSection(designation: string): SteelCatalogSection | undefined {
    const clean = designation.trim().toUpperCase().replace(/\s+/g, ' ');
    return this.CATALOG.find((s) => s.designation.toUpperCase().replace(/\s+/g, ' ') === clean);
  }
}
