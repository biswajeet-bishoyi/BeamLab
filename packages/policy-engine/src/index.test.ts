import { describe, it, expect } from 'vitest';
import { PolicyEngine } from './engine/PolicyEngine';
import { StaticProvider } from './providers/StaticProvider';

describe('Policy Engine', () => {
  it('should initialize and evaluate policy correctly', async () => {
    const engine = new PolicyEngine();
    engine.registerProvider(new StaticProvider());

    const decision = await engine.evaluate({
      action: 'Delete',
      resource: { type: 'StructuralMember', id: 'b1' },
      context: { user: 'u1', roles: [] }
    });

    expect(decision.decision).toBe('RequireApproval');
    expect(decision.matchedPolicies.length).toBeGreaterThan(0);
  });
  
  it('should allow unknown actions by default', async () => {
    const engine = new PolicyEngine();
    engine.registerProvider(new StaticProvider());

    const decision = await engine.evaluate({
      action: 'View',
      resource: { type: 'Dashboard' },
      context: { user: 'u1', roles: [] }
    });

    expect(decision.decision).toBe('Allow');
  });
});
