import { IEngineeringObject, EngineeringObjectType } from '../core/IEngineeringObject';
import { EngineeringMetadata, createDefaultMetadata } from '../core/EngineeringMetadata';
import { EngineeringVersion, createInitialVersion, bumpVersion } from '../core/EngineeringVersion';
import { UnitSystem, SI_UNITS } from '../core/UnitSystem';
import { ObjectRegistry } from '../registries/ObjectRegistry';
import { RelationshipRegistry } from '../registries/RelationshipRegistry';
import { UnitRegistry } from '../registries/UnitRegistry';
import { SerializationRegistry, JsonSerializationProvider } from '../registries/SerializationRegistry';
import { ValidationRegistry, ValidationEngine, OrphanReferenceRule, ValidationContext } from '../validation/ValidationEngine';
import { ValidationResult } from '../validation/ValidationResult';
import { CEMEventEmitter, CEMEvent } from '../events/ModelEvents';
import { EngineeringNode, EngineeringMember } from '../geometry/Geometry';
import { EngineeringMaterial, EngineeringSection } from '../properties/Properties';
import { EngineeringSupport } from '../boundary/Boundary';
import { LoadPattern, LoadCase, LoadCombination, NodeLoad, MemberLoad } from '../loading/Loading';
import { AnalysisResult } from '../results/Results';

// ─── Project & Structure metadata ────────────────────────────────────────────

export interface ProjectInfo {
  id: string;
  name: string;
  description?: string;
  client?: string;
  engineer?: string;
  projectNumber?: string;
  createdAt: string;
  modifiedAt: string;
}

export interface StructureInfo {
  id: string;
  name: string;
  description?: string;
  /** The project this structure belongs to */
  projectId: string;
}

// ─── Change tracking ─────────────────────────────────────────────────────────

export interface ModelChangeset {
  timestamp: string;
  description: string;
  addedIds: string[];
  removedIds: string[];
  modifiedIds: string[];
}

// ─── Central Engineering Model ────────────────────────────────────────────────

/**
 * The Canonical Engineering Model — the single source of truth.
 *
 * Every subsystem operates on this model through its public interface.
 * Never depends on UI, solver, agent, or visualization internals.
 */
export class EngineeringModel {
  readonly id: string;
  readonly projectInfo: ProjectInfo;
  readonly structures: Map<string, StructureInfo> = new Map();

  // ── Registries ──────────────────────────────────────────────────────────
  readonly objects: ObjectRegistry = new ObjectRegistry();
  readonly relationships: RelationshipRegistry = new RelationshipRegistry();
  readonly units: UnitRegistry = new UnitRegistry();
  readonly serialization: SerializationRegistry = new SerializationRegistry();
  readonly validation: ValidationRegistry = new ValidationRegistry();
  readonly events: CEMEventEmitter = new CEMEventEmitter();

  // ── Validation engine ──────────────────────────────────────────────────
  private readonly _validationEngine: ValidationEngine;

  // ── Results store ───────────────────────────────────────────────────────
  private readonly _results: Map<string, AnalysisResult> = new Map();

  // ── Change history ──────────────────────────────────────────────────────
  private readonly _history: ModelChangeset[] = [];
  private _version: EngineeringVersion = createInitialVersion('Model created');

  constructor(id: string, project: Omit<ProjectInfo, 'id' | 'createdAt' | 'modifiedAt'>) {
    this.id = id;
    const now = new Date().toISOString();
    this.projectInfo = { id, ...project, createdAt: now, modifiedAt: now };

    // Wire up default infrastructure
    this.serialization.register(new JsonSerializationProvider());
    this.validation.register(new OrphanReferenceRule());
    this._validationEngine = new ValidationEngine(this.validation);
  }

  // ── Unit system ──────────────────────────────────────────────────────────

  get activeUnits(): UnitSystem {
    return this.units.active;
  }

  setUnitSystem(key: string): void {
    this.units.activate(key);
  }

  // ── Version ──────────────────────────────────────────────────────────────

  get currentVersion(): EngineeringVersion {
    return this._version;
  }

  // ── Object management ─────────────────────────────────────────────────────

  private _add(obj: IEngineeringObject, structureId?: string): void {
    this.objects.register(obj);
    // Register all reference relationships
    for (const [role, targetId] of Object.entries(obj.relationships.references)) {
      this.relationships.set(obj.identity.id, role, targetId);
    }
    this._track('add', obj.identity.id);
    this.events.emit({
      type: 'EngineeringObjectCreated',
      timestamp: new Date().toISOString(),
      modelId: this.id,
      objectId: obj.identity.id,
      payload: { objectType: obj.objectType, name: obj.identity.name },
    });
  }

  private _remove(id: string): void {
    this.objects.unregister(id);
    this.relationships.remove(id);
    this._track('remove', id);
    this.events.emit({
      type: 'EngineeringObjectDeleted',
      timestamp: new Date().toISOString(),
      modelId: this.id,
      objectId: id,
      payload: {},
    });
  }

