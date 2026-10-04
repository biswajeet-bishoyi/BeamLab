import * as THREE from 'three';
import type { NodeDisplacement } from '@beamstudio/engineering-model';

export interface DisplacementVector {
  dx: number;
  dy: number;
  dz: number;
  rx?: number;
  ry?: number;
  rz?: number;
}

/**
 * Mathematical engine for computing realistic deflected structural shapes
 * using cubic Hermite polynomial interpolation and continuous strain/deflection colormaps.
 */
export class DeformationEngine {
  /**
   * Evaluates cubic Hermite interpolation between two deflected nodes along member length.
   * s is normalized length parameter from 0.0 to 1.0.
   */
  public static interpolateHermite(
    p1: THREE.Vector3,
    p2: THREE.Vector3,
    u1: DisplacementVector,
    u2: DisplacementVector,
    s: number,
    scale = 1.0,
  ): { position: THREE.Vector3; displacement: THREE.Vector3; magnitude: number } {
    const clampedS = Math.max(0, Math.min(1, s));
    const s2 = clampedS * clampedS;
    const s3 = s2 * clampedS;

    // Hermite basis functions
    const h1 = 2 * s3 - 3 * s2 + 1; // 1 at s=0, 0 at s=1
    const h2 = -2 * s3 + 3 * s2; // 0 at s=0, 1 at s=1
    const h3 = s3 - 2 * s2 + clampedS; // slope at s=0
    const h4 = s3 - s2; // slope at s=1

    const spanVec = new THREE.Vector3().subVectors(p2, p1);
    const length = spanVec.length();

    // Rotations scaled by length for dimensional consistency with displacements
    const theta1Y = (u1.ry ?? 0) * length;
    const theta2Y = (u2.ry ?? 0) * length;
    const theta1Z = (u1.rz ?? 0) * length;
    const theta2Z = (u2.rz ?? 0) * length;

    // Interpolate displacements in 3D
    const dx = THREE.MathUtils.lerp(u1.dx, u2.dx, clampedS);
    const dy = h1 * u1.dy + h2 * u2.dy + (h3 * theta1Z + h4 * theta2Z) * 0.1;
    const dz = h1 * u1.dz + h2 * u2.dz + (h3 * theta1Y + h4 * theta2Y) * 0.1;

    const disp = new THREE.Vector3(dx, dy, dz).multiplyScalar(scale);
    const undeformedPos = new THREE.Vector3().lerpVectors(p1, p2, clampedS);
    const deformedPos = undeformedPos.clone().add(disp);

    // Total displacement magnitude in meters (unscaled)
    const magnitude = Math.hypot(dx, dy, dz);

    return {
      position: deformedPos,
      displacement: disp,
      magnitude,
    };
  }

  /**
   * Generates continuous rainbow/heatmap vertex colors from normalized value [0.0, 1.0].
   * 0.0 = Pure Blue (zero displacement)
   * 0.25 = Cyan
   * 0.5 = Green
   * 0.75 = Yellow
   * 1.0 = Red (peak displacement)
   */
  public static getHeatmapColor(normalizedVal: number): THREE.Color {
    const t = Math.max(0, Math.min(1, normalizedVal));
    const color = new THREE.Color();

    if (t < 0.25) {
      // Blue to Cyan
      const localT = t / 0.25;
      color.setRGB(0, localT, 1);
    } else if (t < 0.5) {
      // Cyan to Green
      const localT = (t - 0.25) / 0.25;
      color.setRGB(0, 1, 1 - localT);
    } else if (t < 0.75) {
      // Green to Yellow
      const localT = (t - 0.5) / 0.25;
      color.setRGB(localT, 1, 0);
    } else {
      // Yellow to Red
      const localT = (t - 0.75) / 0.25;
      color.setRGB(1, 1 - localT, 0);
    }

    return color;
  }

  /**
   * Computes max displacement across an array of node displacements.
   */
  public static computeMaxDisplacement(displacements: NodeDisplacement[]): number {
    let maxD = 0;
    for (const d of displacements) {
      const mag = Math.hypot(d.dx, d.dy, d.dz);
      if (mag > maxD) maxD = mag;
    }
    return maxD;
  }
}
