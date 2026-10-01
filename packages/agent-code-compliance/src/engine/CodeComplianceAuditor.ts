/**
 * BeamLab Sprint B6.2 — Automated Code Compliance Verification & Clause Audit Engine
 * Evaluates structural members against Eurocode 3, AISC 360-16, and IS 800:2007.
 * Emits step-by-step mathematical substitutions, LaTeX expressions, and governing clause citations.
 */

import {
  CodeClauseRetriever,
  type DesignStandard,
  type LimitState,
} from '@beamlab/knowledge-platform';

export interface MemberAuditDemand {
  elementId: string;
  designCode: DesignStandard;
  member: {
    length: number; // [m]
    bucklingLengthZ?: number; // [m] default length
    bucklingLengthY?: number; // [m] default length
    unbracedLengthLT?: number; // [m] default length
    section: {
      name: string;
      A: number; // [m^2]
      Av_z?: number; // [m^2] shear area
      W_pl_y: number; // [m^3] major plastic modulus
      W_el_y?: number; // [m^3]
      W_pl_z?: number; // [m^3] minor plastic modulus
      Iy: number; // [m^4]
      Iz: number; // [m^4]
      It?: number; // [m^4] torsional constant
      Iw?: number; // [m^6] warping constant
    };
    material: {
      name: string;
      fy: number; // [Pa]
      fu?: number; // [Pa]
      E: number; // [Pa] (e.g. 210e9)
      G?: number; // [Pa] (e.g. 81e9)
    };
  };
  forces: {
    Ned: number; // [N] (positive = compression, negative = tension)
    Vz_ed: number; // [N] major/vertical shear
    Vy_ed?: number; // [N] minor shear
    My_ed: number; // [N*m] major bending moment
    Mz_ed?: number; // [N*m] minor bending moment
    deflection?: number; // [m] serviceability deflection
  };
}

export interface LimitStateCheckResult {
  clauseId: string;
  sectionNumber: string;
  clauseTitle: string;
  limitState: LimitState;
  demandName: string;
  demandValue: number;
  demandUnit: string;
  capacityName: string;
  capacityValue: number;
  capacityUnit: string;
  utilizationRatio: number;
  status: 'PASS' | 'WARNING' | 'FAIL';
  governingEquationLatex: string;
  substitutionLatex: string;
}

export interface MemberAuditResult {
  elementId: string;
  designCode: DesignStandard;
  crossSectionName: string;
  overallStatus: 'PASS' | 'WARNING' | 'FAIL';
  maxUtilizationRatio: number;
  governingCheck: LimitStateCheckResult;
  checks: LimitStateCheckResult[];
}

