import { describe, it, expect } from 'vitest';
import { ResourceClient } from './client/ResourceClient';

describe('Resource Client', () => {
  it('should initialize and proxy methods', async () => {
    const client = new ResourceClient();
    await client.initialize();

    const categories = await client.categories();
    expect(categories.length).toBeGreaterThan(0);

    const resource = await client.get('BL-RES-ISMB-300');
    expect(resource?.name).toBe('ISMB 300');
  });
});
