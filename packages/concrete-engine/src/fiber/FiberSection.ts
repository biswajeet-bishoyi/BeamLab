/**
 * FiberSection.ts
 *
 * Discretizes reinforced concrete cross-sections (rectangular, circular, flanged T/L)
 * into 2D concrete fiber meshes and discrete steel rebar fibers.
 */

import {
  ConcreteMaterial,
  ConcreteFiber,
  RebarFiber,
  RebarSizeName,
  RebarMaterial,
  REBAR_DATABASE,
} from '../core/ConcreteTypes';

export interface SectionGeometry {
  type: 'RECTANGULAR' | 'CIRCULAR' | 'T_BEAM' | 'CUSTOM';
  width_mm: number;
  height_mm: number;
  grossArea_mm2: number;
  centroidX_mm: number;
  centroidY_mm: number;
  Igx_mm4: number;
  Igy_mm4: number;
}

export class FiberSection {
  readonly concreteMaterial: ConcreteMaterial;
  readonly concreteFibers: ConcreteFiber[] = [];
  readonly rebarFibers: RebarFiber[] = [];
  geometry: SectionGeometry;

  constructor(concreteMaterial: ConcreteMaterial, geometry: SectionGeometry) {
    this.concreteMaterial = concreteMaterial;
    this.geometry = geometry;
  }

  // =========================================================================
  // FACTORY BUILDERS
  // =========================================================================

  /**
   * Creates a rectangular cross-section centered at (0, 0)
   * with nx divisions along X (width) and ny divisions along Y (height).
   */
  static createRectangular(
    width_mm: number,
    height_mm: number,
    concreteMaterial: ConcreteMaterial,
    clearCover_mm: number = 40,
    nx: number = 20,
    ny: number = 20
  ): FiberSection {
    const grossArea = width_mm * height_mm;
    const Igx = (width_mm * Math.pow(height_mm, 3)) / 12;
    const Igy = (height_mm * Math.pow(width_mm, 3)) / 12;

    const section = new FiberSection(concreteMaterial, {
      type: 'RECTANGULAR',
      width_mm,
      height_mm,
      grossArea_mm2: grossArea,
      centroidX_mm: 0,
      centroidY_mm: 0,
      Igx_mm4: Igx,
      Igy_mm4: Igy,
    });

    const dx = width_mm / nx;
    const dy = height_mm / ny;
    const dA = dx * dy;

    // Confined core boundary inside ties
    const coreXMin = -width_mm / 2 + clearCover_mm;
    const coreXMax = width_mm / 2 - clearCover_mm;
    const coreYMin = -height_mm / 2 + clearCover_mm;
    const coreYMax = height_mm / 2 - clearCover_mm;

    let fiberId = 0;
    for (let iy = 0; iy < ny; iy++) {
      const y = -height_mm / 2 + (iy + 0.5) * dy;
      for (let ix = 0; ix < nx; ix++) {
        const x = -width_mm / 2 + (ix + 0.5) * dx;
        const isConfined =
          x >= coreXMin && x <= coreXMax && y >= coreYMin && y <= coreYMax;

        section.concreteFibers.push({
          id: fiberId++,
          x_mm: x,
          y_mm: y,
          area_mm2: dA,
          isConfined,
        });
      }
    }

    return section;
  }

  /**
   * Creates a circular cross-section centered at (0, 0).
   */
  static createCircular(
    diameter_mm: number,
    concreteMaterial: ConcreteMaterial,
    clearCover_mm: number = 40,
    nRings: number = 10,
    nSectors: number = 24
  ): FiberSection {
    const R = diameter_mm / 2;
    const grossArea = Math.PI * R * R;
    const Ig = (Math.PI * Math.pow(diameter_mm, 4)) / 64;

    const section = new FiberSection(concreteMaterial, {
      type: 'CIRCULAR',
      width_mm: diameter_mm,
      height_mm: diameter_mm,
      grossArea_mm2: grossArea,
      centroidX_mm: 0,
      centroidY_mm: 0,
      Igx_mm4: Ig,
      Igy_mm4: Ig,
    });

    const dr = R / nRings;
    const dTheta = (2 * Math.PI) / nSectors;
    const coreR = Math.max(0, R - clearCover_mm);

    let fiberId = 0;
    for (let ir = 0; ir < nRings; ir++) {
      const r = (ir + 0.5) * dr;
      const dA = r * dr * dTheta;
      const isConfined = r <= coreR;

      for (let is = 0; is < nSectors; is++) {
        const theta = (is + 0.5) * dTheta;
        const x = r * Math.cos(theta);
        const y = r * Math.sin(theta);

        section.concreteFibers.push({
          id: fiberId++,
          x_mm: x,
          y_mm: y,
          area_mm2: dA,
          isConfined,
        });
      }
    }

    return section;
  }

