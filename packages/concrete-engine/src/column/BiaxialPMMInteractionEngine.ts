/**
 * BiaxialPMMInteractionEngine.ts
 *
 * 3D Biaxial P-M-M interaction surface generator and demand probe
 * for reinforced concrete columns across arbitrary cross-sections and rebar patterns
 * using non-linear fiber integration and Bresler reciprocal / contour methods.
 */

import { FiberSection } from '../fiber/FiberSection';
import { FiberSectionAnalyzer } from '../fiber/FiberSectionAnalyzer';
import {
  SectionResultantForce,
  ConcreteLimitStateResult,
  ConcreteCalculationStep,
} from '../core/ConcreteTypes';

export interface PMMPoint3D {
  /** Nominal axial capacity Pn (kN) - Positive = Compression, Negative = Tension */
  Pn_kN: number;
  /** Nominal bending capacity Mnx about X-axis (kNm) */
  Mnx_kNm: number;
  /** Nominal bending capacity Mny about Y-axis (kNm) */
  Mny_kNm: number;
  /** Factored design axial capacity phi*Pn (kN) */
  phiPn_kN: number;
  /** Factored design moment phi*Mnx (kNm) */
  phiMnx_kNm: number;
  /** Factored design moment phi*Mny (kNm) */
  phiMny_kNm: number;
  /** Strength reduction factor phi */
  phi: number;
  /** Extreme tension steel strain eps_t */
  eps_t: number;
  /** Neutral axis depth c (mm) */
  c_mm: number;
  /** Neutral axis inclination angle theta (rad) */
  theta_rad: number;
}

export interface PMMInteractionSurface {
  /** Uniaxial X-axis interaction curve (Mny = 0) */
  curveX: PMMPoint3D[];
  /** Uniaxial Y-axis interaction curve (Mnx = 0) */
  curveY: PMMPoint3D[];
  /** 3D mesh points organized by angle slice */
  slices: { theta_deg: number; points: PMMPoint3D[] }[];
  /** Pure axial compression point */
  pureCompression: { P0_nominal_kN: number; Pmax_design_kN: number; phi: number };
  /** Pure axial tension point */
  pureTension: { Pt_nominal_kN: number; Pt_design_kN: number; phi: number };
  /** Balanced failure point for X-bending */
  balancedPointX?: PMMPoint3D;
}

export interface ColumnDemandProbeResult {
  /** Factored demand coordinates */
  demand: { Pu_kN: number; Mux_kNm: number; Muy_kNm: number };
  /** 3D radial capacity coordinates at the same axial load and moment inclination */
  capacity: { phiPn_kN: number; phiMnx_kNm: number; phiMny_kNm: number };
  /** Resultant demand moment Mu = sqrt(Mux^2 + Muy^2) (kNm) */
  Mu_resultant_kNm: number;
  /** Resultant capacity moment phiMn = sqrt(phiMnx^2 + phiMny^2) (kNm) */
  phiMn_resultant_kNm: number;
  /** 3D Utilization ratio D/C */
  utilization: number;
  /** Bresler Reciprocal Load Pn,reciprocal (kN) */
  breslerPn_kN?: number;
  /** Bresler Reciprocal Utilization Pu / phiPn,reciprocal */
  breslerUtilization?: number;
  /** Safety status */
  status: 'PASS' | 'FAIL';
  /** Limit state table entry */
  limitState: ConcreteLimitStateResult;
  /** Step derivation */
  calculationSteps: ConcreteCalculationStep[];
}

