import { ActionRequest, PolicyDecision } from '../core/PolicyModel';
import { PolicyResolver } from '../evaluator/PolicyResolver';
import { PolicyEvaluator } from '../evaluator/PolicyEvaluator';
import { IPolicyProvider } from '../providers/IPolicyProvider';
import { PolicyCache } from '../cache/PolicyCache';

export class PolicyEngine {
  private providers: IPolicyProvider[] = [];
  private resolver!: PolicyResolver;
  private evaluator: PolicyEvaluator;
  private cache: PolicyCache;

  constructor(cache?: PolicyCache) {
    this.evaluator = new PolicyEvaluator();
    this.cache = cache || new PolicyCache();
  }

  public registerProvider(provider: IPolicyProvider) {
    this.providers.push(provider);
    this.resolver = new PolicyResolver(this.providers);
  }

  public async evaluate(request: ActionRequest): Promise<PolicyDecision> {
    if (!this.resolver) {
      throw new Error("No policy providers registered.");
    }

    const cacheKey = this.generateCacheKey(request);
    const cachedDecision = this.cache.get(cacheKey);
    if (cachedDecision) {
      return cachedDecision;
    }

    const resolvedPolicies = await this.resolver.resolve(request);
    const decision = this.evaluator.evaluate(request, resolvedPolicies);
    
    this.cache.set(cacheKey, decision);
    
    return decision;
  }
  
  private generateCacheKey(request: ActionRequest): string {
    return `${request.action}:${request.resource.type}:${request.resource.id || 'any'}:${request.context.user}`;
  }
  
  public clearCache() {
    this.cache.clear();
  }
}
