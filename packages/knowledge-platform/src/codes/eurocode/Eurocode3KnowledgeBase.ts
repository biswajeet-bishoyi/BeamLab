import type { CodeClause } from '../DesignCodeClause';

export const EUROCODE_3_CLAUSES: CodeClause[] = [
  {
    clauseId: 'EC3_6_2_3',
    standard: 'EUROCODE_3',
    sectionNumber: '6.2.3',
    title: 'Tension Resistance of Cross-Sections',
    description:
      'Verification of members in axial tension under tension forces without significant moment.',
    limitState: 'ULTIMATE_STRENGTH',
    applicableActions: ['AXIAL_TENSION'],
    safetyFactors: { gamma_M0: 1.0, gamma_M2: 1.25 },
    crossReferences: ['EN 1993-1-1 §6.2.3(2)'],
    keywords: ['tension', 'yielding', 'net section', 'rupture', 'N_pl_Rd', 'N_u_Rd'],
    equations: [
      {
        id: 'eq_6_6',
        latex: 'N_{pl,Rd} = \\frac{A \\cdot f_y}{\\gamma_{M0}}',
        description: 'Design plastic resistance of gross cross-section',
        variables: [
          { symbol: 'A', name: 'Gross area', unit: 'm^2', description: 'Total cross-sectional area' },
          { symbol: 'f_y', name: 'Yield strength', unit: 'Pa', description: 'Nominal steel yield strength' },
          { symbol: '\\gamma_{M0}', name: 'Partial factor', unit: '-', description: 'Partial factor for cross-section resistance', defaultValue: 1.0 },
        ],
      },
    ],
  },
  {
    clauseId: 'EC3_6_2_4',
    standard: 'EUROCODE_3',
    sectionNumber: '6.2.4',
    title: 'Compression Resistance of Cross-Sections',
    description:
      'Design resistance of cross-section for uniform axial compression (Classes 1, 2, and 3).',
    limitState: 'ULTIMATE_STRENGTH',
    applicableActions: ['AXIAL_COMPRESSION'],
    safetyFactors: { gamma_M0: 1.0 },
    crossReferences: ['EN 1993-1-1 §5.5', 'EN 1993-1-1 §6.3.1'],
    keywords: ['compression', 'squash load', 'cross section', 'N_c_Rd', 'class 1', 'class 2', 'class 3'],
    equations: [
      {
        id: 'eq_6_10',
        latex: 'N_{c,Rd} = \\frac{A \\cdot f_y}{\\gamma_{M0}}',
        description: 'Design compression resistance of cross-section for Classes 1, 2, and 3',
        variables: [
          { symbol: 'A', name: 'Gross area', unit: 'm^2', description: 'Total cross-sectional area' },
          { symbol: 'f_y', name: 'Yield strength', unit: 'Pa', description: 'Nominal steel yield strength' },
          { symbol: '\\gamma_{M0}', name: 'Partial factor', unit: '-', description: 'Partial factor for cross-section resistance', defaultValue: 1.0 },
        ],
      },
    ],
  },
  {
    clauseId: 'EC3_6_2_5',
    standard: 'EUROCODE_3',
    sectionNumber: '6.2.5',
    title: 'Bending Moment Resistance of Cross-Sections',
    description:
      'Design resistance for major or minor axis bending moment for compact cross-sections (Classes 1 and 2).',
    limitState: 'ULTIMATE_STRENGTH',
    applicableActions: ['MAJOR_FLEXURE', 'MINOR_FLEXURE'],
    safetyFactors: { gamma_M0: 1.0 },
    crossReferences: ['EN 1993-1-1 §5.5', 'EN 1993-1-1 §6.3.2'],
    keywords: ['bending', 'moment', 'flexure', 'M_c_Rd', 'plastic section modulus', 'W_pl'],
    equations: [
      {
        id: 'eq_6_13',
        latex: 'M_{c,Rd} = M_{pl,Rd} = \\frac{W_{pl} \\cdot f_y}{\\gamma_{M0}}',
        description: 'Design plastic bending resistance of cross-section',
        variables: [
          { symbol: 'W_{pl}', name: 'Plastic section modulus', unit: 'm^3', description: 'Plastic modulus about bending axis' },
          { symbol: 'f_y', name: 'Yield strength', unit: 'Pa', description: 'Nominal steel yield strength' },
          { symbol: '\\gamma_{M0}', name: 'Partial factor', unit: '-', description: 'Partial factor for cross-section resistance', defaultValue: 1.0 },
        ],
      },
    ],
  },
  {
    clauseId: 'EC3_6_2_6',
    standard: 'EUROCODE_3',
    sectionNumber: '6.2.6',
    title: 'Shear Resistance of Cross-Sections',
    description:
      'Design shear resistance of cross-section without shear buckling verification.',
    limitState: 'ULTIMATE_STRENGTH',
    applicableActions: ['SHEAR'],
    safetyFactors: { gamma_M0: 1.0 },
    crossReferences: ['EN 1993-1-5 §5'],
    keywords: ['shear', 'shear area', 'V_c_Rd', 'von Mises', 'A_v'],
    equations: [
      {
        id: 'eq_6_18',
        latex: 'V_{c,Rd} = V_{pl,Rd} = \\frac{A_v \\cdot (f_y / \\sqrt{3})}{\\gamma_{M0}}',
        description: 'Design plastic shear resistance of cross-section',
        variables: [
          { symbol: 'A_v', name: 'Shear area', unit: 'm^2', description: 'Effective shear area of profile' },
          { symbol: 'f_y', name: 'Yield strength', unit: 'Pa', description: 'Nominal steel yield strength' },
          { symbol: '\\gamma_{M0}', name: 'Partial factor', unit: '-', description: 'Partial factor for cross-section resistance', defaultValue: 1.0 },
        ],
      },
    ],
  },
  {
    clauseId: 'EC3_6_3_1',
    standard: 'EUROCODE_3',
    sectionNumber: '6.3.1',
    title: 'Uniform Members in Compression (Flexural Buckling)',
    description:
      'Buckling resistance of compression members using Eurocode 3 buckling curves (a0, a, b, c, d).',
    limitState: 'STABILITY_BUCKLING',
    applicableActions: ['AXIAL_COMPRESSION'],
    safetyFactors: { gamma_M1: 1.0 },
    crossReferences: ['EN 1993-1-1 Table 6.1', 'EN 1993-1-1 Table 6.2'],
    keywords: ['column buckling', 'Euler buckling', 'slenderness', 'reduction factor chi', 'N_b_Rd', 'imperfection factor alpha'],
    equations: [
      {
        id: 'eq_6_47',
        latex: 'N_{b,Rd} = \\frac{\\chi \\cdot A \\cdot f_y}{\\gamma_{M1}}',
        description: 'Design buckling resistance of a compression member',
        variables: [
          { symbol: '\\chi', name: 'Buckling reduction factor', unit: '-', description: 'Reduction factor for relevant buckling curve' },
          { symbol: 'A', name: 'Gross area', unit: 'm^2', description: 'Cross-sectional area' },
          { symbol: 'f_y', name: 'Yield strength', unit: 'Pa', description: 'Steel yield strength' },
          { symbol: '\\gamma_{M1}', name: 'Partial factor', unit: '-', description: 'Partial factor for member stability', defaultValue: 1.0 },
        ],
      },
      {
        id: 'eq_6_49',
        latex: '\\chi = \\frac{1}{\\Phi + \\sqrt{\\Phi^2 - \\bar{\\lambda}^2}} \\le 1.0',
        description: 'Flexural buckling reduction factor formulation',
        variables: [
          { symbol: '\\Phi', name: 'Buckling parameter', unit: '-', description: '0.5 * (1 + alpha * (lambda_bar - 0.2) + lambda_bar^2)' },
          { symbol: '\\bar{\\lambda}', name: 'Non-dimensional slenderness', unit: '-', description: 'sqrt(A * fy / N_cr)' },
        ],
      },
    ],
  },
  {
    clauseId: 'EC3_6_3_2',
    standard: 'EUROCODE_3',
    sectionNumber: '6.3.2',
    title: 'Uniform Members in Bending (Lateral-Torsional Buckling)',
    description:
      'Lateral-torsional buckling resistance of beams subjected to major axis bending.',
    limitState: 'STABILITY_BUCKLING',
    applicableActions: ['MAJOR_FLEXURE', 'LATERAL_TORSIONAL_BUCKLING'],
    safetyFactors: { gamma_M1: 1.0 },
    crossReferences: ['EN 1993-1-1 §6.3.2.2', 'EN 1993-1-1 §6.3.2.3'],
    keywords: ['LTB', 'lateral-torsional buckling', 'M_b_Rd', 'elastic critical moment M_cr', 'chi_LT'],
    equations: [
      {
        id: 'eq_6_55',
        latex: 'M_{b,Rd} = \\frac{\\chi_{LT} \\cdot W_{pl,y} \\cdot f_y}{\\gamma_{M1}}',
        description: 'Design lateral-torsional buckling moment resistance',
        variables: [
          { symbol: '\\chi_{LT}', name: 'LTB reduction factor', unit: '-', description: 'Reduction factor for lateral-torsional buckling' },
          { symbol: 'W_{pl,y}', name: 'Plastic modulus y-axis', unit: 'm^3', description: 'Major axis plastic section modulus' },
          { symbol: 'f_y', name: 'Yield strength', unit: 'Pa', description: 'Steel yield strength' },
          { symbol: '\\gamma_{M1}', name: 'Partial factor', unit: '-', description: 'Partial factor for stability', defaultValue: 1.0 },
        ],
      },
    ],
  },
  {
    clauseId: 'EC3_6_3_3',
    standard: 'EUROCODE_3',
    sectionNumber: '6.3.3',
    title: 'Uniform Members in Bending and Axial Compression',
    description:
      'Interaction equations for members subjected to combined axial compression and biaxial bending moments.',
    limitState: 'STABILITY_BUCKLING',
    applicableActions: ['AXIAL_COMPRESSION', 'MAJOR_FLEXURE', 'MINOR_FLEXURE', 'COMBINED_P_M'],
    safetyFactors: { gamma_M1: 1.0 },
    crossReferences: ['EN 1993-1-1 Annex A', 'EN 1993-1-1 Annex B'],
    keywords: ['combined stress', 'interaction', 'P-M interaction', 'k_yy', 'k_yz', 'biaxial bending'],
    equations: [
      {
        id: 'eq_6_61',
        latex: '\\frac{N_{Ed}}{\\chi_y N_{Rk}/\\gamma_{M1}} + k_{yy} \\frac{M_{y,Ed}}{\\chi_{LT} M_{y,Rk}/\\gamma_{M1}} + k_{yz} \\frac{M_{z,Ed}}{M_{z,Rk}/\\gamma_{M1}} \\le 1.0',
        description: 'Eurocode 3 combined axial compression and bending interaction check (Clause 6.61)',
        variables: [
          { symbol: 'N_{Ed}', name: 'Axial design demand', unit: 'N', description: 'Applied factored axial compression force' },
          { symbol: 'M_{y,Ed}', name: 'Major bending demand', unit: 'N*m', description: 'Applied factored major-axis moment' },
          { symbol: 'M_{z,Ed}', name: 'Minor bending demand', unit: 'N*m', description: 'Applied factored minor-axis moment' },
          { symbol: 'k_{yy}', name: 'Interaction factor', unit: '-', description: 'Interaction factor from Annex A or Annex B' },
        ],
      },
    ],
  },
];
