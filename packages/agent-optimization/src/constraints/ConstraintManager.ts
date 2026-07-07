import { OptimizationConstraint } from '../models';

export interface IConstraintManager {
  addConstraint(constraint: OptimizationConstraint): void;
  getConstraints(): OptimizationConstraint[];
  clear(): void;
  checkAllSatisfied(): boolean;
}

export class ConstraintRegistry implements IConstraintManager {
  private constraints: OptimizationConstraint[] = [];

  public addConstraint(constraint: OptimizationConstraint): void {
    this.constraints.push(constraint);
  }

  public getConstraints(): OptimizationConstraint[] {
    return this.constraints;
  }

  public clear(): void {
    this.constraints = [];
  }

  public checkAllSatisfied(): boolean {
    return this.constraints.every(c => c.isSatisfied);
  }
}

export class ConstraintManager implements IConstraintManager {
  private registry: ConstraintRegistry;

  constructor() {
    this.registry = new ConstraintRegistry();
  }

  public addConstraint(constraint: OptimizationConstraint): void {
    this.registry.addConstraint(constraint);
  }

  public getConstraints(): OptimizationConstraint[] {
    return this.registry.getConstraints();
  }

  public clear(): void {
    this.registry.clear();
  }

  public checkAllSatisfied(): boolean {
    return this.registry.checkAllSatisfied();
  }
}
