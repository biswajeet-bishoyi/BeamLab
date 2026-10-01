import { describe, it, expect } from 'vitest';
import { ErnstModulusEngine } from './ErnstModulusEngine';
import { STANDARD_CABLE_MATERIALS, STANDARD_CABLE_SECTIONS } from '../catenary/CableCatalog';

describe('Sprint B18.2 — Ernst Equivalent Modulus & Geometric Non-Linearity', () => {
  const matPws = STANDARD_CABLE_MATERIALS.BRIDGE_STRAND_1860!; // E = 205 GPa
  const secStay80 = STANDARD_CABLE_SECTIONS[3]!; // Ø80mm Stay Cable (Area = 0.00465 m2, weight = 357.9 N/m)

  it('calculates Ernst tangent modulus and demonstrates sag degradation at low vs high tension', () => {
    // 200m horizontal span stay cable inclined at 30 degrees (height = 115.47m)
    const geom = ErnstModulusEngine.createGeometry('STAY-01', 0, 0, 200, 115.47);

    // High tension: 3,500 kN (stress = 3500e3 / 0.00465 ~ 752 MPa)
    const resHigh = ErnstModulusEngine.calculateTangentModulus(geom, secStay80, matPws, 3_500_000);

    // At high tension, modulus should remain very close to full material modulus (eta > 0.95)
    expect(resHigh.reductionFactor).toBeGreaterThan(0.95);
    expect(resHigh.reductionFactor).toBeLessThanOrEqual(1.0);
    expect(resHigh.tangentModulus).toBeLessThanOrEqual(matPws.elasticModulus);
    expect(resHigh.axialStress).toBeCloseTo(3_500_000 / secStay80.metallicArea, 0);

    // Low tension: 250 kN (stress ~ 72.6 MPa) -> Sag causes massive apparent flexibility
    const resLow = ErnstModulusEngine.calculateTangentModulus(geom, secStay80, matPws, 250_000);

    // Reduction factor at low tension must be dramatically lower due to cubic T dependence
    expect(resLow.reductionFactor).toBeLessThan(0.60);
    expect(resLow.tangentModulus).toBeLessThan(resHigh.tangentModulus);
    expect(resLow.equivalentStiffness).toBeLessThan(resHigh.equivalentStiffness);
    expect(resLow.irvineParameter).toBeGreaterThan(resHigh.irvineParameter);
  });

  it('proves that secant modulus converges to tangent modulus when T1 = T2', () => {
    const geom = ErnstModulusEngine.createGeometry('STAY-02', 0, 0, 150, 80);
    const T = 1_800_000;

    const tanRes = ErnstModulusEngine.calculateTangentModulus(geom, secStay80, matPws, T);
    const secRes = ErnstModulusEngine.calculateSecantModulus(geom, secStay80, matPws, T, T);

    // For identical tensions, Ernst secant formulation analytically matches tangent modulus
    expect(secRes.secantModulus).toBeCloseTo(tanRes.tangentModulus, 3);
    expect(secRes.reductionFactor).toBeCloseTo(tanRes.reductionFactor, 6);
  });

  it('demonstrates secant stiffness under finite load increment from T1 to T2', () => {
    const geom = ErnstModulusEngine.createGeometry('STAY-03', 0, 0, 180, 100);
    const T1 = 1_000_000; // 1000 kN
    const T2 = 2_000_000; // 2000 kN

    const tan1 = ErnstModulusEngine.calculateTangentModulus(geom, secStay80, matPws, T1);
    const tan2 = ErnstModulusEngine.calculateTangentModulus(geom, secStay80, matPws, T2);
    const sec12 = ErnstModulusEngine.calculateSecantModulus(geom, secStay80, matPws, T1, T2);

    // Secant modulus for tension increase must lie between E_tan(T1) and E_tan(T2)
    expect(sec12.secantModulus).toBeGreaterThan(tan1.tangentModulus);
    expect(sec12.secantModulus).toBeLessThan(tan2.tangentModulus);
  });

  it('iteratively solves non-linear stay cable elongation under imposed displacement', () => {
    const geom = ErnstModulusEngine.createGeometry('STAY-04', 0, 0, 120, 60);
    const initialTension = 800_000; // 800 kN
    const imposedElongation = 0.05; // 50 mm elongation

    const iterResult = ErnstModulusEngine.solveIterativeElongation(
      geom,
      secStay80,
      matPws,
      initialTension,
      imposedElongation
    );

    expect(iterResult.converged).toBe(true);
    expect(iterResult.iterations).toBeGreaterThan(1);
    expect(iterResult.iterations).toBeLessThan(15);
    expect(iterResult.finalTension).toBeGreaterThan(initialTension);
    expect(iterResult.finalEquivalentModulus).toBeGreaterThan(0);
    expect(iterResult.history.length).toBe(iterResult.iterations);
  });

  it('throws helpful errors on invalid non-positive cable tensions', () => {
    const geom = ErnstModulusEngine.createGeometry('STAY-ERR', 0, 0, 100, 50);
    expect(() => {
      ErnstModulusEngine.calculateTangentModulus(geom, secStay80, matPws, 0);
    }).toThrow(/Axial cable tension must be strictly positive/);

    expect(() => {
      ErnstModulusEngine.calculateSecantModulus(geom, secStay80, matPws, -100, 500);
    }).toThrow(/Both initial and final cable tensions must be strictly positive/);
  });
});
