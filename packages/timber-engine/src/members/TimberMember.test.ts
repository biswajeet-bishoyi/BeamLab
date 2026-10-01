import { describe, it, expect } from 'vitest';
import {
  TimberSectionCalculator,
  TimberFlexureEngine,
  TimberAxialEngine,
  TimberCombinedStressEngine,
} from './index';
import { TimberMaterialEngine } from '../material';

describe('Sprint B14.2: Sawn Timber & Glulam Member Design Engine', () => {
  const c24Strengths = TimberMaterialEngine.computeEurocode5DesignStrengths('C24', {
    serviceClass: 1,
    loadDuration: 'MEDIUM_TERM',
    memberType: 'SOLID_TIMBER',
    h: 300,
  });

  const glulamStrengths = TimberMaterialEngine.computeEurocode5DesignStrengths('GL28h', {
    serviceClass: 1,
    loadDuration: 'MEDIUM_TERM',
    memberType: 'GLULAM',
    h: 600,
  });

  const ndsStrengths = TimberMaterialEngine.computeNdsDesignStrengths('DF_L_No1', {
    loadDuration: 'OCCUPANCY_1_0',
    isWetService: false,
    d: 300,
    b: 140,
  });

  it('should calculate accurate cross-section geometric properties', () => {
    const props = TimberSectionCalculator.computeProperties({
      b: 140,
      d: 300,
      L: 5000,
    });

    expect(props.area).toBe(140 * 300);
    expect(props.Ix).toBe((140 * Math.pow(300, 3)) / 12);
    expect(props.Iy).toBe((300 * Math.pow(140, 3)) / 12);
    expect(props.Sx).toBe((140 * Math.pow(300, 2)) / 6);
    expect(props.rx).toBeCloseTo(300 / Math.sqrt(12), 2);
    expect(props.ry).toBeCloseTo(140 / Math.sqrt(12), 2);
    expect(props.Itor).toBeGreaterThan(0);
  });

  it('should evaluate Eurocode 5 lateral torsional buckling factor k_crit', () => {
    // Stocky beam (well braced, short unbraced length lu = 1000 mm)
    const stockyProps = TimberSectionCalculator.computeProperties({
      b: 140,
      d: 300,
      L: 5000,
      lu: 1000,
    });
    const stockyRes = TimberFlexureEngine.checkEurocode5Bending(stockyProps, c24Strengths, 15.0);
    expect(stockyRes.stabilityFactor).toBe(1.0);
    expect(stockyRes.isCompliant).toBe(true);

    // Slender beam (unbraced length lu = 6000 mm, narrow b = 60 mm, deep d = 400 mm)
    const slenderProps = TimberSectionCalculator.computeProperties({
      b: 60,
      d: 400,
      L: 6000,
      lu: 6000,
    });
    const slenderRes = TimberFlexureEngine.checkEurocode5Bending(slenderProps, c24Strengths, 25.0);
    expect(slenderRes.stabilityFactor).toBeLessThan(0.75);
    expect(slenderRes.criticalBucklingStress).toBeLessThan(30.0);
  });

  it('should evaluate NDS 2024 beam stability factor C_L', () => {
    const props = TimberSectionCalculator.computeProperties({
      b: 89,
      d: 286,
      L: 4500,
      lu: 4500,
    });
    const ndsRes = TimberFlexureEngine.checkNdsBending(props, ndsStrengths, 12.0);
    expect(ndsRes.stabilityFactor).toBeGreaterThan(0.4);
    expect(ndsRes.stabilityFactor).toBeLessThanOrEqual(1.0);
  });

  it('should evaluate Eurocode 5 column stability reduction factor k_c', () => {
    // Short stocky glulam column (L = 2000 mm, 200x200 mm)
    const shortCol = TimberSectionCalculator.computeProperties({
      b: 200,
      d: 200,
      L: 2000,
    });
    const shortRes = TimberAxialEngine.checkEurocode5Axial(shortCol, glulamStrengths, 300);
    expect(shortRes.stabilityFactor).toBeGreaterThan(0.85);

    // Slender glulam column (L = 6000 mm, 120x120 mm)
    const slenderCol = TimberSectionCalculator.computeProperties({
      b: 120,
      d: 120,
      L: 6000,
    });
    const slenderRes = TimberAxialEngine.checkEurocode5Axial(slenderCol, glulamStrengths, 100);
    expect(slenderRes.stabilityFactor).toBeLessThan(0.40);
    expect(slenderRes.slenderness).toBeGreaterThan(100);
  });

  it('should evaluate NDS 2024 column stability factor C_P', () => {
    const colProps = TimberSectionCalculator.computeProperties({
      b: 140,
      d: 140,
      L: 3500,
    });
    const ndsColRes = TimberAxialEngine.checkNdsAxial(colProps, ndsStrengths, 80);
    expect(ndsColRes.stabilityFactor).toBeGreaterThan(0.3);
    expect(ndsColRes.stabilityFactor).toBeLessThan(1.0);
  });

  it('should verify member under combined compression, biaxial bending and shear per Eurocode 5', () => {
    const beamColProps = TimberSectionCalculator.computeProperties({
      b: 140,
      d: 360,
      L: 4000,
      ley: 4000,
      lez: 4000,
      lu: 2000,
    });

    const combinedRes = TimberCombinedStressEngine.verifyEurocode5Member(
      beamColProps,
      glulamStrengths,
      {
        axialForce: 150, // 150 kN compression
        momentY: 35,     // 35 kNm major moment
        momentZ: 3,      // 3 kNm minor moment
        shearZ: 30,      // 30 kN shear
      },
      0.60
    );

    expect(combinedRes.interactionDcr).toBeGreaterThan(0);
    expect(combinedRes.shearResult.appliedShearStress).toBeGreaterThan(0);
    expect(combinedRes.shearResult.isCompliant).toBe(true);
    expect(combinedRes.deflectionResult.finalCreepMm).toBeGreaterThan(combinedRes.deflectionResult.instantaneousMm);
  });

  it('should verify member under combined axial and flexure per NDS 2024', () => {
    const props = TimberSectionCalculator.computeProperties({
      b: 140,
      d: 300,
      L: 4000,
    });

    const ndsCombined = TimberCombinedStressEngine.verifyNdsMember(
      props,
      ndsStrengths,
      {
        axialForce: 50,
        momentY: 20,
        shearZ: 15,
      },
      0.50
    );

    expect(ndsCombined.interactionDcr).toBeGreaterThan(0);
    expect(ndsCombined.isCompliant).toBe(true);
  });
});
