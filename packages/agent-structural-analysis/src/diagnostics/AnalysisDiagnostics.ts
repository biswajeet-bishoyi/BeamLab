export interface AnalysisMetrics {
  validationTimeMs: number;
  planningTimeMs: number;
  reasoningTimeMs: number;
  recommendationCount: number;
  knowledgeQueries: number;
  policyEvaluations: number;
  resourceRequests: number;
  executionDurationMs: number;
  failures: number;
  warnings: number;
}

export class AnalysisDiagnostics {
  private metrics: AnalysisMetrics = {
    validationTimeMs: 0,
    planningTimeMs: 0,
    reasoningTimeMs: 0,
    recommendationCount: 0,
    knowledgeQueries: 0,
    policyEvaluations: 0,
    resourceRequests: 0,
    executionDurationMs: 0,
    failures: 0,
    warnings: 0
  };

  public recordMetric(key: keyof AnalysisMetrics, value: number) {
    this.metrics[key] += value;
  }

  public getMetrics(): AnalysisMetrics {
    return { ...this.metrics };
  }
}