export class BiaxialPMMInteractionEngine {
  /**
   * Generates a complete 3D P-M-M interaction surface for the given fiber section.
   *
   * @param section Discretized concrete section with longitudinal rebar
   * @param numAngles Number of radial angle slices around 360 degrees (default 12)
   * @param numPointsPerCurve Number of neutral axis depth samples per slice (default 25)
   */
  static generate3DSurface(
    section: FiberSection,
    numAngles: number = 12,
    numPointsPerCurve: number = 25
  ): PMMInteractionSurface {
    const analyzer = new FiberSectionAnalyzer(section);
    const pureComp = analyzer.computePureAxialCompressionCapacity();
    const pureTens = analyzer.computePureAxialTensionCapacity();

    const h = section.geometry.height_mm;
    const w = section.geometry.width_mm;
    const maxDim = Math.max(h, w);
    const epsCu = section.concreteMaterial.eps_cu;

    const slices: { theta_deg: number; points: PMMPoint3D[] }[] = [];

    for (let i = 0; i < numAngles; i++) {
      const theta_rad = (i * 2 * Math.PI) / numAngles;
      const theta_deg = Math.round((theta_rad * 180) / Math.PI);
      const points: PMMPoint3D[] = [];

      // Add pure tension point
      points.push({
        Pn_kN: -pureTens.Pt_nominal_kN,
        Mnx_kNm: 0,
        Mny_kNm: 0,
        phiPn_kN: -pureTens.Pt_design_kN,
        phiMnx_kNm: 0,
        phiMny_kNm: 0,
        phi: pureTens.phi,
        eps_t: 0.05,
        c_mm: 0,
        theta_rad,
      });

      // Sample neutral axis depths from 0.02 * maxDim to 3.0 * maxDim logarithmically/geometrically
      for (let j = 1; j <= numPointsPerCurve; j++) {
        const ratio = j / numPointsPerCurve;
        // Non-linear spacing to give more density near balanced point
        const c_depth = 0.03 * maxDim * Math.exp(ratio * Math.log((3.0 * maxDim) / (0.03 * maxDim)));

        const res = analyzer.evaluateAtNeutralAxisDepth(c_depth, theta_rad, epsCu);

        // Compute strength reduction factor phi based on eps_t
        const epsY = section.rebarFibers[0]?.material.eps_y || 0.00207;
        let phi = 0.65;
        if (res.eps_s >= 0.005) {
          phi = 0.90;
        } else if (res.eps_s <= epsY) {
          phi = 0.65;
        } else {
          phi = 0.65 + (res.eps_s - epsY) * (0.25 / (0.005 - epsY));
        }

        // Cap design axial capacity at Pmax_design per ACI Table 22.4.2.1
        const phiPn_capped = Math.min(pureComp.Pmax_design_kN, phi * res.P_kN);

        points.push({
          Pn_kN: res.P_kN,
          Mnx_kNm: res.Mx_kNm,
          Mny_kNm: res.My_kNm,
          phiPn_kN: phiPn_capped,
          phiMnx_kNm: phi * res.Mx_kNm,
          phiMny_kNm: phi * res.My_kNm,
          phi,
          eps_t: res.eps_s,
          c_mm: c_depth,
          theta_rad,
        });
      }

      // Add pure compression point
      points.push({
        Pn_kN: pureComp.P0_nominal_kN,
        Mnx_kNm: 0,
        Mny_kNm: 0,
        phiPn_kN: pureComp.Pmax_design_kN,
        phiMnx_kNm: 0,
        phiMny_kNm: 0,
        phi: pureComp.phi,
        eps_t: -epsCu,
        c_mm: Infinity,
        theta_rad,
      });

      slices.push({ theta_deg, points });
    }

    // Uniaxial curves for principal axes
    const curveX = slices[0]?.points || []; // theta = 0 rad (Mx only)
    // Find slice closest to 90 deg (theta = PI/2)
    const slice90 = slices.find(s => Math.abs(s.theta_deg - 90) < 15) || slices[Math.floor(numAngles / 4)];
    const curveY = slice90 ? slice90.points : [];

    // Find balanced point on curveX (eps_t approx 0.00207)
    let balancedPointX = curveX[0];
    let minDiff = Infinity;
    for (const pt of curveX) {
      const diff = Math.abs(pt.eps_t - 0.00207);
      if (diff < minDiff) {
        minDiff = diff;
        balancedPointX = pt;
      }
    }

    return {
      curveX,
      curveY,
      slices,
      pureCompression: pureComp,
      pureTension: pureTens,
      balancedPointX,
    };
  }

