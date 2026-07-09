import { BaseEngineeringObject, EngineeringObjectType } from '../core/IEngineeringObject';
import { ValidationResult } from '../validation/ValidationResult';

// ─── Degrees of freedom ───────────────────────────────────────────────────────

export interface RestraintDOF {
  /** Translational restraint along X */
  Tx: boolean;
  /** Translational restraint along Y */
  Ty: boolean;
  /** Translational restraint along Z */
  Tz: boolean;
  /** Rotational restraint about X */
  Rx: boolean;
  /** Rotational restraint about Y */
  Ry: boolean;
  /** Rotational restraint about Z */
  Rz: boolean;
}

// ─── Spring stiffness ─────────────────────────────────────────────────────────

export interface SpringStiffness {
  /** Translational spring stiffness [force/length] */
  kTx?: number;
  kTy?: number;
  kTz?: number;
  /** Rotational spring stiffness [moment/radian] */
  kRx?: number;
  kRy?: number;
  kRz?: number;
}

// ─── Support presets ──────────────────────────────────────────────────────────

export type SupportPreset = 'Fixed' | 'Pinned' | 'RollerX' | 'RollerY' | 'RollerZ' | 'Spring' | 'Custom';

export const SUPPORT_PRESETS: Record<SupportPreset, RestraintDOF> = {
  Fixed:   { Tx: true,  Ty: true,  Tz: true,  Rx: true,  Ry: true,  Rz: true  },
  Pinned:  { Tx: true,  Ty: true,  Tz: true,  Rx: false, Ry: false, Rz: false },
  RollerX: { Tx: false, Ty: true,  Tz: true,  Rx: false, Ry: false, Rz: false },
  RollerY: { Tx: true,  Ty: false, Tz: true,  Rx: false, Ry: false, Rz: false },
  RollerZ: { Tx: true,  Ty: true,  Tz: false, Rx: false, Ry: false, Rz: false },
  Spring:  { Tx: false, Ty: false, Tz: false, Rx: false, Ry: false, Rz: false },
  Custom:  { Tx: false, Ty: false, Tz: false, Rx: false, Ry: false, Rz: false },
};

// ─── Nonlinear support hook (future) ─────────────────────────────────────────

export interface NonlinearSupportHook {
  /** Placeholder for nonlinear support characteristics (gap, compression-only, etc.) */
  type: 'GapElement' | 'CompressionOnly' | 'TensionOnly' | 'Friction';
  parameters: Record<string, number>;
}

// ─── Structural Support ───────────────────────────────────────────────────────

export class StructuralSupport extends BaseEngineeringObject {
  readonly objectType: EngineeringObjectType = 'Support';

  nodeId: string;
  preset: SupportPreset;
  restraints: RestraintDOF;
  springs: SpringStiffness;

  /** Reference CS for the spring/restraint directions */
  coordinateSystemId: string;

  /**
   * Future extension: nonlinear support behaviour.
   * Set to undefined for linear supports.
   */
  nonlinearHook?: NonlinearSupportHook;

  constructor(
    id: string,
    name: string,
    nodeId: string,
    preset: SupportPreset = 'Pinned',
    springs: SpringStiffness = {},
    coordinateSystemId = 'cs-global',
    structureId?: string,
  ) {
    super(id, name, structureId);
    this.nodeId = nodeId;
    this.preset = preset;
    this.restraints = { ...SUPPORT_PRESETS[preset] };
    this.springs = springs;
    this.coordinateSystemId = coordinateSystemId;

    this.relationships.references['node'] = nodeId;
    this.relationships.dependencyIds = [nodeId];
  }

  /** Apply a preset, resetting custom restraints */
  applyPreset(preset: SupportPreset): void {
    this.preset = preset;
    this.restraints = { ...SUPPORT_PRESETS[preset] };
  }

  validate(): ValidationResult {
    if (!this.nodeId) {
      return ValidationResult.error(this.identity.id, 'SDM-SUP001', 'Support must reference a node.', 'nodeId');
    }
    const hasAnyRestraint =
      Object.values(this.restraints).some(Boolean) ||
      Object.values(this.springs).some(v => v !== undefined && v > 0);
    if (!hasAnyRestraint) {
      return ValidationResult.warning(this.identity.id, 'SDM-SUP002', 'Support has no active restraints or springs — it has no structural effect.');
    }
    const hasNegativeSpring = Object.values(this.springs).some(v => v !== undefined && v < 0);
    if (hasNegativeSpring) {
      return ValidationResult.error(this.identity.id, 'SDM-SUP003', 'Spring stiffness values must be non-negative.', 'springs');
    }
    return ValidationResult.ok(this.identity.id);
  }
}
