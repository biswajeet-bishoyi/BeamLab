/**
 * Cross-Laminated Timber (CLT) multi-layer layup geometric configuration and material assignment.
 */

import { TimberGradeDefinition, getTimberGrade } from '../material/TimberMaterialDatabase';

export type CltLayerOrientation = 0 | 90; // degrees relative to primary span

export interface CltLayerConfig {
  layerIndex: number;
  /** Thickness of lamella layer (mm) */
  thickness: number;
  /** Grain orientation: 0° (longitudinal) or 90° (transverse) */
  orientation: CltLayerOrientation;
  /** Timber grade definition */
  grade: TimberGradeDefinition;
}

export interface CltLayupDefinition {
  id: string;
  name: string;
  /** Number of plies / layers: typically 3, 5, or 7 */
  layerCount: number;
  layers: CltLayerConfig[];
  /** Total panel thickness (mm) */
  totalThickness: number;
  /** Standard reference width b (typically 1000 mm for 1m strip analysis) */
  stripWidth: number;
}

export class CltLayupFactory {
  /**
   * Create standard symmetric 3-ply, 5-ply, or 7-ply CLT layup using uniform or mixed layer thicknesses.
   */
  static createStandardLayup(
    id: string,
    layerThicknesses: number[],
    gradeId: string = 'C24',
    stripWidthMm: number = 1000
  ): CltLayupDefinition {
    const grade = getTimberGrade(gradeId);
    const layers: CltLayerConfig[] = [];
    let currentZ = 0;
    const totalThickness = layerThicknesses.reduce((acc, t) => acc + t, 0);

    for (let i = 0; i < layerThicknesses.length; i++) {
      // Alternating 0° and 90°: Outer layers are always 0°
      const orientation: CltLayerOrientation = i % 2 === 0 ? 0 : 90;
      layers.push({
        layerIndex: i,
        thickness: layerThicknesses[i],
        orientation,
        grade,
      });
      currentZ += layerThicknesses[i];
    }

    return {
      id,
      name: `${layerThicknesses.length}-Ply CLT ${totalThickness}mm (${grade.name})`,
      layerCount: layerThicknesses.length,
      layers,
      totalThickness,
      stripWidth: stripWidthMm,
    };
  }

  /**
   * Pre-configured industry standard CLT layups (e.g. Stora Enso, KLH, Binderholz).
   */
  static getPresetLayup(preset: 'CLT_3s_60' | 'CLT_3s_100' | 'CLT_5s_140' | 'CLT_7s_210'): CltLayupDefinition {
    switch (preset) {
      case 'CLT_3s_60':
        // 3-ply 60mm (20-20-20)
        return this.createStandardLayup('CLT_3s_60', [20, 20, 20], 'C24');
      case 'CLT_3s_100':
        // 3-ply 100mm (30-40-30)
        return this.createStandardLayup('CLT_3s_100', [30, 40, 30], 'C24');
      case 'CLT_5s_140':
        // 5-ply 140mm (30-20-40-20-30)
        return this.createStandardLayup('CLT_5s_140', [30, 20, 40, 20, 30], 'C24');
      case 'CLT_7s_210':
        // 7-ply 210mm (30-30-30-30-30-30-30)
        return this.createStandardLayup('CLT_7s_210', [30, 30, 30, 30, 30, 30, 30], 'C24');
    }
  }
}