  private _track(op: 'add' | 'remove' | 'modify', id: string): void {
    const now = new Date().toISOString();
    const last = this._history[this._history.length - 1];
    let current: ModelChangeset;
    if (!last || last.timestamp !== now) {
      current = { timestamp: now, description: '', addedIds: [], removedIds: [], modifiedIds: [] };
      this._history.push(current);
    } else {
      current = last;
    }
    if (op === 'add') current.addedIds.push(id);
    else if (op === 'remove') current.removedIds.push(id);
    else current.modifiedIds.push(id);
    this._version = bumpVersion(this._version);
  }

  // ── Structure management ──────────────────────────────────────────────────

  addStructure(id: string, name: string, description?: string): StructureInfo {
    const info: StructureInfo = { id, name, description, projectId: this.id };
    this.structures.set(id, info);
    this.events.emit({ type: 'StructureAdded', timestamp: new Date().toISOString(), modelId: this.id, payload: info });
    return info;
  }

  // ── Geometry ──────────────────────────────────────────────────────────────

  addNode(id: string, name: string, x: number, y: number, z: number, structureId: string): EngineeringNode {
    const node = new EngineeringNode(id, name, x, y, z, structureId);
    this._add(node);
    return node;
  }

  addMember(id: string, name: string, startNodeId: string, endNodeId: string, materialId: string, sectionId: string, structureId: string): EngineeringMember {
    const member = new EngineeringMember(id, name, startNodeId, endNodeId, materialId, sectionId, {}, structureId);
    this._add(member);
    return member;
  }

  // ── Properties ────────────────────────────────────────────────────────────

  addMaterial(id: string, name: string, E: number, G: number, nu: number, density: number, type?: string): EngineeringMaterial {
    const mat = new EngineeringMaterial(id, name, E, G, nu, density, undefined, type);
    this._add(mat);
    return mat;
  }

  addSection(id: string, name: string, A: number, Iy: number, Iz: number, J: number): EngineeringSection {
    const sec = new EngineeringSection(id, name, A, Iy, Iz, J);
    this._add(sec);
    return sec;
  }

  // ── Boundary ──────────────────────────────────────────────────────────────

  addSupport(id: string, name: string, nodeId: string, structureId: string): EngineeringSupport {
    const sup = new EngineeringSupport(id, name, nodeId, undefined, undefined, structureId);
    this._add(sup);
    return sup;
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  addLoadPattern(id: string, name: string, type: LoadPattern['patternType']): LoadPattern {
    const lp = new LoadPattern(id, name, type);
    this._add(lp);
    return lp;
  }

  addLoadCase(id: string, name: string, patternIds: string[]): LoadCase {
    const lc = new LoadCase(id, name, patternIds);
    this._add(lc);
    return lc;
  }

  addLoadCombination(id: string, name: string, factors: LoadCombination['factors']): LoadCombination {
    const combo = new LoadCombination(id, name, factors);
    this._add(combo);
    return combo;
  }

  addNodeLoad(id: string, name: string, nodeId: string, patternId: string, force: NodeLoad['force']): NodeLoad {
    const nl = new NodeLoad(id, name, nodeId, patternId, force);
    this._add(nl);
    return nl;
  }

  addMemberLoad(id: string, name: string, memberId: string, patternId: string, type: MemberLoad['loadType'], magnitudeA: number): MemberLoad {
    const ml = new MemberLoad(id, name, memberId, patternId, type, magnitudeA);
    this._add(ml);
    return ml;
  }

  // ── Results ───────────────────────────────────────────────────────────────

  publishResult(result: AnalysisResult): void {
    this._results.set(result.id, result);
    this.events.emit({ type: 'EngineeringObjectCreated', timestamp: new Date().toISOString(), modelId: this.id, objectId: result.id, payload: result });
  }

  getResult(id: string): AnalysisResult | undefined {
    return this._results.get(id);
  }

  allResults(): AnalysisResult[] {
    return Array.from(this._results.values());
  }

  // ── Validation ────────────────────────────────────────────────────────────

  private _validationContext(): ValidationContext {
    return { resolve: (id: string) => this.objects.get(id) };
  }

  validateAll(): ValidationResult[] {
    const results = this._validationEngine.validateAll(this.objects.all(), this._validationContext());
    this.events.emit({ type: 'ValidationCompleted', timestamp: new Date().toISOString(), modelId: this.id, payload: { count: results.length } });
    return results;
  }

  validateObject(id: string): ValidationResult | undefined {
    const obj = this.objects.get(id);
    if (!obj) return undefined;
    return this._validationEngine.validate(obj, this._validationContext());
  }

  // ── Serialization ─────────────────────────────────────────────────────────

  toJSON(): object {
    return {
      id: this.id,
      version: this._version,
      projectInfo: this.projectInfo,
      structures: Array.from(this.structures.values()),
      objects: this.objects.all().map(o => ({
        id: o.identity.id,
        name: o.identity.name,
        type: o.objectType,
        version: o.version,
        metadata: o.metadata,
        extensions: o.extensions,
        relationships: o.relationships,
      })),
      results: this.allResults(),
      units: this.units.active.preset,
    };
  }

  // ── History ───────────────────────────────────────────────────────────────

  get changeHistory(): ModelChangeset[] {
    return [...this._history];
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  summary(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const obj of this.objects.all()) {
      counts[obj.objectType] = (counts[obj.objectType] ?? 0) + 1;
    }
    return counts;
  }
}
