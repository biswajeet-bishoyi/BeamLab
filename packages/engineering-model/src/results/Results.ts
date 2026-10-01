/**
 * BeamLab B1.4 — Canonical Analysis Results & Result Containers
 *
 * Canonical result structures produced by the Solver Runtime and consumed by
 * Engineering Agents, Reporting, Visualization, and Design Engines.
 */

import { BaseEngineeringObject, EngineeringObjectType } from '../core/IEngineeringObject';
import { ValidationResult, ValidationDiagnostic } from '../validation/ValidationResult';
import { ResultState, ConvergenceMetrics } from './ResultTypes';
import { AnalysisCaseResult } from './AnalysisCaseResult';
import { EnvelopeResult } from './EnvelopeResult';
import { ModalResult } from './ModalResult';
import { BucklingResult } from './BucklingResult';
import { EngineeringProvenance } from '../history/EngineeringProvenance';
import { NodeDisplacementResult } from './DisplacementResult';
import { MemberResult } from './MemberResult';

// ─── Legacy Interfaces (Maintained for Backward Compatibility) ───────────────

export interface NodeDisplacement {
  readonly nodeId: string;
  readonly dx: number;
  readonly dy: number;
  readonly dz: number;
  readonly rx: number;
  readonly ry: number;
  readonly rz: number;
}

export interface SupportReaction {
  readonly nodeId: string;
  readonly fx: number;
  readonly fy: number;
  readonly fz: number;
  readonly mx: number;
  readonly my: number;
  readonly mz: number;
}

export interface MemberForceStation {
  readonly position: number;
  readonly axial: number;
  readonly shearY: number;
  readonly shearZ: number;
  readonly torque: number;
  readonly momentY: number;
  readonly momentZ: number;
}

export interface MemberForceResult {
  readonly memberId: string;
  readonly stations: MemberForceStation[];
}

export interface AnalysisResult {
  readonly id: string;
  readonly loadCaseId: string;
  readonly timestamp: string;
  readonly solverId: string;
  readonly displacements: NodeDisplacement[];
  readonly reactions: SupportReaction[];
  readonly memberForces: MemberForceResult[];
  readonly converged: boolean;
  readonly maxDisplacement?: number;
}

// ─── Canonical Analysis Result Class ─────────────────────────────────────────

export class CanonicalAnalysisResult extends BaseEngineeringObject {
  readonly objectType: EngineeringObjectType = 'AnalysisResult';

  status: ResultState = 'Pending';
  invalidationReason?: string;
  supersededById?: string;

  readonly solverId: string;
  readonly solverVersion: string;
  readonly modelRevisionNumber: number;
  readonly executionTimeMs: number;

  provenance?: EngineeringProvenance;
  convergence: ConvergenceMetrics;

  readonly caseResults: Map<string, AnalysisCaseResult> = new Map();
  readonly envelopes: Map<string, EnvelopeResult> = new Map();
  modalResult?: ModalResult;
  bucklingResult?: BucklingResult;

  constructor(params: {
    id: string;
    name: string;
    solverId: string;
    solverVersion: string;
    modelRevisionNumber: number;
    executionTimeMs?: number;
    provenance?: EngineeringProvenance;
    convergence?: Partial<ConvergenceMetrics>;
    status?: ResultState;
  }) {
    super(params.id, params.name);
    this.solverId = params.solverId;
    this.solverVersion = params.solverVersion;
    this.modelRevisionNumber = params.modelRevisionNumber;
    this.executionTimeMs = params.executionTimeMs ?? 0;
    this.provenance = params.provenance;
    this.status = params.status ?? 'Pending';

    this.convergence = {
      converged: params.convergence?.converged ?? true,
      iterations: params.convergence?.iterations ?? 1,
      toleranceAchieved: params.convergence?.toleranceAchieved,
      targetTolerance: params.convergence?.targetTolerance,
      residualNorm: params.convergence?.residualNorm,
      terminationReason: params.convergence?.terminationReason,
      executionTimeMs: params.executionTimeMs ?? 0,
    };
  }

  // ─── Case & Envelope Management ─────────────────────────────────────────────

  addCaseResult(caseResult: AnalysisCaseResult): void {
    this.caseResults.set(caseResult.caseId, caseResult);
  }

  getCaseResult(caseId: string): AnalysisCaseResult | undefined {
    return this.caseResults.get(caseId);
  }

  addEnvelope(envelope: EnvelopeResult): void {
    this.envelopes.set(envelope.envelopeId, envelope);
  }

  getEnvelope(envelopeId: string): EnvelopeResult | undefined {
    return this.envelopes.get(envelopeId);
  }

  // ─── Direct Query Helpers ───────────────────────────────────────────────────

  getNodeDisplacement(caseId: string, nodeId: string): NodeDisplacementResult | undefined {
    return this.caseResults.get(caseId)?.nodeResults.get(nodeId)?.displacement;
  }

  getMemberResult(caseId: string, memberId: string): MemberResult | undefined {
    return this.caseResults.get(caseId)?.memberResults.get(memberId);
  }

  // ─── Lifecycle State Transitions ────────────────────────────────────────────

  markRunning(): void {
    this.status = 'Running';
  }

  markCompleted(convergence?: Partial<ConvergenceMetrics>): void {
    this.status = 'Completed';
    if (convergence) {
      this.convergence = {
        ...this.convergence,
        ...convergence,
      };
    }
  }

  markFailed(reason: string): void {
    this.status = 'Failed';
    this.convergence = {
      ...this.convergence,
      converged: false,
      terminationReason: reason,
    };
  }

  invalidate(reason: string): void {
    this.status = 'Invalidated';
    this.invalidationReason = reason;
  }

  markSuperseded(newResultId: string): void {
    this.status = 'Superseded';
    this.supersededById = newResultId;
  }

  // ─── Validation ─────────────────────────────────────────────────────────────

  validate(): ValidationResult {
    const diagnostics: ValidationDiagnostic[] = [];

    if (!this.solverId) {
      diagnostics.push({
        code: 'RES-001',
        message: 'Missing solverId',
        severity: 'error',
        objectId: this.identity.id,
        field: 'solverId',
      });
    }

    if (this.status === 'Completed' && this.caseResults.size === 0 && !this.modalResult && !this.bucklingResult) {
      diagnostics.push({
        code: 'RES-002',
        message: 'Result is marked Completed but contains no case results, modal results, or buckling results',
        severity: 'error',
        objectId: this.identity.id,
      });
    }

    return new ValidationResult(this.identity.id, diagnostics);
  }
}
