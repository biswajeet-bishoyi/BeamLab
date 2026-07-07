import { OptimizationObjective } from '../models';

export interface IObjectiveManager {
  addObjective(objective: OptimizationObjective): void;
  getObjectives(): OptimizationObjective[];
  clear(): void;
}

export class ObjectiveRegistry implements IObjectiveManager {
  private objectives: OptimizationObjective[] = [];

  public addObjective(objective: OptimizationObjective): void {
    this.objectives.push(objective);
  }

  public getObjectives(): OptimizationObjective[] {
    return this.objectives;
  }

  public clear(): void {
    this.objectives = [];
  }
}

export class ObjectiveManager implements IObjectiveManager {
  private registry: ObjectiveRegistry;

  constructor() {
    this.registry = new ObjectiveRegistry();
  }

  public addObjective(objective: OptimizationObjective): void {
    this.registry.addObjective(objective);
  }

  public getObjectives(): OptimizationObjective[] {
    return this.registry.getObjectives();
  }

  public clear(): void {
    this.registry.clear();
  }
}
