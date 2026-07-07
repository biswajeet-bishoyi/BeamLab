import { ActionRequest, PolicyDecision, Policy, ActionType } from '../core/PolicyModel';
import { ExpressionEvaluator } from './ExpressionEvaluator';
import { policyEventBus } from '../events/PolicyEventBus';

export class PolicyEvaluator {
  private expressionEvaluator: ExpressionEvaluator;

  constructor() {
    this.expressionEvaluator = new ExpressionEvaluator();
  }

  public evaluate(request: ActionRequest, resolvedPolicies: Policy[]): PolicyDecision {
    const startTime = Date.now();
    let finalDecision: ActionType = 'Allow';
    const matchedPolicies: string[] = [];
    const warnings: string[] = [];
    const suggestedAlternatives: string[] = [];
    let explanation = 'Default Allow - No restricting policies matched.';
    let evaluatedRulesCount = 0;

    for (const policy of resolvedPolicies) {
      if (policy.reviewStatus !== 'Active') continue;
      
      evaluatedRulesCount++;
      const isMatch = this.expressionEvaluator.evaluate(policy.conditions, request);

      if (isMatch) {
        matchedPolicies.push(policy.id);
        
        // Update decision if it's more restrictive
        if (this.isMoreRestrictive(policy.actions.type, finalDecision)) {
          finalDecision = policy.actions.type;
          explanation = policy.actions.message || `Policy ${policy.name} enforced ${policy.actions.type}`;
        }

        if (policy.actions.suggestedAlternatives) {
          suggestedAlternatives.push(...policy.actions.suggestedAlternatives);
        }

        if (policy.actions.type === 'AllowWithWarning' && policy.actions.message) {
          warnings.push(policy.actions.message);
        }

        // Fast fail on Deny to prevent unnecessary execution
        if (finalDecision === 'Deny') {
          break;
        }
      }
    }

    const executionTimeMs = Date.now() - startTime;

    const decision: PolicyDecision = {
      decision: finalDecision,
      matchedPolicies,
      explanation,
      evaluatedRules: evaluatedRulesCount,
      executionTimeMs,
      warnings: warnings.length > 0 ? warnings : undefined,
      suggestedAlternatives: suggestedAlternatives.length > 0 ? suggestedAlternatives : undefined
    };

    policyEventBus.emit('PolicyEvaluated', { request, decision });

    return decision;
  }

  private isMoreRestrictive(newDecision: ActionType, currentDecision: ActionType): boolean {
    const restrictiveness: Record<ActionType, number> = {
      'Allow': 0,
      'RecommendAlternative': 1,
      'AllowWithWarning': 2,
      'Defer': 3,
      'RequireApproval': 4,
      'Deny': 5
    };
    return restrictiveness[newDecision] > restrictiveness[currentDecision];
  }
}
