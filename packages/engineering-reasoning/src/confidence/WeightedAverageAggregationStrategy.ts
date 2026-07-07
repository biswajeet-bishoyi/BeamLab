import { IAggregationStrategy, ConfidenceResult } from './IAggregationStrategy';

export class WeightedAverageAggregationStrategy implements IAggregationStrategy {
  public id = 'weighted-average';

  constructor(private weights: Record<string, number> = {}) {}

  public aggregate(results: Array<{ id: string; name: string; score: number; explanation: string }>): ConfidenceResult {
    let totalWeight = 0;
    let weightedSum = 0;
    const warnings: string[] = [];

    for (const res of results) {
      const weight = this.weights[res.id] || 1.0;
      totalWeight += weight;
      weightedSum += res.score * weight;
      if (res.score < 0.6) {
        warnings.push(`Low confidence from ${res.name}: ${res.explanation}`);
      }
    }

    const overall = totalWeight > 0 ? weightedSum / totalWeight : 0;
    
    return {
      overall,
      contributors: results,
      explanation: `Aggregated using weighted average. Overall confidence is ${(overall * 100).toFixed(1)}%.`,
      warnings,
      recommendations: warnings.length > 0 ? ['Review low confidence contributors'] : []
    };
  }
}
