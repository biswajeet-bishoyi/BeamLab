/**
 * Steel-concrete composite material definitions, standard wide flange steel sections,
 * concrete classes, and profiled metal deck specifications.
 */

export interface SteelSectionProperties {
  id: string;
  name: string;
  /** Total depth d (mm) */
  d: number;
  /** Flange width b_f (mm) */
  bf: number;
  /** Flange thickness t_f (mm) */
  tf: number;
  /** Web thickness t_w (mm) */
  tw: number;
  /** Cross-sectional area A_s (mm²) */
  area: number;
  /** Strong-axis moment of inertia I_x (mm⁴) */
  Ix: number;
  /** Strong-axis elastic section modulus S_x (mm³) */
  Sx: number;
  /** Strong-axis plastic section modulus Z_x (mm³) */
  Zx: number;
  /** Steel yield strength F_y (MPa) */
  Fy: number;
  /** Steel elastic modulus E_s (MPa, default 200,000 MPa) */
  Es: number;
}

export interface ConcreteSlabProperties {
  /** Cylinder compressive strength f_c' (MPa) */
  fc: number;
  /** Total slab thickness t_c including ribs (mm) */
  totalThickness: number;
  /** Profiled metal deck rib height h_r (mm, 0 for solid flat slab) */
  ribHeight: number;
  /** Net solid concrete topping thickness t_s = totalThickness - ribHeight (mm) */
  toppingThickness: number;
  /** Concrete density rho (kg/m³, 2400 for normal weight, 1800 for lightweight) */
  density: number;
  /** Concrete elastic modulus E_c (MPa) */
  Ec: number;
  /** Characteristic tensile strength f_ctm (MPa) */
  fctm: number;
}

export interface MetalDeckProperties {
  id: string;
  name: string;
  /** Rib height h_r (mm, e.g. 50 mm / 2" or 75 mm / 3") */
  ribHeight: number;
  /** Average rib width w_r (mm) */
  ribWidth: number;
  /** Rib pitch / center-to-center spacing s_r (mm) */
  ribSpacing: number;
  /** Sheet thickness (mm) */
  sheetThickness: number;
  /** Deck orientation relative to beam axis */
  orientation: 'PERPENDICULAR' | 'PARALLEL';
}

export class CompositeMaterialFactory {
  /**
   * Create standard concrete slab definition with codified elastic modulus Ec.
   * ACI 318 / AISC 360: E_c = 0.043 * w_c^1.5 * sqrt(f_c') (MPa)
   */
  static createConcreteSlab(
    fcMPa: number = 30,
    totalDepthMm: number = 130,
    ribHeightMm: number = 50,
    densityKgM3: number = 2400
  ): ConcreteSlabProperties {
    const toppingThickness = Math.max(50, totalDepthMm - ribHeightMm);
    // Ec formula: for normal weight (2400 kg/m³), 4700 * sqrt(f_c')
    const Ec = densityKgM3 >= 2200
      ? 4700 * Math.sqrt(fcMPa)
      : 0.043 * Math.pow(densityKgM3, 1.5) * Math.sqrt(fcMPa);
    const fctm = 0.30 * Math.pow(fcMPa, 2 / 3);

    return {
      fc: fcMPa,
      totalThickness: totalDepthMm,
      ribHeight: ribHeightMm,
      toppingThickness,
      density: densityKgM3,
      Ec,
      fctm,
    };
  }

  /**
   * Library of standard steel shapes for composite beams.
   */
  static getStandardSteelSection(id: 'W16x40' | 'W18x50' | 'W21x62' | 'W24x76' | 'IPE360' | 'UB457'): SteelSectionProperties {
    switch (id) {
      case 'W16x40':
        return {
          id: 'W16x40',
          name: 'W16x40 (AISC)',
          d: 407,
          bf: 178,
          tf: 12.8,
          tw: 7.7,
          area: 7610,
          Ix: 216e6,
          Sx: 1060e3,
          Zx: 1195e3,
          Fy: 345, // A992 50 ksi
          Es: 200000,
        };
      case 'W18x50':
        return {
          id: 'W18x50',
          name: 'W18x50 (AISC)',
          d: 457,
          bf: 190,
          tf: 14.5,
          tw: 9.0,
          area: 9480,
          Ix: 333e6,
          Sx: 1460e3,
          Zx: 1655e3,
          Fy: 345,
          Es: 200000,
        };
      case 'W21x62':
        return {
          id: 'W21x62',
          name: 'W21x62 (AISC)',
          d: 533,
          bf: 210,
          tf: 15.6,
          tw: 10.2,
          area: 11800,
          Ix: 554e6,
          Sx: 2080e3,
          Zx: 2360e3,
          Fy: 345,
          Es: 200000,
        };
      case 'W24x76':
        return {
          id: 'W24x76',
          name: 'W24x76 (AISC)',
          d: 607,
          bf: 228,
          tf: 17.3,
          tw: 11.2,
          area: 14500,
          Ix: 874e6,
          Sx: 2880e3,
          Zx: 3280e3,
          Fy: 345,
          Es: 200000,
        };
      case 'IPE360':
        return {
          id: 'IPE360',
          name: 'IPE 360 (Eurocode)',
          d: 360,
          bf: 170,
          tf: 12.7,
          tw: 8.0,
          area: 7270,
          Ix: 162.7e6,
          Sx: 904e3,
          Zx: 1019e3,
          Fy: 355, // S355
          Es: 210000,
        };
      case 'UB457':
        return {
          id: 'UB457',
          name: 'UB 457x191x67 (BS/EN)',
          d: 453,
          bf: 190,
          tf: 12.7,
          tw: 8.5,
          area: 8550,
          Ix: 294e6,
          Sx: 1300e3,
          Zx: 1450e3,
          Fy: 355,
          Es: 210000,
        };
    }
  }
}