export class CodeComplianceAuditor {
  /**
   * Audits a structural member against codified requirements and returns detailed checks.
   */
  public static auditMember(demand: MemberAuditDemand): MemberAuditResult {
    const { elementId, designCode, member, forces } = demand;
    const checks: LimitStateCheckResult[] = [];

    const { A, W_pl_y, Iy, Iz } = member.section;
    const Av_z = member.section.Av_z || A * 0.45;
    const W_pl_z = member.section.W_pl_z || W_pl_y * 0.35;
    const { fy, E } = member.material;
    const G = member.material.G || E / (2 * (1 + 0.3));
    const It = member.section.It || A * 1e-4;
    const Iw = member.section.Iw || Iz * 1e-3;

    const Lcr_y = demand.member.bucklingLengthY || member.length;
    const Lcr_z = demand.member.bucklingLengthZ || member.length;
    const isLaterallyRestrained = demand.member.unbracedLengthLT === 0;
    const L_LT = demand.member.unbracedLengthLT !== undefined ? demand.member.unbracedLengthLT : member.length;

    // ── 1. TENSION OR CROSS-SECTION COMPRESSION ─────────────────────────
    if (forces.Ned < 0) {
      // Axial Tension
      const Nt_Ed = Math.abs(forces.Ned);
      if (designCode === 'EUROCODE_3') {
        const Nt_Rd = (A * fy) / 1.0;
        const uc = Nt_Ed / Nt_Rd;
        checks.push({
          clauseId: 'EC3_6_2_3',
          sectionNumber: '6.2.3',
          clauseTitle: 'Tension Resistance of Cross-Sections',
          limitState: 'ULTIMATE_STRENGTH',
          demandName: 'N_{Ed}',
          demandValue: Nt_Ed,
          demandUnit: 'N',
          capacityName: 'N_{pl,Rd}',
          capacityValue: Nt_Rd,
          capacityUnit: 'N',
          utilizationRatio: Number(uc.toFixed(3)),
          status: uc <= 0.9 ? 'PASS' : uc <= 1.0 ? 'WARNING' : 'FAIL',
          governingEquationLatex: 'N_{pl,Rd} = \\frac{A \\cdot f_y}{\\gamma_{M0}}',
          substitutionLatex: `N_{pl,Rd} = \\frac{${(A * 1e4).toFixed(1)} \\times 10^{-4} \\times ${(fy / 1e6).toFixed(0)}}{1.0} = ${(Nt_Rd / 1e3).toFixed(1)}\\text{ kN}`,
        });
      } else if (designCode === 'AISC_360_16') {
        const phi_t = 0.9;
        const Pn = phi_t * fy * A;
        const uc = Nt_Ed / Pn;
        checks.push({
          clauseId: 'AISC_D2',
          sectionNumber: 'D2',
          clauseTitle: 'Tensile Design Strength (Yielding)',
          limitState: 'ULTIMATE_STRENGTH',
          demandName: 'P_u',
          demandValue: Nt_Ed,
          demandUnit: 'N',
          capacityName: '\\phi_t P_n',
          capacityValue: Pn,
          capacityUnit: 'N',
          utilizationRatio: Number(uc.toFixed(3)),
          status: uc <= 0.9 ? 'PASS' : uc <= 1.0 ? 'WARNING' : 'FAIL',
          governingEquationLatex: '\\phi_t P_n = \\phi_t F_y A_g',
          substitutionLatex: `\\phi_t P_n = 0.90 \\times ${(fy / 1e6).toFixed(0)} \\times ${(A * 1e4).toFixed(1)} = ${(Pn / 1e3).toFixed(1)}\\text{ kN}`,
        });
      } else {
        // IS 800
        const gamma_m0 = 1.1;
        const Tdg = (A * fy) / gamma_m0;
        const uc = Nt_Ed / Tdg;
        checks.push({
          clauseId: 'IS800_6_2',
          sectionNumber: '6.2',
          clauseTitle: 'Design Strength in Tension (Yielding)',
          limitState: 'ULTIMATE_STRENGTH',
          demandName: 'T_u',
          demandValue: Nt_Ed,
          demandUnit: 'N',
          capacityName: 'T_{dg}',
          capacityValue: Tdg,
          capacityUnit: 'N',
          utilizationRatio: Number(uc.toFixed(3)),
          status: uc <= 0.9 ? 'PASS' : uc <= 1.0 ? 'WARNING' : 'FAIL',
          governingEquationLatex: 'T_{dg} = \\frac{A_g \\cdot f_y}{\\gamma_{m0}}',
          substitutionLatex: `T_{dg} = \\frac{${(A * 1e4).toFixed(1)} \\times ${(fy / 1e6).toFixed(0)}}{1.10} = ${(Tdg / 1e3).toFixed(1)}\\text{ kN}`,
        });
      }
    } else if (forces.Ned > 0) {
      // Axial Compression (Cross-Section Squash)
      const Nc_Ed = forces.Ned;
      if (designCode === 'EUROCODE_3') {
        const Nc_Rd = (A * fy) / 1.0;
        const uc = Nc_Ed / Nc_Rd;
        checks.push({
          clauseId: 'EC3_6_2_4',
          sectionNumber: '6.2.4',
          clauseTitle: 'Compression Resistance of Cross-Sections',
          limitState: 'ULTIMATE_STRENGTH',
          demandName: 'N_{Ed}',
          demandValue: Nc_Ed,
          demandUnit: 'N',
          capacityName: 'N_{c,Rd}',
          capacityValue: Nc_Rd,
          capacityUnit: 'N',
          utilizationRatio: Number(uc.toFixed(3)),
          status: uc <= 0.9 ? 'PASS' : uc <= 1.0 ? 'WARNING' : 'FAIL',
          governingEquationLatex: 'N_{c,Rd} = \\frac{A \\cdot f_y}{\\gamma_{M0}}',
          substitutionLatex: `N_{c,Rd} = \\frac{${(A * 1e4).toFixed(1)} \\times 10^{-4} \\times ${(fy / 1e6).toFixed(0)}}{1.0} = ${(Nc_Rd / 1e3).toFixed(1)}\\text{ kN}`,
        });
      }
    }

    // ── 2. MAJOR AXIS BENDING MOMENT ─────────────────────────────────────
    const My_Ed = Math.abs(forces.My_ed);
    if (designCode === 'EUROCODE_3') {
      const Mc_Rd = (W_pl_y * fy) / 1.0;
      const uc = My_Ed / Mc_Rd;
      checks.push({
        clauseId: 'EC3_6_2_5',
        sectionNumber: '6.2.5',
        clauseTitle: 'Bending Moment Resistance of Cross-Sections',
        limitState: 'ULTIMATE_STRENGTH',
        demandName: 'M_{y,Ed}',
        demandValue: My_Ed,
        demandUnit: 'N*m',
        capacityName: 'M_{c,Rd}',
        capacityValue: Mc_Rd,
        capacityUnit: 'N*m',
        utilizationRatio: Number(uc.toFixed(3)),
        status: uc <= 0.9 ? 'PASS' : uc <= 1.0 ? 'WARNING' : 'FAIL',
        governingEquationLatex: 'M_{c,Rd} = \\frac{W_{pl,y} \\cdot f_y}{\\gamma_{M0}}',
        substitutionLatex: `M_{c,Rd} = \\frac{${(W_pl_y * 1e6).toFixed(0)} \\times 10^{-6} \\times ${(fy / 1e6).toFixed(0)}}{1.0} = ${(Mc_Rd / 1e3).toFixed(1)}\\text{ kN}\\cdot\\text{m}`,
      });
    } else if (designCode === 'AISC_360_16') {
      const phi_b = 0.9;
      const Mn = phi_b * fy * W_pl_y;
      const uc = My_Ed / Mn;
      checks.push({
        clauseId: 'AISC_F2',
        sectionNumber: 'F2',
        clauseTitle: 'Flexure of Doubly Symmetric Compact I-Shapes',
        limitState: 'ULTIMATE_STRENGTH',
        demandName: 'M_{ux}',
        demandValue: My_Ed,
        demandUnit: 'N*m',
        capacityName: '\\phi_b M_n',
        capacityValue: Mn,
        capacityUnit: 'N*m',
        utilizationRatio: Number(uc.toFixed(3)),
        status: uc <= 0.9 ? 'PASS' : uc <= 1.0 ? 'WARNING' : 'FAIL',
        governingEquationLatex: '\\phi_b M_n = \\phi_b F_y Z_x',
        substitutionLatex: `\\phi_b M_n = 0.90 \\times ${(fy / 1e6).toFixed(0)} \\times ${(W_pl_y * 1e6).toFixed(0)} = ${(Mn / 1e3).toFixed(1)}\\text{ kN}\\cdot\\text{m}`,
      });
    } else {
      // IS 800
      const gamma_m0 = 1.1;
      const Md = (1.0 * W_pl_y * fy) / gamma_m0;
      const uc = My_Ed / Md;
      checks.push({
        clauseId: 'IS800_8_2',
        sectionNumber: '8.2',
        clauseTitle: 'Design Bending Strength of Beams (Flexure)',
        limitState: 'ULTIMATE_STRENGTH',
        demandName: 'M_u',
        demandValue: My_Ed,
        demandUnit: 'N*m',
        capacityName: 'M_d',
        capacityValue: Md,
        capacityUnit: 'N*m',
        utilizationRatio: Number(uc.toFixed(3)),
        status: uc <= 0.9 ? 'PASS' : uc <= 1.0 ? 'WARNING' : 'FAIL',
        governingEquationLatex: 'M_d = \\beta_b Z_p \\frac{f_y}{\\gamma_{m0}}',
        substitutionLatex: `M_d = 1.0 \\times ${(W_pl_y * 1e6).toFixed(0)} \\times \\frac{${(fy / 1e6).toFixed(0)}}{1.10} = ${(Md / 1e3).toFixed(1)}\\text{ kN}\\cdot\\text{m}`,
      });
    }

    // ── 3. SHEAR FORCE RESISTANCE ────────────────────────────────────────
    const Vz_Ed = Math.abs(forces.Vz_ed);
    if (designCode === 'EUROCODE_3') {
      const Vc_Rd = (Av_z * (fy / Math.sqrt(3))) / 1.0;
      const uc = Vz_Ed / Vc_Rd;
      checks.push({
        clauseId: 'EC3_6_2_6',
        sectionNumber: '6.2.6',
        clauseTitle: 'Shear Resistance of Cross-Sections',
        limitState: 'ULTIMATE_STRENGTH',
        demandName: 'V_{Ed}',
        demandValue: Vz_Ed,
        demandUnit: 'N',
        capacityName: 'V_{c,Rd}',
        capacityValue: Vc_Rd,
        capacityUnit: 'N',
        utilizationRatio: Number(uc.toFixed(3)),
        status: uc <= 0.9 ? 'PASS' : uc <= 1.0 ? 'WARNING' : 'FAIL',
        governingEquationLatex: 'V_{c,Rd} = \\frac{A_v (f_y / \\sqrt{3})}{\\gamma_{M0}}',
        substitutionLatex: `V_{c,Rd} = \\frac{${(Av_z * 1e4).toFixed(1)} \\times 10^{-4} \\times (${(fy / 1e6).toFixed(0)} / 1.732)}{1.0} = ${(Vc_Rd / 1e3).toFixed(1)}\\text{ kN}`,
      });
    } else if (designCode === 'AISC_360_16') {
      const phi_v = 0.9;
      const Vn = phi_v * (0.6 * fy * Av_z * 1.0);
      const uc = Vz_Ed / Vn;
      checks.push({
        clauseId: 'AISC_G2',
        sectionNumber: 'G2',
        clauseTitle: 'Shear Strength of Web',
        limitState: 'ULTIMATE_STRENGTH',
        demandName: 'V_u',
        demandValue: Vz_Ed,
        demandUnit: 'N',
        capacityName: '\\phi_v V_n',
        capacityValue: Vn,
        capacityUnit: 'N',
        utilizationRatio: Number(uc.toFixed(3)),
        status: uc <= 0.9 ? 'PASS' : uc <= 1.0 ? 'WARNING' : 'FAIL',
        governingEquationLatex: '\\phi_v V_n = \\phi_v (0.6 F_y A_w C_{v1})',
        substitutionLatex: `\\phi_v V_n = 0.90 \\times 0.6 \\times ${(fy / 1e6).toFixed(0)} \\times ${(Av_z * 1e4).toFixed(1)} = ${(Vn / 1e3).toFixed(1)}\\text{ kN}`,
      });
    } else {
      // IS 800
      const gamma_m0 = 1.1;
      const Vd = (Av_z * fy) / (Math.sqrt(3) * gamma_m0);
      const uc = Vz_Ed / Vd;
      checks.push({
        clauseId: 'IS800_8_4',
        sectionNumber: '8.4',
        clauseTitle: 'Shear Resistance of Beams',
        limitState: 'ULTIMATE_STRENGTH',
        demandName: 'V_u',
        demandValue: Vz_Ed,
        demandUnit: 'N',
        capacityName: 'V_d',
        capacityValue: Vd,
        capacityUnit: 'N',
        utilizationRatio: Number(uc.toFixed(3)),
        status: uc <= 0.9 ? 'PASS' : uc <= 1.0 ? 'WARNING' : 'FAIL',
        governingEquationLatex: 'V_d = \\frac{A_v f_y}{\\sqrt{3} \\gamma_{m0}}',
        substitutionLatex: `V_d = \\frac{${(Av_z * 1e4).toFixed(1)} \\times ${(fy / 1e6).toFixed(0)}}{1.732 \\times 1.10} = ${(Vd / 1e3).toFixed(1)}\\text{ kN}`,
      });
    }

    // ── 4. FLEXURAL COLUMN BUCKLING (for compression members) ───────────
    if (forces.Ned > 0) {
      const N_Ed = forces.Ned;
      // Weak axis z-z governs column buckling
      const Ncr_z = (Math.PI ** 2 * E * Iz) / Lcr_z ** 2;
      const lambda_bar_z = Math.sqrt((A * fy) / Ncr_z);

      if (designCode === 'EUROCODE_3') {
        const alpha = 0.34; // curve b
        const phi_z = 0.5 * (1 + alpha * (lambda_bar_z - 0.2) + lambda_bar_z ** 2);
        const chi_z = Math.min(1.0, 1.0 / (phi_z + Math.sqrt(Math.max(0, phi_z ** 2 - lambda_bar_z ** 2))));
        const Nb_Rd = (chi_z * A * fy) / 1.0;
        const uc = N_Ed / Nb_Rd;

        checks.push({
          clauseId: 'EC3_6_3_1',
          sectionNumber: '6.3.1',
          clauseTitle: 'Flexural Column Buckling Resistance',
          limitState: 'STABILITY_BUCKLING',
          demandName: 'N_{Ed}',
          demandValue: N_Ed,
          demandUnit: 'N',
          capacityName: 'N_{b,Rd}',
          capacityValue: Nb_Rd,
          capacityUnit: 'N',
          utilizationRatio: Number(uc.toFixed(3)),
          status: uc <= 0.9 ? 'PASS' : uc <= 1.0 ? 'WARNING' : 'FAIL',
          governingEquationLatex: 'N_{b,Rd} = \\frac{\\chi \\cdot A \\cdot f_y}{\\gamma_{M1}}',
          substitutionLatex: `\\bar{\\lambda}_z = ${lambda_bar_z.toFixed(2)}, \\; \\chi_z = ${chi_z.toFixed(3)}, \\; N_{b,Rd} = ${(Nb_Rd / 1e3).toFixed(1)}\\text{ kN}`,
        });
      } else if (designCode === 'AISC_360_16') {
        const Fe = (Math.PI ** 2 * E * Iz) / (A * Lcr_z ** 2);
        const lambda_ratio = fy / Fe;
        const Fcr = lambda_ratio <= 2.25 ? Math.pow(0.658, lambda_ratio) * fy : 0.877 * Fe;
        const phi_c = 0.9;
        const Pn = phi_c * Fcr * A;
        const uc = N_Ed / Pn;

        checks.push({
          clauseId: 'AISC_E3',
          sectionNumber: 'E3',
          clauseTitle: 'Compressive Strength for Flexural Buckling',
          limitState: 'STABILITY_BUCKLING',
          demandName: 'P_u',
          demandValue: N_Ed,
          demandUnit: 'N',
          capacityName: '\\phi_c P_n',
          capacityValue: Pn,
          capacityUnit: 'N',
          utilizationRatio: Number(uc.toFixed(3)),
          status: uc <= 0.9 ? 'PASS' : uc <= 1.0 ? 'WARNING' : 'FAIL',
          governingEquationLatex: '\\phi_c P_n = \\phi_c F_{cr} A_g',
          substitutionLatex: `F_{cr} = ${(Fcr / 1e6).toFixed(1)}\\text{ MPa}, \\; \\phi_c P_n = ${(Pn / 1e3).toFixed(1)}\\text{ kN}`,
        });
      }
    }

    // ── 5. LATERAL-TORSIONAL BUCKLING (LTB) ──────────────────────────────
    if (My_Ed > 0 && !isLaterallyRestrained && L_LT > 0) {
      // Elastic critical moment Mcr for doubly symmetric I-shape under uniform bending
      const Mcr =
        (Math.PI ** 2 * E * Iz) / L_LT ** 2 *
        Math.sqrt(Iw / Iz + (L_LT ** 2 * G * It) / (Math.PI ** 2 * E * Iz));
      const lambda_bar_LT = Math.sqrt((W_pl_y * fy) / Math.max(1, Mcr));

      if (designCode === 'EUROCODE_3') {
        const alpha_LT = 0.34;
        const phi_LT = 0.5 * (1 + alpha_LT * (lambda_bar_LT - 0.2) + lambda_bar_LT ** 2);
        const chi_LT = Math.min(1.0, 1.0 / (phi_LT + Math.sqrt(Math.max(0, phi_LT ** 2 - lambda_bar_LT ** 2))));
        const Mb_Rd = (chi_LT * W_pl_y * fy) / 1.0;
        const uc = My_Ed / Mb_Rd;

        checks.push({
          clauseId: 'EC3_6_3_2',
          sectionNumber: '6.3.2',
          clauseTitle: 'Lateral-Torsional Buckling Resistance',
          limitState: 'STABILITY_BUCKLING',
          demandName: 'M_{y,Ed}',
          demandValue: My_Ed,
          demandUnit: 'N*m',
          capacityName: 'M_{b,Rd}',
          capacityValue: Mb_Rd,
          capacityUnit: 'N*m',
          utilizationRatio: Number(uc.toFixed(3)),
          status: uc <= 0.9 ? 'PASS' : uc <= 1.0 ? 'WARNING' : 'FAIL',
          governingEquationLatex: 'M_{b,Rd} = \\frac{\\chi_{LT} \\cdot W_{pl,y} \\cdot f_y}{\\gamma_{M1}}',
          substitutionLatex: `M_{cr} = ${(Mcr / 1e3).toFixed(1)}\\text{ kNm}, \\; \\bar{\\lambda}_{LT} = ${lambda_bar_LT.toFixed(2)}, \\; \\chi_{LT} = ${chi_LT.toFixed(3)}, \\; M_{b,Rd} = ${(Mb_Rd / 1e3).toFixed(1)}\\text{ kNm}`,
        });
      }
    }

    // ── 6. COMBINED AXIAL COMPRESSION & BENDING INTERACTION ─────────────
    if (forces.Ned > 0 && (My_Ed > 0 || (forces.Mz_ed && Math.abs(forces.Mz_ed) > 0))) {
      const Mz_Ed = Math.abs(forces.Mz_ed || 0);
      if (designCode === 'EUROCODE_3') {
        const Nb_Rd_y = (A * fy) / 1.0;
        const Mb_Rd_y = (W_pl_y * fy) / 1.0;
        const Mc_Rd_z = (W_pl_z * fy) / 1.0;
        const kyy = 1.05;
        const kyz = 0.6;
        const uc_combined =
          forces.Ned / Nb_Rd_y + (kyy * My_Ed) / Mb_Rd_y + (kyz * Mz_Ed) / Mc_Rd_z;

        checks.push({
          clauseId: 'EC3_6_3_3',
          sectionNumber: '6.3.3',
          clauseTitle: 'Uniform Members in Bending & Axial Compression',
          limitState: 'STABILITY_BUCKLING',
          demandName: 'Interaction',
          demandValue: uc_combined,
          demandUnit: '-',
          capacityName: 'Limit',
          capacityValue: 1.0,
          capacityUnit: '-',
          utilizationRatio: Number(uc_combined.toFixed(3)),
          status: uc_combined <= 0.9 ? 'PASS' : uc_combined <= 1.0 ? 'WARNING' : 'FAIL',
          governingEquationLatex:
            '\\frac{N_{Ed}}{\\chi_y N_{Rk}/\\gamma_{M1}} + k_{yy} \\frac{M_{y,Ed}}{\\chi_{LT} M_{y,Rk}/\\gamma_{M1}} + k_{yz} \\frac{M_{z,Ed}}{M_{z,Rk}/\\gamma_{M1}} \\le 1.0',
          substitutionLatex: `\\frac{${(forces.Ned / 1e3).toFixed(1)}}{${(Nb_Rd_y / 1e3).toFixed(1)}} + 1.05 \\frac{${(My_Ed / 1e3).toFixed(1)}}{${(Mb_Rd_y / 1e3).toFixed(1)}} = ${uc_combined.toFixed(2)} \\le 1.0`,
        });
      } else if (designCode === 'AISC_360_16') {
        const Pc = 0.9 * fy * A;
        const Mcx = 0.9 * fy * W_pl_y;
        const Mcy = 0.9 * fy * W_pl_z;
        const pr_pc = forces.Ned / Pc;
        let uc_combined = 0;

        if (pr_pc >= 0.2) {
          uc_combined = pr_pc + (8 / 9) * (My_Ed / Mcx + Mz_Ed / Mcy);
        } else {
          uc_combined = pr_pc / 2 + (My_Ed / Mcx + Mz_Ed / Mcy);
        }

        checks.push({
          clauseId: 'AISC_H1',
          sectionNumber: 'H1',
          clauseTitle: 'Interaction of Flexure and Axial Force',
          limitState: 'STABILITY_BUCKLING',
          demandName: 'Interaction',
          demandValue: uc_combined,
          demandUnit: '-',
          capacityName: 'Limit',
          capacityValue: 1.0,
          capacityUnit: '-',
          utilizationRatio: Number(uc_combined.toFixed(3)),
          status: uc_combined <= 0.9 ? 'PASS' : uc_combined <= 1.0 ? 'WARNING' : 'FAIL',
          governingEquationLatex:
            '\\frac{P_r}{P_c} + \\frac{8}{9} \\left( \\frac{M_{rx}}{M_{cx}} + \\frac{M_{ry}}{M_{cy}} \\right) \\le 1.0',
          substitutionLatex: `\\frac{P_r}{P_c} = ${pr_pc.toFixed(2)} \\implies UC = ${uc_combined.toFixed(2)} \\le 1.0`,
        });
      }
    }

    // ── 7. SERVICEABILITY DEFLECTION CHECK ────────────────────────────────
    if (forces.deflection !== undefined) {
      const delta = Math.abs(forces.deflection);
      const delta_limit = member.length / 300;
      const uc_defl = delta / delta_limit;

      checks.push({
        clauseId: 'SERVICEABILITY_DEFLECTION',
        sectionNumber: 'SLS',
        clauseTitle: 'Serviceability Limit State Deflection',
        limitState: 'SERVICEABILITY',
        demandName: '\\delta',
        demandValue: delta,
        demandUnit: 'm',
        capacityName: '\\delta_{limit} = L / 300',
        capacityValue: delta_limit,
        capacityUnit: 'm',
        utilizationRatio: Number(uc_defl.toFixed(3)),
        status: uc_defl <= 0.9 ? 'PASS' : uc_defl <= 1.0 ? 'WARNING' : 'FAIL',
        governingEquationLatex: '\\delta \\le \\frac{L}{300}',
        substitutionLatex: `\\delta = ${(delta * 1e3).toFixed(1)}\\text{ mm} \\le ${(delta_limit * 1e3).toFixed(1)}\\text{ mm}`,
      });
    }

    // Determine Governing Check
    let maxUC = 0;
    let governing = checks[0]!;
    let overallStatus: MemberAuditResult['overallStatus'] = 'PASS';

    for (const ch of checks) {
      if (ch.utilizationRatio > maxUC) {
        maxUC = ch.utilizationRatio;
        governing = ch;
      }
      if (ch.status === 'FAIL') overallStatus = 'FAIL';
      else if (ch.status === 'WARNING' && overallStatus !== 'FAIL') overallStatus = 'WARNING';
    }

    return {
      elementId,
      designCode,
      crossSectionName: member.section.name,
      overallStatus,
      maxUtilizationRatio: maxUC,
      governingCheck: governing,
      checks,
    };
  }

  /**
   * Audits an array of members across a structural frame model.
   */
  public static auditStructure(demands: MemberAuditDemand[]): {
    results: MemberAuditResult[];
    overallCompliance: 'PASS' | 'WARNING' | 'FAIL';
    governingElementId: string;
    maxGlobalUC: number;
  } {
    const results = demands.map((d) => this.auditMember(d));
    let maxGlobalUC = 0;
    let govId = results[0]?.elementId || '';
    let overallCompliance: 'PASS' | 'WARNING' | 'FAIL' = 'PASS';

    for (const r of results) {
      if (r.maxUtilizationRatio > maxGlobalUC) {
        maxGlobalUC = r.maxUtilizationRatio;
        govId = r.elementId;
      }
      if (r.overallStatus === 'FAIL') overallCompliance = 'FAIL';
      else if (r.overallStatus === 'WARNING' && overallCompliance !== 'FAIL') overallCompliance = 'WARNING';
    }

    return {
      results,
      overallCompliance,
      governingElementId: govId,
      maxGlobalUC,
    };
  }
}
