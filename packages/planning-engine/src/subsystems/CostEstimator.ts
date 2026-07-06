import { ExecutionPlanData } from '../models/ExecutionPlan';

export class CostEstimator {
  estimate(planData: Partial<ExecutionPlanData>): void {
    const stepCount = planData.orderedSteps?.length || 0;
    
    // Stub heuristics
    planData.estimatedDurationMs = stepCount * 500;
    planData.estimatedComputeCost = stepCount * 0.001;
    planData.estimatedTokenCost = stepCount * 150;
  }
}
