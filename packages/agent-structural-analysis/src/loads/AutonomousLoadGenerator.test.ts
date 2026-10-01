import { describe, it, expect } from 'vitest';
import {
  AutonomousLoadGenerator,
  type WindLoadParameters,
  type SeismicLoadParameters,
} from './AutonomousLoadGenerator';

describe('Sprint B5.3 — Autonomous Wind & Seismic Load Generation Agent', () => {
  // 3-story 2-bay frame: height 12m, width 12m (bays at x=0, 6, 12; stories at z=0, 4, 8, 12)
  const nodes = [
    // Base fixed
    { id: 'N1', x: 0, y: 0, z: 0, restraints: { Tx: true, Ty: true, Tz: true } },
    { id: 'N2', x: 6, y: 0, z: 0, restraints: { Tx: true, Ty: true, Tz: true } },
    { id: 'N3', x: 12, y: 0, z: 0, restraints: { Tx: true, Ty: true, Tz: true } },
    // Story 1 (z=4)
    { id: 'N4', x: 0, y: 0, z: 4 },
    { id: 'N5', x: 6, y: 0, z: 4 },
    { id: 'N6', x: 12, y: 0, z: 4 },
    // Story 2 (z=8)
    { id: 'N7', x: 0, y: 0, z: 8 },
    { id: 'N8', x: 6, y: 0, z: 8 },
    { id: 'N9', x: 12, y: 0, z: 8 },
    // Roof (z=12)
    { id: 'N10', x: 0, y: 0, z: 12 },
    { id: 'N11', x: 6, y: 0, z: 12 },
    { id: 'N12', x: 12, y: 0, z: 12 },
  ];

  it('correctly generates height-varying ASCE 7-16 directional wind loads', () => {
    const windParams: WindLoadParameters = {
      basicWindSpeed: 40, // 40 m/s (~90 mph)
      exposureCategory: 'C',
      direction: 'X',
      buildingWidth: 12.0,
      buildingDepth: 18.0,
      gustFactorG: 0.85,
    };

    const seismicParams: SeismicLoadParameters = {
      siteClass: 'D',
      Ss: 1.25,
      S1: 0.50,
      responseModificationR: 8.0,
      direction: 'X',
      seismicWeightKg: 60000,
    };

    const result = AutonomousLoadGenerator.generate(nodes, windParams, seismicParams, 'ASCE_7_16');

    expect(result.windLoads.totalBaseShearN).toBeGreaterThan(10000); // positive base shear
    expect(result.windLoads.velocityPressureAtRoofPa).toBeGreaterThan(600); // realistic q_h
    expect(result.windLoads.overturningMomentNm).toBeGreaterThan(50000);

    // Verify velocity pressure and net design wind pressure increase with height
    expect(result.windLoads.storyPressures.length).toBe(3);
    const story1 = result.windLoads.storyPressures[0]!;
    const story3 = result.windLoads.storyPressures[2]!;

    expect(story3.elevationZ).toBeGreaterThan(story1.elevationZ);
    expect(story3.velocityPressureQzPa).toBeGreaterThan(story1.velocityPressureQzPa);
    expect(story3.netPressurePPa).toBeGreaterThan(story1.netPressurePPa);
  });

  it('computes ASCE 7-16 ELF seismic parameters and vertical force distribution', () => {
    const windParams: WindLoadParameters = {
      basicWindSpeed: 35,
      exposureCategory: 'B',
      direction: 'X',
      buildingWidth: 12.0,
      buildingDepth: 12.0,
    };

    const seismicParams: SeismicLoadParameters = {
      siteClass: 'D',
      Ss: 1.20,
      S1: 0.45,
      responseModificationR: 8.0,
      direction: 'X',
      structuralSystem: 'STEEL_MOMENT_FRAME',
      seismicWeightKg: 80000, // 80 tonnes
    };

    const result = AutonomousLoadGenerator.generate(nodes, windParams, seismicParams, 'ASCE_7_16');

    const seis = result.seismicLoads;
    expect(seis.fundamentalPeriodSec).toBeGreaterThan(0.4);
    expect(seis.fundamentalPeriodSec).toBeLessThan(0.7); // Ta ~ 0.53s for 12m steel frame

    expect(seis.designSpectralAccSds).toBeGreaterThan(0.9);
    expect(seis.designSpectralAccSd1).toBeGreaterThan(0.4);

    expect(seis.seismicResponseCoeffCs).toBeGreaterThan(0.04);
    expect(seis.seismicResponseCoeffCs).toBeLessThan(0.16);

    // Total seismic base shear V = Cs * W
    const expectedBaseShear = seis.seismicResponseCoeffCs * 80000 * 9.81;
    expect(seis.totalBaseShearN).toBeGreaterThan(expectedBaseShear * 0.95);
    expect(seis.totalBaseShearN).toBeLessThan(expectedBaseShear * 1.05);

    // Verify vertical force distribution (roof receives larger force than story 1)
    const story1Force = seis.nodalLoads.find((l) => l.nodeId === 'N4')!.Fx!;
    const roofForce = seis.nodalLoads.find((l) => l.nodeId === 'N10')!.Fx!;
    expect(roofForce).toBeGreaterThan(story1Force);
  });

  it('synthesizes full set of ASCE 7-16 and Eurocode factored design load combinations', () => {
    const windParams: WindLoadParameters = {
      basicWindSpeed: 38,
      exposureCategory: 'C',
      direction: 'X',
      buildingWidth: 10,
      buildingDepth: 10,
    };
    const seismicParams: SeismicLoadParameters = {
      siteClass: 'C',
      Ss: 1.0,
      S1: 0.4,
      responseModificationR: 6.0,
      direction: 'X',
    };

    const asceResult = AutonomousLoadGenerator.generate(nodes, windParams, seismicParams, 'ASCE_7_16');
    expect(asceResult.loadCombinations.length).toBeGreaterThanOrEqual(6);
    expect(asceResult.loadCombinations.some((c) => c.factors.Wind !== undefined)).toBe(true);
    expect(asceResult.loadCombinations.some((c) => c.factors.Seismic !== undefined)).toBe(true);

    const ecResult = AutonomousLoadGenerator.generate(nodes, windParams, seismicParams, 'EUROCODE');
    expect(ecResult.loadCombinations.some((c) => c.name.includes('1.35D + 1.5L'))).toBe(true);
  });
});