  /**
   * Creates a flanged T-beam cross-section centered at its plastic/gross centroid.
   */
  static createTBeam(
    bf_mm: number,
    tf_mm: number,
    bw_mm: number,
    hw_mm: number,
    concreteMaterial: ConcreteMaterial,
    clearCover_mm: number = 40,
    meshSize_mm: number = 20
  ): FiberSection {
    const totalHeight = tf_mm + hw_mm;
    const areaFlange = bf_mm * tf_mm;
    const areaWeb = bw_mm * hw_mm;
    const grossArea = areaFlange + areaWeb;

    // Centroid from bottom of web
    const yFlange = hw_mm + tf_mm / 2;
    const yWeb = hw_mm / 2;
    const yCentroidFromBottom = (areaFlange * yFlange + areaWeb * yWeb) / grossArea;

    // Shift coordinate system so centroid is at y = 0
    const IgxFlange = (bf_mm * Math.pow(tf_mm, 3)) / 12 + areaFlange * Math.pow(yFlange - yCentroidFromBottom, 2);
    const IgxWeb = (bw_mm * Math.pow(hw_mm, 3)) / 12 + areaWeb * Math.pow(yWeb - yCentroidFromBottom, 2);
    const Igx = IgxFlange + IgxWeb;
    const Igy = (tf_mm * Math.pow(bf_mm, 3)) / 12 + (hw_mm * Math.pow(bw_mm, 3)) / 12;

    const section = new FiberSection(concreteMaterial, {
      type: 'T_BEAM',
      width_mm: bf_mm,
      height_mm: totalHeight,
      grossArea_mm2: grossArea,
      centroidX_mm: 0,
      centroidY_mm: 0,
      Igx_mm4: Igx,
      Igy_mm4: Igy,
    });

    let fiberId = 0;
    // Discretize Web
    const nyWeb = Math.max(4, Math.round(hw_mm / meshSize_mm));
    const nxWeb = Math.max(2, Math.round(bw_mm / meshSize_mm));
    const dyWeb = hw_mm / nyWeb;
    const dxWeb = bw_mm / nxWeb;
    const dAWeb = dyWeb * dxWeb;

    for (let iy = 0; iy < nyWeb; iy++) {
      const yGlobal = (iy + 0.5) * dyWeb;
      const y = yGlobal - yCentroidFromBottom;
      for (let ix = 0; ix < nxWeb; ix++) {
        const x = -bw_mm / 2 + (ix + 0.5) * dxWeb;
        section.concreteFibers.push({
          id: fiberId++,
          x_mm: x,
          y_mm: y,
          area_mm2: dAWeb,
          isConfined: false,
        });
      }
    }

    // Discretize Flange
    const nyFlange = Math.max(2, Math.round(tf_mm / meshSize_mm));
    const nxFlange = Math.max(6, Math.round(bf_mm / meshSize_mm));
    const dyFlange = tf_mm / nyFlange;
    const dxFlange = bf_mm / nxFlange;
    const dAFlange = dyFlange * dxFlange;

    for (let iy = 0; iy < nyFlange; iy++) {
      const yGlobal = hw_mm + (iy + 0.5) * dyFlange;
      const y = yGlobal - yCentroidFromBottom;
      for (let ix = 0; ix < nxFlange; ix++) {
        const x = -bf_mm / 2 + (ix + 0.5) * dxFlange;
        section.concreteFibers.push({
          id: fiberId++,
          x_mm: x,
          y_mm: y,
          area_mm2: dAFlange,
          isConfined: false,
        });
      }
    }

    return section;
  }

  // =========================================================================
  // REBAR METHODS
  // =========================================================================

  /**
   * Adds an individual steel rebar fiber.
   */
  addRebar(
    x_mm: number,
    y_mm: number,
    barSize: RebarSizeName,
    material: RebarMaterial,
    role?: string
  ): void {
    const barSpec = REBAR_DATABASE[barSize];
    if (!barSpec) {
      throw new Error(`Unknown rebar size designation: ${barSize}`);
    }

    this.rebarFibers.push({
      id: this.rebarFibers.length,
      x_mm,
      y_mm,
      barSize,
      area_mm2: barSpec.area_mm2,
      diameter_mm: barSpec.diameter_mm,
      material,
      role,
    });
  }

