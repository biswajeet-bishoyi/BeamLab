import { describe, it, expect } from 'vitest';
import { PolicyClient } from './client/PolicyClient';

describe('Policy Client', () => {
  it('should authorize actions correctly', async () => {
    const client = new PolicyClient();
    await client.initialize();

    const isAuthorized = await client.authorize({
      action: 'GenerateReport',
      resource: { type: 'Report', exists: false },
      context: { user: 'u1', roles: [] }
    });

    expect(isAuthorized).toBe(true);
  });

  it('should detect required approvals', async () => {
    const client = new PolicyClient();
    await client.initialize();

    const requiresApproval = await client.approvalRequired({
      action: 'Delete',
      resource: { type: 'StructuralMember' },
      context: { user: 'u1', roles: [] }
    });

    expect(requiresApproval).toBe(true);
  });
});
