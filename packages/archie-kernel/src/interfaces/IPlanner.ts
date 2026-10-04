import { ExecutionPlan } from '@beamstudio/planning-engine';

export interface IPlanner {
  generatePlan(context: any, request: string): Promise<ExecutionPlan>;
}
