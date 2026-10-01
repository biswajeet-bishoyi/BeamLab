import { describe, it, expect } from 'vitest';
import {
  CltLayupFactory,
  CltShearAnalogyEngine,
  CltPanelStressAuditor,
} from './index';
import { TimberMaterialEngine } from '../material';

describe('Sprint B14.3: Cross-Laminated Timber (CLT) Orthotropic Plate & Panel Engine', () => {
  const c24Strengths = TimberMaterialEngine.computeEurocode5DesignStrengths('C24', {
    serviceClass: 1,
    loadDuration: 'MEDIUM_TERM',
    memberType: 'CLT',
    h: 140,
  });

  it('should instantiate standard 3-ply, 5-ply, and 7-ply CLT layups correctly', () => {
    const clt3 = CltLayupFactory.getPresetLayup('CLT_3s_100');
    expect(clt3.layerCount).toBe(3);
    expect(clt3.totalThickness).toBe(100);
    expect(clt3.layers[0].orientation).toBe(0);
    expect(clt3.layers[1].orientation).toBe(90);
    expect(clt3.layers[2].orientation).toBe(0);

    const clt5 = CltLayupFactory.getPresetLayup('CLT_5s_140');
    expect(clt5.layerCount).toBe(5);
    expect(clt5.totalThickness).toBe(140);
    expect(clt5.layers[0].orientation).toBe(0);
    expect(clt5.layers[1].orientation).toBe(90);
    expect(clt5.layers[2].orientation).toBe(0);
    expect(clt5.layers[3].orientation).toBe(90);
    expect(clt5.layers[4].orientation).toBe(0);
  });

  it('should compute effective bending stiffness (EI)_eff and shear stiffness (GA)_eff using Gamma method', () => {
    const clt5 = CltLayupFactory.getPresetLayup('CLT_5s_140');
    const spanMm = 4500;
    const props = CltShearAnalogyEngine.computeProperties(clt5, spanMm);

    expect(props.EI_eff).toBeGreaterThan(1e11); // N*mm²
    expect(props.GA_eff).toBeGreaterThan(1e6);  // N
    expect(props.W_eff).toBeGreaterThan(0);
    expect(props.ES_eff).toBeGreaterThan(0);

    // Outer layers have gamma factors <= 1.0
    expect(props.gammas[0]).toBeGreaterThan(0.85);
    expect(props.gammas[0]).toBeLessThanOrEqual(1.0);
    // Core longitudinal layer gamma = 1.0
    expect(props.gammas[2]).toBe(1.0);
    // Transverse layers gamma = 0.0
    expect(props.gammas[1]).toBe(0.0);
  });

  it('should quantify transverse shear deformation in panel deflections', () => {
    const clt5 = CltLayupFactory.getPresetLayup('CLT_5s_140');
    const spanMm = 4500;
    const props = CltShearAnalogyEngine.computeProperties(clt5, spanMm);

    const defl = CltShearAnalogyEngine.computePanelDeflection(props, spanMm, 3.5); // 3.5 kN/m²

    expect(defl.wBendingMm).toBeGreaterThan(0);
    expect(defl.wShearMm).toBeGreaterThan(0);
    expect(defl.wTotalMm).toBe(defl.wBendingMm + defl.wShearMm);

    // In CLT, shear deformation typically constitutes 5% to 25% of total deflection
    expect(defl.shearDeformationRatio).toBeGreaterThan(0.05);
    expect(defl.shearDeformationRatio).toBeLessThan(0.35);
  });

  it('should audit extreme fiber bending and interlaminar rolling shear stresses', () => {
    const clt5 = CltLayupFactory.getPresetLayup('CLT_5s_140');
    const spanMm = 4500;

    const audit = CltPanelStressAuditor.auditPanel(
      clt5,
      spanMm,
      c24Strengths,
      12.0, // 12 kNm/m bending
      18.0, // 18 kN/m shear
      3.0   // 3 kN/m² service load
    );

    expect(audit.appliedBendingStress).toBeGreaterThan(0);
    expect(audit.bendingDcr).toBeGreaterThan(0);
    expect(audit.bendingDcr).toBeLessThan(1.0);

    expect(audit.appliedRollingShearStress).toBeGreaterThan(0);
    expect(audit.rollingShearDcr).toBeGreaterThan(0);
    expect(audit.rollingShearDcr).toBeLessThan(1.0);

    expect(audit.naturalFrequencyHz).toBeGreaterThan(0);
    expect(audit.isCompliant).toBe(true);
  });

  it('should detect rolling shear overstress when subjected to high concentrated shear loads', () => {
    const clt3 = CltLayupFactory.getPresetLayup('CLT_3s_60');
    const spanMm = 2000; // Short span with very high shear

    const audit = CltPanelStressAuditor.auditPanel(
      clt3,
      spanMm,
      c24Strengths,
      4.0,  // 4 kNm/m
      45.0, // 45 kN/m shear load
      2.0
    );

    expect(audit.appliedRollingShearStress).toBeGreaterThan(c24Strengths.fr_d);
    expect(audit.rollingShearDcr).toBeGreaterThan(1.0);
    expect(audit.isCompliant).toBe(false);
    expect(audit.governingMode).toBe('Interlaminar Rolling Shear');
  });
});
