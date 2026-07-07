export interface AnalysisStrategy {
  id: string;
  name: string;
  description: string;
  requiredInputs: string[];
  supportedBySolvers: string[];
}

export class AnalysisStrategyRegistry {
  private strategies: Map<string, AnalysisStrategy> = new Map();

  constructor() {
    this.registerDefaultStrategies();
  }

  private registerDefaultStrategies() {
    this.registerStrategy({
      id: 'linear-static',
      name: 'Linear Static Analysis',
      description: 'First order linear elastic analysis.',
      requiredInputs: ['geometry', 'materials', 'sections', 'loads', 'supports'],
      supportedBySolvers: ['mock-solver-01']
    });

    this.registerStrategy({
      id: 'nonlinear-static',
      name: 'Nonlinear Static Analysis',
      description: 'Geometric or material nonlinearity.',
      requiredInputs: ['geometry', 'nonlinear-materials', 'sections', 'loads', 'supports'],
      supportedBySolvers: []
    });

    this.registerStrategy({
      id: 'modal',
      name: 'Modal Analysis',
      description: 'Determines natural frequencies and mode shapes.',
      requiredInputs: ['geometry', 'materials', 'sections', 'masses', 'supports'],
      supportedBySolvers: ['mock-solver-01']
    });
  }

  public registerStrategy(strategy: AnalysisStrategy): void {
    this.strategies.set(strategy.id, strategy);
  }

  public getStrategy(id: string): AnalysisStrategy | undefined {
    return this.strategies.get(id);
  }

  public getAllStrategies(): AnalysisStrategy[] {
    return Array.from(this.strategies.values());
  }
}
