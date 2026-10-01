import { IEngineeringObject } from '../core/IEngineeringObject';
import { ValidationResult, ValidationDiagnostic } from '../validation/ValidationResult';

// ─── Rule interface ───────────────────────────────────────────────────────────

export interface IValidationRule {
  readonly ruleId: string;
  readonly description: string;
  evaluate(object: IEngineeringObject, context: ValidationContext): ValidationDiagnostic[];
}

export interface ValidationContext {
  /** Resolve an object by ID for cross-reference checks */
  resolve(id: string): IEngineeringObject | undefined;
  /** Resolve all objects of a given type (for cross-object rules like duplicate checks) */
  resolveAll?(type: string): IEngineeringObject[];
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export class ValidationRegistry {
  private readonly _rules: Map<string, IValidationRule> = new Map();

  public register(rule: IValidationRule): void {
    this._rules.set(rule.ruleId, rule);
  }

  public unregister(ruleId: string): void {
    this._rules.delete(ruleId);
  }

  public all(): IValidationRule[] {
    return Array.from(this._rules.values());
  }
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export class ValidationEngine {
  constructor(private readonly registry: ValidationRegistry) {}

  /** Validate a single object against all registered rules */
  public validate(object: IEngineeringObject, context: ValidationContext): ValidationResult {
    // Start with the object's own self-validation
    const selfResult = object.validate();
    const extraDiagnostics: ValidationDiagnostic[] = [];

    for (const rule of this.registry.all()) {
      const diags = rule.evaluate(object, context);
      extraDiagnostics.push(...diags);
    }

    return new ValidationResult(object.identity.id, [
      ...selfResult.diagnostics,
      ...extraDiagnostics,
    ]);
  }

  /** Validate all objects provided and merge all results */
  public validateAll(
    objects: IEngineeringObject[],
    context: ValidationContext,
  ): ValidationResult[] {
    return objects.map(obj => this.validate(obj, context));
  }
}

// ─── Built-in cross-reference rules ──────────────────────────────────────────

/**
 * Verifies that every object referenced by another object actually exists
 * in the model (resolves to a real entity).
 */
export class OrphanReferenceRule implements IValidationRule {
  readonly ruleId = 'CEM-XREF-001';
  readonly description = 'All referenced IDs must resolve to existing objects.';

  evaluate(object: IEngineeringObject, context: ValidationContext): ValidationDiagnostic[] {
    const diagnostics: ValidationDiagnostic[] = [];
    for (const [role, targetId] of Object.entries(object.relationships.references)) {
      if (!context.resolve(targetId)) {
        diagnostics.push({
          code: this.ruleId,
          severity: 'error',
          message: `Object "${object.identity.name}" references unknown object "${targetId}" via role "${role}".`,
          objectId: object.identity.id,
          field: `relationships.references.${role}`,
        });
      }
    }
    return diagnostics;
  }
}
