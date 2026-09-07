/**
 * BeamLab B1.4 — Engineering Provenance & Traceability
 *
 * Every engineering result is strictly traceable:
 * Result -> Analysis -> Model Revision -> Inputs -> Solver -> Agent -> Evidence
 */

export interface SolverSignature {
  readonly solverId: string;
  readonly solverName: string;
  readonly solverVersion: string;
  readonly solverConfigHash?: string;
  readonly environment?: string;
}

export interface AgentSignature {
  readonly agentId: string;
  readonly agentName: string;
  readonly workflowId?: string;
  readonly taskId?: string;
  readonly promptSummary?: string;
}

export interface EvidenceReference {
  readonly evidenceId: string;
  readonly registryId?: string;
  readonly citationText?: string;
  readonly verificationDocUri?: string;
}

export interface EngineeringProvenance {
  /** Target result identifier */
  readonly resultId: string;
  /** Analysis run identifier */
  readonly analysisId: string;
  /** Monotonic revision number of the model when solved */
  readonly modelRevisionNumber: number;
  /** Content hash of the physical model inputs (nodes, members, materials, loads, supports) */
  readonly inputSnapshotHash: string;
  /** Execution solver identity and version */
  readonly solver: SolverSignature;
  /** Authoring or initiating agent (if automated) */
  readonly agent?: AgentSignature;
  /** User who approved or initiated run (if human) */
  readonly userAuthor?: string;
  /** Audit evidence link for reporting and justification */
  readonly evidence?: EvidenceReference;
  /** Timestamp of generation in ISO-8601 */
  readonly timestamp: string;
}

export function createProvenance(params: {
  resultId: string;
  analysisId: string;
  modelRevisionNumber: number;
  inputSnapshotHash: string;
  solver: SolverSignature;
  agent?: AgentSignature;
  userAuthor?: string;
  evidence?: EvidenceReference;
}): EngineeringProvenance {
  return {
    ...params,
    timestamp: new Date().toISOString(),
  };
}
