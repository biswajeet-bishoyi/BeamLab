import type { CodeClause } from '../DesignCodeClause';

export const IS_800_CLAUSES: CodeClause[] = [
  {
    clauseId: 'IS800_6_2',
    standard: 'IS_800_2007',
    sectionNumber: '6.2',
    title: 'Design Strength in Tension Due to Yielding of Gross Section',
    description:
      'Tension capacity governed by yielding of the gross cross-section.',
    limitState: 'ULTIMATE_STRENGTH',
    applicableActions: ['AXIAL_TENSION'],
    safetyFactors: { gamma_m0: 1.10, gamma_m1: 1.25 },
    crossReferences: ['IS 800:2007 Clause 6.1', 'IS 800:2007 Table 5'],
    keywords: ['tension', 'yielding', 'gross area', 'T_dg', 'gamma_m0'],
    equations: [
      {
        id: 'eq_IS_6_2',
        latex: 'T_{dg} = \\frac{A_g \\cdot f_y}{\\gamma_{m0}}',
        description: 'Design strength of member under axial tension governed by yielding',
        variables: [
          { symbol: 'A_g', name: 'Gross area', unit: 'm^2', description: 'Gross cross-sectional area' },
          { symbol: 'f_y', name: 'Yield stress', unit: 'Pa', description: 'Yield stress of material' },
          { symbol: '\\gamma_{m0}', name: 'Partial safety factor', unit: '-', description: 'Partial safety factor against yielding', defaultValue: 1.10 },
        ],
      },
    ],
  },
  {
    clauseId: 'IS800_7_1_2',
    standard: 'IS_800_2007',
    sectionNumber: '7.1.2',
    title: 'Design Compressive Strength of Axial Compression Members',
    description:
      'Axial compression resistance based on non-dimensional slenderness and Perry-Robertson buckling curves.',
    limitState: 'STABILITY_BUCKLING',
    applicableActions: ['AXIAL_COMPRESSION'],
    safetyFactors: { gamma_m0: 1.10 },
    crossReferences: ['IS 800:2007 Table 7', 'IS 800:2007 Table 10'],
    keywords: ['compression', 'column buckling', 'f_cd', 'slenderness', 'P_d', 'Perry-Robertson'],
    equations: [
      {
        id: 'eq_IS_7_1',
        latex: 'P_d = A_e \\cdot f_{cd}',
        description: 'Design compressive strength of member',
        variables: [
          { symbol: 'A_e', name: 'Effective area', unit: 'm^2', description: 'Effective cross-sectional area' },
          { symbol: 'f_{cd}', name: 'Design compressive stress', unit: 'Pa', description: 'Design compressive stress \\chi f_y / \\gamma_{m0}' },
        ],
      },
      {
        id: 'eq_IS_7_2',
        latex: 'f_{cd} = \\frac{f_y / \\gamma_{m0}}{\\phi + \\sqrt{\\phi^2 - \\lambda^2}} = \\chi \\cdot \\frac{f_y}{\\gamma_{m0}} \\le \\frac{f_y}{\\gamma_{m0}}',
        description: 'Design compressive stress formulation',
        variables: [
          { symbol: '\\phi', name: 'Buckling parameter', unit: '-', description: '0.5 * [1 + alpha * (lambda - 0.2) + lambda^2]' },
          { symbol: '\\lambda', name: 'Non-dimensional slenderness', unit: '-', description: 'sqrt(f_y / f_{cc})' },
        ],
      },
    ],
  },
  {
    clauseId: 'IS800_8_2',
    standard: 'IS_800_2007',
    sectionNumber: '8.2',
    title: 'Design Bending Strength of Beams (Flexure)',
    description:
      'Design bending resistance for laterally supported beams under major or minor axis moment.',
    limitState: 'ULTIMATE_STRENGTH',
    applicableActions: ['MAJOR_FLEXURE', 'MINOR_FLEXURE'],
    safetyFactors: { gamma_m0: 1.10 },
    crossReferences: ['IS 800:2007 Clause 8.2.1.2', 'IS 800:2007 Clause 8.2.2'],
    keywords: ['bending', 'flexure', 'M_d', 'plastic section modulus', 'Z_p', 'beta_b'],
    equations: [
      {
        id: 'eq_IS_8_2',
        latex: 'M_d = \\beta_b \\cdot Z_p \\cdot \\frac{f_y}{\\gamma_{m0}} \\le 1.2 \\cdot Z_e \\cdot \\frac{f_y}{\\gamma_{m0}}',
        description: 'Design bending strength for plastic and compact cross-sections',
        variables: [
          { symbol: '\\beta_b', name: 'Section factor', unit: '-', description: '1.0 for plastic and compact sections' },
          { symbol: 'Z_p', name: 'Plastic modulus', unit: 'm^3', description: 'Plastic section modulus' },
          { symbol: 'f_y', name: 'Yield strength', unit: 'Pa', description: 'Steel yield strength' },
          { symbol: '\\gamma_{m0}', name: 'Partial factor', unit: '-', description: 'Partial safety factor', defaultValue: 1.10 },
        ],
      },
    ],
  },
  {
    clauseId: 'IS800_8_4',
    standard: 'IS_800_2007',
    sectionNumber: '8.4',
    title: 'Shear Resistance of Beams',
    description:
      'Design shear strength of webs without tension field action or stiffeners.',
    limitState: 'ULTIMATE_STRENGTH',
    applicableActions: ['SHEAR'],
    safetyFactors: { gamma_m0: 1.10 },
    crossReferences: ['IS 800:2007 Clause 8.4.1', 'IS 800:2007 Clause 8.4.2'],
    keywords: ['shear', 'V_d', 'V_n', 'A_v', 'von Mises'],
    equations: [
      {
        id: 'eq_IS_8_4',
        latex: 'V_d = \\frac{A_v \\cdot f_y}{\\sqrt{3} \\cdot \\gamma_{m0}}',
        description: 'Design shear strength governed by yielding',
        variables: [
          { symbol: 'A_v', name: 'Shear area', unit: 'm^2', description: 'Effective shear area' },
          { symbol: 'f_y', name: 'Yield strength', unit: 'Pa', description: 'Steel yield strength' },
          { symbol: '\\gamma_{m0}', name: 'Partial factor', unit: '-', description: 'Partial safety factor', defaultValue: 1.10 },
        ],
      },
    ],
  },
  {
    clauseId: 'IS800_9_3',
    standard: 'IS_800_2007',
    sectionNumber: '9.3',
    title: 'Combined Axial Force and Bending Moment (Beam-Columns)',
    description:
      'Interaction equations for members subjected to combined axial compression and biaxial bending.',
    limitState: 'STABILITY_BUCKLING',
    applicableActions: ['AXIAL_COMPRESSION', 'MAJOR_FLEXURE', 'MINOR_FLEXURE', 'COMBINED_P_M'],
    safetyFactors: { gamma_m0: 1.10 },
    crossReferences: ['IS 800:2007 Clause 9.3.1.1', 'IS 800:2007 Clause 9.3.2.2'],
    keywords: ['combined stress', 'interaction', 'P-M', 'beam-column', 'K_y', 'K_z'],
    equations: [
      {
        id: 'eq_IS_9_3',
        latex: '\\frac{P}{P_{dz}} + K_y \\frac{M_y}{M_{dy}} + K_z \\frac{M_z}{M_{dz}} \\le 1.0',
        description: 'Overall member buckling interaction check under combined axial compression and bending',
        variables: [
          { symbol: 'P', name: 'Axial compression force', unit: 'N', description: 'Factored design axial load' },
          { symbol: 'P_{dz}', name: 'Design compressive strength', unit: 'N', description: 'Design compressive strength about relevant axis' },
          { symbol: 'M_y', name: 'Major bending demand', unit: 'N*m', description: 'Factored design bending moment' },
          { symbol: 'M_{dy}', name: 'Design bending strength', unit: 'N*m', description: 'Design flexural strength' },
        ],
      },
    ],
  },
];
