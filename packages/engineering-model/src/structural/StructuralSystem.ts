import { BaseEngineeringObject, EngineeringObjectType } from '../core/IEngineeringObject';
import { ValidationResult } from '../validation/ValidationResult';
import { UnitSystem, SI_UNITS } from '../core/UnitSystem';
import { StructuralNode } from './StructuralNode';
import { StructuralMember } from './StructuralMember';
import { StructuralMaterial, MaterialDefinition } from './StructuralMaterial';
import { StructuralSection, SectionProfile, SECTION_PRESETS } from './StructuralSection';
import { StructuralSupport, SupportPreset } from './StructuralSupport';
import { StructuralAssembly, AssemblyType, AssemblyRegistry } from './StructuralAssembly';
import { EngineeringCoordinateSystem, CoordinateRegistry, GLOBAL_COORDINATE_SYSTEM, Point3D } from '../coordinate/CoordinateSystem';
import { MaterialRegistry, MATERIAL_PRESETS } from './StructuralMaterial';
import { SectionRegistry } from './StructuralSection';
import { MemberType } from './StructuralMember';

// ─── Structural System ────────────────────────────────────────────────────────

/**
 * Top-level structural system container.
 *
 * A project may contain multiple structural systems
 * (e.g., superstructure + foundation + secondary steel).
 *
 * Owns all domain objects, maintains registries,
 * and exposes a fluent builder API.
 */
export class StructuralSystem extends BaseEngineeringObject {
  readonly objectType: EngineeringObjectType = 'Structure';

  // ── Domain collections ────────────────────────────────────────────────────
  readonly nodes: Map<string, StructuralNode> = new Map();
  readonly members: Map<string, StructuralMember> = new Map();
  readonly materials: Map<string, StructuralMaterial> = new Map();
  readonly sections: Map<string, StructuralSection> = new Map();
  readonly supports: Map<string, StructuralSupport> = new Map();
  readonly assemblies: AssemblyRegistry = new AssemblyRegistry();

  // ── Infrastructure registries ─────────────────────────────────────────────
  readonly materialRegistry: MaterialRegistry = new MaterialRegistry();
  readonly sectionRegistry: SectionRegistry = new SectionRegistry();
  readonly coordinateRegistry: CoordinateRegistry = new CoordinateRegistry();

  // ── Unit system ───────────────────────────────────────────────────────────
  units: UnitSystem;

  /** ID of the owning project */
  readonly projectId: string;

  constructor(id: string, name: string, projectId: string, units: UnitSystem = SI_UNITS) {
    super(id, name);
    this.projectId = projectId;
    this.units = units;
    this.relationships.references['project'] = projectId;
  }

  // ── Coordinate Systems ────────────────────────────────────────────────────

  addCoordinateSystem(cs: EngineeringCoordinateSystem): void {
    this.coordinateRegistry.register(cs);
  }

  get globalCS(): EngineeringCoordinateSystem {
    return GLOBAL_COORDINATE_SYSTEM;
  }

  // ── Node management ───────────────────────────────────────────────────────

  addNode(
    id: string,
    name: string,
    x: number,
    y: number,
    z: number,
    coordinateSystemId = 'cs-global',
  ): StructuralNode {
    const node = new StructuralNode(id, name, { x, y, z }, coordinateSystemId, this.identity.id);
    this.nodes.set(id, node);
    return node;
  }

  getNode(id: string): StructuralNode | undefined { return this.nodes.get(id); }

  // ── Member management ─────────────────────────────────────────────────────

  addMember(
    id: string,
    name: string,
    startNodeId: string,
    endNodeId: string,
    materialId: string,
    sectionId: string,
    memberType: MemberType = 'Beam',
  ): StructuralMember {
    const member = new StructuralMember(
      id, name, startNodeId, endNodeId, materialId, sectionId, memberType, this.identity.id,
    );
    this.members.set(id, member);

    // Maintain connected-member index on nodes
    const start = this.nodes.get(startNodeId);
    const end = this.nodes.get(endNodeId);
    if (start) start.connectedMembers.push({ memberId: id, end: 'start' });
    if (end) end.connectedMembers.push({ memberId: id, end: 'end' });

    return member;
  }

