import { RuleEvaluation, Violation, RuleModel } from '../models';

export interface IViolationDetector {
  detect(evaluations: RuleEvaluation[], rules: RuleModel[]): Violation[];
}

export class ViolationDetector implements IViolationDetector {
  public detect(evaluations: RuleEvaluation[], rules: RuleModel[]): Violation[] {
    const violations: Violation[] = [];

    for (const evaluation of evaluations) {
      if (!evaluation.result) {
        const rule = rules.find(r => r.id === evaluation.ruleId);
        if (rule) {
          violations.push({
            id: `violation-${Date.now()}-${evaluation.id}`,
            ruleId: rule.id,
            clauseId: rule.clauseId,
            standardId: 'unknown', // Would resolve from Clause
            severity: rule.severity,
            description: `Failed rule: ${rule.description}`,
            evidenceId: evaluation.evidenceId
          });
        }
      }
    }

    return violations;
  }
}
