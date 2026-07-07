import { ReasoningRegistry, EngineeringInsight } from './ReasoningRegistry';

export interface ReasoningSummary {
  insights: EngineeringInsight[];
  executionTimeMs: number;
}

export class EngineeringReasoner {
  constructor(private registry: ReasoningRegistry) {}

  public async reason(interpretedResults: any): Promise<ReasoningSummary> {
    const start = Date.now();
    const rules = this.registry.getAllRules();
    const allInsights: EngineeringInsight[] = [];

    for (const rule of rules) {
      try {
        const insights = await rule.analyze(interpretedResults);
        allInsights.push(...insights);
      } catch (err: any) {
        console.error(`[EngineeringReasoner] Rule ${rule.id} failed:`, err);
      }
    }

    return {
      insights: allInsights,
      executionTimeMs: Date.now() - start
    };
  }
}
