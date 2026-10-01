import { describe, it, expect } from 'vitest';
import { StressCriteriaEngine } from './StressCriteriaEngine';

describe('Sprint B19.4 — Stress Contours & Multi-Axial Yield Criteria', () => {
  it('calculates exact principal stresses and orientation under combined tension and shear', () => {
    // sigma_x = 80 MPa, sigma_y = 20 MPa, tau_xy = 40 MPa
    const principal = StressCriteriaEngine.calculatePrincipalStresses({
      sigmax: 80,
      sigmay: 20,
      tauxy: 40,
    });

    // Center = 50, Radius = sqrt(30^2 + 40^2) = 50
    // sigma_1 = 50 + 50 = 100 MPa, sigma_2 = 50 - 50 = 0 MPa
    expect(principal.sigma1).toBeCloseTo(100, 3);
    expect(principal.sigma2).toBeCloseTo(0, 3);
    expect(principal.tauMax).toBeCloseTo(50, 3);
    expect(principal.hydrostaticMeanStress).toBeCloseTo(50, 3);

    // theta_p = 0.5 * atan2(80, 60) = 0.5 * 53.13 deg = 26.565 deg
    expect(principal.thetaPrincipalDeg).toBeCloseTo(26.565, 2);
  });

  it('evaluates von Mises and Tresca yield criteria under pure shear', () => {
    // Pure shear of 100 MPa
    const yieldRes = StressCriteriaEngine.evaluateYieldCriteria(
      {
        sigmax: 0,
        sigmay: 0,
        tauxy: 100,
      },
      355 // S355 steel yield strength
    );

    // Theoretical von Mises: sqrt(3) * 100 = 173.205 MPa
    expect(yieldRes.vonMisesStress).toBeCloseTo(173.205, 2);
    // Theoretical Tresca: 2 * tau = 200 MPa
    expect(yieldRes.trescaStress).toBeCloseTo(200, 2);

    expect(yieldRes.utilizationVonMises).toBeCloseTo(173.205 / 355, 3);
    expect(yieldRes.utilizationTresca).toBeCloseTo(200 / 355, 3);
    expect(yieldRes.isYielded).toBe(false);
  });

  it('detects plastic yielding when von Mises stress exceeds material yield strength', () => {
    const yieldRes = StressCriteriaEngine.evaluateYieldCriteria(
      {
        sigmax: 300,
        sigmay: -200,
        tauxy: 120,
      },
      250 // S250 mild steel
    );

    // sigma_vm = sqrt(300^2 - (300)(-200) + 200^2 + 3 * 120^2) = sqrt(90000 + 60000 + 40000 + 43200) = sqrt(233200) = 482.9 MPa
    expect(yieldRes.vonMisesStress).toBeGreaterThan(450);
    expect(yieldRes.isYielded).toBe(true);
    expect(yieldRes.utilizationVonMises).toBeGreaterThan(1.0);
  });

  it('smooths element stresses to mesh nodes via area-weighted averaging', () => {
    const nodeIds = ['N1', 'N2', 'N3', 'N4', 'N5', 'N6'];
    const elements = [
      { id: 'E1', nodeIds: ['N1', 'N2', 'N5', 'N4'], area: 1.0 },
      { id: 'E2', nodeIds: ['N2', 'N3', 'N6', 'N5'], area: 1.0 },
    ];

    const elementStressMap = new Map<string, number>();
    elementStressMap.set('E1', 100);
    elementStressMap.set('E2', 200);

    const nodalMap = StressCriteriaEngine.smoothElementStressesToNodes(
      nodeIds,
      elements,
      elementStressMap
    );

    // Node N1 belongs only to E1 -> stress = 100
    expect(nodalMap.get('N1')).toBeCloseTo(100, 1);
    // Node N3 belongs only to E2 -> stress = 200
    expect(nodalMap.get('N3')).toBeCloseTo(200, 1);
    // Shared nodes N2 and N5 belong equally to E1 and E2 -> average stress = (100 + 200) / 2 = 150
    expect(nodalMap.get('N2')).toBeCloseTo(150, 1);
    expect(nodalMap.get('N5')).toBeCloseTo(150, 1);
  });
});
