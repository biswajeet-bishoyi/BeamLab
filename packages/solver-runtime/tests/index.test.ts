import { describe, it, expect } from 'vitest';
import { SolverRuntime } from '../src/runtime/SolverRuntime';

describe('SolverRuntime', () => {
  it('should initialize successfully', async () => {
    const runtime = new SolverRuntime();
    await runtime.initialize();
    expect(runtime.registry.getAvailableSolvers().length).toBeGreaterThan(0);
  });
});
