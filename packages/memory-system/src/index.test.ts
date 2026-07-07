import { describe, it, expect } from 'vitest';
import { MemoryRegistry } from './core/MemoryRegistry';
import { InMemoryProvider } from './providers/InMemoryProvider';

describe('MemorySystem', () => {
  it('should register and retrieve a provider', () => {
    const registry = new MemoryRegistry();
    const provider = new InMemoryProvider();
    
    registry.registerProvider('session', 'agent-1', provider);
    const retrieved = registry.getProvider('session', 'agent-1');
    
    expect(retrieved).toBe(provider);
  });
});