  getMember(id: string): StructuralMember | undefined { return this.members.get(id); }

  /**
   * Compute the Euclidean length of a member from its node coordinates.
   * Returns undefined if either node is not found.
   */
  memberLength(memberId: string): number | undefined {
    const m = this.members.get(memberId);
    if (!m) return undefined;
    const n1 = this.nodes.get(m.startNodeId);
    const n2 = this.nodes.get(m.endNodeId);
    if (!n1 || !n2) return undefined;
    return n1.distanceTo(n2);
  }

  // ── Material management ───────────────────────────────────────────────────

  addMaterial(id: string, definition: MaterialDefinition): StructuralMaterial {
    const mat = new StructuralMaterial(id, definition);
    this.materials.set(id, mat);
    return mat;
  }

  addMaterialByGrade(id: string, grade: string): StructuralMaterial {
    const def = this.materialRegistry.resolve(grade);
    if (!def) throw new Error(`Unknown material grade: "${grade}". Register a provider or use MATERIAL_PRESETS.`);
    return this.addMaterial(id, def);
  }

  getMaterial(id: string): StructuralMaterial | undefined { return this.materials.get(id); }

  // ── Section management ────────────────────────────────────────────────────

  addSection(id: string, profile: SectionProfile): StructuralSection {
    const sec = new StructuralSection(id, profile);
    this.sections.set(id, sec);
    return sec;
  }

  addSectionByDesignation(id: string, designation: string): StructuralSection {
    const profile =
      this.sectionRegistry.resolve(designation) ?? SECTION_PRESETS[designation];
    if (!profile) throw new Error(`Unknown section designation: "${designation}". Register a provider or use SECTION_PRESETS.`);
    return this.addSection(id, profile);
  }

  getSection(id: string): StructuralSection | undefined { return this.sections.get(id); }

  // ── Support management ────────────────────────────────────────────────────

  addSupport(
    id: string,
    name: string,
    nodeId: string,
    preset: SupportPreset = 'Pinned',
  ): StructuralSupport {
    const sup = new StructuralSupport(id, name, nodeId, preset, {}, 'cs-global', this.identity.id);
    this.supports.set(id, sup);
    return sup;
  }

  getSupport(id: string): StructuralSupport | undefined { return this.supports.get(id); }

  // ── Assembly management ───────────────────────────────────────────────────

  addAssembly(id: string, name: string, type: AssemblyType = 'Group'): StructuralAssembly {
    const asm = new StructuralAssembly(id, name, type, this.identity.id);
    this.assemblies.register(asm);
    return asm;
  }

  // ── Statistics ────────────────────────────────────────────────────────────

  summary(): Record<string, number> {
    return {
      nodes: this.nodes.size,
      members: this.members.size,
      materials: this.materials.size,
      sections: this.sections.size,
      supports: this.supports.size,
      assemblies: this.assemblies.all().length,
    };
  }

  // ── Validation ────────────────────────────────────────────────────────────

  validate(): ValidationResult {
    const diagnostics = [];

    if (this.nodes.size === 0) {
      diagnostics.push({ code: 'SDM-SYS001', severity: 'warning' as const, message: 'Structural system has no nodes.', objectId: this.identity.id });
    }
    if (this.members.size === 0) {
      diagnostics.push({ code: 'SDM-SYS002', severity: 'warning' as const, message: 'Structural system has no members.', objectId: this.identity.id });
    }
    if (this.supports.size === 0) {
      diagnostics.push({ code: 'SDM-SYS003', severity: 'error' as const, message: 'Structural system has no supports — it is geometrically unstable.', objectId: this.identity.id });
    }

    // Check for zero-length members
    for (const [id, member] of this.members) {
      const length = this.memberLength(id);
      if (length !== undefined && length < 1e-9) {
        diagnostics.push({ code: 'SDM-SYS004', severity: 'error' as const, message: `Member "${member.identity.name}" has zero length.`, objectId: id, field: 'length' });
      }
    }

    return new ValidationResult(this.identity.id, diagnostics);
  }
}
