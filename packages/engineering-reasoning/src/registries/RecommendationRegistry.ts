export interface RecommendationDefinition {
  id: string;
  category: 'design' | 'analysis' | 'compliance' | 'optimization';
  template: string;
  defaultPriority: 'high' | 'medium' | 'low';
}

export class RecommendationRegistry {
  private recommendations: Map<string, RecommendationDefinition> = new Map();

  public register(recommendation: RecommendationDefinition): void {
    this.recommendations.set(recommendation.id, recommendation);
  }

  public getRecommendation(id: string): RecommendationDefinition | undefined {
    return this.recommendations.get(id);
  }
}
