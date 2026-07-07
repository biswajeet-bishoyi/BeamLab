import { describe, it, expect } from 'vitest';
import { SolverClient } from '../src/client/SolverClient';

describe('SolverClient', () => {
  it('should initialize successfully', () => {
    const client = new SolverClient(null);
    expect(client).toBeDefined();
  });
});
