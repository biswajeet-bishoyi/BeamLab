import { RecommendationMetadata } from '../models';

export class EngineeringBlackboard {
  private memory: Map<string, any> = new Map();
  private recommendations: Map<string, RecommendationMetadata> = new Map();

  public publish(key: string, data: any): void {
    this.memory.set(key, data);
  }

  public read(key: string): any | undefined {
    return this.memory.get(key);
  }

  public publishRecommendation(rec: RecommendationMetadata): void {
    this.recommendations.set(rec.id, rec);
  }

  public getRecommendations(): RecommendationMetadata[] {
    return Array.from(this.recommendations.values());
  }

  public clear(): void {
    this.memory.clear();
    this.recommendations.clear();
  }
}
