import { describe, it, expect } from 'vitest';
import { ResourceEngine } from './engine/ResourceEngine';
import { StaticProvider } from './providers/StaticProvider';

describe('Resource Engine', () => {
  it('should initialize and register provider', async () => {
    const engine = new ResourceEngine();
    engine.registerProvider(new StaticProvider());

    const categories = await engine.getCategories();
    expect(categories).toContain('SteelSection');
    expect(categories).toContain('ConcreteGrade');
  });
  
  it('should fetch and cache a resource', async () => {
    const engine = new ResourceEngine();
    engine.registerProvider(new StaticProvider());

    const resource1 = await engine.getResource('BL-RES-ISMB-200');
    expect(resource1).toBeDefined();
    expect(resource1?.name).toBe('ISMB 200');

    const stats = engine.getCacheStats();
    expect(stats.misses).toBe(1);

    const resource2 = await engine.getResource('BL-RES-ISMB-200');
    expect(resource2).toBeDefined();

    const stats2 = engine.getCacheStats();
    expect(stats2.hits).toBe(1);
    expect(stats2.hitRate).toBe(0.5);
  });

  it('should search resources by category and tag', async () => {
    const engine = new ResourceEngine();
    engine.registerProvider(new StaticProvider());

    const results = await engine.search({ type: 'SteelSection' });
    expect(results.length).toBe(2);

    const tagResults = await engine.search({ tags: ['Concrete'] });
    expect(tagResults.length).toBe(1);
    expect(tagResults[0].id).toBe('BL-RES-M20');
  });
});
