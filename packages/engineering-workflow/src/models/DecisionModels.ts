export interface RecommendationMetadata {
  id: string;
  agentId: string;
  objective: string;
  confidence: number;
  evidenceRef: string[];
  engineeringRisk: number; // 0-100
  policyImpact: 'None' | 'Low' | 'Medium' | 'High' | 'Mandatory';
  costImpact: number; // 0-100
  carbonImpact: number; // 0-100
  constructabilityImpact: number; // 0-100
  severity: 'Info' | 'Warning' | 'Critical';
  priority: number;
  justification: string;
  proposedChange: any;
}

export interface DecisionPolicy {
  id: string;
  name: 'Safety First' | 'Cost First' | 'Sustainability First' | 'Balanced' | 'Company Policy' | 'Government Policy' | 'Research Mode';
  weights: {
    safety: number;
    cost: number;
    carbon: number;
    constructability: number;
    confidence: number;
  };
  evaluate(recommendations: RecommendationMetadata[]): DecisionResult;
}

export type DecisionOutcome = 'Accepted' | 'Rejected' | 'Deferred' | 'Requires Human Review';

export interface DecisionResult {
  outcome: DecisionOutcome;
  selectedRecommendationId?: string;
  matrix: DecisionMatrix;
  explanation: string;
}

export interface DecisionMatrixRow {
  recommendationId: string;
  scores: {
    safety: number;
    cost: number;
    carbon: number;
    constructability: number;
    confidence: number;
  };
  totalScore: number;
}

export interface DecisionMatrix {
  rows: DecisionMatrixRow[];
}
