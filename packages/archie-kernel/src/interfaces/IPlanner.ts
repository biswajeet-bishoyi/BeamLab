export interface IPlan {
  id: string;
  steps: IPlanStep[];
}

export interface IPlanStep {
  id: string;
  action: string;
  arguments: Record<string, any>;
  dependencies: string[];
}

export interface IPlanner {
  generatePlan(context: any, request: string): Promise<IPlan>;
}
