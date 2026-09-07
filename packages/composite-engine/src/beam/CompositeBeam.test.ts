import { describe, it, expect } from 'vitest';
import { STANDARD_WIDE_FLANGE_SECTIONS } from '../material/CompositeMaterialModel';
import { EffectiveWidthEngine } from '../material/EffectiveWidthEngine';
import { ShearStudConnectorEngine, ShearStudDefinition } from './ShearStudConnectorEngine';
import { PlasticStressDistributionEngine } from './PlasticStressDistributionEngine';
import { ConstructionStageAuditor } from './ConstructionStageAuditor';

describe('CompositeBeam Engine (Sprint B15.2)', () => {
  const steelSection = STANDARD_WIDE_FLANGE_SECTIONS['W18x50'];
  const testSection = {
    steel: steelSection,
    concrete: {
      fc: 28, // MPa (~4000 psi)
      density: 2350,
      elasticModulus: 25000,
      poissonRatio: 0.2,
      slabThickness: 85, // mm above deck ribs
      totalSlabThickness: 160,
    },
    deck: {
      ribDepth: 75, // mm (3 in)
      averageRibWidth: 150,
      ribPitch: 300,
      sheetThickness: 0.9,
      orientation: 'perpendicular' as const,
    },
  };

  const spanLength = 9.0; // 9 meters
  const tributarySpacing = 3.0; // 3 meters
  const bEff = EffectiveWidthEngine.computeAiscEffectiveWidth({
    spanLengthMm: spanLength * 1000,
    spacingLeftMm: tributarySpacing * 1000,
    spacingRightMm: tributarySpacing * 1000,
    flangeWidthMm: steelSection.flangeWidth,
    toppingThicknessMm: 85,
  }).beff; // ~2250 mm

  const standardStud: ShearStudDefinition = {
    diameter: 19, // 19 mm (3/4")
    length: 125, // 125 mm
    fu: 450, // MPa
    studsPerRow: 1,
  };

  describe('ShearStudConnectorEngine', () => {
    it('calculates single stud nominal shear capacity Qn and EC4 PRd', () => {
      const result = ShearStudConnectorEngine.calculateStudCapacity(standardStud, testSection);

      expect(result.studDiameter).toBe(19);
      expect(result.studArea).toBeCloseTo(283.5, 1);
      expect(result.rgFactor).toBe(1.0);
      expect(result.rpFactor).toBe(0.75);
      // Qn = min(0.5*Asa*sqrt(fc*Ec), Rg*Rp*Asa*Fu)
      // Rg*Rp*Asa*Fu = 1.0 * 0.75 * 283.5 * 450 = 95.69 kN
      // 0.5*Asa*sqrt(fc*Ec) = 0.5 * 283.5 * sqrt(28 * 25000) = 0.5 * 283.5 * 836.66 = 118.6 kN
      // Governing is stud shear: ~95.7 kN
      expect(result.nominalShearStrengthQn).toBeGreaterThan(80);
      expect(result.nominalShearStrengthQn).toBeLessThan(110);
      expect(result.designResistancePrd).toBeGreaterThan(50);
    });

    it('calculates full composite shear connector requirements', () => {
      const fullConn = ShearStudConnectorEngine.calculateFullShearConnection(
        standardStud,
        testSection,
        bEff
      );

      // Cmax = 0.85 * 28 * 2250 * 85 / 1000 = 4551.75 kN
      // Tmax = 9480 * 345 / 1000 = 3270.6 kN
      // Vp = min(4551.75, 3270.6) = 3270.6 kN
      expect(fullConn.concreteCompressiveCapacityCmax).toBeGreaterThan(4000);
      expect(fullConn.steelTensileCapacityTmax).toBeCloseTo(3270.6, 1);
      expect(fullConn.governingInterfaceShearVp).toBeCloseTo(3270.6, 1);

      // Half-span studs = ceil(3270.6 / Qn) ~ 35 studs
      expect(fullConn.requiredStudsHalfSpanFullComposite).toBeGreaterThan(25);
      expect(fullConn.requiredStudsTotalSpanFullComposite).toBe(
        fullConn.requiredStudsHalfSpanFullComposite * 2
      );
    });

    it('evaluates partial interaction degree and checks minimum threshold', () => {
      const fullConn = ShearStudConnectorEngine.calculateFullShearConnection(
        standardStud,
        testSection,
        bEff
      );

      // Test with 50% studs
      const halfStuds = Math.floor(fullConn.requiredStudsHalfSpanFullComposite * 0.5);
      const partial = ShearStudConnectorEngine.evaluatePartialInteraction(halfStuds, fullConn);

      expect(partial.degreeOfCompositeActionEta).toBeGreaterThanOrEqual(0.45);
      expect(partial.degreeOfCompositeActionEta).toBeLessThanOrEqual(0.55);
      expect(partial.isFullComposite).toBe(false);
      expect(partial.meetsMinimumInteraction).toBe(true);

      // Test with insufficient studs (< 25%)
      const lowStuds = Math.floor(fullConn.requiredStudsHalfSpanFullComposite * 0.15);
      const lowPartial = ShearStudConnectorEngine.evaluatePartialInteraction(lowStuds, fullConn);
      expect(lowPartial.meetsMinimumInteraction).toBe(false);
      expect(lowPartial.statusMessage).toContain('Insufficient');
    });
  });

  describe('PlasticStressDistributionEngine', () => {
    it('determines plastic neutral axis and Mp for full composite action', () => {
      const flexure = PlasticStressDistributionEngine.calculateFlexuralCapacity(testSection, bEff, 1.0);

      // In testSection, Cmax (4551 kN) > Tmax (3270 kN), so PNA is in the concrete slab!
      expect(flexure.pna.locationCase).toBe('in_slab');
      expect(flexure.pna.concreteBlockDepthA).toBeGreaterThan(0);
      expect(flexure.pna.concreteBlockDepthA).toBeLessThanOrEqual(testSection.concrete.slabThickness);

      // Composite moment capacity should be significantly greater than bare steel
      // Bare steel W18x50 Mp = Zx * Fy = 1655000 * 345 / 1e6 = 570.97 kNm
      expect(flexure.bareSteelPlasticMoment).toBeCloseTo(571, 0);
      expect(flexure.plasticMomentMp).toBeGreaterThan(1100); // More than 100% gain!
      expect(flexure.compositeCapacityGainPercent).toBeGreaterThan(90);
      expect(flexure.aiscDesignMomentPhiMp).toBeCloseTo(flexure.plasticMomentMp * 0.9, 1);
    });

    it('calculates partial composite action with PNA in top flange or web', () => {
      // With eta = 0.35, Cc = 0.35 * 3270 = 1144 kN.
      // Cs = (3270 - 1144) / 2 = 1063 kN.
      // Top flange max comp = bf * tf * Fy = 190 * 14.5 * 345 = 950.4 kN.
      // Since Cs > top flange comp, PNA enters the web!
      const flexurePartial = PlasticStressDistributionEngine.calculateFlexuralCapacity(testSection, bEff, 0.35);

      expect(flexurePartial.pna.locationCase).toBe('in_web');
      expect(flexurePartial.pna.ypnaFromTopFlange).toBeGreaterThan(steelSection.flangeThickness);
      expect(flexurePartial.plasticMomentMp).toBeGreaterThan(flexurePartial.bareSteelPlasticMoment);
      expect(flexurePartial.plasticMomentMp).toBeLessThan(1200);
    });

    it('generates monotonic partial interaction curve', () => {
      const fullConn = ShearStudConnectorEngine.calculateFullShearConnection(
        standardStud,
        testSection,
        bEff
      );
      const curve = PlasticStressDistributionEngine.generateInteractionCurve(
        testSection,
        bEff,
        fullConn.requiredStudsHalfSpanFullComposite,
        5
      );

      expect(curve.length).toBe(6);
      expect(curve[0].eta).toBe(0.25);
      expect(curve[curve.length - 1].eta).toBe(1.0);

      // Verify monotonic increase in moment capacity
      for (let i = 1; i < curve.length; i++) {
        expect(curve[i].plasticMomentMp).toBeGreaterThanOrEqual(curve[i - 1].plasticMomentMp);
      }
    });
  });

  describe('ConstructionStageAuditor', () => {
    it('audits unshored construction stage under wet concrete loading', () => {
      const audit = ConstructionStageAuditor.audit(testSection, {
        spanLength: 9.0,
        tributaryWidth: 3.0,
        deckWeight: 0.12,
        wetConcreteDensity: 24.0,
        constructionLiveLoad: 1.0,
      });

      expect(audit.spanLength).toBe(9.0);
      expect(audit.tributaryWidth).toBe(3.0);
      expect(audit.deadLoadTotal).toBeGreaterThan(7.0); // Wet concrete + steel + deck
      expect(audit.factoredMomentMu).toBeGreaterThan(100);
      expect(audit.bareSteelCapacityPhiMn).toBeCloseTo(0.9 * 571, 0);
      expect(audit.constructionDeadDeflection).toBeGreaterThan(0);
      expect(typeof audit.isPassing).toBe('boolean');
      expect(audit.summaryText).toBeDefined();
    });
  });
});
