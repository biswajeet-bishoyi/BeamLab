export interface Violation {
  id: string;
  ruleId: string;
  clauseId: string;
  standardId: string;
  severity: 'Error' | 'Warning' | 'Information' | 'Recommendation';
  description: string;
  evidenceId: string;
}
