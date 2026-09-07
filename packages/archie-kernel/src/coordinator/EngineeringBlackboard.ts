/**
 * BeamLab Sprint B5.1 — Shared Engineering Blackboard
 * Central thread-safe state repository for autonomous multi-agent sessions.
 * Holds canonical models, load combinations, analysis results, code compliance audits,
 * optimization candidates, calculation notes, and human approval gates.
 */

export interface FactoredLoadCombination {
  id: string;
  name: string;
  factors: Record<string, number>; // e.g. { Dead: 1.35, Live: 1.5 } or { Dead: 1.2, Wind: 1.0, Live: 0.5 }
  limitState: 'ULS_STRENGTH' | 'SLS_DEFLECTION' | 'SEISMIC';
}

export interface MemberComplianceCheck {
  elementId: string;
  designCode: string; // e.g. 'EUROCODE_3' | 'AISC_360_16'
  crossSectionName: string;
  utilizationRatio: number; // UC = Demand / Capacity
  governingLimitState: 'FLEXURE' | 'AXIAL_COMPRESSION' | 'LATERAL_TORSIONAL_BUCKLING' | 'SHEAR' | 'DEFLECTION';
  status: 'PASS' | 'WARNING' | 'FAIL'; // PASS <= 0.90, WARNING 0.90 < UC <= 1.00, FAIL > 1.00
  governingEquation: string; // e.g. "N_Ed / N_b,Rd + k_zy * M_y,Ed / M_b,Rd <= 1.0"
  demand: number;
  capacity: number;
}

export interface SectionOptimizationProposal {
  elementId: string;
  currentSection: string;
  proposedSection: string;
  currentArea: number; // [m^2]
  proposedArea: number; // [m^2]
  currentWeightKg: number;
  proposedWeightKg: number;
  weightDeltaKg: number;
  weightReductionPercent: number;
  newUtilizationRatio: number;
  status: 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'APPLIED';
}

export interface CalculationNoteSection {
  id: string;
  title: string;
  contentMarkdown: string;
  equations?: string[];
  status?: 'PASS' | 'FAIL' | 'INFO';
}

export interface HumanApprovalGate {
  id: string;
  action: string;
  description: string;
  impactSummary: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: number;
  decidedAt?: number;
  decidedBy?: string;
  notes?: string;
}

export interface EngineeringBlackboardState {
  sessionId: string;
  goalDescription: string;
  designCode: 'EUROCODE_3' | 'AISC_360_16' | 'IS_800' | 'ASCE_7';
  canonicalModel: any; // SpaceFrameModel3D
  loadCombinations: FactoredLoadCombination[];
  analysisResults?: any;
  complianceAudits: MemberComplianceCheck[];
  overallComplianceStatus: 'NOT_CHECKED' | 'PASS' | 'WARNING' | 'FAIL';
  maxUtilizationRatio: number;
  governingElementId?: string;
  optimizationProposals: SectionOptimizationProposal[];
  totalStructureWeightKg: number;
  optimizedStructureWeightKg: number;
  calculationNote: CalculationNoteSection[];
  approvals: Map<string, HumanApprovalGate>;
  auditTrail: Array<{ timestamp: number; agentId: string; action: string; details?: string }>;
}

export class EngineeringBlackboard {
  private state: EngineeringBlackboardState;
  private subscribers = new Set<(state: Readonly<EngineeringBlackboardState>) => void>();

  constructor(sessionId: string, goalDescription: string, canonicalModel: any, designCode = 'EUROCODE_3' as const) {
    this.state = {
      sessionId,
      goalDescription,
      designCode,
      canonicalModel,
      loadCombinations: [],
      complianceAudits: [],
      overallComplianceStatus: 'NOT_CHECKED',
      maxUtilizationRatio: 0,
      optimizationProposals: [],
      totalStructureWeightKg: 0,
      optimizedStructureWeightKg: 0,
      calculationNote: [],
      approvals: new Map(),
      auditTrail: [],
    };
  }

  public getState(): Readonly<EngineeringBlackboardState> {
    return this.state;
  }

