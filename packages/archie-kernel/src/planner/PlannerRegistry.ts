import { IPlanner } from '../interfaces/IPlanner';

export class PlannerRegistry {
  private planners: Map<string, IPlanner> = new Map();
  private defaultPlanner: string | null = null;

  registerPlanner(name: string, planner: IPlanner, isDefault: boolean = false): void {
    this.planners.set(name, planner);
    if (isDefault || !this.defaultPlanner) {
      this.defaultPlanner = name;
    }
  }

  getPlanner(name?: string): IPlanner | undefined {
    const target = name || this.defaultPlanner;
    if (!target) return undefined;
    return this.planners.get(target);
  }
}
