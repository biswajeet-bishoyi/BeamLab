import * as THREE from 'three';

export interface PlateDefinition {
  id: string;
  name: string;
  cornerPoints: THREE.Vector3[];
  thickness: number; // thickness in meters (e.g. 0.20 for 200mm slab)
  materialCategory?: string;
}

/**
 * 3D visual builder for structural plates, floor slabs, and shear wall shell elements
 * with realistic physical thickness extrusion and boundary edges.
 */
export class PlateMeshBuilder {
  private static slabMat = new THREE.MeshStandardMaterial({
    color: 0x64748b, // slate-500
    roughness: 0.8,
    metalness: 0.1,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide,
  });

  private static edgeMat = new THREE.LineBasicMaterial({
    color: 0x1e293b,
    linewidth: 1.5,
  });

  /**
   * Generates a 3D volumetric extruded plate mesh from an array of coplanar 3D points.
   */
  public static buildPlateObject(plate: PlateDefinition): THREE.Object3D {
    const group = new THREE.Group();
    group.name = `Plate-${plate.id}`;
    group.userData = {
      plateId: plate.id,
      name: plate.name,
      thickness: plate.thickness,
      entityType: 'plate',
    };

    const pts = plate.cornerPoints;
    if (pts.length < 3) return group;

    // Calculate normal vector of the polygon
    const v01 = new THREE.Vector3().subVectors(pts[1], pts[0]);
    const v02 = new THREE.Vector3().subVectors(pts[2], pts[0]);
    const normal = new THREE.Vector3().crossVectors(v01, v02).normalize();

    const halfT = Math.max(0.02, plate.thickness / 2);
    const offset = normal.clone().multiplyScalar(halfT);

    // Top and bottom vertex rings
    const topPts = pts.map((p) => new THREE.Vector3().addVectors(p, offset));
    const botPts = pts.map((p) => new THREE.Vector3().subVectors(p, offset));

    const positions: number[] = [];
    const n = pts.length;

    // Helper to push triangle
    const pushTri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    };

    // Triangulate top face (fan triangulation from vertex 0)
    for (let i = 1; i < n - 1; i++) {
      pushTri(topPts[0], topPts[i], topPts[i + 1]);
    }

    // Triangulate bottom face (reverse winding)
    for (let i = 1; i < n - 1; i++) {
      pushTri(botPts[0], botPts[i + 1], botPts[i]);
    }

    // Side faces (quad for each edge)
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      // Top i, Bottom i, Bottom next
      pushTri(topPts[i], botPts[i], botPts[next]);
      // Top i, Bottom next, Top next
      pushTri(topPts[i], botPts[next], topPts[next]);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.computeVertexNormals();

    const mesh = new THREE.Mesh(geom, this.slabMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { entityType: 'plate', entityId: plate.id };
    group.add(mesh);

    // Outline wireframe edges
    const edgePoints: THREE.Vector3[] = [];
    // Top perimeter
    for (let i = 0; i < n; i++) {
      edgePoints.push(topPts[i], topPts[(i + 1) % n]);
    }
    // Bottom perimeter
    for (let i = 0; i < n; i++) {
      edgePoints.push(botPts[i], botPts[(i + 1) % n]);
    }
    // Corner verticals
    for (let i = 0; i < n; i++) {
      edgePoints.push(topPts[i], botPts[i]);
    }

    const edgeGeom = new THREE.BufferGeometry().setFromPoints(edgePoints);
    const edgeLines = new THREE.LineSegments(edgeGeom, this.edgeMat);
    group.add(edgeLines);

    return group;
  }
}
