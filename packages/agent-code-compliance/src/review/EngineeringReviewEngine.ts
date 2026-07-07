import { Violation, EngineeringReview } from '../models';

export interface IEngineeringReviewEngine {
  generateReview(sessionId: string, violations: Violation[]): EngineeringReview;
}

export class EngineeringReviewEngine implements IEngineeringReviewEngine {
  public generateReview(sessionId: string, violations: Violation[]): EngineeringReview {
    const errorViolations = violations.filter(v => v.severity === 'Error');
    const warningViolations = violations.filter(v => v.severity === 'Warning');

    let approvalRecommendation: EngineeringReview['approvalRecommendation'] = 'Approved';
    const requiredActions: string[] = [];
    const reviewNotes: string[] = [];

    if (errorViolations.length > 0) {
      approvalRecommendation = 'Rejected';
      requiredActions.push(`Resolve ${errorViolations.length} critical non-compliance errors.`);
      reviewNotes.push('The design does not meet mandatory safety criteria.');
    } else if (warningViolations.length > 0) {
      approvalRecommendation = 'Approved with Comments';
      requiredActions.push('Review warnings before proceeding to fabrication.');
      reviewNotes.push('The design meets criteria but has sub-optimal parameters flagged by warnings.');
    } else {
      reviewNotes.push('Design fully complies with evaluated standard clauses.');
    }

    return {
      id: `rev-${Date.now()}`,
      sessionId,
      violations: violations.map(v => v.id),
      reviewNotes,
      requiredActions,
      approvalRecommendation,
    };
  }
}
