import { describe, it, expect } from 'vitest';
import { KnowledgeEngine } from './engine/KnowledgeEngine';
import { KeywordRetrievalEngine } from './retrieval/KeywordRetrievalEngine';
import { StaticProvider } from './providers/StaticProvider';

describe('Knowledge Platform', () => {
  it('should initialize and return knowledge', async () => {
    const retrievalEngine = new KeywordRetrievalEngine();
    const engine = new KnowledgeEngine(retrievalEngine);
    const staticProvider = new StaticProvider();
    
    engine.registerProvider(staticProvider);
    await engine.initialize();
    
    const results = await engine.retrieve({ query: 'Steel Design' });
    expect(results.length).toBeGreaterThan(0);
  });
});
