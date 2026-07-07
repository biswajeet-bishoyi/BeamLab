export interface AuditTrailNode {
  id: string;
  type: 'Report' | 'Section' | 'Paragraph' | 'Evidence' | 'Agent' | 'WorkspaceObject' | 'TimelineEvent' | 'Revision';
  referenceId: string;
  timestamp: string;
}

export interface AuditTrailEdge {
  source: string;
  target: string;
  description: string;
}

export interface EngineeringAuditTrail {
  reportId: string;
  nodes: AuditTrailNode[];
  edges: AuditTrailEdge[];
}
