import { ExecutionPlanData } from '../models/ExecutionPlan';

export class PlanExplainer {
  explain(planData: Partial<ExecutionPlanData>): string {
    let explanation = `Execution Plan Strategy: ${planData.strategy}\n`;
    explanation += `Intent: ${planData.userIntent}\n\n`;

    planData.orderedSteps?.forEach((step, idx) => {
      explanation += `Step ${idx + 1}: ${step.action}\n`;
      explanation += `  Explanation: ${step.explanation}\n`;
    });

    if (planData.requiredApprovals && planData.requiredApprovals.length > 0) {
      explanation += `\nApprovals Required:\n`;
      planData.requiredApprovals.forEach(a => {
        explanation += `- [${a.priority.toUpperCase()}] ${a.type}: ${a.reason}\n`;
      });
    }

    return explanation;
  }
}
