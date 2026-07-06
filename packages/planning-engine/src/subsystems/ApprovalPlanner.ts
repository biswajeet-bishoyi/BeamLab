import { ApprovalRequirement, ConstraintViolation } from '../models/ExecutionPlan';

export class ApprovalPlanner {
  determineApprovals(tools: string[], constraints: ConstraintViolation[]): ApprovalRequirement[] {
    const approvals: ApprovalRequirement[] = [];

    // Requires approval if destructive tools are used
    if (tools.some(t => t.includes('delete') || t.includes('modify'))) {
      approvals.push({
        id: `app_${Date.now()}`,
        type: 'Human-in-the-Loop',
        priority: 'high',
        reason: 'Plan contains destructive or modifying actions.'
      });
    }

    // Requires approval if warnings exist
    if (constraints.some(c => c.severity === 'warning')) {
      approvals.push({
        id: `app_${Date.now()}_warn`,
        type: 'Warning Override',
        priority: 'medium',
        reason: 'Execution Plan violates minor engineering constraints.'
      });
    }

    return approvals;
  }
}
