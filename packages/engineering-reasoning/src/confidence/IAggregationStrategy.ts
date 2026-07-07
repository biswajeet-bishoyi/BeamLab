export interface ConfidenceResult {
  overall: number;
  contributors: Array<{
    id: string;
    name: string;
    score: number;
    explanation: string;
  }>;
  explanation: string;
  warnings: string[];
  recommendations: string[];
}

export interface IAggregationStrategy {
  id: string;
  aggregate(results: Array<{ id: string; name: string; score: number; explanation: string }>): ConfidenceResult;
}
