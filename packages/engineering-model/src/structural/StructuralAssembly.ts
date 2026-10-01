import { BaseEngineeringObject, EngineeringObjectType } from '../core/IEngineeringObject';
import { ValidationResult } from '../validation/ValidationResult';

// ─── Assembly type classification ──────────────────────────────────────────────

export type AssemblyType =
  | 'Frame'
  | 'Truss'
  | 'Floor'
  | 'Roof'
  | 'BracingSystem'
  | 'Foundation'
  | 'Shearwall'
  | 'Column'     // column stack / group
  | 'Group'      // generic user group
  | 'Custom';

// ─── Assembly Registry ─────────────────────────────────────────────────────────

export class AssemblyRegistry {
  private readonly _assemblies: Map<string, StructuralAssembly> = new Map();

  public register(assembly: StructuralAssembly): void {
    this._assemblies.set(assembly.identity.id, assembly);
  }

  public get(id: string): StructuralAssembly | undefined {
    return this._assemblies.get(id);
  }

  public getByType(type: AssemblyType): StructuralAssembly[] {
    return Array.from(this._assemblies.values()).filter(a => a.assemblyType === type);
  }

  public all(): StructuralAssembly[] {
    return Array.from(this._assemblies.values());
  }
}

// ─── Structural Assembly ───────────────────────────────────────────────────────

/**
 * A named, typed grouping of structural objects.
 *
 * Assemblies may contain nodes, members, and nested sub-assemblies.
 * An assembly does NOT own its members — the StructuralSystem does.
 * Assemblies are purely organisational / relational.
 */
export class StructuralAssembly extends BaseEngineeringObject {
  readonly objectType: EngineeringObjectType = 'Structure'; // reuse structure type slot

  assemblyType: AssemblyType;

  /** IDs of nodes in this assembly */
  nodeIds: string[] = [];

  /** IDs of members in this assembly */
  memberIds: string[] = [];

  /** IDs of nested child assemblies */
  childAssemblyIds: string[] = [];

  /** Level in the building (future multi-story support) */
  level?: number;

  /** Storey height (for building assemblies) */
  storeyHeight?: number;

  constructor(
    id: string,
    name: string,
    assemblyType: AssemblyType = 'Group',
    systemId?: string,
  ) {
    super(id, name, systemId);
    this.assemblyType = assemblyType;
  }

  addNode(nodeId: string): void {
    if (!this.nodeIds.includes(nodeId)) this.nodeIds.push(nodeId);
    if (!this.relationships.childIds.includes(nodeId)) this.relationships.childIds.push(nodeId);
  }

  addMember(memberId: string): void {
    if (!this.memberIds.includes(memberId)) this.memberIds.push(memberId);
    if (!this.relationships.childIds.includes(memberId)) this.relationships.childIds.push(memberId);
  }

  addChildAssembly(assemblyId: string): void {
    if (!this.childAssemblyIds.includes(assemblyId)) this.childAssemblyIds.push(assemblyId);
  }

  get totalObjectCount(): number {
    return this.nodeIds.length + this.memberIds.length + this.childAssemblyIds.length;
  }

  validate(): ValidationResult {
    if (this.totalObjectCount === 0) {
      return ValidationResult.warning(this.identity.id, 'SDM-ASM001', `Assembly "${this.identity.name}" is empty.`);
    }
    return ValidationResult.ok(this.identity.id);
  }
}
