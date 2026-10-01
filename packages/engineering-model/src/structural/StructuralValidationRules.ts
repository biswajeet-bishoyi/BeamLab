import { IValidationRule, ValidationContext } from '../validation/ValidationEngine';
import { ValidationDiagnostic } from '../validation/ValidationResult';
import { IEngineeringObject } from '../core/IEngineeringObject';
import { StructuralNode } from '../structural/StructuralNode';
import { StructuralMember } from '../structural/StructuralMember';
import { StructuralMaterial } from '../structural/StructuralMaterial';
import { StructuralSection } from '../structural/StructuralSection';

// ─── Duplicate Coordinate Rule ────────────────────────────────────────────────

/**
 * Warns when two nodes share identical global coordinates.
 * Cannot be done as a self-validation because it requires context.
 */
export class DuplicateNodeCoordinateRule implements IValidationRule {
  readonly ruleId = 'SDM-XREF-N001';
  readonly description = 'No two nodes should occupy the same global coordinates.';

  evaluate(object: IEngineeringObject, context: ValidationContext): ValidationDiagnostic[] {
    if (object.objectType !== 'Node') return [];
    const node = object as StructuralNode;
    const all = context.resolveAll?.('Node') as StructuralNode[] | undefined;
    if (!all) return [];

    return all
      .filter(other =>
        other.identity.id !== node.identity.id &&
        Math.abs(other.x - node.x) < 1e-9 &&
        Math.abs(other.y - node.y) < 1e-9 &&
        Math.abs(other.z - node.z) < 1e-9,
      )
      .map(() => ({
        code: this.ruleId,
        severity: 'error' as const,
        message: `Node "${node.identity.name}" shares coordinates (${node.x}, ${node.y}, ${node.z}) with another node.`,
        objectId: node.identity.id,
        field: 'globalCoordinates',
      }));
  }
}

// ─── Missing Coordinate System Rule ──────────────────────────────────────────

export class MissingCoordinateSystemRule implements IValidationRule {
  readonly ruleId = 'SDM-XREF-N002';
  readonly description = 'Node must reference an existing coordinate system.';

  evaluate(object: IEngineeringObject, context: ValidationContext): ValidationDiagnostic[] {
    if (object.objectType !== 'Node') return [];
    const node = object as StructuralNode;
    if (!node.coordinateSystemId) return [];

    if (!context.resolve(node.coordinateSystemId)) {
      return [{
        code: this.ruleId,
        severity: 'error',
        message: `Node "${node.identity.name}" references unknown coordinate system "${node.coordinateSystemId}".`,
        objectId: node.identity.id,
        field: 'coordinateSystemId',
      }];
    }
    return [];
  }
}

// ─── Member orphan rule (references existing nodes) ───────────────────────────

export class MemberNodeExistenceRule implements IValidationRule {
  readonly ruleId = 'SDM-XREF-M001';
  readonly description = 'Member start and end nodes must exist in the model.';

  evaluate(object: IEngineeringObject, context: ValidationContext): ValidationDiagnostic[] {
    if (object.objectType !== 'Member') return [];
    const member = object as StructuralMember;
    const diagnostics: ValidationDiagnostic[] = [];

    if (!context.resolve(member.startNodeId)) {
      diagnostics.push({ code: this.ruleId, severity: 'error', message: `Member "${member.identity.name}" references unknown start node "${member.startNodeId}".`, objectId: member.identity.id, field: 'startNodeId' });
    }
    if (!context.resolve(member.endNodeId)) {
      diagnostics.push({ code: this.ruleId, severity: 'error', message: `Member "${member.identity.name}" references unknown end node "${member.endNodeId}".`, objectId: member.identity.id, field: 'endNodeId' });
    }
    return diagnostics;
  }
}

// ─── Material properties positive-check rule ──────────────────────────────────

export class MaterialPropertiesRule implements IValidationRule {
  readonly ruleId = 'SDM-XREF-MAT001';
  readonly description = 'All material mechanical properties must be physically meaningful.';

  evaluate(object: IEngineeringObject, _context: ValidationContext): ValidationDiagnostic[] {
    if (object.objectType !== 'Material') return [];
    // Delegate to the object's own self-validation (it already checks)
    const result = object.validate();
    return result.diagnostics;
  }
}

// ─── Section properties positive-check rule ───────────────────────────────────

export class SectionPropertiesRule implements IValidationRule {
  readonly ruleId = 'SDM-XREF-SEC001';
  readonly description = 'All section geometric properties must be positive.';

  evaluate(object: IEngineeringObject, _context: ValidationContext): ValidationDiagnostic[] {
    if (object.objectType !== 'Section') return [];
    const result = object.validate();
    return result.diagnostics;
  }
}

// ─── Bundle: all SDM rules ────────────────────────────────────────────────────

export const STRUCTURAL_VALIDATION_RULES: IValidationRule[] = [
  new DuplicateNodeCoordinateRule(),
  new MissingCoordinateSystemRule(),
  new MemberNodeExistenceRule(),
  new MaterialPropertiesRule(),
  new SectionPropertiesRule(),
];
