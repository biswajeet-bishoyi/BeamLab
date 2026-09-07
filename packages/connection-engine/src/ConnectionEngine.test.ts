import { describe, it, expect } from 'vitest';
import {
  BoltLimitStateEngine,
  BoltGroupAnalyzer,
  WeldLimitStateEngine,
  BOLT_DATABASE,
  STANDARD_BOLT_GEOMETRY,
} from './index';

describe('Phase B8.1: Structural Steel Connection Design Engine', () => {
  describe('AISC 360-16 Chapter J: Bolt Limit States', () => {
    it('verifies AISC single bolt shear capacity (LRFD) for M20 A325 threads included', () => {
      const result = BoltLimitStateEngine.checkAiscBoltShear({
        grade: 'A325',
        diameter_mm: 20,
        threadCondition: 'INCLUDED',
        shearPlanes: 1,
        demand_kN: 70,
        method: 'LRFD',
      });

      // F_nv = 372 MPa, A_b = 314.2 mm2 -> R_n = 116.88 kN -> phi*R_n = 0.75 * 116.88 = 87.66 kN
      expect(result.capacity_kN).toBeCloseTo(87.66, 1);
      expect(result.demand_kN).toBe(70);
      expect(result.utilization).toBeCloseTo(70 / 87.66, 2);
      expect(result.pass).toBe(true);
      expect(result.steps.length).toBeGreaterThanOrEqual(4);
      expect(result.steps[0].citation).toContain('AISC 360-16');
    });

    it('verifies AISC single bolt tension capacity (LRFD) for M20 A325', () => {
      const result = BoltLimitStateEngine.checkAiscBoltTension({
        grade: 'A325',
        diameter_mm: 20,
        demand_kN: 120,
        method: 'LRFD',
      });

      // F_nt = 620 MPa, A_b = 314.2 mm2 -> R_n = 194.8 kN -> phi*R_n = 0.75 * 194.8 = 146.1 kN
      expect(result.capacity_kN).toBeCloseTo(146.1, 1);
      expect(result.pass).toBe(true);
      expect(result.utilization).toBeLessThan(1.0);
    });

    it('verifies AISC combined shear and tension interaction (Eq. J3-3a)', () => {
      const result = BoltLimitStateEngine.checkAiscCombinedTensionShear({
        grade: 'A325',
        diameter_mm: 20,
        threadCondition: 'INCLUDED',
        shearDemand_kN: 40,
        tensionDemand_kN: 80,
        method: 'LRFD',
      });

      expect(result.capacity_kN).toBeGreaterThan(0);
      expect(result.steps.some((s) => s.equationName.includes("Modified Nominal Tensile Stress"))).toBe(true);
    });

    it('verifies AISC bolt hole bearing and tearout resistance (J3.10)', () => {
      const result = BoltLimitStateEngine.checkAiscBearingAndTearout({
        diameter_mm: 20,
        plateThickness_mm: 10,
        Fu_MPa: 450, // A572 Gr 50
        clearDistance_mm: 35,
        deformationConsidered: true,
        demand_kN: 80,
        method: 'LRFD',
      });

      // Tearout: 1.2 * 35 * 10 * 450 = 189 kN
      // Bearing: 2.4 * 20 * 10 * 450 = 216 kN
      // Governs: Tearout = 189 kN -> phi*Rn = 0.75 * 189 = 141.75 kN
      expect(result.capacity_kN).toBeCloseTo(141.75, 1);
      expect(result.limitState).toContain('Tearout');
      expect(result.pass).toBe(true);
    });

    it('verifies AISC slip-critical connection resistance (Section J3.8)', () => {
      const result = BoltLimitStateEngine.checkAiscSlipCritical({
        grade: 'A325',
        diameter_mm: 20,
        holeType: 'STANDARD',
        surfaceClass: 'CLASS_A',
        shearPlanes: 1,
        demand_kN: 35,
      });

      // mu = 0.30, Du = 1.13, Tb = 142 kN -> Rn = 0.30 * 1.13 * 1.0 * 142 = 48.14 kN
      expect(result.capacity_kN).toBeCloseTo(48.14, 1);
      expect(result.pass).toBe(true);
      expect(result.utilization).toBeLessThan(1.0);
    });
  });

  describe('Eurocode 3 EN 1993-1-8: Bolt Limit States', () => {
    it('verifies Eurocode 3 Table 3.4 bolt shear resistance F_v,Rd for Grade 8.8', () => {
      const result = BoltLimitStateEngine.checkEurocodeBoltShear({
        grade: 'GRADE_8_8',
        diameter_mm: 20,
        threadCondition: 'INCLUDED',
        shearPlanes: 1,
        demand_kN: 80,
      });

      // fub = 800 MPa, As = 245 mm2, alpha_v = 0.6, gammaM2 = 1.25
      // F_v,Rd = (0.6 * 800 * 245) / 1.25 = 94.08 kN
      expect(result.capacity_kN).toBeCloseTo(94.08, 1);
      expect(result.pass).toBe(true);
      expect(result.utilization).toBeCloseTo(80 / 94.08, 2);
    });

    it('verifies Eurocode 3 Table 3.4 bolt tension resistance F_t,Rd for Grade 8.8', () => {
      const result = BoltLimitStateEngine.checkEurocodeBoltTension({
        grade: 'GRADE_8_8',
        diameter_mm: 20,
        demand_kN: 100,
      });

      // fub = 800 MPa, As = 245 mm2, k2 = 0.9, gammaM2 = 1.25
      // F_t,Rd = (0.9 * 800 * 245) / 1.25 = 141.12 kN
      expect(result.capacity_kN).toBeCloseTo(141.12, 1);
      expect(result.pass).toBe(true);
    });

    it('verifies Eurocode 3 combined shear and tension interaction', () => {
      const result = BoltLimitStateEngine.checkEurocodeCombinedInteraction({
        shearDemand_kN: 47,
        shearCapacity_kN: 94.08,
        tensionDemand_kN: 70,
        tensionCapacity_kN: 141.12,
      });

      // 47/94.08 + 70/(1.4 * 141.12) = 0.50 + 0.354 = 0.854 <= 1.0 -> PASS
      expect(result.utilization).toBeCloseTo(0.854, 2);
      expect(result.pass).toBe(true);
    });

    it('verifies Eurocode 3 plate bearing resistance F_b,Rd', () => {
      const result = BoltLimitStateEngine.checkEurocodeBearing({
        grade: 'GRADE_8_8',
        diameter_mm: 20,
        plateThickness_mm: 10,
        plateFu_MPa: 510, // S355
        e1_mm: 40,
        p1_mm: 70,
        e2_mm: 35,
        p2_mm: 70,
        isEndBolt: true,
        demand_kN: 90,
      });

      expect(result.capacity_kN).toBeGreaterThan(0);
      expect(result.pass).toBe(true);
      expect(result.steps.some((s) => s.equationName.includes('alpha_b'))).toBe(true);
    });
  });

  describe('Weld Limit States (AISC 360-16 & Eurocode 3)', () => {
    it('verifies AISC fillet weld shear capacity with longitudinal orientation (theta = 0)', () => {
      const result = WeldLimitStateEngine.checkAiscFilletWeld({
        weldLeg_mm: 8,
        weldLength_mm: 200,
        electrode: 'E70XX',
        loadAngle_deg: 0,
        demand_kN: 150,
      });

      // te = 0.7071 * 8 = 5.6568 mm, A_we = 5.6568 * 200 = 1131.37 mm2
      // F_nw = 0.60 * 485 = 291 MPa -> Rn = 291 * 1131.37 / 1000 = 329.23 kN
      // phi*Rn = 0.75 * 329.23 = 246.92 kN
      expect(result.capacity_kN).toBeCloseTo(246.92, 1);
      expect(result.pass).toBe(true);
      expect(result.utilization).toBeLessThan(1.0);
    });

    it('verifies AISC fillet weld +50% directional strength increase for transverse load (theta = 90)', () => {
      const longitudinal = WeldLimitStateEngine.checkAiscFilletWeld({
        weldLeg_mm: 8,
        weldLength_mm: 200,
        electrode: 'E70XX',
        loadAngle_deg: 0,
        demand_kN: 100,
      });

      const transverse = WeldLimitStateEngine.checkAiscFilletWeld({
        weldLeg_mm: 8,
        weldLength_mm: 200,
        electrode: 'E70XX',
        loadAngle_deg: 90,
        demand_kN: 100,
      });

      // Directional factor for 90 deg = 1.50 -> Capacity should be 1.5x longitudinal
      expect(transverse.capacity_kN / longitudinal.capacity_kN).toBeCloseTo(1.5, 2);
    });

    it('verifies AISC minimum and maximum fillet weld leg sizes', () => {
      expect(WeldLimitStateEngine.getMinimumFilletWeldLeg_mm(5)).toBe(3.0);
      expect(WeldLimitStateEngine.getMinimumFilletWeldLeg_mm(10)).toBe(5.0);
      expect(WeldLimitStateEngine.getMinimumFilletWeldLeg_mm(16)).toBe(6.0);
      expect(WeldLimitStateEngine.getMinimumFilletWeldLeg_mm(25)).toBe(8.0);

      expect(WeldLimitStateEngine.getMaximumFilletWeldLeg_mm(5)).toBe(5.0);
      expect(WeldLimitStateEngine.getMaximumFilletWeldLeg_mm(12)).toBe(10.5); // 12 - 1.5
    });

    it('verifies Eurocode 3 simplified fillet weld resistance for S355 steel', () => {
      const result = WeldLimitStateEngine.checkEurocodeFilletWeldSimplified({
        throat_mm: 5,
        weldLength_mm: 150,
        steelGrade: 'S355',
        fu_MPa: 510,
        demand_kN: 120,
      });

      // beta_w = 0.90, gammaM2 = 1.25
      // f_vw_d = (510 / sqrt(3)) / (0.90 * 1.25) = 294.45 / 1.125 = 261.73 MPa
      // capacity = 261.73 * 5 * 150 / 1000 = 196.3 kN
      expect(result.capacity_kN).toBeCloseTo(196.3, 1);
      expect(result.pass).toBe(true);
    });
  });

  describe('Bolt Group Mechanics & Vector Superposition', () => {
    it('creates a regular 2x2 bolt grid pattern and calculates centroid & polar moment J', () => {
      const pattern = BoltGroupAnalyzer.createGridPattern({
        rows: 2,
        cols: 2,
        pitchY_mm: 80,
        gageX_mm: 80,
        diameter_mm: 20,
        edgeDistX_mm: 40,
        edgeDistY_mm: 40,
      });

      expect(pattern.bolts.length).toBe(4);
      const centroid = BoltGroupAnalyzer.calculateCentroid(pattern.bolts);
      expect(centroid.x).toBeCloseTo(80, 2);
      expect(centroid.y).toBeCloseTo(80, 2);

      // Distances from centroid: each bolt is at dx = +/-40, dy = +/-40 -> r^2 = 1600 + 1600 = 3200 mm2
      // J = 4 * 3200 = 12800 mm2
      const J = BoltGroupAnalyzer.calculatePolarMoment(pattern.bolts, centroid);
      expect(J).toBeCloseTo(12800, 2);
    });

    it('performs elastic vector analysis on eccentric shear connection', () => {
      const pattern = BoltGroupAnalyzer.createGridPattern({
        rows: 3,
        cols: 1,
        pitchY_mm: 75,
        gageX_mm: 0,
        diameter_mm: 20,
        edgeDistX_mm: 40,
        edgeDistY_mm: 40,
      });

      // Vertical load of 90 kN with 100 mm eccentricity
      const result = BoltGroupAnalyzer.analyzeElasticVector({
        bolts: pattern.bolts,
        forceX_kN: 0,
        forceY_kN: 90,
        momentZ_kNm: 0,
        eccentricityX_mm: 100, // M = 90 kN * 0.1 m = 9 kNm
      });

      expect(result.totalBolts).toBe(3);
      // Top and bottom bolts experience maximum combined shear
      expect(result.governingDemand_kN).toBeGreaterThan(30); // Higher than direct 90/3 = 30 kN
      expect(result.criticalBolt.boltId).toMatch(/B1|B3/);
    });

    it('computes Instantaneous Center of Rotation (ICR) non-linear convergence', () => {
      const pattern = BoltGroupAnalyzer.createGridPattern({
        rows: 4,
        cols: 1,
        pitchY_mm: 75,
        gageX_mm: 0,
        diameter_mm: 20,
        edgeDistX_mm: 40,
        edgeDistY_mm: 40,
      });

      const icrResult = BoltGroupAnalyzer.analyzeICR({
        bolts: pattern.bolts,
        eccentricity_mm: 75,
        singleBoltShearCapacity_kN: 87.66,
      });

      expect(icrResult.converged).toBe(true);
      expect(icrResult.ultimateCoefficientC).toBeGreaterThan(1.0);
      expect(icrResult.ultimateCoefficientC).toBeLessThan(4.0);
      expect(icrResult.nominalCapacity_kN).toBeGreaterThan(87.66);
    });
  });
});
