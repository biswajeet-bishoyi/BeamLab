import { IConfidenceContributor } from './ConfidenceContributors';
import { IAggregationStrategy, ConfidenceResult } from './IAggregationStrategy';
import { WeightedAverageAggregationStrategy } from './WeightedAverageAggregationStrategy';

export class ConfidenceEngine {
  private contributors: IConfidenceContributor[] = [];
  private strategy: IAggregationStrategy;

  constructor(strategy?: IAggregationStrategy) {
    this.strategy = strategy || new WeightedAverageAggregationStrategy();
  }

  public registerContributor(contributor: IConfidenceContributor): void {
    this.contributors.push(contributor);
  }

  public setStrategy(strategy: IAggregationStrategy): void {
    this.strategy = strategy;
  }

  public async evaluate(context: any, evidence: any): Promise<ConfidenceResult> {
    const results = await Promise.all(
      this.contributors.map(async (c) => {
        const { score, explanation } = await c.evaluate(context, evidence);
        return { id: c.id, name: c.name, score, explanation };
      })
    );

    return this.strategy.aggregate(results);
  }
}
