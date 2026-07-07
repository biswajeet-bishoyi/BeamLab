import { IKnowledgeProvider } from '../providers/IKnowledgeProvider';
import { KnowledgeCache } from '../cache/KnowledgeCache';
import { IKnowledgeRetrievalEngine, RetrievalQuery, RetrievalResult } from '../retrieval/IKnowledgeRetrievalEngine';
import { type KnowledgeItem } from '../core/KnowledgeModel';
import { type KnowledgeRelationship } from '../core/KnowledgeRelationship';
import { KnowledgeEventBus, knowledgeEventBus } from '../events/KnowledgeEventBus';

export class KnowledgeEngine {
  private providers: IKnowledgeProvider[] = [];
  private cache: KnowledgeCache;
  private retrievalEngine: IKnowledgeRetrievalEngine;
  private eventBus: KnowledgeEventBus;

  constructor(
    retrievalEngine: IKnowledgeRetrievalEngine,
    cacheSize: number = 1000
  ) {
    this.retrievalEngine = retrievalEngine;
    this.cache = new KnowledgeCache(cacheSize);
    this.eventBus = knowledgeEventBus;
  }

  registerProvider(provider: IKnowledgeProvider) {
    this.providers.push(provider);
  }

  async initialize(): Promise<void> {
    for (const provider of this.providers) {
      await provider.initialize(this.eventBus);
    }
    await this.reindex();
  }

  async reindex(): Promise<void> {
    let allItems: KnowledgeItem[] = [];
    let allRelationships: any[] = [];
    
    for (const provider of this.providers) {
      const items = await provider.getItems();
      allItems = allItems.concat(items);
      const rels = await provider.getRelationships();
      allRelationships = allRelationships.concat(rels);
    }

    // Hacky injection of relationships for KeywordRetrievalEngine
    if ('setRelationships' in this.retrievalEngine) {
      (this.retrievalEngine as any).setRelationships(allRelationships);
    }

    await this.retrievalEngine.index(allItems);
    this.eventBus.emit('KnowledgeIndexed', { count: allItems.length, engine: this.retrievalEngine.name });
  }

  async retrieve(query: RetrievalQuery): Promise<RetrievalResult[]> {
    this.eventBus.emit('KnowledgeRequested', { query });
    const results = await this.retrievalEngine.retrieve(query);
    
    // Cache the hits
    for (const result of results) {
      this.cache.set(result.item);
    }
    
    return results;
  }

  async getItem(id: string): Promise<KnowledgeItem | null> {
    // Check cache first
    const cached = this.cache.get(id);
    if (cached) {
      this.eventBus.emit('KnowledgeCached', { id });
      return cached;
    }

    // Check providers
    for (const provider of this.providers) {
      const item = await provider.getItem(id);
      if (item) {
        this.cache.set(item);
        return item;
      }
    }

    return null;
  }

  getCacheStats() {
    return this.cache.getStats();
  }
}
