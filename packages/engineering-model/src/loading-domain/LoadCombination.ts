import { BaseEngineeringObject, EngineeringObjectType } from '../core/IEngineeringObject';
import { ValidationResult } from '../validation/ValidationResult';
import { CombinationType, CombinationStandard } from './LoadTypes';

// ─── Case-Factor reference ───────────────────────────────────────────────────

export interface CaseCombinationReference {
  /** ID of the load case or sub-combination */
  caseId: string;
  /** Scale factor applied to this case */
  factor: number;
}

// ─── Load Combination ─────────────────────────────────────────────────────────

/**
 * Canonical B1.3 Load Combination.
 *
 * Represents an engineering design combination.
 * References multiple load cases (and potentially other combinations)
 * with design factors.
 */
export class LoadCombination extends BaseEngineeringObject {
  readonly objectType: EngineeringObjectType = 'LoadCombination';

  combinationType: CombinationType;
  standard: CombinationStandard;
  caseRefs: CaseCombinationReference[];

  /**
   * If true, this combination references other combinations
   * (nested combinations).
   */
  isNested: boolean;

  constructor(
    id: string,
    name: string,
    caseRefs: CaseCombinationReference[] = [],
    combinationType: CombinationType = 'ULS',
    standard: CombinationStandard = 'Custom',
    isNested = false,
  ) {
    super(id, name);
    this.caseRefs = caseRefs;
    this.combinationType = combinationType;
    this.standard = standard;
    this.isNested = isNested;
    this.relationships.dependencyIds = caseRefs.map(r => r.caseId);
  }

  addCase(caseId: string, factor = 1.0): void {
    this.caseRefs.push({ caseId, factor });
    if (!this.relationships.dependencyIds.includes(caseId)) {
      this.relationships.dependencyIds.push(caseId);
    }
  }

  validate(): ValidationResult {
    const diags = [];
    if (this.caseRefs.length === 0) {
      diags.push({
        code: 'LDM-COMBO001',
        severity: 'error' as const,
        message: 'Load combination must reference at least one load case or combination.',
        objectId: this.identity.id,
      });
    }

    const hasExtremelyHighFactor = this.caseRefs.some(r => Math.abs(r.factor) > 10.0);
    if (hasExtremelyHighFactor) {
      diags.push({
        code: 'LDM-COMBO002',
        severity: 'warning' as const,
        message: 'Load combination has a scale factor greater than 10.0. Please verify mechanical validity.',
        objectId: this.identity.id,
        field: 'caseRefs',
      });
    }

    return new ValidationResult(this.identity.id, diags);
  }
}

// ─── Combination Registry ─────────────────────────────────────────────────────

export class CombinationRegistry {
  private readonly _combinations: Map<string, LoadCombination> = new Map();

  public register(combo: LoadCombination): void {
    this._combinations.set(combo.identity.id, combo);
  }

  public get(id: string): LoadCombination | undefined {
    return this._combinations.get(id);
  }

  public getByType(type: CombinationType): LoadCombination[] {
    return Array.from(this._combinations.values()).filter(c => c.combinationType === type);
  }

  public getByStandard(standard: CombinationStandard): LoadCombination[] {
    return Array.from(this._combinations.values()).filter(c => c.standard === standard);
  }

  public all(): LoadCombination[] {
    return Array.from(this._combinations.values());
  }

  public remove(id: string): void {
    this._combinations.delete(id);
  }
}
