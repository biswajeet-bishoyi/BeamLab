import { ComplianceStatus } from './ComplianceStatus';
import { Standard } from './Standard';
import { Clause } from './Clause';
import { RuleModel } from './Rule';
import { RuleEvaluation } from './RuleEvaluation';
import { Violation } from './Violation';
import { EngineeringReview } from './EngineeringReview';
import { ComplianceEvidenceGraph } from './ComplianceEvidenceGraph';

export interface ComplianceSession {
  sessionId: string;
  status: 'started' | 'planning' | 'resolving_standards' | 'interpreting_clauses' | 'evaluating_rules' | 'detecting_violations' | 'reasoning' | 'completed';
  standards: Standard[];
  clauses: Clause[];
  rules: RuleModel[];
  evaluations: RuleEvaluation[];
  violations: Violation[];
  evidenceGraph: ComplianceEvidenceGraph;
  review?: EngineeringReview;
  overallStatus: ComplianceStatus;
}
