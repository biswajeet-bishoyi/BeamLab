import { KnowledgeEngine, KeywordRetrievalEngine, StaticProvider } from '@beamlab/knowledge-platform';
import { ClientRetrievalQuery, ClientRetrievalResult } from '../types';

export class KnowledgeClient {
  private engine: KnowledgeEngine;

  constructor(engine?: KnowledgeEngine) {
    if (engine) {
      this.engine = engine;
    } else {
      // Default initialization for development/testing
      const retrievalEngine = new KeywordRetrievalEngine();
      this.engine = new KnowledgeEngine(retrievalEngine);
      this.engine.registerProvider(new StaticProvider());
    }
  }

  async initialize(): Promise<void> {
    await this.engine.initialize();
  }

  async search(query: ClientRetrievalQuery): Promise<ClientRetrievalResult[]> {
    return this.engine.retrieve(query);
  }

  async get(id: string) {
    return this.engine.getItem(id);
  }

  async suggest(partialQuery: string): Promise<string[]> {
    // Stub for auto-suggest
    return [];
  }

  getEngineStats() {
    return this.engine.getCacheStats();
  }
}
