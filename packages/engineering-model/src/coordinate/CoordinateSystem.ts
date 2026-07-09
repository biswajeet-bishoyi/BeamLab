/**
 * Engineering Coordinate Systems for the Structural Domain Model.
 *
 * All geometry in BeamLab must explicitly reference a coordinate system.
 * This enables correct multi-structure models, local member axes,
 * survey imports, and future BIM/IFC alignment.
 */

// ─── Axis definition ─────────────────────────────────────────────────────────

export interface EngineeringAxis {
  /** Direction cosines defining the axis (must be unit vector) */
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly label?: string; // e.g., "X", "Y1", "Local-Z"
}

export const GLOBAL_X_AXIS: EngineeringAxis = { x: 1, y: 0, z: 0, label: 'X' };
export const GLOBAL_Y_AXIS: EngineeringAxis = { x: 0, y: 1, z: 0, label: 'Y' };
export const GLOBAL_Z_AXIS: EngineeringAxis = { x: 0, y: 0, z: 1, label: 'Z' };

// ─── 3×3 rotation matrix (column-major: [e1 | e2 | e3]) ─────────────────────

export type RotationMatrix = readonly [
  number, number, number, // col 1 — local X direction in global
  number, number, number, // col 2 — local Y direction in global
  number, number, number, // col 3 — local Z direction in global
];

export const IDENTITY_ROTATION: RotationMatrix = [
  1, 0, 0,
  0, 1, 0,
  0, 0, 1,
];

// ─── Coordinate system types ──────────────────────────────────────────────────

export type CoordinateSystemType =
  | 'Global'
  | 'Local'
  | 'Construction'
  | 'Survey'   // future GPS / site-based
  | 'Custom';

// ─── Origin point ─────────────────────────────────────────────────────────────

export interface Point3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export const ORIGIN: Point3D = { x: 0, y: 0, z: 0 };

// ─── Coordinate System ────────────────────────────────────────────────────────

export interface EngineeringCoordinateSystem {
  /** Stable identifier */
  readonly id: string;
  readonly name: string;
  readonly type: CoordinateSystemType;
  /** Origin in the parent (or global) coordinate system */
  readonly origin: Point3D;
  /**
   * Rotation from parent to this CS.
   * Identity = aligned with global axes.
   */
  readonly rotation: RotationMatrix;
  /** Reference to parent CS id (null = Global is the root) */
  readonly parentId?: string;
  readonly description?: string;
}

// ─── Well-known global coordinate system ──────────────────────────────────────

export const GLOBAL_COORDINATE_SYSTEM: EngineeringCoordinateSystem = {
  id: 'cs-global',
  name: 'Global',
  type: 'Global',
  origin: ORIGIN,
  rotation: IDENTITY_ROTATION,
};

// ─── Coordinate System Registry ───────────────────────────────────────────────

export class CoordinateRegistry {
  private readonly _systems: Map<string, EngineeringCoordinateSystem> = new Map([
    ['cs-global', GLOBAL_COORDINATE_SYSTEM],
  ]);

  public register(cs: EngineeringCoordinateSystem): void {
    this._systems.set(cs.id, cs);
  }

  public get(id: string): EngineeringCoordinateSystem | undefined {
    return this._systems.get(id);
  }

  public get global(): EngineeringCoordinateSystem {
    return GLOBAL_COORDINATE_SYSTEM;
  }

  public all(): EngineeringCoordinateSystem[] {
    return Array.from(this._systems.values());
  }

  /** Transform a point from this coordinate system to global */
  public toGlobal(point: Point3D, csId: string): Point3D {
    const cs = this._systems.get(csId);
    if (!cs || cs.type === 'Global') return point;

    const [r00, r10, r20, r01, r11, r21, r02, r12, r22] = cs.rotation;

    // Rotate then translate
    return {
      x: cs.origin.x + r00 * point.x + r01 * point.y + r02 * point.z,
      y: cs.origin.y + r10 * point.x + r11 * point.y + r12 * point.z,
      z: cs.origin.z + r20 * point.x + r21 * point.y + r22 * point.z,
    };
  }
}

// ─── Utility: magnitude of axis vector ────────────────────────────────────────

export function axisNorm(a: EngineeringAxis): number {
  return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
}

export function normalizeAxis(a: EngineeringAxis): EngineeringAxis {
  const n = axisNorm(a);
  if (n === 0) throw new Error('Cannot normalize zero-length axis vector.');
  return { x: a.x / n, y: a.y / n, z: a.z / n, label: a.label };
}
