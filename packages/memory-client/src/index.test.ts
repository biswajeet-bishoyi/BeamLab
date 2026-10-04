import { describe, it, expect } from 'vitest';
import { MemoryClient } from './MemoryClient';
import { MemoryManager } from '@beamstudio/memory-system';

describe('MemoryClient', () => {
  it('should be instantiable', () => {
    const manager = new MemoryManager();
    const client = new MemoryClient(manager);
    expect(client).toBeDefined();
  });
});
