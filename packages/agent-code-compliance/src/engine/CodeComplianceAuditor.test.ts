import { describe, it, expect } from 'vitest';
import { CodeComplianceAuditor, type MemberAuditDemand } from './CodeComplianceAuditor';

describe('Sprint B6.2 — Automated Code Compliance Verification & Clause Audit Engine', () => {
  const ipe240 = {
    name: 'IPE 240',
    A: 3.91e-3, // 39.1 cm^2
    Av_z: 1.91e-3,
    W_pl_y: 366.6e-6, // 366.6 cm^3
    W_el_y: 324.3e-6,
    W_pl_z: 73.9e-6,
    Iy: 38.92e-6,
    Iz: 2.84e-6,
    It: 12.88e-8,
    Iw: 3.74e-8,
  };

  const s355 = {
    name: 'S355',
    fy: 355e6,
    fu: 510e6,
    E: 210e9,
    G: 81e9,
  };

  it('correctly audits beam flexure under Eurocode 3 §6.2.5 with explicit LaTeX substitution', () => {
    // 6m beam with design moment My = 95 kNm (< plastic moment Mc_Rd = 366.6e-6 * 355e6 = 130.1 kNm)
    const demand: MemberAuditDemand = {
      elementId: 'BEAM_01',
      designCode: 'EUROCODE_3',
      member: {
        length: 6.0,
        unbracedLengthLT: 0,
        section: ipe240,
        material: s355,
      },
      forces: {
        Ned: 0,
        Vz_ed: 45e3, // 45 kN
        My_ed: 95e3, // 95 kNm
      },
    };

    const result = CodeComplianceAuditor.auditMember(demand);

    expect(result.overallStatus).toBe('PASS');
    expect(result.maxUtilizationRatio).toBeLessThan(0.90);
    expect(result.crossSectionName).toBe('IPE 240');

    const flexureCheck = result.checks.find((c) => c.clauseId === 'EC3_6_2_5');
    expect(flexureCheck).toBeDefined();
    expect(flexureCheck?.capacityValue).toBeCloseTo(130143, -1);
    expect(flexureCheck?.utilizationRatio).toBeCloseTo(95e3 / 130143, 2);
    expect(flexureCheck?.substitutionLatex).toContain('M_{c,Rd}');
  });

  it('audits column buckling under Eurocode 3 §6.3.1 with Euler slenderness reduction chi', () => {
    // 4m column under Ned = 400 kN axial compression
    const demand: MemberAuditDemand = {
      elementId: 'COL_01',
      designCode: 'EUROCODE_3',
      member: {
        length: 4.0,
        bucklingLengthZ: 4.0,
        section: ipe240,
        material: s355,
      },
      forces: {
        Ned: 400e3, // 400 kN compression
        Vz_ed: 10e3,
        My_ed: 15e3,
      },
    };

    const result = CodeComplianceAuditor.auditMember(demand);

    const bucklingCheck = result.checks.find((c) => c.clauseId === 'EC3_6_3_1');
    expect(bucklingCheck).toBeDefined();
    expect(bucklingCheck?.limitState).toBe('STABILITY_BUCKLING');
    expect(bucklingCheck?.substitutionLatex).toContain('\\chi_z');
    expect(bucklingCheck?.capacityValue).toBeLessThan(ipe240.A * s355.fy); // Buckling capacity < squash load
  });

  it('evaluates combined axial compression and flexural interaction under AISC 360-16 Chapter H1', () => {
    const demand: MemberAuditDemand = {
      elementId: 'BEAM_COL_01',
      designCode: 'AISC_360_16',
      member: {
        length: 5.0,
        section: ipe240,
        material: s355,
      },
      forces: {
        Ned: 350e3, // Pr
        Vz_ed: 50e3,
        My_ed: 60e3, // Mrx
      },
    };

    const result = CodeComplianceAuditor.auditMember(demand);

    const interactionCheck = result.checks.find((c) => c.clauseId === 'AISC_H1');
    expect(interactionCheck).toBeDefined();
    expect(interactionCheck?.governingEquationLatex).toContain('\\frac{P_r}{P_c}');
    expect(interactionCheck?.substitutionLatex).toContain('UC');
  });

  it('performs structure-wide batch audit and identifies governing elements and limit states', () => {
    const demands: MemberAuditDemand[] = [
      {
        elementId: 'BEAM_01',
        designCode: 'EUROCODE_3',
        member: { length: 6.0, unbracedLengthLT: 0, section: ipe240, material: s355 },
        forces: { Ned: 0, Vz_ed: 20e3, My_ed: 50e3 }, // light load
      },
      {
        elementId: 'BEAM_02',
        designCode: 'EUROCODE_3',
        member: { length: 6.0, unbracedLengthLT: 0, section: ipe240, material: s355 },
        forces: { Ned: 0, Vz_ed: 80e3, My_ed: 125e3 }, // heavy flexure (~0.96 UC)
      },
      {
        elementId: 'COL_01',
        designCode: 'EUROCODE_3',
        member: { length: 4.0, section: ipe240, material: s355 },
        forces: { Ned: 250e3, Vz_ed: 10e3, My_ed: 20e3 },
      },
    ];

    const audit = CodeComplianceAuditor.auditStructure(demands);

    expect(audit.results.length).toBe(3);
    expect(audit.governingElementId).toBe('BEAM_02');
    expect(audit.maxGlobalUC).toBeGreaterThan(0.90);
    expect(audit.overallCompliance).toBe('WARNING'); // Between 0.90 and 1.00
  });
});
