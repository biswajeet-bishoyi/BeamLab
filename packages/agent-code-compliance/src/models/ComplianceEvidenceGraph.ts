export interface EvidenceNode {
  id: string;
  type: 'Violation' | 'Rule' | 'Clause' | 'Standard' | 'Input' | 'Calculation' | 'Reasoning' | 'Recommendation';
  label: string;
  data: any;
}

export interface EvidenceEdge {
  source: string;
  target: string;
  relationship: string;
}

export interface ComplianceEvidenceGraph {
  id: string;
  sessionId: string;
  nodes: EvidenceNode[];
  edges: EvidenceEdge[];
}
