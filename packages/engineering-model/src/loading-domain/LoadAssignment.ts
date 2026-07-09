import { BaseEngineeringObject, EngineeringObjectType } from '../core/IEngineeringObject';
import { ValidationResult } from '../validation/ValidationResult';
import { LoadTargetType } from './LoadTypes';

// ─── Load Assignment ──────────────────────────────────────────────────────────

/**
 * Links a load to a structural target within a load pattern.
 *
 * Loads never store their own target — assignments do.
 * This keeps the load definition reusable across patterns/cases.
 */
export class LoadAssignment extends BaseEngineeringObject {
  readonly objectType: EngineeringObjectType = 'NodeLoad'; // reuse slot

  /** The load entity being assigned */
  loadId: string;
  /** Pattern this assignment belongs to */
  patternId: string;
  /** Target structural object type */
  targetType: LoadTargetType;
  /** Target object ID (node, member, assembly, …) */
  targetId: string;
  /** Scale factor applied to the load magnitude */
  scaleFactor: number;
  /** If true, apply in local CS of the target; otherwise in coordinateSystemId of the load */
  applyInLocalAxis: boolean;

  constructor(
    id: string,
    name: string,
    loadId: string,
    targetType: LoadTargetType,
    targetId: string,
    patternId: string,
    scaleFactor = 1.0,
    applyInLocalAxis = false,
  ) {
    super(id, name);
    this.loadId = loadId;
    this.targetType = targetType;
    this.targetId = targetId;
    this.patternId = patternId;
    this.scaleFactor = scaleFactor;
    this.applyInLocalAxis = applyInLocalAxis;

    this.relationships.references['load'] = loadId;
    this.relationships.references['target'] = targetId;
    this.relationships.references['pattern'] = patternId;
    this.relationships.dependencyIds = [loadId, targetId, patternId];
  }

  validate(): ValidationResult {
    const diags = [];
    if (!this.loadId) {
      diags.push({ code: 'LDM-ASGN001', severity: 'error' as const, message: 'Assignment must reference a load.', objectId: this.identity.id, field: 'loadId' });
    }
    if (!this.targetId) {
      diags.push({ code: 'LDM-ASGN002', severity: 'error' as const, message: 'Assignment must reference a target.', objectId: this.identity.id, field: 'targetId' });
    }
    if (!this.patternId) {
      diags.push({ code: 'LDM-ASGN003', severity: 'error' as const, message: 'Assignment must belong to a pattern.', objectId: this.identity.id, field: 'patternId' });
    }
    if (this.scaleFactor === 0) {
      diags.push({ code: 'LDM-ASGN004', severity: 'warning' as const, message: 'Scale factor is 0 — the load has no effect in this assignment.', objectId: this.identity.id, field: 'scaleFactor' });
    }
    return new ValidationResult(this.identity.id, diags);
  }
}

// ─── Assignment Registry ──────────────────────────────────────────────────────

export class AssignmentRegistry {
  private readonly _assignments: Map<string, LoadAssignment> = new Map();

  public register(assignment: LoadAssignment): void {
    this._assignments.set(assignment.identity.id, assignment);
  }

  public get(id: string): LoadAssignment | undefined {
    return this._assignments.get(id);
  }

  /** All assignments targeting a specific object */
  public byTarget(targetId: string): LoadAssignment[] {
    return Array.from(this._assignments.values()).filter(a => a.targetId === targetId);
  }

  /** All assignments in a given pattern */
  public byPattern(patternId: string): LoadAssignment[] {
    return Array.from(this._assignments.values()).filter(a => a.patternId === patternId);
  }

  public all(): LoadAssignment[] {
    return Array.from(this._assignments.values());
  }

  public remove(id: string): void {
    this._assignments.delete(id);
  }
}
