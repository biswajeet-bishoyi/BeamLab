import { BaseEngineeringObject, EngineeringObjectType } from '../core/IEngineeringObject';
import { ValidationResult } from '../validation/ValidationResult';
import { LoadPatternType, LoadGroupType } from './LoadTypes';

// ─── Load Pattern ──────────────────────────────────────────────────────────────

/**
 * Canonical B1.3 Load Pattern.
 *
 * A named collection of load assignments of a given engineering type.
 * Patterns are combined into Load Cases via scale factors.
 */
export class LoadPattern extends BaseEngineeringObject {
  readonly objectType: EngineeringObjectType = 'LoadPattern';

  patternType: LoadPatternType;

  /**
   * Whether self-weight of structural members is included in this pattern.
   * Solver reads selfWeightFactor × g in the gravity direction.
   */
  selfWeight: boolean;
  selfWeightFactor: number;

  /** IDs of load assignments belonging to this pattern */
  assignmentIds: string[] = [];

  constructor(
    id: string,
    name: string,
    patternType: LoadPatternType = 'Dead',
    selfWeight = false,
    selfWeightFactor = 1.0,
  ) {
    super(id, name);
    this.patternType = patternType;
    this.selfWeight = selfWeight;
    this.selfWeightFactor = selfWeightFactor;
  }

  addAssignment(assignmentId: string): void {
    if (!this.assignmentIds.includes(assignmentId)) {
      this.assignmentIds.push(assignmentId);
      this.relationships.childIds.push(assignmentId);
    }
  }

  validate(): ValidationResult {
    const diags = [];
    if (this.selfWeight && (this.selfWeightFactor < 0 || this.selfWeightFactor > 2)) {
      diags.push({ code: 'LDM-PAT001', severity: 'warning' as const, message: 'Self-weight factor is outside typical range [0, 2]. Verify intent.', objectId: this.identity.id, field: 'selfWeightFactor' });
    }
    return new ValidationResult(this.identity.id, diags);
  }
}

// ─── Pattern Registry ─────────────────────────────────────────────────────────

export class PatternRegistry {
  private readonly _patterns: Map<string, LoadPattern> = new Map();

  public register(pattern: LoadPattern): void {
    this._patterns.set(pattern.identity.id, pattern);
  }

  public get(id: string): LoadPattern | undefined {
    return this._patterns.get(id);
  }

  public getByType(type: LoadPatternType): LoadPattern[] {
    return Array.from(this._patterns.values()).filter(p => p.patternType === type);
  }

  public all(): LoadPattern[] {
    return Array.from(this._patterns.values());
  }
}

// ─── Load Group ───────────────────────────────────────────────────────────────

/**
 * Organisational grouping of load patterns.
 * Groups do not affect the analysis — they are purely for navigation and reporting.
 */
export class LoadGroup extends BaseEngineeringObject {
  readonly objectType: EngineeringObjectType = 'LoadPattern'; // reuse slot

  groupType: LoadGroupType;
  patternIds: string[] = [];

  constructor(id: string, name: string, groupType: LoadGroupType = 'Gravity') {
    super(id, name);
    this.groupType = groupType;
  }

  addPattern(patternId: string): void {
    if (!this.patternIds.includes(patternId)) {
      this.patternIds.push(patternId);
    }
  }

  validate(): ValidationResult {
    if (this.patternIds.length === 0) {
      return ValidationResult.warning(this.identity.id, 'LDM-GRP001', `Load group "${this.identity.name}" is empty.`);
    }
    return ValidationResult.ok(this.identity.id);
  }
}
