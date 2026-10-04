import * as THREE from 'three';
import type { StructuralSupport, StructuralNode, SupportPreset } from '@beamstudio/engineering-model';

/**
 * Procedural 3D glyph builder for structural boundary conditions & supports.
 * Generates engineering representations (Fixed base, Pinned pyramid, Roller shoe, Springs).
 */
export class SupportMeshBuilder {
  // Support materials
  private static fixedMat = new THREE.MeshStandardMaterial({
    color: 0x475569, // slate-600
    roughness: 0.6,
    metalness: 0.4,
  });

  private static pinnedMat = new THREE.MeshStandardMaterial({
    color: 0xd97706, // amber-600
    roughness: 0.4,
    metalness: 0.6,
  });

  private static rollerMat = new THREE.MeshStandardMaterial({
    color: 0x2563eb, // blue-600
    roughness: 0.3,
    metalness: 0.7,
  });

  private static rollerCylinderMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8, // slate-400
    roughness: 0.2,
    metalness: 0.8,
  });

  private static springMat = new THREE.LineBasicMaterial({
    color: 0x10b981, // emerald-500
    linewidth: 2,
  });

  /**
   * Builds the 3D support glyph positioned directly beneath the target node.
   */
  public static buildSupportGlyph(
    support: StructuralSupport,
    node: StructuralNode,
    scale: number = 1.0,
  ): THREE.Object3D {
    const group = new THREE.Group();
    group.name = `Support-${support.identity.id}`;
    group.position.set(node.x, node.y, node.z);
    group.scale.setScalar(Math.max(0.2, scale));
    group.userData = {
      supportId: support.identity.id,
      nodeId: node.identity.id,
      preset: support.preset,
      entityType: 'support',
    };

    switch (support.preset) {
      case 'Fixed':
        group.add(this.createFixedGlyph());
        break;

      case 'Pinned':
        group.add(this.createPinnedGlyph());
        break;

      case 'RollerX':
      case 'RollerY':
      case 'RollerZ':
        group.add(this.createRollerGlyph(support.preset));
        break;

      case 'Spring':
        group.add(this.createSpringGlyph());
        break;

      case 'Custom':
      default:
        group.add(this.createCustomGlyph(support));
        break;
    }

    return group;
  }

  /**
   * Fixed support: Steel anchor base plate on concrete footing bed with clamp studs.
   */
  private static createFixedGlyph(): THREE.Group {
    const g = new THREE.Group();

    // Steel base plate (just below node at Z=0)
    const plateGeom = new THREE.BoxGeometry(0.32, 0.32, 0.03);
    plateGeom.translate(0, 0, -0.015);
    const plate = new THREE.Mesh(plateGeom, this.fixedMat);
    g.add(plate);

    // Concrete pedestal footing block
    const footGeom = new THREE.BoxGeometry(0.44, 0.44, 0.14);
    footGeom.translate(0, 0, -0.10);
    const footMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.9,
      metalness: 0.1,
    });
    const footing = new THREE.Mesh(footGeom, footMat);
    g.add(footing);

    // 4 Corner anchor bolts
    const boltGeom = new THREE.CylinderGeometry(0.012, 0.012, 0.04, 8);
    boltGeom.rotateX(Math.PI / 2);
    const boltMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
    const offsets = [-0.11, 0.11];
    for (const ox of offsets) {
      for (const oy of offsets) {
        const bolt = new THREE.Mesh(boltGeom, boltMat);
        bolt.position.set(ox, oy, 0.01);
        g.add(bolt);
      }
    }

    // Hatch line base indicator beneath footing
    const hatchGeom = new THREE.BufferGeometry();
    const points: THREE.Vector3[] = [];
    for (let x = -0.22; x <= 0.22; x += 0.07) {
      points.push(new THREE.Vector3(x, -0.22, -0.17));
      points.push(new THREE.Vector3(x + 0.05, 0.22, -0.17));
    }
    hatchGeom.setFromPoints(points);
    const hatchLines = new THREE.LineSegments(hatchGeom, new THREE.LineBasicMaterial({ color: 0x94a3b8 }));
    g.add(hatchLines);

    return g;
  }

  /**
   * Pinned support: Pyramid pivot with apex at node and base plate below.
   */
  private static createPinnedGlyph(): THREE.Group {
    const g = new THREE.Group();

    // Hinge apex sphere at node
    const sphereGeom = new THREE.SphereGeometry(0.04, 12, 12);
    const sphere = new THREE.Mesh(sphereGeom, this.pinnedMat);
    g.add(sphere);

    // Cone / Pyramid below node (apex at z=0, base at z=-0.22)
    const coneGeom = new THREE.ConeGeometry(0.18, 0.22, 4);
    // ConeGeometry is oriented along +Y by default, apex at +Y/2.
    // Rotate to point down along -Z
    coneGeom.rotateZ(Math.PI);
    coneGeom.rotateX(Math.PI / 2);
    coneGeom.translate(0, 0, -0.11);
    const cone = new THREE.Mesh(coneGeom, this.pinnedMat);
    g.add(cone);

    // Base plate at bottom of pyramid
    const plateGeom = new THREE.BoxGeometry(0.36, 0.36, 0.02);
    plateGeom.translate(0, 0, -0.23);
    const plate = new THREE.Mesh(plateGeom, this.fixedMat);
    g.add(plate);

    return g;
  }

  /**
   * Roller support: Triangular pivot resting on cylindrical rollers with base track.
   */
  private static createRollerGlyph(preset: SupportPreset): THREE.Group {
    const g = new THREE.Group();

    // Hinge sphere at node
    const sphereGeom = new THREE.SphereGeometry(0.035, 12, 12);
    const sphere = new THREE.Mesh(sphereGeom, this.rollerMat);
    g.add(sphere);

    // Triangular shoe
    const coneGeom = new THREE.ConeGeometry(0.16, 0.16, 4);
    coneGeom.rotateZ(Math.PI);
    coneGeom.rotateX(Math.PI / 2);
    coneGeom.translate(0, 0, -0.08);
    const cone = new THREE.Mesh(coneGeom, this.rollerMat);
    g.add(cone);

    // Two parallel rollers (cylinders)
    const cylRadius = 0.025;
    const cylLength = 0.24;
    const cylGeom = new THREE.CylinderGeometry(cylRadius, cylRadius, cylLength, 12);
    // Align cylinders along Y if roller frees translation along X
    if (preset === 'RollerX') {
      cylGeom.rotateX(Math.PI / 2); // Cylinder runs along Y
    } else {
      cylGeom.rotateZ(Math.PI / 2); // Cylinder runs along X
    }

    const roller1 = new THREE.Mesh(cylGeom, this.rollerCylinderMat);
    roller1.position.set(-0.06, 0, -0.16 - cylRadius);
    const roller2 = new THREE.Mesh(cylGeom, this.rollerCylinderMat);
    roller2.position.set(0.06, 0, -0.16 - cylRadius);
    g.add(roller1, roller2);

    // Guide bed plate under rollers
    const trackGeom = new THREE.BoxGeometry(0.36, 0.36, 0.02);
    trackGeom.translate(0, 0, -0.16 - cylRadius * 2 - 0.01);
    const track = new THREE.Mesh(trackGeom, this.fixedMat);
    g.add(track);

    return g;
  }

  /**
   * Spring support: 3D helical coil spring.
   */
  private static createSpringGlyph(): THREE.Group {
    const g = new THREE.Group();

    const points: THREE.Vector3[] = [];
    const coils = 5;
    const radius = 0.08;
    const depth = 0.28;
    const segments = 60;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = t * coils * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const z = -t * depth;
      points.push(new THREE.Vector3(x, y, z));
    }

    const springGeom = new THREE.BufferGeometry().setFromPoints(points);
    const springLine = new THREE.Line(springGeom, this.springMat);
    g.add(springLine);

    // Ground anchor plate
    const plateGeom = new THREE.BoxGeometry(0.24, 0.24, 0.02);
    plateGeom.translate(0, 0, -depth - 0.01);
    const plate = new THREE.Mesh(plateGeom, this.fixedMat);
    g.add(plate);

    return g;
  }

  /**
   * Custom support with directional restraint glyphs.
   */
  private static createCustomGlyph(_support: StructuralSupport): THREE.Group {
    const g = new THREE.Group();
    const cubeGeom = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const cubeMat = new THREE.MeshStandardMaterial({ color: 0x8b5cf6, roughness: 0.5 });
    const cube = new THREE.Mesh(cubeGeom, cubeMat);
    cube.position.set(0, 0, -0.06);
    g.add(cube);
    return g;
  }
}
