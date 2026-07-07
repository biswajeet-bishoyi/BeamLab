import type { KnowledgeItem, KnowledgeVersion } from '@beamlab/knowledge-platform';

export interface ClientRetrievalQuery {
  query: string;
  category?: string;
  tags?: string[];
  limit?: number;
}

export interface ClientRetrievalResult {
  item: KnowledgeItem;
  relatedKnowledge: KnowledgeItem[];
  rationale: string;
  confidence: number;
  source: string;
  version: KnowledgeVersion;
}
