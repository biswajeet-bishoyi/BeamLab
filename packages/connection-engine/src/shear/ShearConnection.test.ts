import { describe, it, expect } from 'vitest';
import {
  BlockShearEngine,
  SinglePlateShearEngine,
  DoubleAngleShearEngine,
  SinglePlateConfig,
  DoubleAngleConfig,
} from '../index';

describe('Phase B8.2: Structural Steel Shear Connection Engine', () => {
  describe('Block Shear Rupture Engine (AISC J4.3 & Eurocode 3)', () => {
    it('verifies AISC 360-16 Section J4.3 block shear calculation against reference', () => {
      // Plate: t = 10 mm, A36 (Fy = 250 MPa, Fu = 400 MPa)
      // 3 bolts M20, dh = 22 mm, p = 75 mm, ev = 35 mm, eh = 40 mm
      // Lgv = 2 * 75 + 35 = 185 mm
      // Lgt = 40 mm
      const result = BlockShearEngine.checkAiscBlockShear({
        thickness_mm: 10,
        Fy_MPa: 250,
        Fu_MPa: 400,
        holeDiameter_mm: 22,
        shearLengthGross_mm: 185,
        tensionLengthGross_mm: 40,
        boltsInShearLine: 3,
        demand_kN: 200,
        method: 'LRFD',
      });

      // Agv = 1850, Agt = 400
      // Anv = (185 - 2.5 * 22) * 10 = 1300 mm2
      // Ant = (40 - 0.5 * 22) * 10 = 290 mm2
      // Rn1 = 0.6 * 400 * 1300 + 400 * 290 = 312 + 116 = 428 kN
      // Rn2_upper = 0.6 * 250 * 1850 + 400 * 290 = 277.5 + 116 = 393.5 kN
      // Rn = 393.5 kN -> phi * Rn = 0.75 * 393.5 = 295.125 kN
      expect(result.capacity_kN).toBeCloseTo(295.1, 1);
      expect(result.pass).toBe(true);
      expect(result.utilization).toBeCloseTo(200 / 295.125, 2);
      expect(result.steps.length).toBeGreaterThanOrEqual(4);
    });

    it('verifies Eurocode 3 EN 1993-1-8 Clause 3.10.2 block tearing resistance V_eff,1,Rd', () => {
      const result = BlockShearEngine.checkEurocodeBlockTearing({
        thickness_mm: 10,
        Fy_MPa: 250,
        Fu_MPa: 400,
        holeDiameter_mm: 22,
        shearLengthGross_mm: 185,
        tensionLengthGross_mm: 40,
        boltsInShearLine: 3,
        demand_kN: 200,
      });

      // V_eff,1,Rd = (400 * 290 / 1.25) + (250 * 1300 / (sqrt(3) * 1.0)) / 1000 = 92.8 + 187.64 = 280.44 kN
      expect(result.capacity_kN).toBeCloseTo(280.4, 1);
      expect(result.pass).toBe(true);
      expect(result.limitState).toContain('Block Tearing');
    });
  });

  describe('Single Plate Shear Connection (Shear Tab / Fin Plate)', () => {
    const baseConfig: SinglePlateConfig = {
      connectionId: 'ST-101',
      supportType: 'COLUMN_FLANGE',
      plateThickness_mm: 10,
      plateHeight_mm: 230,
      plateWidth_mm: 110,
      plateFy_MPa: 250, // A36
      plateFu_MPa: 400,
      boltGrade: 'A325',
      boltDiameter_mm: 20,
      boltRows: 3,
      boltColumns: 1,
      pitchY_mm: 75,
      edgeDistanceTop_mm: 40,
      edgeDistanceSide_mm: 40,
      threadCondition: 'INCLUDED',
      holeType: 'STANDARD',
      weldToBoltLine_a_mm: 75, // Conventional (< 89 mm)
      weldLeg_mm: 8,
      weldElectrode: 'E70XX',
      beam: {
        id: 'B-1',
        name: 'W16x50',
        depth_mm: 413,
        flangeWidth_mm: 180,
        flangeThickness_mm: 16,
        webThickness_mm: 9.65,
        yieldStrength_MPa: 345, // A992
        ultimateStrength_MPa: 450,
      },
    };

    it('evaluates conventional 3-bolt single plate shear connection per AISC 360-16', () => {
      const evaluation = SinglePlateShearEngine.evaluate({
        config: baseConfig,
        shearDemand_kN: 150,
        standard: 'AISC_360_16',
        method: 'LRFD',
      });

      expect(evaluation.isConventionalTab).toBe(true);
      expect(evaluation.connectionType).toBe('SINGLE_PLATE');
      expect(evaluation.designShearCapacity_kN).toBeGreaterThan(0);
      expect(evaluation.governingLimitState).toBeDefined();
      expect(evaluation.limitStateResults.length).toBeGreaterThanOrEqual(6);

      // Verify essential limit states are evaluated:
      const limitStateNames = evaluation.limitStateResults.map((r) => r.limitState);
      expect(limitStateNames).toContain('Bolt Group Shear with Eccentricity');
      expect(limitStateNames).toContain('Plate Gross Shear Yielding');
      expect(limitStateNames).toContain('Plate Net Shear Rupture');
      expect(limitStateNames.some((n) => n.includes('Block Shear'))).toBe(true);
      expect(limitStateNames).toContain('Bolt Bearing & Tearout on Plate');
      expect(limitStateNames).toContain('Bolt Bearing & Tearout on Beam Web');
      expect(limitStateNames).toContain('Fillet Weld to Support (Eccentric Shear)');
    });

    it('evaluates extended shear tab and includes plate flexural yielding check', () => {
      const extendedConfig: SinglePlateConfig = {
        ...baseConfig,
        connectionId: 'ST-EXT-201',
        weldToBoltLine_a_mm: 150, // Extended (> 89 mm)
      };

      const evaluation = SinglePlateShearEngine.evaluate({
        config: extendedConfig,
        shearDemand_kN: 100,
        standard: 'AISC_360_16',
        method: 'LRFD',
      });

      expect(evaluation.isConventionalTab).toBe(false);
      const flexuralLS = evaluation.limitStateResults.find((r) =>
        r.limitState.includes('Plate Flexural Yielding')
      );
      expect(flexuralLS).toBeDefined();
      expect(flexuralLS?.capacity_kN).toBeGreaterThan(0);
    });

    it('correctly reports failure and utilization when demand exceeds connection capacity', () => {
      const evaluation = SinglePlateShearEngine.evaluate({
        config: baseConfig,
        shearDemand_kN: 900, // Excessive shear demand
        standard: 'AISC_360_16',
        method: 'LRFD',
      });

      expect(evaluation.pass).toBe(false);
      expect(evaluation.utilization).toBeGreaterThan(1.0);
    });
  });

  describe('Double Web Angle Connection (Clip Angles)', () => {
    const doubleAngleConfig: DoubleAngleConfig = {
      connectionId: 'DA-301',
      supportType: 'COLUMN_FLANGE',
      angleLeg1_mm: 102,
      angleLeg2_mm: 102,
      angleThickness_mm: 9.5,
      angleLength_mm: 230,
      angleFy_MPa: 250, // A36
      angleFu_MPa: 400,
      webBoltGrade: 'A325',
      webBoltDiameter_mm: 20,
      webBoltRows: 3,
      webBoltPitch_mm: 75,
      webEdgeDistanceTop_mm: 40,
      webEdgeDistanceEnd_mm: 35,
      supportFastenerType: 'BOLTED',
      supportBoltGrade: 'A325',
      supportBoltDiameter_mm: 20,
      beam: {
        id: 'B-2',
        name: 'W18x50',
        depth_mm: 457,
        flangeWidth_mm: 190,
        flangeThickness_mm: 14.5,
        webThickness_mm: 9.0,
        yieldStrength_MPa: 345,
        ultimateStrength_MPa: 450,
      },
    };

    it('evaluates all-bolted double clip angle connection per AISC 360-16', () => {
      const evaluation = DoubleAngleShearEngine.evaluate({
        config: doubleAngleConfig,
        shearDemand_kN: 180,
        standard: 'AISC_360_16',
        method: 'LRFD',
      });

      expect(evaluation.connectionType).toBe('DOUBLE_ANGLE');
      expect(evaluation.designShearCapacity_kN).toBeGreaterThan(0);
      expect(evaluation.governingLimitState).toBeDefined();
      expect(evaluation.limitStateResults.length).toBeGreaterThanOrEqual(5);

      const lsNames = evaluation.limitStateResults.map((r) => r.limitState);
      expect(lsNames).toContain('Beam Web Bolts Double Shear');
      expect(lsNames).toContain('Bolt Bearing & Tearout on Beam Web');
      expect(lsNames).toContain('Double Angles Gross Shear Yielding');
      expect(lsNames).toContain('Double Angles Net Shear Rupture');
      expect(lsNames).toContain('Double Angles Block Shear Rupture');
      expect(lsNames).toContain('Support Fasteners Shear (Outstanding Legs)');
    });

    it('evaluates double angle connection with welded outstanding legs', () => {
      const weldedAngleConfig: DoubleAngleConfig = {
        ...doubleAngleConfig,
        connectionId: 'DA-WELD-302',
        supportFastenerType: 'WELDED',
        supportWeldLeg_mm: 8,
        supportWeldElectrode: 'E70XX',
      };

      const evaluation = DoubleAngleShearEngine.evaluate({
        config: weldedAngleConfig,
        shearDemand_kN: 180,
      });

      const weldLS = evaluation.limitStateResults.find((r) =>
        r.limitState.includes('Support Welds Shear')
      );
      expect(weldLS).toBeDefined();
      expect(weldLS?.capacity_kN).toBeGreaterThan(0);
    });
  });
});
