import { BaseEngineeringObject, EngineeringObjectType } from '../core/IEngineeringObject';
import { ValidationResult } from '../validation/ValidationResult';
import { EngineeringAxis } from '../coordinate/CoordinateSystem';

// ─── Member classification ────────────────────────────────────────────────────

export type MemberType =
  | 'Beam'
  | 'Column'
  | 'Brace'
  | 'Truss'
  | 'Tie'
  | 'Strut'
  | 'Rafter'
  | 'Purlin'
  | 'Foundation'
  | 'Custom';

// ─── Degrees of freedom releases ─────────────────────────────────────────────

export interface EndReleases {
  /** Release axial force */
  Fx?: boolean;
  /** Release shear Y */
  Fy?: boolean;
  /** Release shear Z */
  Fz?: boolean;
  /** Release torsion */
  Mx?: boolean;
  /** Release moment Y */
  My?: boolean;
  /** Release moment Z */
  Mz?: boolean;
}

export interface MemberReleaseCondition {
  startReleases: EndReleases;
  endReleases: EndReleases;
}

export const PIN_PIN_RELEASES: MemberReleaseCondition = {
  startReleases: { Mz: true },
  endReleases: { Mz: true },
};

export const FIXED_FIXED_RELEASES: MemberReleaseCondition = {
  startReleases: {},
  endReleases: {},
};

// ─── Member offsets ──────────────────────────────────────────────────────────

export interface MemberOffset {
  /** Offset at the start node [length units] */
  startDx?: number; startDy?: number; startDz?: number;
  /** Offset at the end node [length units] */
  endDx?: number; endDy?: number; endDz?: number;
}

// ─── Local axis orientation ───────────────────────────────────────────────────

export interface LocalAxisOrientation {
  /**
   * Rotation of local 2-axis (weak axis) about the member longitudinal axis [degrees].
   * 0 = default orientation (2-axis in global XZ plane if member is horizontal,
   * otherwise towards global Z if vertical).
   */
  rollAngleDeg: number;
  /**
   * Optional explicit local 2-axis direction. When provided, overrides rollAngleDeg.
   */
  localYVector?: EngineeringAxis;
}

// ─── Structural Member ────────────────────────────────────────────────────────

/**
 * A structural member (beam, column, brace, etc.).
 *
 * Geometry is always derived from node references — never stored redundantly.
 */
export class StructuralMember extends BaseEngineeringObject {
  readonly objectType: EngineeringObjectType = 'Member';

  /** Start node ID */
  startNodeId: string;
  /** End node ID */
  endNodeId: string;
  /** Material definition ID */
  materialId: string;
  /** Section profile ID */
  sectionId: string;

  memberType: MemberType;
  releases: MemberReleaseCondition;
  offsets: MemberOffset;
  orientation: LocalAxisOrientation;

  /** User-visible member number (for display and import/export) */
  memberNumber?: number;

  /**
   * Optional assembly this member belongs to.
   * Maintained by StructuralAssembly.
   */
  assemblyId?: string;

  constructor(
    id: string,
    name: string,
    startNodeId: string,
    endNodeId: string,
    materialId: string,
    sectionId: string,
    memberType: MemberType = 'Beam',
    structureId?: string,
  ) {
    super(id, name, structureId);
    this.startNodeId = startNodeId;
    this.endNodeId = endNodeId;
    this.materialId = materialId;
    this.sectionId = sectionId;
    this.memberType = memberType;
    this.releases = FIXED_FIXED_RELEASES;
    this.offsets = {};
    this.orientation = { rollAngleDeg: 0 };

    // Register relationships
    this.relationships.references['startNode'] = startNodeId;
    this.relationships.references['endNode'] = endNodeId;
    this.relationships.references['material'] = materialId;
    this.relationships.references['section'] = sectionId;
    this.relationships.dependencyIds = [startNodeId, endNodeId, materialId, sectionId];
  }

  validate(): ValidationResult {
    const diagnostics = [];

    if (!this.startNodeId) {
      diagnostics.push({ code: 'SDM-M001', severity: 'error' as const, message: 'Member must have a start node.', objectId: this.identity.id, field: 'startNodeId' });
    }
    if (!this.endNodeId) {
      diagnostics.push({ code: 'SDM-M002', severity: 'error' as const, message: 'Member must have an end node.', objectId: this.identity.id, field: 'endNodeId' });
    }
    if (this.startNodeId && this.endNodeId && this.startNodeId === this.endNodeId) {
      diagnostics.push({ code: 'SDM-M003', severity: 'error' as const, message: 'Member start and end nodes cannot be identical (zero-length member).', objectId: this.identity.id, field: 'nodeIds' });
    }
    if (!this.materialId) {
      diagnostics.push({ code: 'SDM-M004', severity: 'error' as const, message: 'Member must reference a material.', objectId: this.identity.id, field: 'materialId' });
    }
    if (!this.sectionId) {
      diagnostics.push({ code: 'SDM-M005', severity: 'error' as const, message: 'Member must reference a section.', objectId: this.identity.id, field: 'sectionId' });
    }
    if (this.orientation.rollAngleDeg < -360 || this.orientation.rollAngleDeg > 360) {
      diagnostics.push({ code: 'SDM-M006', severity: 'warning' as const, message: 'Roll angle is outside [-360°, 360°] — verify intent.', objectId: this.identity.id, field: 'orientation.rollAngleDeg' });
    }

    return new ValidationResult(this.identity.id, diagnostics);
  }
}
