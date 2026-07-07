export interface ReasoningRule {
  id: string;
  name: string;
  description: string;
  condition: (evidence: any) => boolean;
  insight: any;
}

export class ReasoningRegistry {
  private rules: Map<string, ReasoningRule> = new Map();

  public register(rule: ReasoningRule): void {
    this.rules.set(rule.id, rule);
  }

  public getRules(): ReasoningRule[] {
    return Array.from(this.rules.values());
  }
}
