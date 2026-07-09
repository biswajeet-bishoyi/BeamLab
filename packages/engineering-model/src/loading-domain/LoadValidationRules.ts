import { IValidationRule, ValidationContext } from '../validation/ValidationEngine';
import { ValidationDiagnostic } from '../validation/ValidationResult';
import { IEngineeringObject } from '../core/IEngineeringObject';
import { LoadAssignment } from './LoadAssignment';
import { LoadCombination } from './LoadCombination';
import { LoadCase } from './LoadCase';
import { LoadEnvelope } from './LoadEnvelope';

// ─── Duplicate Load Assignment Rule ──────────────────────────────────────────

/**
 * Flags if identical load definitions are assigned to the exact same target
 * within the same load pattern.
 */
export class DuplicateLoadAssignmentRule implements IValidationRule {
  readonly ruleId = 'LDM-XREF-A001';
  readonly description = 'No duplicate load assignments of the same load on the same target within a pattern.';

  evaluate(object: IEngineeringObject, context: ValidationContext): ValidationDiagnostic[] {
    if (object.objectType !== 'NodeLoad') return []; // reuse slot
    // Check if this is a B1.3 LoadAssignment
    if (!(object instanceof LoadAssignment)) return [];
    const assignment = object as LoadAssignment;
    const all = context.resolveAll?.('NodeLoad') as LoadAssignment[] | undefined;
    if (!all) return [];

    const duplicates = all.filter(
      other =>
        other.identity.id !== assignment.identity.id &&
        other.loadId === assignment.loadId &&
        other.targetId === assignment.targetId &&
        other.patternId === assignment.patternId,
    );

    if (duplicates.length > 0) {
      return [{
        code: this.ruleId,
        severity: 'error' as const,
        message: `Load assignment "${assignment.identity.name}" is a duplicate. Same load (${assignment.loadId}) is already assigned to target (${assignment.targetId}) in pattern (${assignment.patternId}).`,
        objectId: assignment.identity.id,
        field: 'targetId',
      }];
    }

    return [];
  }
}

// ─── Missing Load Case Rule ───────────────────────────────────────────────────

export class CombinationMissingCaseRule implements IValidationRule {
  readonly ruleId = 'LDM-XREF-C001';
  readonly description = 'All referenced cases/combinations in a load combination must exist.';

  evaluate(object: IEngineeringObject, context: ValidationContext): ValidationDiagnostic[] {
    if (object.objectType !== 'LoadCombination') return [];
    if (!(object instanceof LoadCombination)) return [];
    const combo = object as LoadCombination;
    const diagnostics: ValidationDiagnostic[] = [];

    for (const ref of combo.caseRefs) {
      const resolved = context.resolve(ref.caseId);
      if (!resolved) {
        diagnostics.push({
          code: this.ruleId,
          severity: 'error' as const,
          message: `Load combination "${combo.identity.name}" references non-existent case or combination "${ref.caseId}".`,
          objectId: combo.identity.id,
          field: 'caseRefs',
        });
      }
    }

    return diagnostics;
  }
}

// ─── Circular Combination Reference Rule ──────────────────────────────────────

export class CircularCombinationReferenceRule implements IValidationRule {
  readonly ruleId = 'LDM-XREF-C002';
  readonly description = 'Combinations must not contain circular dependencies.';

  evaluate(object: IEngineeringObject, context: ValidationContext): ValidationDiagnostic[] {
    if (object.objectType !== 'LoadCombination') return [];
    if (!(object instanceof LoadCombination)) return [];
    const startCombo = object as LoadCombination;

    const visited = new Set<string>();
    const path = new Set<string>();

    const checkCircularity = (id: string): boolean => {
      if (path.has(id)) return true;
      if (visited.has(id)) return false;

      visited.add(id);
      path.add(id);

      const resolved = context.resolve(id);
      if (resolved instanceof LoadCombination) {
        for (const ref of resolved.caseRefs) {
          if (checkCircularity(ref.caseId)) return true;
        }
      }

      path.delete(id);
      return false;
    };

    if (checkCircularity(startCombo.identity.id)) {
      return [{
        code: this.ruleId,
        severity: 'error' as const,
        message: `Load combination "${startCombo.identity.name}" is involved in a circular dependency chain.`,
        objectId: startCombo.identity.id,
      }];
    }

    return [];
  }
}

// ─── Envelope Source Existence Rule ───────────────────────────────────────────

export class EnvelopeSourceExistenceRule implements IValidationRule {
  readonly ruleId = 'LDM-XREF-E001';
  readonly description = 'All sources referenced in a load envelope must exist.';

  evaluate(object: IEngineeringObject, context: ValidationContext): ValidationDiagnostic[] {
    // Envelope uses LoadCombination objectType slot
    if (!(object instanceof LoadEnvelope)) return [];
    const env = object as LoadEnvelope;
    const diagnostics: ValidationDiagnostic[] = [];

    for (const sourceId of env.sourceIds) {
      if (!context.resolve(sourceId)) {
        diagnostics.push({
          code: this.ruleId,
          severity: 'error' as const,
          message: `Load envelope "${env.identity.name}" references non-existent source case/combination "${sourceId}".`,
          objectId: env.identity.id,
          field: 'sourceIds',
        });
      }
    }

    return diagnostics;
  }
}

// ─── Invalid Load Case Pattern References ─────────────────────────────────────

export class CaseMissingPatternRule implements IValidationRule {
  readonly ruleId = 'LDM-XREF-LC001';
  readonly description = 'All patterns referenced in a load case must exist.';

  evaluate(object: IEngineeringObject, context: ValidationContext): ValidationDiagnostic[] {
    if (object.objectType !== 'LoadCase') return [];
    if (!(object instanceof LoadCase)) return [];
    const loadCase = object as LoadCase;
    const diagnostics: ValidationDiagnostic[] = [];

    for (const ref of loadCase.patternRefs) {
      if (!context.resolve(ref.patternId)) {
        diagnostics.push({
          code: this.ruleId,
          severity: 'error' as const,
          message: `Load case "${loadCase.identity.name}" references non-existent pattern "${ref.patternId}".`,
          objectId: loadCase.identity.id,
          field: 'patternRefs',
        });
      }
    }

    return diagnostics;
  }
}

// ─── Bundle: all LDM rules ────────────────────────────────────────────────────

export const LOADING_VALIDATION_RULES: IValidationRule[] = [
  new DuplicateLoadAssignmentRule(),
  new CombinationMissingCaseRule(),
  new CircularCombinationReferenceRule(),
  new EnvelopeSourceExistenceRule(),
  new CaseMissingPatternRule(),
];
