export interface EngineeringInsight {
  id: string;
  category: 'behavior' | 'cause' | 'optimization' | 'risk';
  description: string;
  confidence: number;
  relatedElements?: string[];
}

export interface ReasoningRule {
  id: string;
  name: string;
  analyze(interpretedResults: any): Promise<EngineeringInsight[]>;
}

export class ReasoningRegistry {
  private rules: Map<string, ReasoningRule> = new Map();

  public registerRule(rule: ReasoningRule): void {
    this.rules.set(rule.id, rule);
  }

  public getRule(id: string): ReasoningRule | undefined {
    return this.rules.get(id);
  }

  public getAllRules(): ReasoningRule[] {
    return Array.from(this.rules.values());
  }
}
