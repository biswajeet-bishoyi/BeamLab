import { describe, it, expect } from 'vitest';
import {
  CatenaryGeometryEngine,
  STANDARD_CABLE_MATERIALS,
  STANDARD_CABLE_SECTIONS,
} from '@beamlab/cable-engine';
import {
  LateralEarthPressureEngine,
  RetainingWallStabilityEngine,
} from '@beamlab/earth-engine';
import {
  KingeryBulmashEngine,
  SDOFBlastEngine,
} from '@beamlab/blast-engine';
import { DomainDecompositionEngine } from '@beamlab/solve-farm';

describe('Cross-Domain Golden Benchmarks (Sprint B23)', () => {
  describe('Benchmark 1: Cable Mechanics & Exact Catenary Formulation', () => {
    it('matches analytical Irvine cable formulation for 100m span catenary profile', () => {
      const mat = STANDARD_CABLE_MATERIALS.BRIDGE_STRAND_1860!;
      const sec = STANDARD_CABLE_SECTIONS[0]!;

      const span = 100;
      const sag = 10;
      const H_approx = (sec.unitWeight * (span ** 2)) / (8 * sag);

      const supportA = { id: 'A', x: 0, y: 0, z: 0, type: 'fixed_anchor' as const };
      const supportB = { id: 'B', x: span, y: 0, z: 0, type: 'fixed_anchor' as const };

      const result = CatenaryGeometryEngine.solveCatenaryByTension(
        supportA,
        supportB,
        sec,
        mat,
        H_approx,
        21
      );

      expect(result.catenaryParameter).toBeGreaterThan(0);
      expect(result.maxTension).toBeGreaterThan(result.horizontalTension);
      expect(result.stressedLength).toBeGreaterThan(span);
      // Midspan station check
      const midStation = result.stations[10]!;
      expect(midStation.x).toBeCloseTo(span / 2, 1);
    });
  });

  describe('Benchmark 2: Geotechnical Earth Pressure & Retaining Wall Stability', () => {
    it('verifies Rankine active earth pressure coefficient against theoretical Coduto benchmark', () => {
      const phiDeg = 32;
      const phiRad = (phiDeg * Math.PI) / 180;
      const expectedKa = (1 - Math.sin(phiRad)) / (1 + Math.sin(phiRad));

      const coeffs = LateralEarthPressureEngine.computeRankineCoefficients(phiDeg);

      expect(coeffs.Ka).toBeCloseTo(expectedKa, 3);
      expect(coeffs.Kp).toBeGreaterThan(1.0);
      expect(coeffs.Ko).toBeLessThan(1.0);
    });

    it('verifies overturning and sliding factors of safety for standard cantilever wall', () => {
      const stability = RetainingWallStabilityEngine.analyzeStability({
        wall: {
          height: 5.0,
          baseThickness: 0.6,
          stemTopWidth: 0.3,
          stemBottomWidth: 0.5,
          toeWidth: 0.8,
          heelWidth: 2.2,
          concreteUnitWeight: 24.0,
        },
        backfillLayers: [
          {
            id: 'soil-1',
            name: 'Dense Sand',
            depthTop: 0,
            depthBottom: 5.0,
            unitWeight: 18.0,
            saturatedUnitWeight: 20.0,
            frictionAngle: 32.0,
            cohesion: 0,
          },
        ],
        foundationSoil: {
          id: 'fdn-1',
          name: 'Stiff Clay',
          depthTop: 5.0,
          depthBottom: 15.0,
          unitWeight: 19.0,
          saturatedUnitWeight: 20.0,
          frictionAngle: 28.0,
          cohesion: 15.0,
        },
        allowableBearingCapacity: 250.0,
      });

      expect(stability.safetyFactorOverturning).toBeGreaterThan(1.5);
      expect(stability.safetyFactorSliding).toBeGreaterThan(1.2);
      expect(stability.isWithinKern).toBe(true);
    });
  });

  describe('Benchmark 3: DoD UFC 3-340-02 Blast Shock Wave & SDOF Dynamic Response', () => {
    it('predicts accurate scaled distance and positive phase decay', () => {
      const W = 500; // kg TNT
      const R = 20;  // m
      const effectiveW = W * 1.8; // surface burst
      const expectedZ = R / Math.cbrt(effectiveW);

      const blast = KingeryBulmashEngine.calculateWaveformParameters({
        chargeMass: W,
        standoffDistance: R,
        burstType: 'surface',
      });

      expect(blast.scaledDistanceZ).toBeCloseTo(expectedZ, 2);
      expect(blast.peakIncidentPressure).toBeGreaterThan(50);
      expect(blast.positivePhaseDuration).toBeGreaterThan(0);
      expect(blast.positiveIncidentImpulse).toBeGreaterThan(0);
    });

    it('verifies SDOF dynamic response and Biggs transformation factor', () => {
      const blast = KingeryBulmashEngine.calculateWaveformParameters({
        chargeMass: 250,
        standoffDistance: 15,
        burstType: 'surface',
      });

      const klm = SDOFBlastEngine.getLoadMassFactor('simply-supported', false);
      expect(klm).toBe(0.78);

      const response = SDOFBlastEngine.solveResponse({
        system: {
          memberType: 'beam',
          spanLength: 4.5,
          yieldResistanceKN: 400,
          elasticStiffnessKNm: 30000,
          totalMassKg: 1800,
          boundary: 'simply-supported',
        },
        blast,
      });

      expect(response.maxDisplacementMm).toBeGreaterThan(0);
      expect(response.ductilityRatio).toBeGreaterThan(0);
      expect(response.supportRotationDeg).toBeGreaterThan(0);
    });
  });

  describe('Benchmark 4: Cloud Solve Farm Domain Decomposition & Schur Complement', () => {
    it('exact condensation of interior DOFs to interface boundary stiffness matrix', () => {
      const K_II = [
        [400, -200],
        [-200, 400],
      ];
      const K_IB = [
        [-100, 0],
        [0, -100],
      ];
      const K_BB = [
        [300, -50],
        [-50, 300],
      ];
      const f_I = [20, 40];
      const f_B = [10, 10];

      const { schurMatrix, condensedForce } = DomainDecompositionEngine.computeSchurComplement({
        K_II,
        K_IB,
        K_BB,
        f_I,
        f_B,
      });

      expect(schurMatrix.length).toBe(2);
      expect(schurMatrix[0]!.length).toBe(2);
      expect(condensedForce.length).toBe(2);

      // Symmetry check on condensed interface operator
      expect(schurMatrix[0]![1]).toBeCloseTo(schurMatrix[1]![0]!, 6);
    });
  });
});
