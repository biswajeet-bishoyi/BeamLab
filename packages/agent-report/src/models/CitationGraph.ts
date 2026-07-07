export interface CitationNode {
  id: string;
  type: 'Paragraph' | 'Evidence' | 'Knowledge' | 'Policy' | 'Clause' | 'AnalysisResult';
  data: any;
}

export interface CitationEdge {
  source: string;
  target: string;
  relationship: string;
}

export interface CitationGraph {
  id: string;
  nodes: CitationNode[];
  edges: CitationEdge[];
}
