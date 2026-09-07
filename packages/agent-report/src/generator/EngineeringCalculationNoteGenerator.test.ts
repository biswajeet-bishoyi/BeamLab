import { describe, it, expect } from 'vitest';
import {
  EngineeringCalculationNoteGenerator,
  type CalculationNoteInput,
} from './EngineeringCalculationNoteGenerator';

describe('Sprint B5.4 — Automated Engineering Calculation Note & Report Generation Agent', () => {
  const sampleInput: CalculationNoteInput = {
    metadata: {
      projectTitle: 'Metropolitan Commercial Office Building',
      structureName: 'Primary Perimeter Lateral Frame',
      engineerName: 'Biswajeet Bishoyi, PE, SE',
      licenseNumber: 'PE-984120',
      organization: 'BeamLab Engineering OS',
      date: '2026-09-07',
      revision: 'Rev C',
      codeOfRecord: 'EUROCODE_3',
    },
    model: {
      nodes: [
        { id: 'N1', x: 0, y: 0, z: 0, restraints: { Tx: true, Ty: true, Tz: true, Rx: true, Ry: true, Rz: true } },
        { id: 'N2', x: 6, y: 0, z: 0, restraints: { Tx: true, Ty: true, Tz: true, Rx: true, Ry: true, Rz: true } },
        { id: 'N3', x: 0, y: 0, z: 4 },
        { id: 'N4', x: 6, y: 0, z: 4 },
      ],
      elements: [
        { id: 'COL_A', startNodeId: 'N1', endNodeId: 'N3', section: { name: 'HEB 260', area: 0.0118 }, material: { E: 210e9 } },
        { id: 'COL_B', startNodeId: 'N2', endNodeId: 'N4', section: { name: 'HEB 260', area: 0.0118 }, material: { E: 210e9 } },
        { id: 'BEAM_1', startNodeId: 'N3', endNodeId: 'N4', section: { name: 'IPE 300', area: 0.00538 }, material: { E: 210e9 } },
      ],
    },
    loadCombinations: [
      { id: 'ULS_1', name: '1.35D + 1.5L', factors: { Dead: 1.35, Live: 1.5 }, limitState: 'ULS_STRENGTH' },
      { id: 'ULS_2', name: '1.35D + 1.5W + 1.05L', factors: { Dead: 1.35, Wind: 1.5, Live: 1.05 }, limitState: 'ULS_STRENGTH' },
    ],
    reactions: [
      { nodeId: 'N1', Fx: 12e3, Fy: 0, Fz: 180e3, Mx: 0, My: 24e3, Mz: 0 },
      { nodeId: 'N2', Fx: 12e3, Fy: 0, Fz: 180e3, Mx: 0, My: 24e3, Mz: 0 },
    ],
    equilibriumAudit: {
      totalApplied: { Fx: -24e3, Fy: 0, Fz: -360e3 },
      totalReaction: { Fx: 24e3, Fy: 0, Fz: 360e3 },
      isEquilibrated: true,
    },
    memberChecks: [
      {
        elementId: 'COL_A',
        sectionName: 'HEB 260',
        Ned: 180e3,
        Med: 45e3,
        Ved: 12e3,
        N_cap: 3500e3,
        M_cap: 380e3,
        V_cap: 250e3,
        uc: 0.72,
        governingClause: 'EN 1993-1-1 Cl 6.3.3',
        status: 'PASS',
      },
      {
        elementId: 'BEAM_1',
        sectionName: 'IPE 300',
        Ned: 5e3,
        Med: 110e3,
        Ved: 35e3,
        N_cap: 1800e3,
        M_cap: 125e3,
        V_cap: 190e3,
        uc: 0.88,
        governingClause: 'EN 1993-1-1 Cl 6.2.5',
        status: 'PASS',
      },
    ],
    optimizationSummary: {
      initialMassKg: 1050.0,
      optimizedMassKg: 780.0,
      massSavingsKg: 270.0,
      savingsPercent: 25.7,
      memberProposals: [
        { elementId: 'COL_A', fromSection: 'HEB 300', toSection: 'HEB 260', weightDeltaKg: -96.0, newUC: 0.72 },
        { elementId: 'BEAM_1', fromSection: 'IPE 360', toSection: 'IPE 300', weightDeltaKg: -89.4, newUC: 0.88 },
      ],
    },
    pushoverSummary: {
      Vy: 320e3,
      Dy: 0.045,
      mu: 2.22,
      Vmax: 345e3,
      performanceLevel: 'LIFE_SAFETY',
    },
  };

  it('compiles professional markdown note with LaTeX formulas and audit schedules', () => {
    const result = EngineeringCalculationNoteGenerator.compile(sampleInput);

    expect(result.summaryMetrics.overallStatus).toBe('PASS');
    expect(result.summaryMetrics.maxUtilization).toBe(0.88);
    expect(result.summaryMetrics.governingElementId).toBe('BEAM_1');
    expect(result.summaryMetrics.weightSavingsPercent).toBe(25.7);

    const md = result.markdown;
    expect(md).toContain('# STRUCTURAL ENGINEERING CALCULATION NOTE');
    expect(md).toContain('Biswajeet Bishoyi, PE, SE');
    expect(md).toContain('PE-984120');
    expect(md).toContain('EUROCODE_3');
    expect(md).toContain('$$M_{c,Rd} = \\frac{W_{pl} \\cdot f_y}{\\gamma_{M0}}');
    expect(md).toContain('Professional Certification & Peer Review');
  });

  it('generates complete printable standalone HTML document with embedded CSS', () => {
    const result = EngineeringCalculationNoteGenerator.compile(sampleInput);
    const html = result.html;

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Structural Engineering Calculation Note');
    expect(html).toContain('<span class="status-badge status-PASS">PASS</span>');
    expect(html).toContain('BEAM_1');
    expect(html).toContain('0.880');
    expect(html).toContain('@media print');
  });

  it('flags warning and failure statuses accurately in executive dashboard', () => {
    const failingInput: CalculationNoteInput = {
      ...sampleInput,
      memberChecks: [
        {
          elementId: 'OVERSTRESSED_COL',
          sectionName: 'IPE 140',
          Ned: 800e3,
          Med: 95e3,
          Ved: 20e3,
          N_cap: 400e3,
          M_cap: 35e3,
          V_cap: 100e3,
          uc: 2.45,
          governingClause: 'EN 1993-1-1 Cl 6.3.3',
          status: 'FAIL',
        },
      ],
    };

    const result = EngineeringCalculationNoteGenerator.compile(failingInput);
    expect(result.summaryMetrics.overallStatus).toBe('FAIL');
    expect(result.summaryMetrics.maxUtilization).toBe(2.45);
    expect(result.summaryMetrics.governingElementId).toBe('OVERSTRESSED_COL');
    expect(result.markdown).toContain('**[FAIL]**');
    expect(result.html).toContain('status-FAIL');
  });
});
