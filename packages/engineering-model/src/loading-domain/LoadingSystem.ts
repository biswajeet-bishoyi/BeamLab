import { BaseEngineeringObject, EngineeringObjectType } from '../core/IEngineeringObject';
import { ValidationResult } from '../validation/ValidationResult';
import { UnitSystem, SI_UNITS } from '../core/UnitSystem';
import { LoadCategory, LoadTargetType, LoadType, LoadVector, LoadDistribution, LoadPatternType, LoadGroupType, AnalysisType, CombinationType, CombinationStandard, EnvelopeType } from './LoadTypes';
import { StructuralLoad, PointLoad, DistributedLoad, MomentLoad, TemperatureLoad, SettlementLoad, PretensionLoad, PressureLoad, LoadRegistry } from './StructuralLoad';
import { LoadAssignment, AssignmentRegistry } from './LoadAssignment';
import { LoadPattern, LoadGroup, PatternRegistry } from './LoadPattern';
import { LoadCase, CaseRegistry } from './LoadCase';
import { LoadCombination, CombinationRegistry } from './LoadCombination';
import { LoadEnvelope, EnvelopeRegistry } from './LoadEnvelope';

// ─── Loading System ───────────────────────────────────────────────────────────

/**
 * Top-level loading system container.
 *
 * Holds all registries for loads, patterns, cases, combinations,
 * envelopes, and assignments. Exposes a fluent builder API.
 */
export class LoadingSystem extends BaseEngineeringObject {
  readonly objectType: EngineeringObjectType = 'Structure'; // Reuse structure slot

  // Registries
  readonly loadRegistry = new LoadRegistry();
  readonly assignmentRegistry = new AssignmentRegistry();
  readonly patternRegistry = new PatternRegistry();
  readonly caseRegistry = new CaseRegistry();
  readonly combinationRegistry = new CombinationRegistry();
  readonly envelopeRegistry = new EnvelopeRegistry();
  readonly groups: Map<string, LoadGroup> = new Map();

  units: UnitSystem;
  readonly projectId: string;

  constructor(id: string, name: string, projectId: string, units: UnitSystem = SI_UNITS) {
    super(id, name);
    this.projectId = projectId;
    this.units = units;
    this.relationships.references['project'] = projectId;
  }

  // ─── Loads ──────────────────────────────────────────────────────────────────

  addPointLoad(
    id: string,
    name: string,
    vector: LoadVector,
    category: LoadCategory = 'Gravity',
    coordinateSystemId = 'cs-global',
  ): PointLoad {
    const load = new PointLoad(id, name, vector, category, coordinateSystemId);
    this.loadRegistry.register(load);
    return load;
  }

  addDistributedLoad(
    id: string,
    name: string,
    magnitudeStart: number,
    magnitudeEnd: number = magnitudeStart,
    direction: 'Fx' | 'Fy' | 'Fz' = 'Fy',
    distribution: LoadDistribution = 'Uniform',
    spanStart = 0,
    spanEnd = 1,
    category: LoadCategory = 'Gravity',
    coordinateSystemId = 'cs-global',
  ): DistributedLoad {
    const load = new DistributedLoad(
      id,
      name,
      magnitudeStart,
      magnitudeEnd,
      direction,
      distribution,
      spanStart,
      spanEnd,
      category,
      coordinateSystemId,
    );
    this.loadRegistry.register(load);
    return load;
  }

  addMomentLoad(
    id: string,
    name: string,
    mx = 0,
    my = 0,
    mz = 0,
    coordinateSystemId = 'cs-global',
  ): MomentLoad {
    const load = new MomentLoad(id, name, mx, my, mz, coordinateSystemId);
    this.loadRegistry.register(load);
    return load;
  }

  addTemperatureLoad(
    id: string,
    name: string,
    uniformDeltaT: number,
    gradientDeltaT = 0,
  ): TemperatureLoad {
    const load = new TemperatureLoad(id, name, uniformDeltaT, gradientDeltaT);
    this.loadRegistry.register(load);
    return load;
  }

  addSettlementLoad(
    id: string,
    name: string,
    dx = 0,
    dy = 0,
    dz = 0,
    rx = 0,
    ry = 0,
    rz = 0,
  ): SettlementLoad {
    const load = new SettlementLoad(id, name, dx, dy, dz, rx, ry, rz);
    this.loadRegistry.register(load);
    return load;
  }

