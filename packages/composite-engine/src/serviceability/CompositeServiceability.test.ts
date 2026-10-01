import { describe, it, expect } from 'vitest';
import { STANDARD_WIDE_FLANGE_SECTIONS } from '../material/CompositeMaterialModel';
import { EffectiveWidthEngine } from '../material/EffectiveWidthEngine';
import { CompositeDeflectionAuditor } from './CompositeDeflectionAuditor';
import { FloorVibrationAuditor } from './FloorVibrationAuditor';

describe('CompositeServiceability Engine (Sprint B15.4)', () => {
  const steelSection = STANDARD_WIDE_FLANGE_SECTIONS['W18x50'];
  const testSection = {
    steel: steelSection,
    concrete: {
      fc: 28, // MPa
      density: 2350,
      elasticModulus: 25000,
      slabThickness: 85,
      totalSlabThickness: 160,
    },
    deck: {
      ribDepth: 75,
      averageRibWidth: 150,
      ribPitch: 300,
      sheetThickness: 0.9,
      orientation: 'perpendicular' as const,
    },
  };

  const spanLength = 9.0;
  const tributarySpacing = 3.0;
  const bEff = EffectiveWidthEngine.computeAiscEffectiveWidth({
    spanLengthMm: spanLength * 1000,
    spacingLeftMm: tributarySpacing * 1000,
    spacingRightMm: tributarySpacing * 1000,
    flangeWidthMm: steelSection.flangeWidth,
    toppingThicknessMm: 85,
  }).beff;

  describe('CompositeDeflectionAuditor', () => {
    it('computes short-term, sustained creep, and shrinkage deflections', () => {
      const result = CompositeDeflectionAuditor.calculateDeflections(testSection, bEff, {
        spanLength: 9.0,
        tributaryWidth: 3.0,
        liveLoad: 3.0, // 3 kPa
        superimposedDeadLoad: 0.75, // 0.75 kPa
        eta: 0.85,
      });

      expect(result.spanLengthM).toBe(9.0);
      expect(result.bareSteelIx).toBe(33300); // cm^4
      expect(result.transformedIxShort).toBeGreaterThan(result.bareSteelIx);
      expect(result.effectiveIxShort).toBeGreaterThan(result.bareSteelIx);
      expect(result.effectiveIxShort).toBeLessThanOrEqual(result.transformedIxShort);

      // Long term transformed Ix should be lower than short term due to creep modular ratio
      expect(result.transformedIxLong).toBeLessThan(result.transformedIxShort);
      expect(result.effectiveIxLong).toBeLessThan(result.effectiveIxShort);

      // Deflections
      expect(result.constructionDeadDeflection).toBeGreaterThan(5);
      expect(result.liveLoadDeflection).toBeGreaterThan(0);
      expect(result.liveLoadDeflection).toBeLessThan(result.liveLoadLimit); // Passing L/360
      expect(result.shrinkageDeflection).toBeGreaterThan(0);
      expect(result.longTermTotalDeflection).toBeGreaterThan(result.liveLoadDeflection);
      expect(result.isPassing).toBe(true);
      expect(result.recommendedCamber).toBeGreaterThanOrEqual(0);
    });

    it('verifies that lower composite interaction eta reduces effective stiffness Ieff', () => {
      const fullRes = CompositeDeflectionAuditor.calculateDeflections(testSection, bEff, {
        spanLength: 9.0,
        tributaryWidth: 3.0,
        liveLoad: 3.0,
        eta: 1.0,
      });

      const partialRes = CompositeDeflectionAuditor.calculateDeflections(testSection, bEff, {
        spanLength: 9.0,
        tributaryWidth: 3.0,
        liveLoad: 3.0,
        eta: 0.30,
      });

      expect(partialRes.effectiveIxShort).toBeLessThan(fullRes.effectiveIxShort);
      expect(partialRes.liveLoadDeflection).toBeGreaterThan(fullRes.liveLoadDeflection);
    });
  });

  describe('FloorVibrationAuditor (AISC DG11)', () => {
    it('evaluates natural frequency and walking vibration comfort for office floor', () => {
      const defl = CompositeDeflectionAuditor.calculateDeflections(testSection, bEff, {
        spanLength: 9.0,
        tributaryWidth: 3.0,
        liveLoad: 3.0,
        eta: 0.85,
      });

      const vibResult = FloorVibrationAuditor.auditVibration({
        beamSpanM: 9.0,
        beamSpacingM: 3.0,
        effectiveMomentOfInertiaCm4: defl.effectiveIxShort,
        slabThicknessMm: 85,
        concreteElasticModulusMPa: 25000,
        deadLoadKPa: 3.5, // 3.5 kPa total dead load
        vibrationLiveLoadKPa: 0.5,
        occupancy: 'office_residential',
        dampingRatioBeta: 0.03,
      });

      expect(vibResult.naturalFrequencyFn).toBeGreaterThan(3.5);
      expect(vibResult.frequencyStatus).toBe('Adequate (> 3 Hz)');
      expect(vibResult.effectivePanelWidthB).toBeGreaterThan(3.0);
      expect(vibResult.effectivePanelWeightW).toBeGreaterThan(100);

      // AISC DG11 peak acceleration
      expect(vibResult.peakAccelerationPercentG).toBeGreaterThan(0.01);
      expect(vibResult.peakAccelerationPercentG).toBeLessThan(0.5); // Less than 0.5% g comfort limit
      expect(vibResult.isComfortable).toBe(true);
      expect(vibResult.comfortVerdict).toContain('meets AISC DG11');
    });

    it('identifies excessive vibration and produces corrective recommendations for sensitive occupancy', () => {
      const vibResult = FloorVibrationAuditor.auditVibration({
        beamSpanM: 12.0, // long slender span
        beamSpacingM: 3.5,
        effectiveMomentOfInertiaCm4: 40000,
        slabThicknessMm: 65, // thin slab
        concreteElasticModulusMPa: 22000,
        deadLoadKPa: 2.8,
        occupancy: 'sensitive_laboratory', // Strict 0.15% g limit
        dampingRatioBeta: 0.015, // Low damping
      });

      expect(vibResult.isComfortable).toBe(false);
      expect(vibResult.comfortVerdict).toContain('FAIL');
      expect(vibResult.recommendations.length).toBeGreaterThan(0);
    });
  });
});
