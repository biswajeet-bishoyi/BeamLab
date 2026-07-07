import { describe, it, expect } from 'vitest';
import { KnowledgeClient } from './client/KnowledgeClient';

describe('Knowledge Client', () => {
  it('should initialize successfully', async () => {
    const client = new KnowledgeClient();
    await client.initialize();
    
    const results = await client.search({ query: 'Beam' });
    expect(results).toBeDefined();
  });
});
