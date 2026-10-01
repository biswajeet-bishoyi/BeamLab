/**
 * Timber member cross-section geometric properties and internal demand actions.
 */

export interface TimberSectionDimensions {
  /** Breadth / width b (mm) */
  b: number;
  /** Depth / height d or h (mm) */
  d: number;
  /** Member span / length L (mm) */
  L: number;
  /** Effective buckling length for strong-axis bending l_e,y (mm) */
  ley?: number;
  /** Effective buckling length for weak-axis bending l_e,z (mm) */
  lez?: number;
  /** Unbraced length for lateral torsional buckling l_u (mm) */
  lu?: number;
}

export interface TimberCrossSectionProperties {
  b: number;
  d: number;
  L: number;
  ley: number;
  lez: number;
  lu: number;
  /** Area A (mm²) */
  area: number;
  /** Moment of inertia about major axis I_x (mm⁴) */
  Ix: number;
  /** Moment of inertia about minor axis I_y (mm⁴) */
  Iy: number;
  /** Elastic section modulus about major axis S_x or W_y (mm³) */
  Sx: number;
  /** Elastic section modulus about minor axis S_y or W_z (mm³) */
  Sy: number;
  /** Radius of gyration about major axis r_x (mm) */
  rx: number;
  /** Radius of gyration about minor axis r_y (mm) */
  ry: number;
  /** Torsional constant I_tor (mm⁴) */
  Itor: number;
}

export interface TimberMemberForces {
  /** Axial force: positive for compression (+), negative for tension (-) in kN */
  axialForce: number;
  /** Major axis bending moment M_y (kNm) */
  momentY: number;
  /** Minor axis bending moment M_z (kNm) */
  momentZ?: number;
  /** Major shear force V_z (kN) */
  shearZ: number;
  /** Minor shear force V_y (kN) */
  shearY?: number;
}

export class TimberSectionCalculator {
  static computeProperties(dims: TimberSectionDimensions): TimberCrossSectionProperties {
    const { b, d, L } = dims;
    const ley = dims.ley ?? L;
    const lez = dims.lez ?? L;
    const lu = dims.lu ?? L;

    const area = b * d;
    const Ix = (b * Math.pow(d, 3)) / 12;
    const Iy = (d * Math.pow(b, 3)) / 12;
    const Sx = (b * Math.pow(d, 2)) / 6;
    const Sy = (d * Math.pow(b, 2)) / 6;
    const rx = d / Math.sqrt(12);
    const ry = b / Math.sqrt(12);

    // St. Venant torsional constant approximation for rectangular section:
    // I_tor = b * d^3 * (1/3 - 0.21 * (d/b) * (1 - (d/b)^4 / 12)) where b >= d
    const longSide = Math.max(b, d);
    const shortSide = Math.min(b, d);
    const ratio = shortSide / longSide;
    const beta = (1 / 3) * (1 - 0.63 * ratio);
    const Itor = beta * longSide * Math.pow(shortSide, 3);

    return {
      b,
      d,
      L,
      ley,
      lez,
      lu,
      area,
      Ix,
      Iy,
      Sx,
      Sy,
      rx,
      ry,
      Itor,
    };
  }
}
