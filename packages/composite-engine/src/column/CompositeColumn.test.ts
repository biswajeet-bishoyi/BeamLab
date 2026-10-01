import { describe, it, expect } from 'vitest';
import {
  RectangularCftDefinition,
  CircularCftDefinition,
  EncasedColumnDefinition,
} from './CompositeColumnModels';
import { CompositeAxialBucklingEngine } from './CompositeAxialBucklingEngine';
import { CompositeInteractionEngine } from './CompositeInteractionEngine';

describe('CompositeColumn Engine (Sprint B15.3)', () => {
  const rectCft: RectangularCftDefinition = {
    type: 'rectangular_cft',
    id: 'CFT-400x400x12',
    name: 'HSS 400x400x12 CFT',
    widthB: 400, // mm
    depthH: 400, // mm
    wallThickness: 12, // mm
    steelYieldStrength: 355, // MPa
    concreteStrengthFc: 35, // MPa
  };

  const circularCft: CircularCftDefinition = {
    type: 'circular_cft',
    id: 'CCFT-450x12',
    name: 'Pipe 450x12 CCFT',
    outerDiameter: 450, // mm
    wallThickness: 12, // mm
    steelYieldStrength: 355, // MPa
    concreteStrengthFc: 35, // MPa
  };

  const encasedCol: EncasedColumnDefinition = {
    type: 'encased_wide_flange',
    id: 'ENC-500x500',
    name: 'Encased W14x90 500x500 Col',
    concreteWidth: 500,
    concreteDepth: 500,
    embeddedSteel: {
      depth: 356,
      flangeWidth: 369,
      flangeThickness: 18.0,
      webThickness: 11.2,
      area: 17100, // mm^2
      Ix: 416e6, // mm^4
      Iy: 151e6, // mm^4
      yieldStrength: 345, // MPa
      elasticModulus: 200000, // MPa
    },
    rebar: {
      areaTotal: 2500, // 8 #7 bars
      yieldStrength: 420, // MPa
      Ix: 50e6,
      Iy: 50e6,
    },
    concreteStrengthFc: 35,
  };

  const standardBoundary = {
    unbracedLength: 4.5, // 4.5 m
    effectiveLengthFactor: 1.0,
  };

  describe('Rectangular CFT Buckling', () => {
    it('calculates cross-section areas, squash load Pp0, and flexural stiffness', () => {
      const geo = CompositeAxialBucklingEngine.calculateSectionGeometry(rectCft);

      // Outer area = 400 * 400 = 160,000 mm^2
      // Inner = (400 - 24) * (400 - 24) = 376 * 376 = 141,376 mm^2
      // Steel area = 160,000 - 141,376 = 18,624 mm^2
      expect(geo.totalArea).toBe(160000);
      expect(geo.concreteArea).toBe(141376);
      expect(geo.steelArea).toBe(18624);
      expect(geo.c2Factor).toBe(0.85);

      const buckling = CompositeAxialBucklingEngine.calculateAxialCapacity(rectCft, standardBoundary);

      // Pp0 = 355 * 18624 + 0.85 * 35 * 141376 = 6611.52 kN + 4205.94 kN = 10,817 kN
      expect(buckling.squashLoadPp0).toBeCloseTo(10817, -1);
      expect(buckling.effectiveStiffnessEIeffX).toBeGreaterThan(10000);
      expect(buckling.eulerBucklingLoadPeX).toBeGreaterThan(buckling.squashLoadPp0); // Stocky column
      expect(buckling.nominalCompressiveStrengthPn).toBeGreaterThan(7000);
      expect(buckling.aiscLrfdDesignCapacityPhiPn).toBeCloseTo(
        buckling.nominalCompressiveStrengthPn * 0.75,
        0
      );
      expect(buckling.eurocodeDesignResistanceNbRd).toBeGreaterThan(6000);
    });
  });

  describe('Circular CFT Buckling & Confinement', () => {
    it('applies C2 = 0.95 confinement factor and axisymmetric properties', () => {
      const geo = CompositeAxialBucklingEngine.calculateSectionGeometry(circularCft);
      expect(geo.c2Factor).toBe(0.95);
      expect(geo.steelIx).toBeCloseTo(geo.steelIy, 1);
      expect(geo.concreteIx).toBeCloseTo(geo.concreteIy, 1);

      const buckling = CompositeAxialBucklingEngine.calculateAxialCapacity(
        circularCft,
        standardBoundary
      );
      expect(buckling.governingAxis).toBe('X');
      expect(buckling.eulerBucklingLoadPeX).toBeCloseTo(buckling.eulerBucklingLoadPeY, 1);
      expect(buckling.aiscLrfdDesignCapacityPhiPn).toBeGreaterThan(5000);
    });
  });

  describe('Encased Column Buckling', () => {
    it('aggregates structural steel, rebar, and concrete contributions', () => {
      const geo = CompositeAxialBucklingEngine.calculateSectionGeometry(encasedCol);
      expect(geo.totalArea).toBe(250000);
      expect(geo.steelArea).toBe(17100);
      expect(geo.rebarArea).toBe(2500);
      expect(geo.concreteArea).toBe(250000 - 17100 - 2500);

      const buckling = CompositeAxialBucklingEngine.calculateAxialCapacity(encasedCol, standardBoundary);
      // Weak axis is Y-axis due to wide flange Iy < Ix
      expect(buckling.governingAxis).toBe('Y');
      expect(buckling.eulerBucklingLoadPeY).toBeLessThan(buckling.eulerBucklingLoadPeX);
      expect(buckling.squashLoadPp0).toBeGreaterThan(12000);
    });
  });

  describe('CompositeInteractionEngine (4-Point Envelope & AISC H1)', () => {
    it('constructs 4-point plastic envelope (Points A, B, C, D)', () => {
      const envelope = CompositeInteractionEngine.generatePlasticEnvelope(
        rectCft,
        standardBoundary,
        'X'
      );

      expect(envelope.nominalPoints.length).toBe(4);
      expect(envelope.designPointsAisc.length).toBe(4);

      const [pointA, pointD, pointC, pointB] = envelope.nominalPoints;
      expect(pointA.pointId).toBe('A');
      expect(pointA.momentM).toBe(0);
      expect(pointA.axialForceP).toBeGreaterThan(10000);

      expect(pointB.pointId).toBe('B');
      expect(pointB.axialForceP).toBe(0);
      expect(pointB.momentM).toBe(envelope.plasticMomentX);

      // Point C: concrete in full compression, steel in pure flexure -> Moment equals pure flexure Mp
      expect(pointC.pointId).toBe('C');
      expect(pointC.momentM).toBe(envelope.plasticMomentX);
      expect(pointC.axialForceP).toBeGreaterThan(3000);

      // Point D: intermediate
      expect(pointD.pointId).toBe('D');
      expect(pointD.axialForceP).toBeGreaterThan(pointC.axialForceP);
      expect(pointD.axialForceP).toBeLessThan(pointA.axialForceP);
    });

    it('verifies safe combined axial and flexural loading per AISC 360-22 H1', () => {
      const check = CompositeInteractionEngine.verifyInteraction(rectCft, standardBoundary, {
        factoredAxialPu: 3000, // kN
        factoredMomentMux: 150, // kNm
        factoredMomentMuy: 50, // kNm
      });

      expect(check.axialUtilization).toBeLessThan(0.6);
      expect(check.isPassing).toBe(true);
      expect(check.combinedUtilizationAisc).toBeLessThan(1.0);
      expect(check.governingCheckText).toContain('PASS');
    });

    it('flags failure when column is overloaded', () => {
      const check = CompositeInteractionEngine.verifyInteraction(rectCft, standardBoundary, {
        factoredAxialPu: 8000, // kN (high)
        factoredMomentMux: 600, // kNm (high)
      });

      expect(check.combinedUtilizationAisc).toBeGreaterThan(1.0);
      expect(check.isPassing).toBe(false);
      expect(check.governingCheckText).toContain('FAIL');
    });
  });
});
