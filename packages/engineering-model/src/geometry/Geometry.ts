import { BaseEngineeringObject, EngineeringObjectType } from '../core/IEngineeringObject';
import { ValidationResult } from '../validation/ValidationResult';

/**
 * A point in 3D space. The base building block of every structural model.
 * Coordinates are stored in the project's active UnitSystem (length).
 */
export class EngineeringNode extends BaseEngineeringObject {
  readonly objectType: EngineeringObjectType = 'Node';

  constructor(
    id: string,
    name: string,
    public x: number,
    public y: number,
    public z: number,
    structureId?: string,
  ) {
    super(id, name, structureId);
  }

  validate(): ValidationResult {
    const diagnostics = [];
    if (!isFinite(this.x) || !isFinite(this.y) || !isFinite(this.z)) {
      diagnostics.push({
        code: 'CEM-N001',
        severity: 'error' as const,
        message: 'Node coordinates must be finite numbers.',
        objectId: this.identity.id,
        field: 'coordinates',
      });
    }
    return new ValidationResult(this.identity.id, diagnostics);
  }
}

// ─── Member releases ─────────────────────────────────────────────────────────

export interface MemberReleases {
  startFx?: boolean;
  startFy?: boolean;
  startFz?: boolean;
  startMx?: boolean;
  startMy?: boolean;
  startMz?: boolean;
  endFx?: boolean;
  endFy?: boolean;
  endFz?: boolean;
  endMx?: boolean;
  endMy?: boolean;
  endMz?: boolean;
}

/**
 * A structural member connecting two nodes.
 * References material and section by ID (never direct object reference).
 */
export class EngineeringMember extends BaseEngineeringObject {
  readonly objectType: EngineeringObjectType = 'Member';

  constructor(
    id: string,
    name: string,
    public startNodeId: string,
    public endNodeId: string,
    public materialId: string,
    public sectionId: string,
    public releases: MemberReleases = {},
    structureId?: string,
  ) {
    super(id, name, structureId);
    // Wire up references via the relationship model
    this.relationships.references['startNode'] = startNodeId;
    this.relationships.references['endNode'] = endNodeId;
    this.relationships.references['material'] = materialId;
    this.relationships.references['section'] = sectionId;
    this.relationships.dependencyIds = [startNodeId, endNodeId, materialId, sectionId];
  }

  validate(): ValidationResult {
    const diagnostics = [];
    if (!this.startNodeId || !this.endNodeId) {
      diagnostics.push({
        code: 'CEM-M001',
        severity: 'error' as const,
        message: 'Member must reference valid start and end nodes.',
        objectId: this.identity.id,
        field: 'nodeIds',
      });
    }
    if (this.startNodeId === this.endNodeId) {
      diagnostics.push({
        code: 'CEM-M002',
        severity: 'error' as const,
        message: 'Member start and end nodes cannot be identical.',
        objectId: this.identity.id,
        field: 'nodeIds',
      });
    }
    if (!this.materialId) {
      diagnostics.push({
        code: 'CEM-M003',
        severity: 'error' as const,
        message: 'Member must reference a material.',
        objectId: this.identity.id,
        field: 'materialId',
      });
    }
    if (!this.sectionId) {
      diagnostics.push({
        code: 'CEM-M004',
        severity: 'error' as const,
        message: 'Member must reference a cross-section.',
        objectId: this.identity.id,
        field: 'sectionId',
      });
    }
    return new ValidationResult(this.identity.id, diagnostics);
  }
}
