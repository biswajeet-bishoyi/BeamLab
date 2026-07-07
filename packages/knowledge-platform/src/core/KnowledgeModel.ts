export type ReviewStatus = 'Draft' | 'In Review' | 'Approved' | 'Deprecated';

export interface KnowledgeVersion {
  knowledgeVersion: string;
  sourceVersion: string;
  reviewStatus: ReviewStatus;
  approvedBy?: string;
  updatedAt: string;
}

export interface KnowledgeItem {
  id: string; // e.g. BL-KNOW-STEEL-0001
  category: string;
  title: string;
  summary: string;
  detailedExplanation: string;
  keywords: string[];
  engineeringDomain: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  references: string[];
  source: string;
  version: KnowledgeVersion;
}
