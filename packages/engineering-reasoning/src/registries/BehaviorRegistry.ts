export interface BehaviorDefinition {
  id: string;
  name: string;
  category: 'safety' | 'serviceability' | 'stability' | 'efficiency';
  description: string;
}

export class BehaviorRegistry {
  private behaviors: Map<string, BehaviorDefinition> = new Map();

  public register(behavior: BehaviorDefinition): void {
    this.behaviors.set(behavior.id, behavior);
  }

  public getBehavior(id: string): BehaviorDefinition | undefined {
    return this.behaviors.get(id);
  }

  public getAll(): BehaviorDefinition[] {
    return Array.from(this.behaviors.values());
  }
}
