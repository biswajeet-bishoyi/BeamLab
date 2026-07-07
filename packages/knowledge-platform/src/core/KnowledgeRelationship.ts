export type RelationshipType = 
  | 'Depends On'
  | 'Related To'
  | 'Supersedes'
  | 'References'
  | 'Contradicts'
  | 'Requires'
  | 'Example'
  | 'Uses'
  | 'Checked By'
  | 'Defined In'
  | 'Used By';

export interface KnowledgeRelationship {
  sourceId: string;
  targetId: string;
  type: RelationshipType;
  description?: string;
}

export interface KnowledgeGraph {
  nodes: string[]; // knowledge IDs
  edges: KnowledgeRelationship[];
}
