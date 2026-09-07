/**
 * BeamLab B1.4 — Engineering History Timeline & Audit Log
 *
 * Tracks all engineering actions, model changes, solver executions,
 * agent decisions, user approvals, and revision milestones.
 */

export type HistoryEntryType =
  | 'ModelChange'
  | 'LoadChange'
  | 'AnalysisRun'
  | 'DesignRun'
  | 'Optimization'
  | 'ComplianceCheck'
  | 'UserDecision'
  | 'AgentDecision'
  | 'Approval'
  | 'Revision';

export interface HistoryAuthor {
  readonly type: 'User' | 'Agent' | 'System';
  readonly id: string;
  readonly name: string;
}

export interface HistoryObjectDiff {
  readonly objectId: string;
  readonly objectType: string;
  readonly changeType: 'Added' | 'Modified' | 'Removed';
  readonly propertyPath?: string;
  readonly before?: unknown;
  readonly after?: unknown;
}

export interface ApprovalSignature {
  readonly approverName: string;
  readonly approverRole: string;
  readonly approvedAt: string;
  readonly comments?: string;
  readonly signatureHash: string;
}

export interface EngineeringHistoryEntry {
  readonly id: string;
  readonly timestamp: string;
  readonly type: HistoryEntryType;
  readonly revisionNumber: number;
  readonly author: HistoryAuthor;
  readonly description: string;
  readonly affectedObjectIds: string[];
  readonly diffs?: HistoryObjectDiff[];
  readonly metadata?: Record<string, unknown>;
  readonly approval?: ApprovalSignature;
}

export function createHistoryEntry(params: {
  id: string;
  type: HistoryEntryType;
  revisionNumber: number;
  author: HistoryAuthor;
  description: string;
  affectedObjectIds?: string[];
  diffs?: HistoryObjectDiff[];
  metadata?: Record<string, unknown>;
  approval?: ApprovalSignature;
}): EngineeringHistoryEntry {
  return {
    id: params.id,
    timestamp: new Date().toISOString(),
    type: params.type,
    revisionNumber: params.revisionNumber,
    author: params.author,
    description: params.description,
    affectedObjectIds: params.affectedObjectIds ?? [],
    diffs: params.diffs,
    metadata: params.metadata,
    approval: params.approval,
  };
}
