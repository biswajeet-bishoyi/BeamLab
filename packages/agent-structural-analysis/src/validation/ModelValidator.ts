import { ValidationRuleRegistry, ValidationIssue } from './ValidationRuleRegistry';

export interface ValidationSummary {
  isValid: boolean;
  issues: ValidationIssue[];
  executionTimeMs: number;
}

export class ModelValidator {
  constructor(private registry: ValidationRuleRegistry) {}

  public async validateModel(model: any): Promise<ValidationSummary> {
    const start = Date.now();
    const rules = this.registry.getAllRules();
    const allIssues: ValidationIssue[] = [];

    for (const rule of rules) {
      try {
        const issues = await rule.validate(model);
        allIssues.push(...issues);
      } catch (err: any) {
        allIssues.push({
          ruleId: rule.id,
          severity: 'error',
          message: `Rule execution failed: ${err.message}`,
          explanation: 'The validation rule threw an unexpected error.'
        });
      }
    }

    const hasErrors = allIssues.some(issue => issue.severity === 'error');

    return {
      isValid: !hasErrors,
      issues: allIssues,
      executionTimeMs: Date.now() - start
    };
  }
}
