export interface IDesignStrategy {
  id: string;
  name: string;
  description: string;
  applicableMaterials: string[];
}

export class DesignStrategyRegistry {
  private strategies: Map<string, IDesignStrategy> = new Map();

  constructor() {
    this.registerDefaults();
  }

  public register(strategy: IDesignStrategy): void {
    if (this.strategies.has(strategy.id)) {
      console.warn(`[DesignStrategyRegistry] Overwriting strategy ${strategy.id}`);
    }
    this.strategies.set(strategy.id, strategy);
  }

  public getStrategy(id: string): IDesignStrategy | undefined {
    return this.strategies.get(id);
  }

  public getAll(): IDesignStrategy[] {
    return Array.from(this.strategies.values());
  }

  private registerDefaults(): void {
    this.register({
      id: 'steel-design',
      name: 'Steel Design',
      description: 'Standard hot-rolled and cold-formed steel structural design.',
      applicableMaterials: ['Steel']
    });
    this.register({
      id: 'rc-design',
      name: 'Reinforced Concrete',
      description: 'Cast-in-place and precast reinforced concrete design.',
      applicableMaterials: ['Concrete', 'Rebar']
    });
    this.register({
      id: 'composite-structures',
      name: 'Composite Structures',
      description: 'Steel-concrete composite floors and columns.',
      applicableMaterials: ['Steel', 'Concrete']
    });
    this.register({
      id: 'timber-design',
      name: 'Timber',
      description: 'Glulam, CLT, and traditional timber design.',
      applicableMaterials: ['Timber']
    });
  }
}
