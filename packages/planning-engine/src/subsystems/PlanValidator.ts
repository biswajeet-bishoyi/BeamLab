import { ExecutionPlanData } from '../models/ExecutionPlan';

export class PlanValidator {
  validate(planData: Partial<ExecutionPlanData>): boolean {
    if (!planData.orderedSteps || planData.orderedSteps.length === 0) {
      throw new Error('Execution Plan must contain at least one step.');
    }

    if (planData.constraints?.some(c => c.severity === 'fatal')) {
      throw new Error('Execution Plan contains fatal constraint violations and cannot be executed.');
    }

    return true;
  }
}
