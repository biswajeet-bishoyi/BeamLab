import { describe, it, expect } from 'vitest';
import { SoilStratigraphy, SoilStratigraphyProfile } from '../soil/SoilStratigraphy';
import { SinglePileEngine, PileGeometry } from './SinglePileEngine';
import { PileGroupEngine, PileCapDimensions, PileCapColumn, PileGroupLoads } from './PileGroupEngine';

describe('Deep Foundations & Pile Group Analysis Engine', () => {
  const profile: SoilStratigraphyProfile = {
    name: 'Deep Borehole BH-Piles',
    waterTableDepth_m: 5.0,
    layers: [
      {
        id: 'L1',
        name: 'Upper Sand',
        depthTop_m: 0,
        depthBottom_m: 6.0,
        dryUnitWeight_kN_m3: 18.0,
        saturatedUnitWeight_kN_m3: 19.5,
        cohesion_kPa: 0,
        frictionAngle_deg: 32,
        elasticModulus_MPa: 25,
        poissonRatio: 0.30,
        soilType: 'SAND',
      },
      {
        id: 'L2',
        name: 'Stiff Clay',
        depthTop_m: 6.0,
        depthBottom_m: 20.0,
        dryUnitWeight_kN_m3: 18.5,
        saturatedUnitWeight_kN_m3: 20.0,
        cohesion_kPa: 85,
        frictionAngle_deg: 0,
        elasticModulus_MPa: 40,
        poissonRatio: 0.35,
        soilType: 'CLAY',
      },
    ],
  };

  const stratigraphy = new SoilStratigraphy(profile);

  const singleEngine = new SinglePileEngine();
  const groupEngine = new PileGroupEngine();

  describe('SinglePileEngine', () => {
    it('computes skin friction across layers and end bearing in stiff clay for bored pile', () => {
      const boredPile: PileGeometry = {
        pileType: 'BORED_CAST_IN_SITU',
        shape: 'CIRCULAR',
        diameter_m: 0.6,
        length_m: 12.0, // 6m in sand, 6m into clay
        concreteStrength_MPa: 35,
        rebarYield_MPa: 500,
        rebarRatio: 0.015,
      };

      const result = singleEngine.analyzeSinglePile(stratigraphy, boredPile, {
        factorOfSafetyCompression: 2.5,
      });

      expect(result.diameter_m).toBe(0.6);
      expect(result.length_m).toBe(12.0);
      expect(result.layers.length).toBe(2);

      // Layer 1: Upper Sand
      expect(result.layers[0]?.layerName).toBe('Upper Sand');
      expect(result.layers[0]?.shaftCapacity_kN).toBeGreaterThan(0);

      // Layer 2: Stiff Clay
      expect(result.layers[1]?.layerName).toBe('Stiff Clay');
      expect(result.layers[1]?.shaftCapacity_kN).toBeGreaterThan(0);

      // End bearing at 12m in stiff clay: 9 * cu * tipArea * 0.8 (bored reduction)
      expect(result.unitEndBearing_kPa).toBeCloseTo(9 * 85 * 0.8, 1);
      expect(result.endBearingCapacity_kN).toBeGreaterThan(100);

      // Total ultimate and allowable
      expect(result.ultimateCompression_kN).toBeCloseTo(
        result.totalShaftCapacity_kN + result.endBearingCapacity_kN,
        1
      );
      expect(result.allowableCompression_kN).toBeCloseTo(
        result.ultimateCompression_kN / 2.5,
        1
      );

      // Structural capacity should exceed typical allowable geotechnical
      expect(result.structuralAxialCapacity_kN).toBeGreaterThan(result.allowableCompression_kN);
      expect(result.governingCompressionCapacity_kN).toBe(result.allowableCompression_kN);
    });

    it('rewards driven displacement piles with higher lateral earth pressure coefficient', () => {
      const boredPile: PileGeometry = {
        pileType: 'BORED_CAST_IN_SITU',
        shape: 'CIRCULAR',
        diameter_m: 0.5,
        length_m: 8.0,
      };
      const drivenPile: PileGeometry = {
        pileType: 'DRIVEN_PRECAST',
        shape: 'CIRCULAR',
        diameter_m: 0.5,
        length_m: 8.0,
      };

      const resBored = singleEngine.analyzeSinglePile(stratigraphy, boredPile);
      const resDriven = singleEngine.analyzeSinglePile(stratigraphy, drivenPile);

      // Driven pile has higher shaft resistance in cohesionless sand layer
      expect(resDriven.layers[0]?.shaftCapacity_kN).toBeGreaterThan(
        resBored.layers[0]?.shaftCapacity_kN!
      );
      expect(resDriven.ultimateCompression_kN).toBeGreaterThan(resBored.ultimateCompression_kN);
    });
  });

  describe('PileGroupEngine', () => {
    it('calculates Converse-Labarre group efficiency correctly', () => {
      // 2x2 group, D = 0.6m, s = 1.8m (3D spacing)
      const eta = groupEngine.calculateConverseLabarreEfficiency(2, 2, 0.6, 1.8);
      // theta = arctan(0.6 / 1.8) = 18.43 deg
      // eta = 1 - 18.43 * (1*2 + 1*2) / (90 * 4) = 1 - 18.43 * 4 / 360 = 1 - 0.2048 = 0.795
      expect(eta).toBeCloseTo(0.795, 2);
    });

    it('analyzes 2x2 pile cap under concentric axial load', () => {
      const piles = groupEngine.generateGrid({
        rows: 2,
        cols: 2,
        spacingX_m: 1.8,
        spacingY_m: 1.8,
        pileDiameter_m: 0.6,
        singlePileCapacity_kN: 800,
      });

      expect(piles.length).toBe(4);

      const cap: PileCapDimensions = {
        length_m: 3.0,
        width_m: 3.0,
        thickness_m: 0.9,
        concreteStrength_MPa: 35,
        rebarYield_MPa: 500,
      };

      const column: PileCapColumn = {
        cx_m: 0.5,
        cy_m: 0.5,
      };

      const loads: PileGroupLoads = {
        P_kN: 2000,
        Mx_kNm: 0,
        My_kNm: 0,
      };

      const result = groupEngine.analyzePileGroup(cap, column, piles, loads, 800, 0.6);

      // Cap weight = 3.0 * 3.0 * 0.9 * 24.5 = 198.45 kN
      expect(result.capSelfWeight_kN).toBeCloseTo(198.5, 0);
      expect(result.totalServiceLoad_kN).toBeCloseTo(2198.5, 0);

      // Concentric load -> all 4 piles share load equally
      const expectedReaction = 2198.5 / 4;
      for (const p of result.pileReactions) {
        expect(p.serviceReaction_kN).toBeCloseTo(expectedReaction, 1);
        expect(p.isTension).toBe(false);
      }

      // No tension piles
      expect(result.hasTensionPiles).toBe(false);
      expect(result.oneWayShearX.pass).toBe(true);
      expect(result.punchingShearColumn.pass).toBe(true);
      expect(result.punchingShearPile.pass).toBe(true);
      expect(result.overallPass).toBe(true);
    });

    it('handles overturning moments producing differential pile reactions', () => {
      const piles = groupEngine.generateGrid({
        rows: 2,
        cols: 2,
        spacingX_m: 2.0,
        spacingY_m: 2.0,
        pileDiameter_m: 0.6,
        singlePileCapacity_kN: 1200,
      });

      const cap: PileCapDimensions = {
        length_m: 3.2,
        width_m: 3.2,
        thickness_m: 1.0,
      };

      const column: PileCapColumn = {
        cx_m: 0.6,
        cy_m: 0.6,
      };

      // Large overturning moment in X direction (My = 600 kNm)
      const loads: PileGroupLoads = {
        P_kN: 1500,
        Mx_kNm: 0,
        My_kNm: 600,
      };

      const result = groupEngine.analyzePileGroup(cap, column, piles, loads, 1200, 0.6);

      expect(result.maxPileReaction_kN).toBeGreaterThan(result.minPileReaction_kN);
      expect(result.flexureAndTies.momentUx_kNm).toBeGreaterThan(0);
      expect(result.flexureAndTies.tensionTieX_kN).toBeGreaterThan(0);
      expect(result.flexureAndTies.barsCountX).toBeGreaterThanOrEqual(4);
      expect(result.flexureAndTies.spacingX_mm).toBeGreaterThan(50);
    });
  });
});
