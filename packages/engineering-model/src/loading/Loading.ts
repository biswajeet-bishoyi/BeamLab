import { BaseEngineeringObject, EngineeringObjectType } from '../core/IEngineeringObject';
import { ValidationResult } from '../validation/ValidationResult';

// ─── Load pattern ────────────────────────────────────────────────────────────

export type LoadPatternType = 'Dead' | 'Live' | 'Wind' | 'Seismic' | 'Snow' | 'Temperature' | 'Settlement' | 'Custom';

export class LoadPattern extends BaseEngineeringObject {
  readonly objectType: EngineeringObjectType = 'LoadPattern';

  constructor(
    id: string,
    name: string,
    public patternType: LoadPatternType = 'Custom',
    public selfWeightFactor: number = 0,
  ) {
    super(id, name);
  }

  validate(): ValidationResult {
    return ValidationResult.ok(this.identity.id);
  }
}

// ─── Load case ───────────────────────────────────────────────────────────────

export type AnalysisType = 'Linear' | 'NonLinear' | 'Modal' | 'BucklingLinear';

export class LoadCase extends BaseEngineeringObject {
  readonly objectType: EngineeringObjectType = 'LoadCase';

  constructor(
    id: string,
    name: string,
    /** IDs of load patterns contributing to this case */
    public loadPatternIds: string[],
    public analysisType: AnalysisType = 'Linear',
  ) {
    super(id, name);
    this.relationships.dependencyIds = [...loadPatternIds];
  }

  validate(): ValidationResult {
    if (this.loadPatternIds.length === 0) {
      return ValidationResult.warning(this.identity.id, 'CEM-LC001', 'Load case has no load patterns — it will produce zero results.');
    }
    return ValidationResult.ok(this.identity.id);
  }
}

// ─── Load combination ────────────────────────────────────────────────────────

export interface LoadCombinationFactor {
  loadCaseId: string;
  factor: number;
}

export class LoadCombination extends BaseEngineeringObject {
  readonly objectType: EngineeringObjectType = 'LoadCombination';

  constructor(
    id: string,
    name: string,
    public factors: LoadCombinationFactor[],
    public combinationType: 'LRFD' | 'ASD' | 'Custom' = 'Custom',
  ) {
    super(id, name);
    this.relationships.dependencyIds = factors.map(f => f.loadCaseId);
  }

  validate(): ValidationResult {
    if (this.factors.length === 0) {
      return ValidationResult.error(this.identity.id, 'CEM-COMBO001', 'Load combination must reference at least one load case.');
    }
    return ValidationResult.ok(this.identity.id);
  }
}

// ─── Individual loads ────────────────────────────────────────────────────────

export interface ForceVector {
  fx?: number; fy?: number; fz?: number;
  mx?: number; my?: number; mz?: number;
}

export class NodeLoad extends BaseEngineeringObject {
  readonly objectType: EngineeringObjectType = 'NodeLoad';

  constructor(
    id: string,
    name: string,
    public nodeId: string,
    public loadPatternId: string,
    public force: ForceVector,
    public coordinateSystem: 'Global' | 'Local' = 'Global',
  ) {
    super(id, name);
    this.relationships.references['node'] = nodeId;
    this.relationships.references['loadPattern'] = loadPatternId;
    this.relationships.dependencyIds = [nodeId, loadPatternId];
  }

  validate(): ValidationResult {
    if (!this.nodeId) {
      return ValidationResult.error(this.identity.id, 'CEM-NL001', 'NodeLoad must reference a valid node.', 'nodeId');
    }
    return ValidationResult.ok(this.identity.id);
  }
}

export type MemberLoadType = 'PointForce' | 'Distributed' | 'Trapezoidal' | 'Thermal';

export class MemberLoad extends BaseEngineeringObject {
  readonly objectType: EngineeringObjectType = 'MemberLoad';

  constructor(
    id: string,
    name: string,
    public memberId: string,
    public loadPatternId: string,
    public loadType: MemberLoadType,
    /** Magnitude at start (or uniform value) */
    public magnitudeA: number,
    /** Magnitude at end (for trapezoidal loads) */
    public magnitudeB: number = 0,
    /** Relative position along member [0,1] for point loads */
    public position: number = 0,
    public direction: 'Fy' | 'Fz' | 'Mx' = 'Fy',
    public coordinateSystem: 'Global' | 'Local' = 'Local',
  ) {
    super(id, name);
    this.relationships.references['member'] = memberId;
    this.relationships.references['loadPattern'] = loadPatternId;
    this.relationships.dependencyIds = [memberId, loadPatternId];
  }

  validate(): ValidationResult {
    if (!this.memberId) {
      return ValidationResult.error(this.identity.id, 'CEM-ML001', 'MemberLoad must reference a valid member.', 'memberId');
    }
    if (this.loadType === 'PointForce' && (this.position < 0 || this.position > 1)) {
      return ValidationResult.error(this.identity.id, 'CEM-ML002', 'Point load position must be in [0, 1].', 'position');
    }
    return ValidationResult.ok(this.identity.id);
  }
}