  addPretensionLoad(
    id: string,
    name: string,
    pretensionForce: number,
    pretensionStrain?: number,
  ): PretensionLoad {
    const load = new PretensionLoad(id, name, pretensionForce, pretensionStrain);
    this.loadRegistry.register(load);
    return load;
  }

  addPressureLoad(
    id: string,
    name: string,
    pressure: number,
    isNormalToSurface = true,
  ): PressureLoad {
    const load = new PressureLoad(id, name, pressure, isNormalToSurface);
    this.loadRegistry.register(load);
    return load;
  }

  // ─── Patterns & Groups ──────────────────────────────────────────────────────

  addPattern(
    id: string,
    name: string,
    patternType: LoadPatternType = 'Dead',
    selfWeight = false,
    selfWeightFactor = 1.0,
  ): LoadPattern {
    const pattern = new LoadPattern(id, name, patternType, selfWeight, selfWeightFactor);
    this.patternRegistry.register(pattern);
    return pattern;
  }

  addGroup(id: string, name: string, groupType: LoadGroupType = 'Gravity'): LoadGroup {
    const group = new LoadGroup(id, name, groupType);
    this.groups.set(id, group);
    return group;
  }

  // ─── Assignments ────────────────────────────────────────────────────────────

  assignLoad(
    id: string,
    name: string,
    loadId: string,
    targetType: LoadTargetType,
    targetId: string,
    patternId: string,
    scaleFactor = 1.0,
    applyInLocalAxis = false,
  ): LoadAssignment {
    const assignment = new LoadAssignment(
      id,
      name,
      loadId,
      targetType,
      targetId,
      patternId,
      scaleFactor,
      applyInLocalAxis,
    );
    this.assignmentRegistry.register(assignment);

    const pattern = this.patternRegistry.get(patternId);
    if (pattern) {
      pattern.addAssignment(id);
    }

    return assignment;
  }

  // ─── Cases & Combinations ───────────────────────────────────────────────────

  addCase(
    id: string,
    name: string,
    analysisType: AnalysisType = 'LinearStatic',
    includeGravity = true,
  ): LoadCase {
    const loadCase = new LoadCase(id, name, [], analysisType, includeGravity);
    this.caseRegistry.register(loadCase);
    return loadCase;
  }

  addCombination(
    id: string,
    name: string,
    combinationType: CombinationType = 'ULS',
    standard: CombinationStandard = 'Custom',
  ): LoadCombination {
    const combo = new LoadCombination(id, name, [], combinationType, standard);
    this.combinationRegistry.register(combo);
    return combo;
  }

  addEnvelope(
    id: string,
    name: string,
    sourceIds: string[] = [],
    envelopeType: EnvelopeType = 'AbsoluteMaximum',
  ): LoadEnvelope {
    const env = new LoadEnvelope(id, name, sourceIds, envelopeType);
    this.envelopeRegistry.register(env);
    return env;
  }

  // ─── Summary & Stats ────────────────────────────────────────────────────────

  summary(): Record<string, number> {
    return {
      loads: this.loadRegistry.all().length,
      assignments: this.assignmentRegistry.all().length,
      patterns: this.patternRegistry.all().length,
      groups: this.groups.size,
      cases: this.caseRegistry.all().length,
      combinations: this.combinationRegistry.all().length,
      envelopes: this.envelopeRegistry.all().length,
    };
  }

  // ─── System-level Validation ────────────────────────────────────────────────

  validate(): ValidationResult {
    const diagnostics = [];

    if (this.patternRegistry.all().length === 0) {
      diagnostics.push({
        code: 'LDM-SYS001',
        severity: 'warning' as const,
        message: 'Loading system has no load patterns.',
        objectId: this.identity.id,
      });
    }

    if (this.caseRegistry.all().length === 0) {
      diagnostics.push({
        code: 'LDM-SYS002',
        severity: 'warning' as const,
        message: 'Loading system has no load cases defined.',
        objectId: this.identity.id,
      });
    }

    return new ValidationResult(this.identity.id, diagnostics);
  }
}
