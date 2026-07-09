import { describe, it, expect } from 'vitest';
import { LoadingSystem } from './LoadingSystem';
import { PointLoad, DistributedLoad, TemperatureLoad, SettlementLoad, PretensionLoad, PressureLoad } from './StructuralLoad';
import { LoadAssignment } from './LoadAssignment';
import { LoadPattern, LoadGroup } from './LoadPattern';
import { LoadCase } from './LoadCase';
import { LoadCombination } from './LoadCombination';
import { LoadEnvelope } from './LoadEnvelope';
import { DuplicateLoadAssignmentRule, CombinationMissingCaseRule, CircularCombinationReferenceRule, EnvelopeSourceExistenceRule, CaseMissingPatternRule } from './LoadValidationRules';
import { ValidationContext } from '../validation/ValidationEngine';

describe('LoadingSystem', () => {
  it('should correctly configure a complete loading system using the builder API', () => {
    const sys = new LoadingSystem('sys-01', 'Structural Loading', 'proj-01');

    // 1. Create Loads
    const p1 = sys.addPointLoad('pl-01', 'Roof Live Point', { fy: -15.0 });
    const d1 = sys.addDistributedLoad('dl-01', 'Floor Dead UDL', -5.0, -5.0, 'Fy');
    const temp1 = sys.addTemperatureLoad('temp-01', 'Thermal expansion', 35, 10);
    const set1 = sys.addSettlementLoad('set-01', 'Support settlement', 0, -0.02, 0);
    const pret1 = sys.addPretensionLoad('pret-01', 'Cable pretension', 100);
    const pres1 = sys.addPressureLoad('pres-01', 'Wind pressure', 1.2);

    expect(p1.vector.fy).toBe(-15.0);
    expect(d1.magnitudeStart).toBe(-5.0);
    expect(temp1.uniformDeltaT).toBe(35);
    expect(set1.dy).toBe(-0.02);
    expect(pret1.pretensionForce).toBe(100);
    expect(pres1.pressure).toBe(1.2);

    // 2. Create Patterns
    const deadPattern = sys.addPattern('pat-dead', 'Dead Load Pattern', 'Dead', true, 1.0);
    const livePattern = sys.addPattern('pat-live', 'Live Load Pattern', 'Live');

    // 3. Groups
    const gravityGroup = sys.addGroup('grp-gravity', 'Gravity Loads Group', 'Gravity');
    gravityGroup.addPattern('pat-dead');
    gravityGroup.addPattern('pat-live');
    expect(gravityGroup.patternIds).toContain('pat-dead');

    // 4. Assignments
    sys.assignLoad('asg-01', 'Dead assignment on member 1', 'dl-01', 'Member', 'm1', 'pat-dead');
    sys.assignLoad('asg-02', 'Live assignment on node 2', 'pl-01', 'Node', 'n2', 'pat-live');

    expect(deadPattern.assignmentIds).toContain('asg-01');
    expect(livePattern.assignmentIds).toContain('asg-02');

    // 5. Cases
    const caseDead = sys.addCase('case-dead', 'Dead Case', 'LinearStatic');
    caseDead.addPattern('pat-dead', 1.0);

    const caseLive = sys.addCase('case-live', 'Live Case', 'LinearStatic');
    caseLive.addPattern('pat-live', 1.0);

    expect(caseDead.patternRefs[0].patternId).toBe('pat-dead');

    // 6. Combinations
    const comboULS = sys.addCombination('combo-uls', '1.2D + 1.6L', 'ULS', 'AISC-LRFD');
    comboULS.addCase('case-dead', 1.2);
    comboULS.addCase('case-live', 1.6);

    expect(comboULS.caseRefs).toHaveLength(2);
    expect(comboULS.caseRefs[0].factor).toBe(1.2);

    // 7. Envelopes
    const envelope = sys.addEnvelope('env-01', 'Design Envelope', ['combo-uls'], 'Maximum');
    expect(envelope.sourceIds).toContain('combo-uls');

    // Check system summary
    const sum = sys.summary();
    expect(sum.loads).toBe(6);
    expect(sum.assignments).toBe(2);
    expect(sum.patterns).toBe(2);
    expect(sum.groups).toBe(1);
    expect(sum.cases).toBe(2);
    expect(sum.combinations).toBe(1);
    expect(sum.envelopes).toBe(1);

    // Self-validation
    const res = sys.validate();
    expect(res.isValid).toBe(true);
  });
});

describe('Loading Domain Validation Rules', () => {
  it('DuplicateLoadAssignmentRule should catch duplicates', () => {
    const asg1 = new LoadAssignment('asg-1', 'A1', 'load-a', 'Member', 'm1', 'pat-1');
    const asg2 = new LoadAssignment('asg-2', 'A2', 'load-a', 'Member', 'm1', 'pat-1'); // Duplicate

    const rule = new DuplicateLoadAssignmentRule();
    const context: ValidationContext = {
      resolve: () => undefined,
      resolveAll: () => [asg1, asg2],
    };

    const diags = rule.evaluate(asg1, context);
    expect(diags).toHaveLength(1);
    expect(diags[0].code).toBe('LDM-XREF-A001');
  });

  it('CombinationMissingCaseRule should catch missing references', () => {
    const combo = new LoadCombination('combo-1', 'C1', [{ caseId: 'non-existent', factor: 1.2 }]);
    const rule = new CombinationMissingCaseRule();
    const context: ValidationContext = {
      resolve: () => undefined,
    };

    const diags = rule.evaluate(combo, context);
    expect(diags).toHaveLength(1);
    expect(diags[0].code).toBe('LDM-XREF-C001');
  });

  it('CircularCombinationReferenceRule should catch circularity', () => {
    const c1 = new LoadCombination('c1', 'C1', [{ caseId: 'c2', factor: 1.0 }], 'ULS', 'Custom', true);
    const c2 = new LoadCombination('c2', 'C2', [{ caseId: 'c1', factor: 1.0 }], 'ULS', 'Custom', true);

    const rule = new CircularCombinationReferenceRule();
    const context: ValidationContext = {
      resolve: (id) => id === 'c1' ? c1 : id === 'c2' ? c2 : undefined,
    };

    const diags = rule.evaluate(c1, context);
    expect(diags).toHaveLength(1);
    expect(diags[0].code).toBe('LDM-XREF-C002');
  });

  it('EnvelopeSourceExistenceRule should catch missing envelope source', () => {
    const env = new LoadEnvelope('env-1', 'E1', ['non-existent-combo']);
    const rule = new EnvelopeSourceExistenceRule();
    const context: ValidationContext = {
      resolve: () => undefined,
    };

    const diags = rule.evaluate(env, context);
    expect(diags).toHaveLength(1);
    expect(diags[0].code).toBe('LDM-XREF-E001');
  });

  it('CaseMissingPatternRule should catch missing patterns', () => {
    const lcase = new LoadCase('case-1', 'LC1', [{ patternId: 'non-existent-pat', scaleFactor: 1.0 }]);
    const rule = new CaseMissingPatternRule();
    const context: ValidationContext = {
      resolve: () => undefined,
    };

    const diags = rule.evaluate(lcase, context);
    expect(diags).toHaveLength(1);
    expect(diags[0].code).toBe('LDM-XREF-LC001');
  });
});
