import { describe, it, expect } from 'vitest';
import { IdSchema } from './index';

describe('Validation', () => {
  it('IdSchema parses valid UUIDs', () => {
    expect(() => IdSchema.parse('123e4567-e89b-12d3-a456-426614174000')).not.toThrow();
  });
});
