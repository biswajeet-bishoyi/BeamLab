import { ComplianceSession } from '../models';

export interface IComplianceNarrativeBuilder {
  build(session: ComplianceSession): any;
}

export class ComplianceNarrativeBuilder implements IComplianceNarrativeBuilder {
  public build(session: ComplianceSession): any {
    const summary = session.review
      ? `Engineering review resulted in: ${session.review.approvalRecommendation}. Identified ${session.violations.length} violations.`
      : 'Engineering review completed with no findings.';

    return {
      title: 'Engineering Code Compliance Review',
      summary,
      status: session.overallStatus,
      standards: session.standards.map(s => s.id)
    };
  }
}