  /**
   * Adds a standard rectangular pattern of perimeter rebar for a beam or column.
   */
  addRectangularRebarLayout(
    clearCover_mm: number,
    tieDiameter_mm: number,
    topBars: { count: number; barSize: RebarSizeName },
    bottomBars: { count: number; barSize: RebarSizeName },
    sideBarsPerFace: { count: number; barSize: RebarSizeName },
    material: RebarMaterial
  ): void {
    const w = this.geometry.width_mm;
    const h = this.geometry.height_mm;

    // Top and Bottom centerlines
    const yTop = h / 2 - clearCover_mm - tieDiameter_mm - REBAR_DATABASE[topBars.barSize].diameter_mm / 2;
    const yBot = -h / 2 + clearCover_mm + tieDiameter_mm + REBAR_DATABASE[bottomBars.barSize].diameter_mm / 2;

    const xLeftTop = -w / 2 + clearCover_mm + tieDiameter_mm + REBAR_DATABASE[topBars.barSize].diameter_mm / 2;
    const xRightTop = w / 2 - clearCover_mm - tieDiameter_mm - REBAR_DATABASE[topBars.barSize].diameter_mm / 2;

    const xLeftBot = -w / 2 + clearCover_mm + tieDiameter_mm + REBAR_DATABASE[bottomBars.barSize].diameter_mm / 2;
    const xRightBot = w / 2 - clearCover_mm - tieDiameter_mm - REBAR_DATABASE[bottomBars.barSize].diameter_mm / 2;

    // 1. Top row
    if (topBars.count === 1) {
      this.addRebar(0, yTop, topBars.barSize, material, 'top');
    } else if (topBars.count > 1) {
      const dx = (xRightTop - xLeftTop) / (topBars.count - 1);
      for (let i = 0; i < topBars.count; i++) {
        this.addRebar(xLeftTop + i * dx, yTop, topBars.barSize, material, 'top');
      }
    }

    // 2. Bottom row
    if (bottomBars.count === 1) {
      this.addRebar(0, yBot, bottomBars.barSize, material, 'bottom');
    } else if (bottomBars.count > 1) {
      const dx = (xRightBot - xLeftBot) / (bottomBars.count - 1);
      for (let i = 0; i < bottomBars.count; i++) {
        this.addRebar(xLeftBot + i * dx, yBot, bottomBars.barSize, material, 'bottom');
      }
    }

    // 3. Side face bars (skin/web reinforcement)
    if (sideBarsPerFace.count > 0) {
      const dy = (yTop - yBot) / (sideBarsPerFace.count + 1);
      const xLeft = -w / 2 + clearCover_mm + tieDiameter_mm + REBAR_DATABASE[sideBarsPerFace.barSize].diameter_mm / 2;
      const xRight = w / 2 - clearCover_mm - tieDiameter_mm - REBAR_DATABASE[sideBarsPerFace.barSize].diameter_mm / 2;

      for (let i = 1; i <= sideBarsPerFace.count; i++) {
        const y = yBot + i * dy;
        this.addRebar(xLeft, y, sideBarsPerFace.barSize, material, 'side_face');
        this.addRebar(xRight, y, sideBarsPerFace.barSize, material, 'side_face');
      }
    }
  }

  /**
   * Adds circular column rebar arranged in a ring.
   */
  addCircularRebarLayout(
    clearCover_mm: number,
    spiralDiameter_mm: number,
    numBars: number,
    barSize: RebarSizeName,
    material: RebarMaterial
  ): void {
    const D = this.geometry.width_mm;
    const barSpec = REBAR_DATABASE[barSize];
    const rRebar = D / 2 - clearCover_mm - spiralDiameter_mm - barSpec.diameter_mm / 2;
    const dTheta = (2 * Math.PI) / numBars;

    for (let i = 0; i < numBars; i++) {
      const theta = i * dTheta;
      const x = rRebar * Math.cos(theta);
      const y = rRebar * Math.sin(theta);
      this.addRebar(x, y, barSize, material, 'circular_longitudinal');
    }
  }

  /**
   * Total longitudinal steel reinforcement area Ast (mm²)
   */
  getTotalSteelArea_mm2(): number {
    return this.rebarFibers.reduce((sum, b) => sum + b.area_mm2, 0);
  }

  /**
   * Longitudinal reinforcement ratio rho = Ast / Ag
   */
  getSteelRatio(): number {
    return this.getTotalSteelArea_mm2() / this.geometry.grossArea_mm2;
  }
}
