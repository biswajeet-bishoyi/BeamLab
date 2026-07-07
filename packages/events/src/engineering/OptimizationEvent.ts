import { EngineeringEvent } from './EngineeringEvent';

export enum OptimizationEventType {
  OptimizationRequested = 'OptimizationRequested',
  ObjectivesDefined = 'ObjectivesDefined',
  ConstraintsCollected = 'ConstraintsCollected',
  CandidateGenerated = 'CandidateGenerated',
  CandidateRejected = 'CandidateRejected',
  CandidateAccepted = 'CandidateAccepted',
  AlternativeEvaluated = 'AlternativeEvaluated',
  TradeOffCompleted = 'TradeOffCompleted',
  OptimizationRecommendationGenerated = 'OptimizationRecommendationGenerated',
  OptimizationCompleted = 'OptimizationCompleted',
  OptimizationFailed = 'OptimizationFailed'
}

export interface OptimizationEvent extends EngineeringEvent {
  domain: 'Optimization';
  type: OptimizationEventType;
}

export interface OptimizationRequestedEvent extends OptimizationEvent {
  type: OptimizationEventType.OptimizationRequested;
  payload: {
    sessionId: string;
    requestData: any;
  };
}

export interface OptimizationCompletedEvent extends OptimizationEvent {
  type: OptimizationEventType.OptimizationCompleted;
  payload: {
    sessionId: string;
    recommendedCandidateId: string;
    metrics: Record<string, any>;
  };
}
