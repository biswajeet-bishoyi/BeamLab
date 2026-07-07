import { describe, it, expect } from 'vitest';
import { CompliancePipeline } from './CompliancePipeline';
import { ComplianceStatus } from '../models';

describe('CompliancePipeline', () => {
  it('should successfully evaluate rules and detect violations', async () => {
    const pipeline = new CompliancePipeline();
    const result = await pipeline.execute({ standard: 'IS-800:2007', inputs: { P_d: 100, A_e: 10, f_cd: 10 } }, {});
    
    expect(result.status).toBe('success');
    expect(result.data.session.standards.length).toBeGreaterThan(0);
    expect(result.data.session.clauses.length).toBeGreaterThan(0);
    expect(result.data.session.rules.length).toBeGreaterThan(0);
    expect(result.data.session.evaluations.length).toBeGreaterThan(0);
    
    // We mocked the result to be true if inputs have keys, so it should be compliant
    expect(result.data.session.overallStatus).toBe(ComplianceStatus.Compliant);
    expect(result.data.session.violations.length).toBe(0);
    expect(result.data.session.review.approvalRecommendation).toBe('Approved');
  });

  it('should detect violations if inputs are missing', async () => {
    const pipeline = new CompliancePipeline();
    // In our mock, if Object.keys(inputs).length === 0, it evaluates to false
    const result = await pipeline.execute({ standard: 'AISC-360-16', inputs: {} }, {});
    
    expect(result.data.session.evaluations[0].result).toBe(false);
    expect(result.data.session.violations.length).toBeGreaterThan(0);
    expect(result.data.session.overallStatus).toBe(ComplianceStatus.NonCompliant);
    expect(result.data.session.review.approvalRecommendation).toBe('Rejected');
  });
});
