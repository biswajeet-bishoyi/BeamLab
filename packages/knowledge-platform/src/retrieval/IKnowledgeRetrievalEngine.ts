import { KnowledgeItem, KnowledgeVersion } from '../core/KnowledgeModel';

export interface RetrievalResult {
  item: KnowledgeItem;
  relatedKnowledge: KnowledgeItem[];
  rationale: string;
  confidence: number; // 0.0 to 1.0
  source: string;
  version: KnowledgeVersion;
}

export interface RetrievalQuery {
  query: string;
  category?: string;
  tags?: string[];
  limit?: number;
}

export interface IKnowledgeRetrievalEngine {
  name: string;
  index(items: KnowledgeItem[]): Promise<void>;
  retrieve(query: RetrievalQuery): Promise<RetrievalResult[]>;
}
