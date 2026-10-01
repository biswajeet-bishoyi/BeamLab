import { BaseEngineeringObject, EngineeringObjectType } from '../core/IEngineeringObject';
import { ValidationResult } from '../validation/ValidationResult';
import { Point3D, ORIGIN } from '../coordinate/CoordinateSystem';

// ─── Member connectivity record ──────────────────────────────────────────────

export interface ConnectedMemberRef {
  memberId: string;
  /** 'start' | 'end' — which end of the member connects here */
  end: 'start' | 'end';
}

// ─── Structural Node ─────────────────────────────────────────────────────────

/**
 * A structural point in 3D space.
 *
 * Richer than EngineeringNode (B1.1):
 *  - explicit coordinate system reference
 *  - local coordinates alongside global
 *  - connected member registry (maintained by StructuralSystem on add/remove)
 */
export class StructuralNode extends BaseEngineeringObject {
  readonly objectType: EngineeringObjectType = 'Node';

  /** Global coordinates [length units] */
  globalCoordinates: Point3D;

  /**
   * Local coordinates within the referenced CS.
   * Undefined = same as global (CS is global).
   */
  localCoordinates?: Point3D;

  /** Reference to the coordinate system this node is defined in */
  coordinateSystemId: string;

  /**
   * IDs of members whose start/end connects to this node.
   * Maintained by StructuralSystem, not set manually.
   */
  connectedMembers: ConnectedMemberRef[] = [];

  /** User-visible node number (optional — for display and import/export) */
  nodeNumber?: number;

  constructor(
    id: string,
    name: string,
    globalCoords: Point3D,
    coordinateSystemId = 'cs-global',
    structureId?: string,
  ) {
    super(id, name, structureId);
    this.globalCoordinates = globalCoords;
    this.coordinateSystemId = coordinateSystemId;
  }

  /** Convenience accessors */
  get x(): number { return this.globalCoordinates.x; }
  get y(): number { return this.globalCoordinates.y; }
  get z(): number { return this.globalCoordinates.z; }

  /** Euclidean distance to another node */
  distanceTo(other: StructuralNode): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    const dz = this.z - other.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  validate(): ValidationResult {
    const diagnostics = [];

    if (!isFinite(this.x) || !isFinite(this.y) || !isFinite(this.z)) {
      diagnostics.push({
        code: 'SDM-N001',
        severity: 'error' as const,
        message: 'Node global coordinates must be finite numbers.',
        objectId: this.identity.id,
        field: 'globalCoordinates',
      });
    }

    if (!this.coordinateSystemId) {
      diagnostics.push({
        code: 'SDM-N002',
        severity: 'error' as const,
        message: 'Node must reference a coordinate system.',
        objectId: this.identity.id,
        field: 'coordinateSystemId',
      });
    }

    return new ValidationResult(this.identity.id, diagnostics);
  }
}
