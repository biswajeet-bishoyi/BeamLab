import type { CodeClause } from '../DesignCodeClause';

export const AISC_360_CLAUSES: CodeClause[] = [
  {
    clauseId: 'AISC_D2',
    standard: 'AISC_360_16',
    sectionNumber: 'D2',
    title: 'Tensile Design Strength',
    description:
      'Nominal tensile strength of members based on gross section yielding and net section rupture.',
    limitState: 'ULTIMATE_STRENGTH',
    applicableActions: ['AXIAL_TENSION'],
    safetyFactors: { phi_t_yield: 0.90, phi_t_rupture: 0.75, omega_t_yield: 1.67, omega_t_rupture: 2.00 },
    crossReferences: ['AISC 360-16 Section B4.3', 'AISC 360-16 Section D3'],
    keywords: ['tension', 'yielding', 'rupture', 'P_n', 'A_g', 'A_e', 'LRFD', 'ASD'],
    equations: [
      {
        id: 'eq_D2_1',
        latex: 'P_n = F_y \\cdot A_g',
        description: 'Tensile yielding on the gross area (phi = 0.90)',
        variables: [
          { symbol: 'F_y', name: 'Yield stress', unit: 'Pa', description: 'Specified minimum yield stress' },
          { symbol: 'A_g', name: 'Gross area', unit: 'm^2', description: 'Gross cross-sectional area of member' },
        ],
      },
    ],
  },
  {
    clauseId: 'AISC_E3',
    standard: 'AISC_360_16',
    sectionNumber: 'E3',
    title: 'Compressive Strength for Flexural Buckling of Members without Slender Elements',
    description:
      'Nominal compressive strength P_n for columns based on elastic and inelastic flexural buckling.',
    limitState: 'STABILITY_BUCKLING',
    applicableActions: ['AXIAL_COMPRESSION'],
    safetyFactors: { phi_c: 0.90, omega_c: 1.67 },
    crossReferences: ['AISC 360-16 Section E1', 'AISC 360-16 Section E2', 'AISC 360-16 Section E4'],
    keywords: ['compression', 'column', 'buckling', 'critical stress', 'F_cr', 'Euler stress', 'F_e', 'slenderness ratio'],
    equations: [
      {
        id: 'eq_E3_1',
        latex: 'P_n = F_{cr} \\cdot A_g',
        description: 'Nominal compressive strength based on flexural buckling',
        variables: [
          { symbol: 'F_{cr}', name: 'Critical stress', unit: 'Pa', description: 'Flexural buckling critical stress' },
          { symbol: 'A_g', name: 'Gross area', unit: 'm^2', description: 'Gross cross-sectional area' },
        ],
      },
      {
        id: 'eq_E3_2',
        latex: 'F_{cr} = [0.658^{F_y / F_e}] \\cdot F_y \\quad \\text{when } \\frac{L_c}{r} \\le 4.71 \\sqrt{\\frac{E}{F_y}}',
        description: 'Inelastic column buckling critical stress',
        variables: [
          { symbol: 'F_e', name: 'Euler critical stress', unit: 'Pa', description: '\\pi^2 E / (L_c / r)^2' },
          { symbol: 'L_c/r', name: 'Effective slenderness ratio', unit: '-', description: 'Effective length divided by radius of gyration' },
        ],
      },
    ],
  },
  {
    clauseId: 'AISC_F2',
    standard: 'AISC_360_16',
    sectionNumber: 'F2',
    title: 'Doubly Symmetric Compact I-Shaped Members and Channels Bent about Their Major Axis',
    description:
      'Nominal flexural strength M_n based on plastic moment yielding and lateral-torsional buckling (LTB).',
    limitState: 'ULTIMATE_STRENGTH',
    applicableActions: ['MAJOR_FLEXURE', 'LATERAL_TORSIONAL_BUCKLING'],
    safetyFactors: { phi_b: 0.90, omega_b: 1.67 },
    crossReferences: ['AISC 360-16 Table B4.1b', 'AISC 360-16 Section F1'],
    keywords: ['flexure', 'beam', 'plastic moment', 'M_p', 'LTB', 'compact section', 'unbraced length', 'L_b'],
    equations: [
      {
        id: 'eq_F2_1',
        latex: 'M_n = M_p = F_y \\cdot Z_x',
        description: 'Plastic flexural yielding capacity for compact unbraced lengths L_b <= L_p',
        variables: [
          { symbol: 'F_y', name: 'Yield stress', unit: 'Pa', description: 'Specified minimum yield stress' },
          { symbol: 'Z_x', name: 'Plastic section modulus', unit: 'm^3', description: 'Plastic modulus about the major x-axis' },
        ],
      },
    ],
  },
  {
    clauseId: 'AISC_G2',
    standard: 'AISC_360_16',
    sectionNumber: 'G2',
    title: 'Shear Strength of Web without Tension Field Action',
    description:
      'Nominal shear strength V_n based on shear yielding and shear buckling of the web plate.',
    limitState: 'ULTIMATE_STRENGTH',
    applicableActions: ['SHEAR'],
    safetyFactors: { phi_v: 0.90, omega_v: 1.67 },
    crossReferences: ['AISC 360-16 Section G1'],
    keywords: ['shear', 'web', 'shear buckling', 'C_v1', 'V_n', 'A_w'],
    equations: [
      {
        id: 'eq_G2_1',
        latex: 'V_n = 0.6 \\cdot F_y \\cdot A_w \\cdot C_{v1}',
        description: 'Nominal web shear strength',
        variables: [
          { symbol: 'A_w', name: 'Web area', unit: 'm^2', description: 'Overall depth times web thickness d * t_w' },
          { symbol: 'C_{v1}', name: 'Web shear strength coefficient', unit: '-', description: 'Web shear coefficient (1.0 for stocky webs)' },
        ],
      },
    ],
  },
  {
    clauseId: 'AISC_H1',
    standard: 'AISC_360_16',
    sectionNumber: 'H1',
    title: 'Interaction of Flexure and Axial Force for Doubly Symmetric Members',
    description:
      'AISC 360-16 bilinear interaction equations for members subjected to combined axial load and flexure (P-M interaction).',
    limitState: 'STABILITY_BUCKLING',
    applicableActions: ['AXIAL_COMPRESSION', 'MAJOR_FLEXURE', 'MINOR_FLEXURE', 'COMBINED_P_M'],
    safetyFactors: { phi_c: 0.90, phi_b: 0.90 },
    crossReferences: ['AISC 360-16 Section H1.1', 'AISC 360-16 Chapter C'],
    keywords: ['combined forces', 'P-M interaction', 'beam-column', 'second-order effects', 'P_r / P_c', 'LRFD'],
    equations: [
      {
        id: 'eq_H1_1a',
        latex: '\\frac{P_r}{P_c} + \\frac{8}{9} \\left( \\frac{M_{rx}}{M_{cx}} + \\frac{M_{ry}}{M_{cy}} \\right) \\le 1.0 \\quad \\text{for } \\frac{P_r}{P_c} \\ge 0.2',
        description: 'Combined axial compression and flexural interaction for heavy axial load',
        variables: [
          { symbol: 'P_r', name: 'Required axial strength', unit: 'N', description: 'Factored design axial compression demand' },
          { symbol: 'P_c', name: 'Available axial strength', unit: 'N', description: 'Design axial compressive capacity phi_c * P_n' },
          { symbol: 'M_{rx}', name: 'Required major flexural strength', unit: 'N*m', description: 'Factored design moment about x-axis' },
          { symbol: 'M_{cx}', name: 'Available major flexural strength', unit: 'N*m', description: 'Design bending capacity phi_b * M_nx' },
        ],
      },
      {
        id: 'eq_H1_1b',
        latex: '\\frac{P_r}{2 P_c} + \\left( \\frac{M_{rx}}{M_{cx}} + \\frac{M_{ry}}{M_{cy}} \\right) \\le 1.0 \\quad \\text{for } \\frac{P_r}{P_c} < 0.2',
        description: 'Combined axial compression and flexural interaction for light axial load',
        variables: [
          { symbol: 'P_r', name: 'Required axial strength', unit: 'N', description: 'Factored design axial compression demand' },
          { symbol: 'P_c', name: 'Available axial strength', unit: 'N', description: 'Design axial compressive capacity phi_c * P_n' },
        ],
      },
    ],
  },
];
