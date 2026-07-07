import { Clause, RuleModel } from '../models';

export interface IClauseInterpreter {
  interpret(clause: Clause): RuleModel[];
}

export class ClauseInterpreter implements IClauseInterpreter {
  public interpret(clause: Clause): RuleModel[] {
    // In a real system, this could use an LLM or a predefined dictionary
    // to map clauses to machine-readable rules.
    const rules: RuleModel[] = [];

    if (clause.id === 'cl-8.2.1.2') {
      rules.push({
        id: `rule-${clause.id}-1`,
        clauseId: clause.id,
        type: 'Mandatory',
        description: 'Compressive strength check',
        parameters: ['P_d', 'A_e', 'f_cd'],
        condition: 'P_d == A_e * f_cd',
        severity: clause.severity
      });
    } else if (clause.id === 'cl-E3') {
      rules.push({
        id: `rule-${clause.id}-1`,
        clauseId: clause.id,
        type: 'Mandatory',
        description: 'Flexural buckling check',
        parameters: ['Pn', 'Fcr', 'Ag'],
        condition: 'Pn == Fcr * Ag',
        severity: clause.severity
      });
    } else {
      // Generic fallback
      rules.push({
        id: `rule-${clause.id}-generic`,
        clauseId: clause.id,
        type: 'Informational',
        description: 'Generic compliance rule',
        parameters: [],
        condition: 'true',
        severity: clause.severity
      });
    }

    return rules;
  }
}
