/**
 * Canonical validation result returned by every IEngineeringObject.validate()
 * and by the ValidationEngine.
 */

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationDiagnostic {
  /** Machine-readable rule identifier, e.g. "CEM-001" */
  readonly code: string;
  readonly severity: ValidationSeverity;
  readonly message: string;
  /** The object ID that triggered this diagnostic */
  readonly objectId: string;
  /** Optional field path within the object that is invalid */
  readonly field?: string;
  /** Optional suggested fix */
  readonly suggestion?: string;
}

export class ValidationResult {
  constructor(
    public readonly objectId: string,
    public readonly diagnostics: ValidationDiagnostic[] = [],
  ) {}

  get isValid(): boolean {
    return !this.diagnostics.some(d => d.severity === 'error');
  }

  get errors(): ValidationDiagnostic[] {
    return this.diagnostics.filter(d => d.severity === 'error');
  }

  get warnings(): ValidationDiagnostic[] {
    return this.diagnostics.filter(d => d.severity === 'warning');
  }

  /** Merge another result's diagnostics into this one */
  merge(other: ValidationResult): ValidationResult {
    return new ValidationResult(this.objectId, [
      ...this.diagnostics,
      ...other.diagnostics,
    ]);
  }

  static ok(objectId: string): ValidationResult {
    return new ValidationResult(objectId, []);
  }

  static error(objectId: string, code: string, message: string, field?: string): ValidationResult {
    return new ValidationResult(objectId, [{
      code,
      severity: 'error',
      message,
      objectId,
      field,
    }]);
  }

  static warning(objectId: string, code: string, message: string, field?: string): ValidationResult {
    return new ValidationResult(objectId, [{
      code,
      severity: 'warning',
      message,
      objectId,
      field,
    }]);
  }
}
