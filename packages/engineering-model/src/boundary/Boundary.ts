import { BaseEngineeringObject, EngineeringObjectType } from '../core/IEngineeringObject';
import { ValidationResult } from '../validation/ValidationResult';

// ─── Restraint DoF ───────────────────────────────────────────────────────────
// NOTE: The canonical restraint type is RestraintDOF in structural/StructuralSupport.ts.
// This legacy type uses lowercase field names and is retained for backward compatibility
// with the EngineeringSupport class (B1.1). New code should use StructuralSupport instead.

export interface CemRestraintDOF {
  /** Translation along X */
  dx: boolean;
  /** Translation along Y */
  dy: boolean;
  /** Translation along Z */
  dz: boolean;
  /** Rotation about X */
  rx: boolean;
  /** Rotation about Y */
  ry: boolean;
  /** Rotation about Z */
  rz: boolean;
}

export interface CemSpringStiffness {
  kx?: number;  // translational spring stiffness [force/length]
  ky?: number;
  kz?: number;
  krx?: number; // rotational spring stiffness [moment/radian]
  kry?: number;
  krz?: number;
}

/** Common support presets */
export const FIXED_SUPPORT: CemRestraintDOF = { dx: true, dy: true, dz: true, rx: true, ry: true, rz: true };
export const PINNED_SUPPORT: CemRestraintDOF = { dx: true, dy: true, dz: true, rx: false, ry: false, rz: false };
export const ROLLER_X_SUPPORT: CemRestraintDOF = { dx: false, dy: true, dz: true, rx: false, ry: false, rz: false };

/**
 * Support condition applied to a node.
 * References the node by ID.
 */
export class EngineeringSupport extends BaseEngineeringObject {
  readonly objectType: EngineeringObjectType = 'Support';

  constructor(
    id: string,
    name: string,
    public nodeId: string,
    public restraints: CemRestraintDOF = PINNED_SUPPORT,
    public springs: CemSpringStiffness = {},
    structureId?: string,
  ) {
    super(id, name, structureId);
    this.relationships.references['node'] = nodeId;
    this.relationships.dependencyIds = [nodeId];
  }

  validate(): ValidationResult {
    if (!this.nodeId) {
      return ValidationResult.error(this.identity.id, 'CEM-SUP001', 'Support must reference a node.', 'nodeId');
    }
    const hasAnyRestraint = Object.values(this.restraints).some(Boolean);
    if (!hasAnyRestraint) {
      return ValidationResult.warning(this.identity.id, 'CEM-SUP002', 'Support has no active restraints — it has no structural effect.');
    }
    return ValidationResult.ok(this.identity.id);
  }
}
