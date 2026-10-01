/**
 * BeamLab B1.4 — Result Validation Rules
 */

import { IValidationRule, ValidationContext } from '../validation/ValidationEngine';
import { ValidationDiagnostic } from '../validation/ValidationResult';
import { IEngineeringObject } from '../core/IEngineeringObject';
import { CanonicalAnalysisResult } from './Results';

/**
 * Rule RES-VAL-CONV001: Completed Results Must Be Converged
 */
export class ResultConvergenceRule implements IValidationRule {
  readonly ruleId = 'RES-VAL-CONV001';
  readonly description = 'Flags analysis results marked Completed that did not converge successfully';

  evaluate(object: IEngineeringObject, _context: ValidationContext): ValidationDiagnostic[] {
    if (!(object instanceof CanonicalAnalysisResult)) return [];
    if (object.status === 'Completed' && !object.convergence.converged) {
      return [{
        code: this.ruleId,
        message: `Result '${object.identity.name}' (${object.identity.id}) is marked Completed but convergence is false: ${object.convergence.terminationReason ?? 'Unknown error'}`,
        severity: 'error',
        objectId: object.identity.id,
      }];
    }
    return [];
  }
}

/**
 * Rule RES-VAL-STA001: Member Station Continuity Rule
 * Verifies station positions are strictly between 0.0 and 1.0 and non-decreasing.
 */
export class StationContinuityRule implements IValidationRule {
  readonly ruleId = 'RES-VAL-STA001';
  readonly description = 'Verifies station positions along members are between 0 and 1 in non-decreasing order';

  evaluate(object: IEngineeringObject, _context: ValidationContext): ValidationDiagnostic[] {
    if (!(object instanceof CanonicalAnalysisResult)) return [];
    const diagnostics: ValidationDiagnostic[] = [];

    for (const [caseId, caseRes] of object.caseResults) {
      for (const [memberId, memberRes] of caseRes.memberResults) {
        const stations = memberRes.forces.stations;
        for (let i = 0; i < stations.length; i++) {
          const current = stations[i];
          if (!current) continue;
          const pos = current.position;
          if (pos < 0.0 || pos > 1.0) {
            diagnostics.push({
              code: this.ruleId,
              message: `Member '${memberId}' in case '${caseId}' has invalid station position ${pos} outside [0.0, 1.0]`,
              severity: 'error',
              objectId: object.identity.id,
            });
            break;
          }
          if (i > 0) {
            const prev = stations[i - 1];
            if (prev && pos < prev.position) {
              diagnostics.push({
                code: this.ruleId,
                message: `Member '${memberId}' in case '${caseId}' has non-monotonic station position at index ${i} (${pos} < ${prev.position})`,
                severity: 'error',
                objectId: object.identity.id,
              });
              break;
            }
          }
        }
      }
    }

    return diagnostics;
  }
}

/**
 * Rule RES-VAL-EQ001: Statics Equilibrium Balance Rule
 * Checks that global equilibrium check (if present) is satisfied.
 */
export class StaticsEquilibriumRule implements IValidationRule {
  readonly ruleId = 'RES-VAL-EQ001';
  readonly description = 'Verifies global forces and moments are in equilibrium with support reactions';

  evaluate(object: IEngineeringObject, _context: ValidationContext): ValidationDiagnostic[] {
    if (!(object instanceof CanonicalAnalysisResult)) return [];
    const diagnostics: ValidationDiagnostic[] = [];

    for (const [caseId, caseRes] of object.caseResults) {
      if (caseRes.equilibrium && !caseRes.equilibrium.isEquilibriumSatisfied) {
        diagnostics.push({
          code: this.ruleId,
          message: `Case '${caseId}' failed equilibrium check with relative error ${caseRes.equilibrium.relativeErrorPercent.toFixed(2)}%`,
          severity: 'warning',
          objectId: object.identity.id,
        });
      }
    }

    return diagnostics;
  }
}
