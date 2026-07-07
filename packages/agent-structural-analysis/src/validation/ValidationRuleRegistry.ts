export interface ValidationIssue {
  ruleId: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  elementIds?: string[];
  explanation: string;
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  validate(model: any): Promise<ValidationIssue[]>;
}

export class ValidationRuleRegistry {
  private rules: Map<string, ValidationRule> = new Map();

  public registerRule(rule: ValidationRule): void {
    if (this.rules.has(rule.id)) {
      console.warn(`[ValidationRuleRegistry] Overwriting rule ${rule.id}`);
    }
    this.rules.set(rule.id, rule);
  }

  public getRule(id: string): ValidationRule | undefined {
    return this.rules.get(id);
  }

  public getAllRules(): ValidationRule[] {
    return Array.from(this.rules.values());
  }
}
