export interface OptimizationObjective {
  id: string;
  name: string;
  description: string;
  weight: number;
}

export interface OptimizationConstraint {
  id: string;
  type: string;
  description: string;
  isSatisfied: boolean;
}

export interface OptimizationCandidate {
  id: string;
  description: string;
  modelChanges: any;
  status: 'generated' | 'evaluated' | 'rejected' | 'accepted';
}

export interface TradeOffModel {
  id: string;
  candidates: string[];
  metrics: Record<string, any>;
  explanation: string;
}

export interface OptimizationEvidence {
  objectiveId: string;
  constraintId?: string;
  evidence: string;
  reasoning: string;
  tradeOffId?: string;
  recommendationId?: string;
}

export interface OptimizationRecommendation {
  id: string;
  candidateId: string;
  action: string;
  reasoning: string;
}

export interface OptimizationSession {
  sessionId: string;
  status: 'started' | 'planning' | 'generating' | 'evaluating' | 'completed' | 'failed';
  objectives: OptimizationObjective[];
  constraints: OptimizationConstraint[];
  candidates: OptimizationCandidate[];
  tradeOffs: TradeOffModel[];
  recommendations: OptimizationRecommendation[];
  selectedSolutionId?: string;
  metrics: Record<string, any>;
}
