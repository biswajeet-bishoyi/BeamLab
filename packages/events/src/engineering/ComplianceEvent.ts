import { EngineeringEvent } from './EngineeringEvent';

export interface ComplianceEvent extends EngineeringEvent {
  category: 'Compliance';
  sessionId: string;
}

export interface ComplianceRequested extends ComplianceEvent {
  type: 'ComplianceRequested';
  payload: {
    modelId: string;
  };
}

export interface StandardResolved extends ComplianceEvent {
  type: 'StandardResolved';
  payload: {
    standardId: string;
    provider: string;
  };
}

export interface ClauseMatched extends ComplianceEvent {
  type: 'ClauseMatched';
  payload: {
    clauseId: string;
    description: string;
  };
}

export interface RuleEvaluated extends ComplianceEvent {
  type: 'RuleEvaluated';
  payload: {
    ruleId: string;
    status: string;
  };
}

export interface ViolationDetected extends ComplianceEvent {
  type: 'ViolationDetected';
  payload: {
    violationId: string;
    severity: string;
  };
}

export interface RecommendationGenerated extends ComplianceEvent {
  type: 'RecommendationGenerated';
  payload: {
    recommendationId: string;
  };
}

export interface ComplianceCompleted extends ComplianceEvent {
  type: 'ComplianceCompleted';
  payload: {
    status: string;
    violationsCount: number;
  };
}

export interface ComplianceFailed extends ComplianceEvent {
  type: 'ComplianceFailed';
  payload: {
    error: string;
  };
}
