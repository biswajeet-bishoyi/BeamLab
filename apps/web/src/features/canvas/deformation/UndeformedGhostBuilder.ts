import * as THREE from 'three';
import type { StructuralSystem } from '@beamlab/engineering-model';

/**
 * Builds ghosted semi-translucent wireframes of the undeformed structural model
 * to serve as a baseline visual reference during deformation analysis.
 */
export class UndeformedGhostBuilder {
  private static ghostMaterial = new THREE.LineBasicMaterial({
    color: 0x64748b, // slate-500
    transparent: true,
    opacity: 0.35,
    linewidth: 1,
  });

  /**
   * Generates a single batched LineSegments mesh of all members in the system.
   */
  public static buildGhostMesh(system: StructuralSystem): THREE.Object3D {
    const points: THREE.Vector3[] = [];

    for (const member of system.members.values()) {
      const n1 = system.getNode(member.startNodeId);
      const n2 = system.getNode(member.endNodeId);
      if (n1 && n2) {
        points.push(new THREE.Vector3(n1.x, n1.y, n1.z));
        points.push(new THREE.Vector3(n2.x, n2.y, n2.z));
      }
    }

    const geom = new THREE.BufferGeometry().setFromPoints(points);
    const lineSegments = new THREE.LineSegments(geom, this.ghostMaterial);
    lineSegments.name = 'UndeformedGhostWireframe';

    return lineSegments;
  }
}
