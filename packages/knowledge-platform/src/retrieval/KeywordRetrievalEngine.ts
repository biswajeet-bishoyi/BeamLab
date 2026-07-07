import { IKnowledgeRetrievalEngine, RetrievalQuery, RetrievalResult } from './IKnowledgeRetrievalEngine';
import { KnowledgeItem } from '../core/KnowledgeModel';
import { KnowledgeRelationship } from '../core/KnowledgeRelationship';

export class KeywordRetrievalEngine implements IKnowledgeRetrievalEngine {
  name = 'KeywordRetrievalEngine';
  private items: Map<string, KnowledgeItem> = new Map();
  private relationships: KnowledgeRelationship[] = [];

  // Used by the Knowledge Engine to feed relationships for context
  setRelationships(relationships: KnowledgeRelationship[]) {
    this.relationships = relationships;
  }

  async index(items: KnowledgeItem[]): Promise<void> {
    for (const item of items) {
      this.items.set(item.id, item);
    }
  }

  async retrieve(query: RetrievalQuery): Promise<RetrievalResult[]> {
    const searchTerms = query.query.toLowerCase().split(' ').filter(t => t.length > 2);
    const results: RetrievalResult[] = [];

    if (searchTerms.length === 0) return [];

    const limit = query.limit || 10;

    for (const item of this.items.values()) {
      if (query.category && item.category !== query.category) continue;
      
      let score = 0;
      let matchedTerms = 0;

      const titleLower = item.title.toLowerCase();
      const summaryLower = item.summary.toLowerCase();
      const keywordsLower = item.keywords.map(k => k.toLowerCase());

      for (const term of searchTerms) {
        let termMatched = false;
        if (titleLower.includes(term)) { score += 5; termMatched = true; }
        if (summaryLower.includes(term)) { score += 2; termMatched = true; }
        if (keywordsLower.some(k => k.includes(term))) { score += 4; termMatched = true; }
        
        if (termMatched) matchedTerms++;
      }

      if (score > 0) {
        // Find related items via graph
        const relatedIds = this.relationships
          .filter(r => r.sourceId === item.id)
          .map(r => r.targetId);
        
        const relatedKnowledge = relatedIds
          .map(id => this.items.get(id))
          .filter((i): i is KnowledgeItem => i !== undefined);

        results.push({
          item,
          relatedKnowledge,
          rationale: `Matched ${matchedTerms} of ${searchTerms.length} keywords in title, summary, or tags.`,
          confidence: Math.min(score / 15, 0.95), // Normalize somewhat
          source: item.source,
          version: item.version
        });
      }
    }

    return results
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }
}
