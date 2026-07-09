import { BaseEngineeringObject, EngineeringObjectType } from '../core/IEngineeringObject';
import { ValidationResult } from '../validation/ValidationResult';
import { AnalysisType } from './LoadTypes';

// ─── Pattern-Case reference ───────────────────────────────────────────────────

export interface PatternCaseReference {
  /** ID of the load pattern */
  patternId: string;
  /** Scale factor applied to the pattern in this case */
  scaleFactor: number;
}

// ─── Load Case ────────────────────────────────────────────────────────────────

/**
 * Canonical B1.3 Load Case.
 *
 * Represents a single engineering analysis case.
 * References one or more patterns with scale factors.
 * The analysis type controls which solver algorithm is invoked.
 */
export class LoadCase extends BaseEngineeringObject {
  readonly objectType: EngineeringObjectType = 'LoadCase';

  analysisType: AnalysisType;
  patternRefs: PatternCaseReference[];

  /** For dynamic analysis: reference to a modal load case ID */
  modalCaseDependencyId?: string;
  /** For response spectrum: spectrum function ID */
  spectrumFunctionId?: string;
  /** Nonlinear iteration parameters (future solver hook) */
  nonlinearParams?: Record<string, number>;

  /** True if self-weight should be considered (overrides pattern setting) */
  includeGravity: boolean;

  constructor(
    id: string,
    name: string,
    patternRefs: PatternCaseReference[] = [],
    analysisType: AnalysisType = 'LinearStatic',
    includeGravity = true,
  ) {
    super(id, name);
    this.patternRefs = patternRefs;
    this.analysisType = analysisType;
    this.includeGravity = includeGravity;
    this.relationships.dependencyIds = patternRefs.map(r => r.patternId);
  }

  addPattern(patternId: string, scaleFactor = 1.0): void {
    this.patternRefs.push({ patternId, scaleFactor });
    if (!this.relationships.dependencyIds.includes(patternId)) {
      this.relationships.dependencyIds.push(patternId);
    }
  }

  validate(): ValidationResult {
    const diags = [];
    if (this.patternRefs.length === 0) {
      diags.push({ code: 'LDM-CASE001', severity: 'warning' as const, message: 'Load case has no patterns — it will produce zero results.', objectId: this.identity.id });
    }
    const zeroFactor = this.patternRefs.some(r => r.scaleFactor === 0);
    if (zeroFactor) {
      diags.push({ code: 'LDM-CASE002', severity: 'warning' as const, message: 'One or more pattern scale factors are zero — those patterns have no effect.', objectId: this.identity.id, field: 'patternRefs' });
    }
    const needsModal = ['ResponseSpectrum', 'TimeHistory'].includes(this.analysisType);
    if (needsModal && !this.modalCaseDependencyId) {
      diags.push({ code: 'LDM-CASE003', severity: 'warning' as const, message: `Analysis type "${this.analysisType}" typically requires a modal case dependency.`, objectId: this.identity.id, field: 'modalCaseDependencyId' });
    }
    return new ValidationResult(this.identity.id, diags);
  }
}

// ─── Case Registry ────────────────────────────────────────────────────────────

export class CaseRegistry {
  private readonly _cases: Map<string, LoadCase> = new Map();

  public register(loadCase: LoadCase): void {
    this._cases.set(loadCase.identity.id, loadCase);
  }

  public get(id: string): LoadCase | undefined {
    return this._cases.get(id);
  }

  public getByType(type: AnalysisType): LoadCase[] {
    return Array.from(this._cases.values()).filter(c => c.analysisType === type);
  }

  public all(): LoadCase[] {
    return Array.from(this._cases.values());
  }
}
