export type RuleType = 'Mandatory' | 'Conditional' | 'Informational' | 'Advisory';

export interface RuleModel {
  id: string;
  clauseId: string;
  type: RuleType;
  description: string;
  parameters: string[];
  condition: string;
  severity: 'Error' | 'Warning' | 'Information';
}
