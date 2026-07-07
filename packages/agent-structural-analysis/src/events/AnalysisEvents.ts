export enum AnalysisEventType {
  AnalysisRequested = 'AnalysisRequested',
  ValidationCompleted = 'ValidationCompleted',
  PlanningCompleted = 'PlanningCompleted',
  StrategySelected = 'StrategySelected',
  SolverRequested = 'SolverRequested',
  InterpretationCompleted = 'InterpretationCompleted',
  ReasoningCompleted = 'ReasoningCompleted',
  RecommendationGenerated = 'RecommendationGenerated',
  AnalysisCompleted = 'AnalysisCompleted',
  AnalysisFailed = 'AnalysisFailed'
}

export interface AnalysisEvent {
  id: string;
  type: AnalysisEventType;
  timestamp: number;
  payload: any;
  correlationId?: string;
}
