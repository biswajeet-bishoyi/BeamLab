import { describe, it, expect } from 'vitest';
import {
  ColumnBasePlateEngine,
  ColumnBasePlateConfig,
} from '../index';

describe('Phase B8.3: Column Base Plate & Anchor Rod Engine', () => {
  const baseConfig: ColumnBasePlateConfig = {
    connectionId: 'BP-101',
    plateLength_N_mm: 550,   // N = 550 mm
    plateWidth_B_mm: 500,    // B = 500 mm
    plateThickness_mm: 35,   // t_p = 35 mm
    plateFy_MPa: 250,        // A36 steel
    plateFu_MPa: 400,
    columnDepth_d_mm: 310,   // W12x72 column (d = 310 mm, bf = 305 mm)
    columnFlangeWidth_bf_mm: 305,
    columnFlangeThickness_tf_mm: 17.0,
    columnWebThickness_tw_mm: 10.9,
    concreteStrength_fc_MPa: 28, // 4000 psi (~28 MPa)
    pedestalLength_Nped_mm: 700,
    pedestalWidth_Bped_mm: 700,
    anchorGrade: 'F1554_GR55',
    anchorDiameter_mm: 24,   // 1 in rods
    anchorTensionRows: 1,
    anchorsPerRow: 2,        // 2 anchors in tension
    anchorDistanceToEdge_mm: 50,
    frictionCoefficient: 0.45,
  };

  it('evaluates concentrically loaded column base plate (small eccentricity) per AISC DG 1', () => {
    const evaluation = ColumnBasePlateEngine.evaluate({
      config: baseConfig,
      axialDemand_Pu_kN: 1200,
      momentDemand_Mu_kNm: 10, // Small moment
      shearDemand_Vu_kN: 150,
      standard: 'AISC_360_16',
      method: 'LRFD',
    });

    expect(evaluation.isLargeEccentricity).toBe(false);
    expect(evaluation.anchorTensionDemand_kN).toBe(0);
    expect(evaluation.requiredPlateThickness_mm).toBeGreaterThan(0);
    expect(evaluation.requiredPlateThickness_mm).toBeLessThanOrEqual(baseConfig.plateThickness_mm);
    expect(evaluation.pass).toBe(true);

    const lsNames = evaluation.limitStateResults.map((r) => r.limitState);
    expect(lsNames).toContain('Concrete Foundation Bearing');
    expect(lsNames).toContain('Base Plate Cantilever Flexural Yielding');
    expect(lsNames).toContain('Base Plate Shear Transfer (Friction & Anchors)');
  });

  it('evaluates column base plate with large overturning moment (anchor tension active)', () => {
    const evaluation = ColumnBasePlateEngine.evaluate({
      config: baseConfig,
      axialDemand_Pu_kN: 400,
      momentDemand_Mu_kNm: 180, // High moment -> large eccentricity
      shearDemand_Vu_kN: 100,
      standard: 'AISC_360_16',
      method: 'LRFD',
    });

    expect(evaluation.isLargeEccentricity).toBe(true);
    expect(evaluation.eccentricity_e_mm).toBeGreaterThan(evaluation.criticalEccentricity_ecrit_mm);
    expect(evaluation.anchorTensionDemand_kN).toBeGreaterThan(0);
    expect(evaluation.bearingLength_Y_mm).toBeLessThan(baseConfig.plateLength_N_mm);

    const anchorLS = evaluation.limitStateResults.find((r) =>
      r.limitState.includes('Anchor Rod Tensile Rupture')
    );
    expect(anchorLS).toBeDefined();
    expect(anchorLS?.demand_kN).toBeGreaterThan(0);
  });

  it('correctly reports failure when base plate thickness is inadequate', () => {
    const thinConfig: ColumnBasePlateConfig = {
      ...baseConfig,
      connectionId: 'BP-THIN-102',
      plateThickness_mm: 12, // Inadequate for 1200 kN axial force
    };

    const evaluation = ColumnBasePlateEngine.evaluate({
      config: thinConfig,
      axialDemand_Pu_kN: 1200,
      momentDemand_Mu_kNm: 50,
      shearDemand_Vu_kN: 100,
    });

    expect(evaluation.pass).toBe(false);
    expect(evaluation.actualPlateThickness_mm).toBeLessThan(evaluation.requiredPlateThickness_mm);
  });
});