  public subscribe(callback: (state: Readonly<EngineeringBlackboardState>) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notify() {
    for (const sub of this.subscribers) {
      sub(this.state);
    }
  }

  public recordAudit(agentId: string, action: string, details?: string) {
    this.state.auditTrail.push({
      timestamp: Date.now(),
      agentId,
      action,
      details,
    });
    this.notify();
  }

  public setCanonicalModel(model: any, agentId: string) {
    this.state.canonicalModel = model;
    this.recordAudit(agentId, 'UPDATE_MODEL', 'Updated canonical structural model');
  }

  public setLoadCombinations(combinations: FactoredLoadCombination[], agentId: string) {
    this.state.loadCombinations = combinations;
    this.recordAudit(agentId, 'SET_LOAD_COMBINATIONS', `Configured ${combinations.length} load combinations`);
  }

  public setAnalysisResults(results: any, agentId: string) {
    this.state.analysisResults = results;
    this.recordAudit(agentId, 'RECORD_ANALYSIS_RESULTS', 'Saved 3D structural analysis results');
  }

  public setComplianceAudits(checks: MemberComplianceCheck[], agentId: string) {
    this.state.complianceAudits = checks;
    let maxUC = 0;
    let govElem: string | undefined;
    let hasFail = false;
    let hasWarning = false;

    for (const c of checks) {
      if (c.utilizationRatio > maxUC) {
        maxUC = c.utilizationRatio;
        govElem = c.elementId;
      }
      if (c.status === 'FAIL') hasFail = true;
      if (c.status === 'WARNING') hasWarning = true;
    }

    this.state.maxUtilizationRatio = Number(maxUC.toFixed(3));
    this.state.governingElementId = govElem;
    this.state.overallComplianceStatus = hasFail ? 'FAIL' : hasWarning ? 'WARNING' : checks.length > 0 ? 'PASS' : 'NOT_CHECKED';

    this.recordAudit(
      agentId,
      'AUDIT_COMPLIANCE',
      `Audited ${checks.length} members. Overall: ${this.state.overallComplianceStatus}, Max UC: ${this.state.maxUtilizationRatio}`,
    );
  }

  public setOptimizationProposals(
    proposals: SectionOptimizationProposal[],
    totalWeight: number,
    optimizedWeight: number,
    agentId: string,
  ) {
    this.state.optimizationProposals = proposals;
    this.state.totalStructureWeightKg = Number(totalWeight.toFixed(1));
    this.state.optimizedStructureWeightKg = Number(optimizedWeight.toFixed(1));
    const savingsPercent = totalWeight > 0 ? ((totalWeight - optimizedWeight) / totalWeight) * 100 : 0;

    this.recordAudit(
      agentId,
      'GENERATE_OPTIMIZATION_PROPOSALS',
      `Generated ${proposals.length} section proposals. Weight savings: ${savingsPercent.toFixed(1)}% (${(totalWeight - optimizedWeight).toFixed(1)} kg)`,
    );
  }

  public appendCalculationNote(section: CalculationNoteSection, agentId: string) {
    this.state.calculationNote.push(section);
    this.recordAudit(agentId, 'APPEND_CALCULATION_NOTE', `Appended note section: ${section.title}`);
  }

  public createApprovalGate(
    action: string,
    description: string,
    impactSummary: string,
    agentId: string,
  ): string {
    const id = `gate_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const gate: HumanApprovalGate = {
      id,
      action,
      description,
      impactSummary,
      status: 'PENDING',
      requestedAt: Date.now(),
    };
    this.state.approvals.set(id, gate);
    this.recordAudit(agentId, 'REQUEST_APPROVAL', `Approval requested: ${description}`);
    return id;
  }

  public resolveApprovalGate(
    gateId: string,
    decision: 'APPROVED' | 'REJECTED',
    decidedBy: string,
    notes?: string,
  ): boolean {
    const gate = this.state.approvals.get(gateId);
    if (!gate || gate.status !== 'PENDING') return false;

    gate.status = decision;
    gate.decidedAt = Date.now();
    gate.decidedBy = decidedBy;
    gate.notes = notes;

    this.recordAudit(
      decidedBy,
      `APPROVAL_${decision}`,
      `Gate ${gateId} ${decision.toLowerCase()} for: ${gate.action}`,
    );
    return true;
  }
}
