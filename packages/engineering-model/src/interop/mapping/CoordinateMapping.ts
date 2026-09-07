/**
 * BeamLab B1.5 — Interop Coordinate Transformation
 */

import { Point3D } from '../../coordinate/CoordinateSystem';

export interface CoordinateTransformOptions {
  /** Source coordinate system up-axis */
  sourceUpAxis?: 'Y' | 'Z';
  /** Target coordinate system up-axis */
  targetUpAxis?: 'Y' | 'Z';
  /** Length scale factor (e.g. 0.001 to convert millimeters to meters) */
  scaleFactor?: number;
  /** Origin translation offset [m] */
  originOffset?: Point3D;
  /** Rotation angle about vertical axis in degrees */
  rotationAngleDeg?: number;
}

export class CoordinateMapper {
  private readonly _sourceUp: 'Y' | 'Z';
  private readonly _targetUp: 'Y' | 'Z';
  private readonly _scale: number;
  private readonly _offset: Point3D;
  private readonly _cosTheta: number;
  private readonly _sinTheta: number;

  constructor(options: CoordinateTransformOptions = {}) {
    this._sourceUp = options.sourceUpAxis ?? 'Z';
    this._targetUp = options.targetUpAxis ?? 'Z';
    this._scale = options.scaleFactor ?? 1.0;
    this._offset = options.originOffset ?? { x: 0, y: 0, z: 0 };
    const rad = ((options.rotationAngleDeg ?? 0) * Math.PI) / 180.0;
    this._cosTheta = Math.cos(rad);
    this._sinTheta = Math.sin(rad);
  }

  /**
   * Transform an external coordinate point into Canonical SI coordinates.
   */
  toCanonical(point: Point3D): Point3D {
    // 1. Scale
    let x = point.x * this._scale;
    let y = point.y * this._scale;
    let z = point.z * this._scale;

    // 2. Up-Axis conversion (if source is Y-up and target/canonical is Z-up)
    if (this._sourceUp === 'Y' && this._targetUp === 'Z') {
      // Source: X, Y (up), Z (depth) -> Canonical: X, -Z (transverse), Y (up)
      const origY = y;
      const origZ = z;
      y = -origZ;
      z = origY;
    } else if (this._sourceUp === 'Z' && this._targetUp === 'Y') {
      // Source: X, Y, Z (up) -> Target: X, Z (up), -Y
      const origY = y;
      const origZ = z;
      y = origZ;
      z = -origY;
    }

    // 3. Rotation about up-axis
    if (this._cosTheta !== 1.0 || this._sinTheta !== 0.0) {
      const rx = x * this._cosTheta - y * this._sinTheta;
      const ry = x * this._sinTheta + y * this._cosTheta;
      x = rx;
      y = ry;
    }

    // 4. Offset translation
    return {
      x: x + this._offset.x,
      y: y + this._offset.y,
      z: z + this._offset.z,
    };
  }

  /**
   * Transform a Canonical SI coordinate point into external format coordinates.
   */
  toExternal(point: Point3D): Point3D {
    // 1. Subtract offset
    let x = point.x - this._offset.x;
    let y = point.y - this._offset.y;
    let z = point.z - this._offset.z;

    // 2. Reverse rotation
    if (this._cosTheta !== 1.0 || this._sinTheta !== 0.0) {
      const rx = x * this._cosTheta + y * this._sinTheta;
      const ry = -x * this._sinTheta + y * this._cosTheta;
      x = rx;
      y = ry;
    }

    // 3. Reverse Up-Axis
    if (this._sourceUp === 'Y' && this._targetUp === 'Z') {
      const origY = y;
      const origZ = z;
      y = origZ;
      z = -origY;
    } else if (this._sourceUp === 'Z' && this._targetUp === 'Y') {
      const origY = y;
      const origZ = z;
      y = -origZ;
      z = origY;
    }

    // 4. Reverse scale
    return {
      x: x / this._scale,
      y: y / this._scale,
      z: z / this._scale,
    };
  }
}