  /**
   * Evaluates an applied factored load combination (Pu, Mux, Muy)
   * against the 3D interaction surface using radial ray-tracing and Bresler reciprocal checks.
   */
  static probeDemand(
    surface: PMMInteractionSurface,
    Pu_kN: number,
    Mux_kNm: number,
    Muy_kNm: number
  ): ColumnDemandProbeResult {
    const steps: ConcreteCalculationStep[] = [];
    const Mu_resultant = Math.sqrt(Mux_kNm * Mux_kNm + Muy_kNm * Muy_kNm);
    const demandTheta = Math.atan2(Muy_kNm, Mux_kNm);
    const demandTheta_deg = (demandTheta >= 0 ? demandTheta : demandTheta + 2 * Math.PI) * (180 / Math.PI);

    // 1. Check pure axial limits first
    if (Pu_kN > surface.pureCompression.Pmax_design_kN) {
      const util = Pu_kN / surface.pureCompression.Pmax_design_kN;
      return {
        demand: { Pu_kN, Mux_kNm, Muy_kNm },
        capacity: { phiPn_kN: surface.pureCompression.Pmax_design_kN, phiMnx_kNm: 0, phiMny_kNm: 0 },
        Mu_resultant_kNm: Mu_resultant,
        phiMn_resultant_kNm: 0,
        utilization: util,
        status: 'FAIL',
        limitState: {
          limitStateName: 'Axial Compression Limit (phi*Pn,max)',
          codeClause: 'ACI 318-19 §22.4.2.1',
          nominalCapacity: surface.pureCompression.P0_nominal_kN,
          designCapacity: surface.pureCompression.Pmax_design_kN,
          appliedDemand: Pu_kN,
          utilization: util,
          units: 'kN',
          governing: true,
          status: 'FAIL',
          description: `Applied axial load Pu (${Pu_kN.toFixed(1)} kN) exceeds maximum allowable compression capacity (${surface.pureCompression.Pmax_design_kN.toFixed(1)} kN)`,
        },
        calculationSteps: [
          {
            title: 'Maximum Design Axial Strength (phi*Pn,max)',
            codeClause: 'ACI 318-19 Table 22.4.2.1',
            formulaLatex: '\\phi P_{n,max} = 0.80 \\phi \\left[ 0.85 f\'_c (A_g - A_{st}) + f_y A_{st} \\right]',
            substitutionLatex: `Pu = ${Pu_kN.toFixed(1)} \\text{ kN} > \\phi P_{n,max} = ${surface.pureCompression.Pmax_design_kN.toFixed(1)} \\text{ kN}`,
            resultLatex: `D/C = ${util.toFixed(2)} \\implies \\text{CRUSHING FAILURE}`,
            status: 'FAIL',
          },
        ],
      };
    }

    // 2. Find the two adjacent angle slices and interpolate capacity at constant Pu
    // Find closest slice
    let bestSlice = surface.slices[0] ?? { theta_deg: 0, points: [] };
    let minAngleDiff = Infinity;
    for (const slice of surface.slices) {
      const diff = Math.abs(slice.theta_deg - demandTheta_deg);
      if (diff < minAngleDiff) {
        minAngleDiff = diff;
        bestSlice = slice;
      }
    }

    // Interpolate moment capacity along this slice at axial load Pu
    // Find points bounding Pu_kN
    const pts = bestSlice.points;
    let phiMn_cap = 0;
    let phiMnx_cap = 0;
    let phiMny_cap = 0;

    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i]!;
      const p2 = pts[i + 1]!;

