import { Policy, ActionRequest } from '../core/PolicyModel';
import { IPolicyProvider } from '../providers/IPolicyProvider';

export class PolicyResolver {
  private providers: IPolicyProvider[];

  constructor(providers: IPolicyProvider[]) {
    this.providers = providers;
  }

  public async resolve(request: ActionRequest): Promise<Policy[]> {
    const policies: Policy[] = [];
    
    // Aggregate from all providers
    for (const provider of this.providers) {
      const providerPolicies = await provider.getPolicies();
      policies.push(...providerPolicies);
    }
    
    // Sort by priority descending
    return policies.sort((a, b) => b.priority - a.priority);
  }
}
