import { describe, it, expect } from 'vitest';
import { registry } from './index';

describe('Tool Registry', () => {
  it('is defined', () => {
    expect(registry).toBeDefined();
  });

  it('has 10 core tools registered', () => {
    expect(registry.getAll().length).toBeGreaterThanOrEqual(10);
  });
});