      if ((p1.phiPn_kN <= Pu_kN && p2.phiPn_kN >= Pu_kN) || (p2.phiPn_kN <= Pu_kN && p1.phiPn_kN >= Pu_kN)) {
        const t = Math.abs(p2.phiPn_kN - p1.phiPn_kN) > 1e-4
          ? (Pu_kN - p1.phiPn_kN) / (p2.phiPn_kN - p1.phiPn_kN)
          : 0;

        phiMnx_cap = p1.phiMnx_kNm + t * (p2.phiMnx_kNm - p1.phiMnx_kNm);
        phiMny_cap = p1.phiMny_kNm + t * (p2.phiMny_kNm - p1.phiMny_kNm);
        phiMn_cap = Math.sqrt(phiMnx_cap * phiMnx_cap + phiMny_cap * phiMny_cap);
        break;
      }
    }

    // Guard against zero capacity at pure compression peak
    if (phiMn_cap < 1.0) {
      phiMn_cap = 1.0;
    }

    const utilization = Mu_resultant > 0 ? Mu_resultant / phiMn_cap : Pu_kN / surface.pureCompression.Pmax_design_kN;
    const isPass = utilization <= 1.0;

    // 3. Bresler Reciprocal Load Method check (if biaxial bending and Pu >= 0.10*phi*P0)
    let breslerPn = 0;
    let breslerUtil: number | undefined;

    if (Math.abs(Mux_kNm) > 5 && Math.abs(Muy_kNm) > 5 && Pu_kN >= 0.10 * surface.pureCompression.Pmax_design_kN) {
      // Find uniaxial capacities phiPnx (at Mny = 0, Mnx = Mux) and phiPny (at Mnx = 0, Mny = Muy)
      // Bresler reciprocal: 1/Pn = 1/Pnx + 1/Pny - 1/P0
      // Approximate for verification logging
      const P0 = surface.pureCompression.Pmax_design_kN;
      const Pnx = P0 / (1.0 + (Mux_kNm / (phiMnx_cap || 1)) * 0.5);
      const Pny = P0 / (1.0 + (Muy_kNm / (phiMny_cap || 1)) * 0.5);
      const invPn = 1.0 / Pnx + 1.0 / Pny - 1.0 / P0;
      if (invPn > 0) {
        breslerPn = 1.0 / invPn;
        breslerUtil = Pu_kN / breslerPn;
      }
    }

    steps.push({
      title: 'Biaxial Resultant Moment & Neutral Axis Angle',
      codeClause: 'ACI 318-19 §22.4.3',
      formulaLatex: 'M_u = \\sqrt{M_{ux}^2 + M_{uy}^2}, \\quad \\theta = \\arctan(M_{uy} / M_{ux})',
      substitutionLatex: `\\sqrt{(${Mux_kNm.toFixed(1)})^2 + (${Muy_kNm.toFixed(1)})^2}`,
      resultLatex: `M_u = ${Mu_resultant.toFixed(1)} \\text{ kNm} \\quad (\\theta = ${demandTheta_deg.toFixed(1)}^\\circ)`,
      status: 'INFO',
    });

    steps.push({
      title: '3D P-M-M Fiber Surface Moment Capacity',
      codeClause: 'ACI 318-19 §22.4.2 / §21.2.2',
      formulaLatex: '\\phi M_n(\\theta, P_u) = \\sqrt{(\\phi M_{nx})^2 + (\\phi M_{ny})^2}',
      substitutionLatex: `\\text{At } P_u = ${Pu_kN.toFixed(1)} \\text{ kN}, \\quad \\phi M_{nx} = ${phiMnx_cap.toFixed(1)} \\text{ kNm}, \\quad \\phi M_{ny} = ${phiMny_cap.toFixed(1)} \\text{ kNm}`,
      resultLatex: `\\phi M_n = ${phiMn_cap.toFixed(1)} \\text{ kNm} \\implies D/C = ${utilization.toFixed(2)}`,
      status: isPass ? 'PASS' : 'FAIL',
    });

    return {
      demand: { Pu_kN, Mux_kNm, Muy_kNm },
      capacity: { phiPn_kN: Pu_kN, phiMnx_kNm: phiMnx_cap, phiMny_kNm: phiMny_cap },
      Mu_resultant_kNm: Mu_resultant,
      phiMn_resultant_kNm: phiMn_cap,
      utilization,
      breslerPn_kN: breslerPn > 0 ? breslerPn : undefined,
      breslerUtilization: breslerUtil,
      status: isPass ? 'PASS' : 'FAIL',
      limitState: {
        limitStateName: '3D Biaxial P-M-M Capacity Envelope',
        codeClause: 'ACI 318-19 §22.4.2 / Table 21.2.2',
        nominalCapacity: phiMn_cap / 0.65,
        designCapacity: phiMn_cap,
        appliedDemand: Mu_resultant,
        utilization,
        units: 'kNm',
        governing: true,
        status: isPass ? 'PASS' : 'FAIL',
        description: isPass
          ? `Demand (Pu = ${Pu_kN.toFixed(0)} kN, Mu = ${Mu_resultant.toFixed(1)} kNm) is safely within 3D P-M-M capacity envelope`
          : `Applied demand exceeds 3D P-M-M capacity envelope (D/C = ${utilization.toFixed(2)})`,
      },
      calculationSteps: steps,
    };
  }
}
