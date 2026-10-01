/**
 * Column Base Plate Design Engine
 * Conforms to AISC Design Guide 1 (2nd Ed.): Base Plate and Anchor Rod Design,
 * AISC 360-16 Chapter J (Section J8), and ACI 318.
 */

import {
  ColumnBasePlateConfig,
  ColumnBasePlateEvaluation,
  ANCHOR_ROD_DATABASE,
} from './BasePlateTypes';
import {
  DesignStandard,
  DesignMethod,
  LimitStateResult,
  STANDARD_BOLT_GEOMETRY,
  CalculationStep,
} from '../core/ConnectionTypes';

export class ColumnBasePlateEngine {
  /**
   * Evaluates a Column Base Plate under Axial Compression, Moment, and Shear
   */
  public static evaluate(options: {
    config: ColumnBasePlateConfig;
    axialDemand_Pu_kN: number;     // P_u (compression is positive)
    momentDemand_Mu_kNm: number;   // M_u (overturning moment)
    shearDemand_Vu_kN: number;     // V_u (shear force)
    standard?: DesignStandard;
    method?: DesignMethod;
  }): ColumnBasePlateEvaluation {
    const {
      config,
      axialDemand_Pu_kN,
      momentDemand_Mu_kNm,
      shearDemand_Vu_kN,
      standard = 'AISC_360_16',
      method = 'LRFD',
    } = options;

    const limitStateResults: LimitStateResult[] = [];

    const B = config.plateWidth_B_mm;
    const N = config.plateLength_N_mm;
    const A1_mm2 = B * N;

    // -------------------------------------------------------------
    // 1. Concrete Bearing Strength (AISC 360-16 Section J8)
    // -------------------------------------------------------------
    let sqrtA2A1 = 1.0;
    if (config.pedestalLength_Nped_mm && config.pedestalWidth_Bped_mm) {
      const A2_mm2 = config.pedestalLength_Nped_mm * config.pedestalWidth_Bped_mm;
      sqrtA2A1 = Math.min(2.0, Math.sqrt(A2_mm2 / A1_mm2));
    }

    const phi_c = 0.65;
    // Nominal bearing capacity: P_p = 0.85 * f'c * A1 * sqrt(A2/A1) <= 1.7 * f'c * A1
    const nominalBearingStress_MPa = Math.min(
      0.85 * config.concreteStrength_fc_MPa * sqrtA2A1,
      1.7 * config.concreteStrength_fc_MPa
    );
    const designBearingStress_fpmax_MPa = phi_c * nominalBearingStress_MPa;
    const qmax_N_per_mm = designBearingStress_fpmax_MPa * B; // Bearing capacity per mm length along N

    // -------------------------------------------------------------
    // 2. Eccentricity & Anchor Rod Tension Equilibrium
    // -------------------------------------------------------------
    const Pu_N = axialDemand_Pu_kN * 1000;
    const Mu_Nmm = momentDemand_Mu_kNm * 1e6;
    // Eccentricity e = M / P (mm)
    const e_mm = Pu_N > 0 ? Mu_Nmm / Pu_N : 9999;

    // Critical eccentricity e_crit: point where bearing stress reaches zero at opposite edge
    // e_crit = N/2 - P / (2 * q_max)
    const ecrit_mm = N / 2 - (Pu_N / (2 * qmax_N_per_mm));
    const isLargeEccentricity = e_mm > ecrit_mm;

    let bearingLength_Y_mm: number;
    let anchorTensionDemand_N = 0;
    let actualBearingStress_MPa: number;

    const distCenterToAnchor_f_mm = N / 2 - config.anchorDistanceToEdge_mm;

    if (!isLargeEccentricity && Pu_N > 0) {
      // Small eccentricity: triangular/trapezoidal bearing, no anchor rod tension
      bearingLength_Y_mm = Math.min(N, N - 2 * e_mm);
      anchorTensionDemand_N = 0;
      actualBearingStress_MPa = bearingLength_Y_mm > 0 ? (2 * Pu_N) / (B * bearingLength_Y_mm) : 0;
    } else {
      // Large eccentricity: Anchor rods in tension on windward/leeward side
      // Quadratic equation for bearing block length Y:
      // Y = (f + N/2) - sqrt( (f + N/2)^2 - 2 * P * (f + e) / q_max )
      const termA = distCenterToAnchor_f_mm + N / 2;
      const radical = Math.pow(termA, 2) - (2 * Pu_N * (distCenterToAnchor_f_mm + e_mm)) / qmax_N_per_mm;

      if (radical >= 0) {
        bearingLength_Y_mm = Math.max(10, termA - Math.sqrt(radical));
      } else {
        bearingLength_Y_mm = N / 2;
      }
      bearingLength_Y_mm = Math.min(N, bearingLength_Y_mm);

      // Anchor tension: T = q_max * Y - P
      anchorTensionDemand_N = Math.max(0, qmax_N_per_mm * bearingLength_Y_mm - Pu_N);
      actualBearingStress_MPa = designBearingStress_fpmax_MPa;
    }

    const anchorTensionDemand_kN = anchorTensionDemand_N / 1000;
    const bearingCapacity_kN = (designBearingStress_fpmax_MPa * A1_mm2) / 1000;
    const bearingUtil = bearingCapacity_kN > 0 ? axialDemand_Pu_kN / bearingCapacity_kN : 999;

    limitStateResults.push({
      limitState: 'Concrete Foundation Bearing',
      capacity_kN: bearingCapacity_kN,
      demand_kN: axialDemand_Pu_kN,
      utilization: bearingUtil,
      pass: actualBearingStress_MPa <= designBearingStress_fpmax_MPa,
      governingClause: 'AISC 360-16 Section J8 / AISC DG 1',
      steps: [
        {
          equationName: 'Design Concrete Bearing Stress f_{p,max}',
          latexFormula: 'f_{p,max} = 0.65 \\cdot 0.85 f\'_c \\sqrt{A_2/A_1}',
          substitutedValues: `0.65 (0.85 (${config.concreteStrength_fc_MPa})) (${sqrtA2A1.toFixed(2)}) = ${designBearingStress_fpmax_MPa.toFixed(2)} MPa`,
          resultValue: designBearingStress_fpmax_MPa,
          unit: 'MPa',
          citation: 'AISC 360-16 Eq. J8-2',
          pass: true,
        },
        {
          equationName: 'Eccentricity e vs e_{crit}',
          latexFormula: 'e = \\frac{M_u}{P_u},\\quad e_{crit} = \\frac{N}{2} - \\frac{P_u}{2 q_{max}}',
          substitutedValues: `e = ${e_mm.toFixed(1)} mm, \\; e_{crit} = ${ecrit_mm.toFixed(1)} mm (${isLargeEccentricity ? 'Large Eccentricity: Anchor Tension Active' : 'Small Eccentricity: Pure Bearing'})`,
          resultValue: e_mm,
          unit: 'mm',
          citation: 'AISC Design Guide 1 Section 3.2',
          pass: true,
        },
        {
          equationName: 'Bearing Block Length Y',
          latexFormula: 'Y',
          substitutedValues: `${bearingLength_Y_mm.toFixed(1)} mm`,
          resultValue: bearingLength_Y_mm,
          unit: 'mm',
          citation: 'AISC Design Guide 1 Eq. 3.4.7',
          pass: true,
        },
      ],
    });

    // -------------------------------------------------------------
    // 3. Anchor Rod Tensile Rupture
    // -------------------------------------------------------------
    const anchorProps = ANCHOR_ROD_DATABASE[config.anchorGrade];
    const geomAnchor = STANDARD_BOLT_GEOMETRY[config.anchorDiameter_mm] || {
      grossArea_mm2: (Math.PI * Math.pow(config.anchorDiameter_mm, 2)) / 4,
      tensileStressArea_mm2: 0.78 * ((Math.PI * Math.pow(config.anchorDiameter_mm, 2)) / 4),
    };

    const totalTensionAnchors = config.anchorTensionRows * config.anchorsPerRow;
    const singleAnchorTension_N = (0.75 * anchorProps.nominalTensileStrength_MPa * geomAnchor.grossArea_mm2);
    const totalAnchorTensionCap_kN = (totalTensionAnchors * singleAnchorTension_N) / 1000;
    const anchorUtil = totalAnchorTensionCap_kN > 0 ? anchorTensionDemand_kN / totalAnchorTensionCap_kN : 0;

    limitStateResults.push({
      limitState: 'Anchor Rod Tensile Rupture',
      capacity_kN: totalAnchorTensionCap_kN,
      demand_kN: anchorTensionDemand_kN,
      utilization: anchorUtil,
      pass: anchorTensionDemand_kN <= totalAnchorTensionCap_kN,
      governingClause: 'AISC 360-16 Section J3.6 / AISC DG 1',
      steps: [
        {
          equationName: 'Total Anchor Tension Demand T',
          latexFormula: 'T = q_{max} Y - P_u',
          substitutedValues: `${anchorTensionDemand_kN.toFixed(1)} kN (across ${totalTensionAnchors} anchors)`,
          resultValue: anchorTensionDemand_kN,
          unit: 'kN',
          citation: 'AISC Design Guide 1 Section 3.4',
          pass: true,
        },
        {
          equationName: 'Available Anchor Tensile Resistance \\phi N_n',
          latexFormula: '\\phi N_n = n_t \\cdot (0.75 F_{nt} A_b)',
          substitutedValues: `${totalTensionAnchors} \\cdot 0.75 (${anchorProps.nominalTensileStrength_MPa}) (${geomAnchor.grossArea_mm2.toFixed(1)}) / 1000 = ${totalAnchorTensionCap_kN.toFixed(1)} kN`,
          resultValue: totalAnchorTensionCap_kN,
          unit: 'kN',
          citation: 'AISC 360-16 Section J3.6',
          pass: anchorTensionDemand_kN <= totalAnchorTensionCap_kN,
          utilization: anchorUtil,
        },
      ],
    });

    // -------------------------------------------------------------
    // 4. Base Plate Bending & Required Thickness
    // -------------------------------------------------------------
    const d = config.columnDepth_d_mm;
    const bf = config.columnFlangeWidth_bf_mm;

    // Cantilever dimensions (AISC DG 1):
    const m_mm = (N - 0.95 * d) / 2;
    const n_mm = (B - 0.80 * bf) / 2;
    const nPrime_mm = Math.sqrt(d * bf) / 4;
    const governingCantilever_l_mm = Math.max(m_mm, n_mm, nPrime_mm);

    const phiBending = 0.90;
    let treq_mm: number;

    if (!isLargeEccentricity) {
      // AISC DG 1 Eq. 3.3.13: t_min = l * sqrt(2 * P_u / (phi * F_y * B * N))
      treq_mm = governingCantilever_l_mm * Math.sqrt((2 * Pu_N) / (phiBending * config.plateFy_MPa * B * N));
    } else {
      // Large eccentricity: check plate bending over bearing and plate bending over tension
      const treq_bearing = m_mm * Math.sqrt((2 * designBearingStress_fpmax_MPa) / (phiBending * config.plateFy_MPa));
      const leverTension_mm = Math.max(10, distCenterToAnchor_f_mm - d / 2 + config.columnFlangeThickness_tf_mm / 2);
      const treq_tension = Math.sqrt((4 * anchorTensionDemand_N * leverTension_mm) / (phiBending * config.plateFy_MPa * B));
      treq_mm = Math.max(treq_bearing, treq_tension);
    }

    const plateThicknessPass = config.plateThickness_mm >= treq_mm;
    const plateThicknessUtil = config.plateThickness_mm > 0 ? treq_mm / config.plateThickness_mm : 999;

    limitStateResults.push({
      limitState: 'Base Plate Cantilever Flexural Yielding',
      capacity_kN: (config.plateThickness_mm / Math.max(1, treq_mm)) * axialDemand_Pu_kN,
      demand_kN: axialDemand_Pu_kN,
      utilization: plateThicknessUtil,
      pass: plateThicknessPass,
      governingClause: 'AISC Design Guide 1 Section 3.3 / 3.4',
      steps: [
        {
          equationName: 'Cantilever Dimensions (m, n, n\')',
          latexFormula: 'm = \\frac{N - 0.95 d}{2},\\; n = \\frac{B - 0.80 b_f}{2},\\; n\' = \\frac{\\sqrt{d b_f}}{4}',
          substitutedValues: `m = ${m_mm.toFixed(1)} mm, \\; n = ${n_mm.toFixed(1)} mm, \\; n' = ${nPrime_mm.toFixed(1)} mm \\implies l = ${governingCantilever_l_mm.toFixed(1)} mm`,
          resultValue: governingCantilever_l_mm,
          unit: 'mm',
          citation: 'AISC Design Guide 1 Eq. 3.3.11',
          pass: true,
        },
        {
          equationName: 'Minimum Required Base Plate Thickness t_{min}',
          latexFormula: 't_{min}',
          substitutedValues: `${treq_mm.toFixed(1)} mm (Actual = ${config.plateThickness_mm} mm)`,
          resultValue: treq_mm,
          unit: 'mm',
          citation: 'AISC Design Guide 1',
          pass: plateThicknessPass,
          utilization: plateThicknessUtil,
        },
      ],
    });

    // -------------------------------------------------------------
    // 5. Base Plate Shear Transfer (Friction + Anchor Shear)
    // -------------------------------------------------------------
    const mu = config.frictionCoefficient || 0.45;
    const frictionCap_kN = (mu * Pu_N) / 1000;
    const remainingShear_kN = Math.max(0, shearDemand_Vu_kN - frictionCap_kN);

    const totalAnchors = (config.anchorTensionRows * 2) * config.anchorsPerRow;
    const singleAnchorShear_N = 0.75 * anchorProps.nominalShearStrength_MPa * geomAnchor.grossArea_mm2;
    const anchorShearCap_kN = (totalAnchors * singleAnchorShear_N) / 1000;
    const totalShearCap_kN = frictionCap_kN + anchorShearCap_kN;
    const shearUtil = totalShearCap_kN > 0 ? shearDemand_Vu_kN / totalShearCap_kN : 0;

    limitStateResults.push({
      limitState: 'Base Plate Shear Transfer (Friction & Anchors)',
      capacity_kN: totalShearCap_kN,
      demand_kN: shearDemand_Vu_kN,
      utilization: shearUtil,
      pass: shearDemand_Vu_kN <= totalShearCap_kN,
      governingClause: 'AISC Design Guide 1 Section 4.1',
      steps: [
        {
          equationName: 'Interface Friction Resistance V_{friction}',
          latexFormula: 'V_{friction} = \\mu \\cdot P_u',
          substitutedValues: `${mu} \\cdot ${axialDemand_Pu_kN.toFixed(1)} = ${frictionCap_kN.toFixed(1)} kN`,
          resultValue: frictionCap_kN,
          unit: 'kN',
          citation: 'AISC Design Guide 1 Section 4.1',
          pass: true,
        },
        {
          equationName: 'Total Available Shear Resistance',
          latexFormula: '\\phi V_n = V_{friction} + \\sum \\phi V_{anchor}',
          substitutedValues: `${frictionCap_kN.toFixed(1)} + ${anchorShearCap_kN.toFixed(1)} = ${totalShearCap_kN.toFixed(1)} kN`,
          resultValue: totalShearCap_kN,
          unit: 'kN',
          citation: 'AISC Design Guide 1',
          pass: shearDemand_Vu_kN <= totalShearCap_kN,
          utilization: shearUtil,
        },
      ],
    });

    // -------------------------------------------------------------
    // Find Governing Limit State
    // -------------------------------------------------------------
    let maxUtil = -1;
    let governingLS = '';

    for (const ls of limitStateResults) {
      if (ls.utilization > maxUtil) {
        maxUtil = ls.utilization;
        governingLS = ls.limitState;
      }
    }

    const overallPass = limitStateResults.every((ls) => ls.pass);

    return {
      connectionId: config.connectionId,
      standard,
      method,
      axialDemand_Pu_kN,
      momentDemand_Mu_kNm,
      shearDemand_Vu_kN,
      eccentricity_e_mm: e_mm,
      criticalEccentricity_ecrit_mm: ecrit_mm,
      isLargeEccentricity,
      bearingLength_Y_mm,
      anchorTensionDemand_kN,
      requiredPlateThickness_mm: treq_mm,
      actualPlateThickness_mm: config.plateThickness_mm,
      governingLimitState: governingLS,
      pass: overallPass,
      limitStateResults,
    };
  }
}
