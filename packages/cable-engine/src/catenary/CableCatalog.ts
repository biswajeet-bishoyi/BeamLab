/**
 * Standard Cable Strand & Stay Cable Catalog
 * BeamLab Sprint B18.1 — Codified Bridge Strands & Wire Ropes
 */

import { CableMaterial, CableCrossSection } from './types';

export const STANDARD_CABLE_MATERIALS: Record<string, CableMaterial> = {
  BRIDGE_STRAND_1860: {
    id: 'mat_strand_1860',
    name: 'High-Strength Galvanized Bridge Wire (Grade 1860)',
    elasticModulus: 205e9, // 205 GPa (Parallel wire strand)
    density: 7850,
    tensileStrength: 1860e6, // 1860 MPa
    yieldStrength: 1600e6, // 1600 MPa
    thermalExpansionCoefficient: 1.2e-5,
    fillFactor: 0.88,
  },
  LOCKED_COIL_ROPE_1770: {
    id: 'mat_locked_coil_1770',
    name: 'Fully Locked Coil Cable (Grade 1770, EN 12385-10)',
    elasticModulus: 165e9, // 165 GPa (Locked coil rope effective modulus)
    density: 7900,
    tensileStrength: 1770e6, // 1770 MPa
    yieldStrength: 1450e6,
    thermalExpansionCoefficient: 1.2e-5,
    fillFactor: 0.85,
  },
  SPIRAL_STRAND_1570: {
    id: 'mat_spiral_strand_1570',
    name: 'Structural Spiral Strand (Grade 1570, ASTM A586)',
    elasticModulus: 155e9, // 155 GPa
    density: 7850,
    tensileStrength: 1570e6, // 1570 MPa
    yieldStrength: 1250e6,
    thermalExpansionCoefficient: 1.2e-5,
    fillFactor: 0.76,
  },
  STAINLESS_STEEL_STRAND_1450: {
    id: 'mat_stainless_strand_1450',
    name: 'Austenitic Stainless Steel Stay Strand (AISI 316)',
    elasticModulus: 170e9, // 170 GPa
    density: 8000,
    tensileStrength: 1450e6, // 1450 MPa
    yieldStrength: 1100e6,
    thermalExpansionCoefficient: 1.6e-5,
    fillFactor: 0.80,
  }
};

/**
 * Standard factory cross-sections for bridge stay cables and suspension hangers
 */
export const STANDARD_CABLE_SECTIONS: CableCrossSection[] = [
  // 15mm Hanger / Tie rod
  {
    id: 'sec_strand_15mm',
    name: 'Ø15.7mm Stay Strand (1x7 PC Strand)',
    diameter: 0.0157,
    metallicArea: 0.000150, // 150 mm^2
    unitWeight: 0.000150 * 7850 * 9.80665, // ~11.55 N/m
    breakingLoad: 279e3, // 279 kN
  },
  // 30mm Structural Strand
  {
    id: 'sec_strand_30mm',
    name: 'Ø30mm Structural Spiral Strand',
    diameter: 0.030,
    metallicArea: 0.000537, // ~537 mm^2
    unitWeight: 0.000537 * 7850 * 9.80665, // ~41.3 N/m
    breakingLoad: 843e3, // 843 kN
  },
  // 50mm Locked Coil
  {
    id: 'sec_locked_50mm',
    name: 'Ø50mm Full Locked Coil Rope',
    diameter: 0.050,
    metallicArea: 0.001669, // ~1669 mm^2
    unitWeight: 0.001669 * 7900 * 9.80665, // ~129.3 N/m
    breakingLoad: 2.75e6, // 2.75 MN
  },
  // 80mm Bridge Stay Cable
  {
    id: 'sec_stay_80mm',
    name: 'Ø80mm Multi-Strand Stay Cable (31-Strand Bundle)',
    diameter: 0.080,
    metallicArea: 0.004650, // ~4650 mm^2
    unitWeight: 0.004650 * 7850 * 9.80665, // ~357.9 N/m
    breakingLoad: 8.65e6, // 8.65 MN
  },
  // 120mm Heavy Bridge Main Cable Bundle
  {
    id: 'sec_stay_120mm',
    name: 'Ø120mm Heavy Stay Cable (73-Strand Bundle)',
    diameter: 0.120,
    metallicArea: 0.010950, // ~10950 mm^2
    unitWeight: 0.010950 * 7850 * 9.80665, // ~842.9 N/m
    breakingLoad: 20.37e6, // 20.37 MN
  },
  // 250mm Suspension Bridge Main Cable Strand
  {
    id: 'sec_main_250mm',
    name: 'Ø250mm Suspension Bridge Main Cable Strand Group',
    diameter: 0.250,
    metallicArea: 0.043200, // ~43200 mm^2
    unitWeight: 0.043200 * 7850 * 9.80665, // ~3325.6 N/m
    breakingLoad: 80.35e6, // 80.35 MN
  }
];
