import * as THREE from 'three';
import type {
  StructuralMember,
  StructuralNode,
  SectionProfile,
  StructuralMaterial,
  MemberType,
} from '@beamlab/engineering-model';
import { ProfileGeometryBuilder } from './ProfileGeometryBuilder';

export interface MemberVisualOptions {
  renderMode: 'extruded' | 'centerline';
  showReleases?: boolean;
  highlightSelected?: boolean;
}

/**
 * Builds 3D visual representations (extruded volumetric mesh or centerline wireframe)
 * for structural frame members with physically accurate local coordinate alignment.
 */
export class MemberMeshBuilder {
  // Shared PBR materials for high-efficiency batch rendering
  private static materials: Record<string, THREE.MeshStandardMaterial> = {
    steel: new THREE.MeshStandardMaterial({
      color: 0x3d4a58,
      roughness: 0.35,
      metalness: 0.85,
    }),
    concrete: new THREE.MeshStandardMaterial({
      color: 0x949ba2,
      roughness: 0.9,
      metalness: 0.05,
    }),
    timber: new THREE.MeshStandardMaterial({
      color: 0x9e724a,
      roughness: 0.75,
      metalness: 0.0,
    }),
    aluminum: new THREE.MeshStandardMaterial({
      color: 0xcfd6dc,
      roughness: 0.25,
      metalness: 0.95,
    }),
    default: new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.5,
      metalness: 0.5,
    }),
    selected: new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.2,
      metalness: 0.7,
      emissive: 0x0284c7,
      emissiveIntensity: 0.4,
    }),
  };

  // Line materials for centerline mode
  private static lineMaterials: Record<MemberType | 'default', THREE.LineBasicMaterial> = {
    Beam: new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 }),
    Column: new THREE.LineBasicMaterial({ color: 0x34d399, linewidth: 2 }),
    Brace: new THREE.LineBasicMaterial({ color: 0xfbbf24, linewidth: 2 }),
    Truss: new THREE.LineBasicMaterial({ color: 0xa78bfa, linewidth: 2 }),
    Tie: new THREE.LineBasicMaterial({ color: 0xf472b6, linewidth: 2 }),
    Strut: new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 }),
    Rafter: new THREE.LineBasicMaterial({ color: 0x60a5fa, linewidth: 2 }),
    Purlin: new THREE.LineBasicMaterial({ color: 0x94a3b8, linewidth: 1 }),
    Foundation: new THREE.LineBasicMaterial({ color: 0x64748b, linewidth: 2 }),
    Custom: new THREE.LineBasicMaterial({ color: 0x94a3b8, linewidth: 1 }),
    default: new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 }),
  };

  /**
   * Computes the 3D local coordinate frame for a member spanning from P1 to P2.
   * Returns { xAxis, yAxis, zAxis, length, transformMatrix }.
   */
  public static computeLocalFrame(
    p1: THREE.Vector3,
    p2: THREE.Vector3,
    rollAngleDeg: number = 0,
  ): {
    xAxis: THREE.Vector3;
    yAxis: THREE.Vector3;
    zAxis: THREE.Vector3;
    length: number;
    matrix: THREE.Matrix4;
  } {
    const delta = new THREE.Vector3().subVectors(p2, p1);
    const length = delta.length();
    const xAxis = delta.clone().normalize();

    // Canonical structural orientation:
    // When member is horizontal/inclined: local Y (depth) points toward global +Z.
    // When member is vertical (along global Z): local Y points toward global +Y.
    let yAxis = new THREE.Vector3();
    let zAxis = new THREE.Vector3();

    const isVertical = Math.abs(xAxis.z) > 0.9999;
    if (isVertical) {
      // For vertical columns running along +/- Z:
      // If going +Z: local Y = (0, 1, 0), local Z = (-1, 0, 0)
      const sign = xAxis.z > 0 ? 1 : -1;
      yAxis.set(0, sign, 0);
      zAxis.crossVectors(xAxis, yAxis).normalize();
    } else {
      // Global Z is (0, 0, 1)
      const globalZ = new THREE.Vector3(0, 0, 1);
      // zAxis is horizontal perpendicular: xAxis x globalZ
      zAxis.crossVectors(xAxis, globalZ).normalize();
      // yAxis points upward along depth: zAxis x xAxis
      yAxis.crossVectors(zAxis, xAxis).normalize();
    }

    // Apply roll angle (beta angle) around local xAxis
    if (rollAngleDeg !== 0) {
      const rad = THREE.MathUtils.degToRad(rollAngleDeg);
      yAxis.applyAxisAngle(xAxis, rad);
      zAxis.applyAxisAngle(xAxis, rad);
    }

    // Construct 4x4 orientation matrix with column vectors [xAxis, yAxis, zAxis, p1]
    const matrix = new THREE.Matrix4();
    matrix.makeBasis(xAxis, yAxis, zAxis);
    matrix.setPosition(p1);

    return { xAxis, yAxis, zAxis, length, matrix };
  }

  /**
   * Builds the complete visual Object3D for a structural member.
   */
  public static buildMemberObject(
    member: StructuralMember,
    startNode: StructuralNode,
    endNode: StructuralNode,
    profile?: SectionProfile,
    material?: StructuralMaterial,
    options: MemberVisualOptions = { renderMode: 'extruded' },
  ): THREE.Object3D {
    const p1 = new THREE.Vector3(startNode.x, startNode.y, startNode.z);
    const p2 = new THREE.Vector3(endNode.x, endNode.y, endNode.z);

    const rollAngle = member.orientation?.rollAngleDeg ?? 0;
    const { length, matrix } = this.computeLocalFrame(p1, p2, rollAngle);

    const group = new THREE.Group();
    group.name = `Member-${member.identity.id}`;
    group.userData = {
      memberId: member.identity.id,
      name: member.identity.name,
      type: member.memberType,
      length,
    };

    if (options.renderMode === 'extruded' && profile) {
      // Extruded 3D solid geometry
      const geom = ProfileGeometryBuilder.createGeometry(
        profile.type,
        profile.dimensions,
        length,
      );

      const mat = options.highlightSelected
        ? this.materials.selected
        : this.resolveMaterial(material?.category);

      const mesh = new THREE.Mesh(geom, mat);
      mesh.applyMatrix4(matrix);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { entityType: 'member', entityId: member.identity.id };
      group.add(mesh);

      // Subtle edge outlines for architectural clarity
      const wireframeGeom = new THREE.EdgesGeometry(geom, 25);
      const wireframeMat = new THREE.LineBasicMaterial({
        color: 0x1e293b,
        linewidth: 1,
        transparent: true,
        opacity: 0.4,
      });
      const wireMesh = new THREE.LineSegments(wireframeGeom, wireframeMat);
      wireMesh.applyMatrix4(matrix);
      group.add(wireMesh);
    } else {
      // Centerline wireframe mode
      const lineGeom = new THREE.BufferGeometry().setFromPoints([p1, p2]);
      const lineMat = options.highlightSelected
        ? new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 3 })
        : (this.lineMaterials[member.memberType] ?? this.lineMaterials.default);

      const line = new THREE.Line(lineGeom, lineMat);
      line.userData = { entityType: 'member', entityId: member.identity.id };
      group.add(line);
    }

    // End-release indicators (moment releases at start or end)
    if (options.showReleases && member.releases) {
      if (member.releases.startReleases?.Mz || member.releases.startReleases?.My) {
        const hinge1 = this.createHingeGlyph(p1);
        group.add(hinge1);
      }
      if (member.releases.endReleases?.Mz || member.releases.endReleases?.My) {
        const hinge2 = this.createHingeGlyph(p2);
        group.add(hinge2);
      }
    }

    return group;
  }

  private static resolveMaterial(category?: string): THREE.MeshStandardMaterial {
    switch (category) {
      case 'Steel':
        return this.materials.steel;
      case 'Concrete':
        return this.materials.concrete;
      case 'Timber':
        return this.materials.timber;
      case 'Aluminum':
        return this.materials.aluminum;
      default:
        return this.materials.steel;
    }
  }

  private static createHingeGlyph(position: THREE.Vector3): THREE.Mesh {
    const geom = new THREE.SphereGeometry(0.04, 12, 12);
    const mat = new THREE.MeshBasicMaterial({ color: 0xfacc15, wireframe: true });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(position);
    return mesh;
  }
}
