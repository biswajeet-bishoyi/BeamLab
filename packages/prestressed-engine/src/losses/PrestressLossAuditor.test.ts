import { describe, it, expect } from 'vitest';
import { StrandCatalog } from '../tendon/StrandCatalog.js';
import { TendonProfileEngine } from '../tendon/TendonProfileEngine.js';
import { PrestressLossAuditor } from './PrestressLossAuditor.js';

describe('PrestressLossAuditor', () => {
  const tendon = StrandCatalog.createTendonAssembly({
    strandId: 'ASTM-A416-0.6',
    numberOfStrands: 12,
    systemType: 'bonded',
    jackingStressRatio: 0.75, // 1395 MPa
  });

  const geometry = TendonProfileEngine.generateProfile({
    type: 'parabolic',
    spanLengthM: 24,
    yStartMm: 800,
    yMidMm: 150,
    yEndMm: 800,
    concreteCentroidYMm: 600,
  }, 25);

  it('should audit friction, anchorage seating, and elastic shortening for single-end jacking', () => {
    const report = PrestressLossAuditor.auditLosses({
      tendon,
      geometry,
      curvatureFrictionMu: 0.20,
      wobbleFrictionK: 0.0016,
      wedgeSlipMm: 6.0,
      jackingMode: 'single-end',
      concreteStressAtCentroidTransferMpa: 10.0,
      concreteModulusTransferMpa: 28000,
      isPretensioned: false,
    });

    expect(report.initialJackingForceKn).toBeCloseTo(tendon.jackingForceKn, 1);
    expect(report.shortTermLosses.maxFrictionLossKn).toBeGreaterThan(0);
    expect(report.shortTermLosses.anchorageSeatingLossAtAnchorKn).toBeGreaterThan(0);
    expect(report.shortTermLosses.seatingInfluenceLengthM).toBeGreaterThan(0);
    expect(report.shortTermLosses.seatingInfluenceLengthM).toBeLessThan(24);

    // Force after seating at x = 0 should be less than initial jacking force P0:
    const at0 = report.forceDistribution[0];
    expect(at0.forceAfterSeatingKn).toBeLessThan(report.initialJackingForceKn);

    // Far end should reflect pure friction loss before seating:
    const atEnd = report.forceDistribution[report.forceDistribution.length - 1];
    expect(atEnd.forceBeforeSeatingKn).toBeLessThan(report.initialJackingForceKn);
  });

  it('should verify that both-ends jacking improves minimum force in the member', () => {
    const singleEndReport = PrestressLossAuditor.auditLosses({
      tendon,
      geometry,
      jackingMode: 'single-end',
    });

    const bothEndsReport = PrestressLossAuditor.auditLosses({
      tendon,
      geometry,
      jackingMode: 'both-ends',
    });

    // Both ends jacking keeps the lowest force higher than single-end jacking:
    expect(bothEndsReport.effectiveSummary.minEffectiveForceKn)
      .toBeGreaterThanOrEqual(singleEndReport.effectiveSummary.minEffectiveForceKn);
  });

  it('should compute long-term losses (creep, shrinkage, relaxation) within expected PTI boundaries', () => {
    const report = PrestressLossAuditor.auditLosses({
      tendon,
      geometry,
      concreteStressAtCentroidTransferMpa: 11.0,
      concreteStressAtCentroidDeadLoadMpa: 4.5,
      relativeHumidityPercent: 70,
      volumeToSurfaceRatioMm: 100,
      timeYears: 50,
    });

    const { longTermLosses, effectiveSummary } = report;
    expect(longTermLosses.creepLossStressMpa).toBeGreaterThan(15);
    expect(longTermLosses.shrinkageLossStressMpa).toBeGreaterThan(20);
    expect(longTermLosses.relaxationLossStressMpa).toBeGreaterThan(10);
    expect(longTermLosses.totalLongTermStressMpa).toBeGreaterThan(50);

    // Typical long-term prestress loss ratio should be 10% - 25% for low relaxation strands:
    expect(effectiveSummary.totalLossPercent).toBeGreaterThan(10);
    expect(effectiveSummary.totalLossPercent).toBeLessThan(35);
    expect(effectiveSummary.effectiveToJackingRatio).toBeGreaterThan(0.65);
    expect(effectiveSummary.effectiveToJackingRatio).toBeLessThan(0.90);
  });
});
