import { describe, it, expect } from 'vitest';
import { MovingLoadAnalyzer } from './MovingLoadAnalyzer.js';
import { VehicularCatalog } from '../vehicles/VehicularCatalog.js';

describe('MovingLoadAnalyzer - Vehicular Stepping & Envelope Hunter', () => {
  const L = 20.0;
  const truck = VehicularCatalog.getAashtoHL93Truck();

  it('should find governing maximum moment near midspan for AASHTO HL-93 Truck', () => {
    const result = MovingLoadAnalyzer.analyzeSimpleSpan({
      spanLengthM: L,
      vehicle: truck,
      stepSizeM: 0.1,
      numberOfStations: 21, // every 1.0 m
    });

    expect(result.spanLengthM).toBe(20.0);
    expect(result.hasLaneLoad).toBe(true);
    expect(result.dynamicAllowance).toBe(0.33);

    // Governing moment station should be close to midspan (9.0 m to 11.0 m)
    const maxM = result.governingMaxMoment;
    expect(maxM.stationM).toBeGreaterThanOrEqual(9.0);
    expect(maxM.stationM).toBeLessThanOrEqual(11.0);
    expect(maxM.value).toBeGreaterThan(1500.0); // kNm (truck + 33% IM + 9.3 kN/m lane)
    expect(maxM.laneContributionKnOrKNm).toBeGreaterThan(450.0);
    expect(maxM.laneContributionKnOrKNm).toBeLessThanOrEqual(465.0);

    // Governing truck head position should be slightly ahead of midspan so drive axle is near center
    expect(maxM.governingTruckHeadPositionM).toBeGreaterThan(10.0);
  });

  it('should find governing maximum shear at supports', () => {
    const result = MovingLoadAnalyzer.analyzeSimpleSpan({
      spanLengthM: L,
      vehicle: truck,
      stepSizeM: 0.1,
    });

    const maxV = result.governingMaxShear;
    expect(maxV.stationM).toBe(0.0); // Left support
    expect(maxV.value).toBeGreaterThan(300.0); // kN

    // Left reaction at support x = 0 should match maximum shear at x = 0
    expect(result.governingMaxReactionLeft.value).toBeCloseTo(maxV.value, 1);
    expect(result.governingMaxReactionRight.value).toBeCloseTo(maxV.value, 1); // By symmetry
  });

  it('should generate symmetric envelope across symmetric simple span', () => {
    const result = MovingLoadAnalyzer.analyzeSimpleSpan({
      spanLengthM: L,
      vehicle: truck,
      stepSizeM: 0.1,
      numberOfStations: 21,
    });

    const stations = result.stations;
    expect(stations.length).toBe(21);

    // Midspan moment is at index 10 (x = 10m)
    const midspanM = stations[10].maxMomentKNm;
    // Station x = 5m (index 5) and x = 15m (index 15) should have identical maximum moments
    expect(stations[5].maxMomentKNm).toBeCloseTo(stations[15].maxMomentKNm, 0);

    // Shear at x = 0 should match absolute shear at x = 20m
    expect(stations[0].maxShearKn).toBeCloseTo(Math.abs(stations[20].minShearKn), 0);
  });

  it('should compute fatigue limit state moment range and stress range', () => {
    const Sx = 0.025; // 0.025 m^3 section modulus (e.g. plate girder or box beam)
    const result = MovingLoadAnalyzer.analyzeSimpleSpan({
      spanLengthM: L,
      vehicle: truck,
      stepSizeM: 0.1,
      sectionModulusM3: Sx,
    });

    expect(result.maxFatigueMomentRangeKNm).toBeGreaterThan(500.0);
    expect(result.maxFatigueStressRangeMpa).toBeDefined();
    // Delta f = Delta M / Sx / 1000 MPa
    const expectedMpa = (result.maxFatigueMomentRangeKNm / Sx) / 1000;
    expect(result.maxFatigueStressRangeMpa).toBeCloseTo(expectedMpa, 2);
  });

  it('should evaluate AASHTO Tandem on short 10m span', () => {
    const tandem = VehicularCatalog.getAashtoHL93Tandem();
    const result = MovingLoadAnalyzer.analyzeSimpleSpan({
      spanLengthM: 10.0,
      vehicle: tandem,
      stepSizeM: 0.05,
    });

    expect(result.spanLengthM).toBe(10.0);
    expect(result.governingMaxMoment.value).toBeGreaterThan(0);
    expect(result.governingMaxShear.stationM).toBe(0);
  });
});
