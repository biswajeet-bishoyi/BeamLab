import * as THREE from 'three';

/**
 * 3D visual builder for Member Local Coordinate System (LCS) triads.
 * Displays local x (red/longitudinal), local y (green/strong axis), local z (blue/weak axis).
 */
export class LCSGizmoBuilder {
  /**
   * Creates an LCS triad at the midpoint of a member.
   */
  public static buildLCSGizmo(
    origin: THREE.Vector3,
    xAxis: THREE.Vector3,
    yAxis: THREE.Vector3,
    zAxis: THREE.Vector3,
    arrowLength: number = 0.4,
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = 'LCS-Triad';

    const headLength = arrowLength * 0.25;
    const headWidth = arrowLength * 0.12;

    // Local X (Red - Longitudinal)
    const arrowX = new THREE.ArrowHelper(
      xAxis,
      origin,
      arrowLength,
      0xef4444, // red-500
      headLength,
      headWidth,
    );

    // Local Y (Green - Strong axis)
    const arrowY = new THREE.ArrowHelper(
      yAxis,
      origin,
      arrowLength,
      0x22c55e, // green-500
      headLength,
      headWidth,
    );

    // Local Z (Blue - Weak axis)
    const arrowZ = new THREE.ArrowHelper(
      zAxis,
      origin,
      arrowLength,
      0x3b82f6, // blue-500
      headLength,
      headWidth,
    );

    group.add(arrowX, arrowY, arrowZ);
    return group;
  }
}
