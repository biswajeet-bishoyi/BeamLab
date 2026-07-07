import { IReasoningStrategy } from '../core/IEngineeringReasoner';

export class StrategyRegistry {
  private strategies: Map<string, IReasoningStrategy> = new Map();

  public register(strategy: IReasoningStrategy): void {
    if (this.strategies.has(strategy.id)) {
      console.warn(`[StrategyRegistry] Overwriting strategy ${strategy.id}`);
    }
    this.strategies.set(strategy.id, strategy);
  }

  public getStrategy(id: string): IReasoningStrategy | undefined {
    return this.strategies.get(id);
  }

  public getStrategiesByDomain(domain: string): IReasoningStrategy[] {
    return Array.from(this.strategies.values()).filter(s => s.domain === domain);
  }
}
