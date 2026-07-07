export interface RuleEvaluation {
  id: string;
  ruleId: string;
  inputs: Record<string, any>;
  result: boolean;
  evidenceId: string;
}
