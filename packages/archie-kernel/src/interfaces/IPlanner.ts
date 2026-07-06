import { ExecutionPlan } from '@beamlab/planning-engine';

export interface IPlanner {
  generatePlan(context: any, request: string): Promise<ExecutionPlan>;
}
