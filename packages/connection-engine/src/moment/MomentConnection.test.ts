import { describe, it, expect } from 'vitest';
import {
  PryingActionEngine,
  EndPlateMomentEngine,
  EndPlateConfig,
} from '../index';

describe('Phase B8.3: Structural Steel Moment Connection Engine', () => {
  describe('Prying Action Mechanics (AISC Part 9 & Eurocode 3 T-Stub)', () => {
    it('calculates AISC Manual Part 9 prying action when plate is thin (prying active)', () => {
      const result = PryingActionEngine.calculateAiscPrying({
        flangeThickness_mm: 16, // Relatively thin plate
        Fy_MPa: 250,
        Fu_MPa: 400,
        boltDiameter_mm: 20,
        holeDiameter_mm: 22,
        boltTensionCapacity_kN: 146.1, // phi * F_nt * A_b
        dimension_b_mm: 35,
        dimension_a_mm: 35,
        tributaryLength_p_mm: 100,
        tensionDemandPerBolt_kN: 80,
      });

      expect(result.requiredThicknessNoPrying_tc_mm).toBeGreaterThan(16);
      expect(result.hasPrying).toBe(true);
      expect(result.pryingForce_Q_kN).toBeGreaterThan(0);
      expect(result.totalBoltTensionDemand_kN).toBeGreaterThan(80);
      expect(result.limitStateResult.limitState).toContain('Prying Action');
    });

    it('calculates AISC Manual Part 9 prying action when plate is thick (no prying)', () => {
      const result = PryingActionEngine.calculateAiscPrying({
        flangeThickness_mm: 35, // Thick plate
        Fy_MPa: 250,
        Fu_MPa: 400,
        boltDiameter_mm: 20,
        holeDiameter_mm: 22,
        boltTensionCapacity_kN: 146.1,
        dimension_b_mm: 35,
        dimension_a_mm: 35,
        tributaryLength_p_mm: 100,
        tensionDemandPerBolt_kN: 80,
      });

      expect(result.hasPrying).toBe(false);
      expect(result.pryingForce_Q_kN).toBe(0);
      expect(result.governingResistancePerBolt_kN).toBeCloseTo(146.1, 1);
    });

    it('evaluates Eurocode 3 EN 1993-1-8 Clause 6.2.4 equivalent T-stub plastic modes', () => {
      const tStub = PryingActionEngine.calculateEurocodeTStub({
        flangeThickness_mm: 20,
        effectiveLength_leff_mm: 250,
        fy_MPa: 355,
        boltTensionResistance_Ft_Rd_kN: 282, // pair of M20 8.8 bolts
        dimension_m_mm: 35,
        dimension_e_mm: 40,
        tensionDemand_kN: 200,
      });

      expect(tStub.mode1Capacity_kN).toBeGreaterThan(0);
      expect(tStub.mode2Capacity_kN).toBeGreaterThan(0);
      expect(tStub.mode3Capacity_kN).toBe(282);
      expect(tStub.governingResistance_kN).toBe(
        Math.min(tStub.mode1Capacity_kN, tStub.mode2Capacity_kN, tStub.mode3Capacity_kN)
      );
      expect(tStub.pass).toBe(true);
    });
  });

  describe('End-Plate Moment Connection Evaluator', () => {
    const config4E: EndPlateConfig = {
      connectionId: 'MC-4E-101',
      endPlateType: 'EXTENDED_4E',
      plateThickness_mm: 25, // 1 in plate
      plateWidth_mm: 230,
      plateHeight_mm: 700,
      plateFy_MPa: 250, // A36
      plateFu_MPa: 400,
      boltGrade: 'A325',
      boltDiameter_mm: 24, // 1 in bolts
      gageX_mm: 125,
      pitchFlangeInside_mm: 45,
      pitchFlangeOutside_mm: 45,
      threadCondition: 'EXCLUDED',
      holeType: 'STANDARD',
      beam: {
        id: 'B-W24x68',
        name: 'W24x68',
        depth_mm: 602,
        flangeWidth_mm: 228,
        flangeThickness_mm: 14.9,
        webThickness_mm: 10.5,
        yieldStrength_MPa: 345, // A992
        ultimateStrength_MPa: 450,
      },
      column: {
        id: 'C-W14x90',
        name: 'W14x90',
        depth_mm: 356,
        flangeWidth_mm: 368,
        flangeThickness_mm: 18.0,
        webThickness_mm: 11.2,
        rootRadius_mm: 36,
        yieldStrength_MPa: 345,
        ultimateStrength_MPa: 450,
      },
      flangeWeldType: 'CJP',
      webWeldLeg_mm: 8,
      weldElectrode: 'E70XX',
      hasContinuityPlates: false,
      hasWebDoublerPlate: false,
    };

    it('evaluates 4-bolt extended unstiffened (4E) moment connection per AISC Design Guide 4', () => {
      const evaluation = EndPlateMomentEngine.evaluate({
        config: config4E,
        momentDemand_kNm: 250,
        shearDemand_kN: 120,
        standard: 'AISC_360_16',
        method: 'LRFD',
      });

      expect(evaluation.connectionId).toBe('MC-4E-101');
      expect(evaluation.endPlateType).toBe('EXTENDED_4E');
      expect(evaluation.designMomentCapacity_kNm).toBeGreaterThan(0);
      expect(evaluation.governingLimitState).toBeDefined();

      const lsNames = evaluation.limitStateResults.map((r) => r.limitState);
      expect(lsNames).toContain('Bolt Tensile Rupture with Prying Action');
      expect(lsNames).toContain('End-Plate Flexural Yielding (Yield Line)');
      expect(lsNames).toContain('Column Web Panel-Zone Shear');
      expect(lsNames).toContain('Column Web Local Yielding');
      expect(lsNames).toContain('Column Web Local Crippling');
      expect(lsNames).toContain('Beam Web to End-Plate Weld Shear');
    });

    it('evaluates flush end-plate moment connection', () => {
      const flushConfig: EndPlateConfig = {
        ...config4E,
        connectionId: 'MC-FLUSH-102',
        endPlateType: 'FLUSH',
        plateHeight_mm: 620,
      };

      const evaluation = EndPlateMomentEngine.evaluate({
        config: flushConfig,
        momentDemand_kNm: 120,
        shearDemand_kN: 80,
      });

      expect(evaluation.endPlateType).toBe('FLUSH');
      expect(evaluation.designMomentCapacity_kNm).toBeGreaterThan(0);
    });
  });
});
