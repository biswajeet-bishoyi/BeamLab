import * as THREE from 'three';
import type { LoadPatternType } from '@beamstudio/engineering-model';

export interface PointLoadDefinition {
  id: string;
  nodeId?: string;
  position: THREE.Vector3;
  force?: { fx?: number; fy?: number; fz?: number };
  moment?: { mx?: number; my?: number; mz?: number };
  pattern: LoadPatternType;
  label?: string;
}

/**
 * Procedural 3D visual builder for nodal point loads and moments.
 * Generates vector arrows and curved moment arcs with magnitude billboards.
 */
export class PointLoadMeshBuilder {
  // Pattern-based standard engineering color palette
  public static readonly PATTERN_COLORS: Record<string, number> = {
    Dead: 0xf59e0b, // Amber / Ochre
    SuperimposedDead: 0xd97706, // Dark amber
    Live: 0xef4444, // Crimson red
    ReducibleLive: 0xf87171, // Light red
    Wind: 0x0ea5e9, // Sky blue
    Earthquake: 0xa855f7, // Purple
    Snow: 0x38bdf8, // Ice blue
    Temperature: 0xf97316, // Bright orange
    Custom: 0x10b981, // Emerald
  };

  /**
   * Builds the 3D visual Object3D for a point load or moment.
   */
  public static buildPointLoadObject(
    load: PointLoadDefinition,
    scale = 1.0,
    showLabel = true,
  ): THREE.Object3D {
    const group = new THREE.Group();
    group.name = `PointLoad-${load.id}`;
    group.userData = { loadId: load.id, pattern: load.pattern, entityType: 'load' };

    const color = this.PATTERN_COLORS[load.pattern] ?? 0xf59e0b;

    // 1. Force Vector
    if (load.force) {
      const fx = load.force.fx ?? 0;
      const fy = load.force.fy ?? 0;
      const fz = load.force.fz ?? 0;
      const magnitude = Math.hypot(fx, fy, fz);

      if (magnitude > 1e-4) {
        // Force direction vector
        const dir = new THREE.Vector3(fx, fy, fz).normalize();
        // Arrow length scales logarithmically/linearly to stay readable
        const arrowLength = Math.max(0.6, Math.min(2.5, Math.log10(magnitude + 1) * 0.9 + 0.5)) * scale;

        // By standard structural convention, an applied force pointing at a node
        // has its arrow head at the target position, with tail extending opposite to direction
        const arrowTail = load.position.clone().sub(dir.clone().multiplyScalar(arrowLength));

        const arrow = new THREE.ArrowHelper(
          dir,
          arrowTail,
          arrowLength,
          color,
          arrowLength * 0.28,
          arrowLength * 0.14,
        );
        group.add(arrow);

        if (showLabel) {
          const text = load.label ?? `${(magnitude / 1000).toFixed(1)} kN`;
          const sprite = this.createLoadLabelSprite(text, color, 0.45 * scale);
          sprite.position.copy(arrowTail).add(new THREE.Vector3(0, 0, 0.2 * scale));
          group.add(sprite);
        }
      }
    }

    // 2. Moment Vector (Curved circular arc around axis)
    if (load.moment) {
      const mx = load.moment.mx ?? 0;
      const my = load.moment.my ?? 0;
      const mz = load.moment.mz ?? 0;
      const momentMag = Math.hypot(mx, my, mz);

      if (momentMag > 1e-4) {
        const momentMesh = this.createMomentArc(load.position, new THREE.Vector3(mx, my, mz), color, scale);
        group.add(momentMesh);

        if (showLabel) {
          const text = `${(momentMag / 1000).toFixed(1)} kNm`;
          const sprite = this.createLoadLabelSprite(text, color, 0.4 * scale);
          sprite.position.copy(load.position).add(new THREE.Vector3(0, 0, 0.35 * scale));
          group.add(sprite);
        }
      }
    }

    return group;
  }

  private static createMomentArc(
    center: THREE.Vector3,
    axisVector: THREE.Vector3,
    color: number,
    scale: number,
  ): THREE.Group {
    const g = new THREE.Group();
    const radius = 0.35 * scale;
    const points: THREE.Vector3[] = [];
    const segments = 24;
    const arcAngle = Math.PI * 1.5; // 270 degree arc

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * arcAngle;
      points.push(new THREE.Vector3(Math.cos(theta) * radius, Math.sin(theta) * radius, 0));
    }

    const arcGeom = new THREE.BufferGeometry().setFromPoints(points);
    const arcMat = new THREE.LineBasicMaterial({ color, linewidth: 2.5 });
    const arcLine = new THREE.Line(arcGeom, arcMat);

    // Arrowhead cone at end of arc
    const lastPt = points[points.length - 1]!;
    const prevPt = points[points.length - 2]!;
    const tangent = new THREE.Vector3().subVectors(lastPt, prevPt).normalize();

    const coneGeom = new THREE.ConeGeometry(0.06 * scale, 0.14 * scale, 8);
    coneGeom.rotateX(Math.PI / 2);
    const coneMat = new THREE.MeshBasicMaterial({ color });
    const cone = new THREE.Mesh(coneGeom, coneMat);
    cone.position.copy(lastPt);
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);

    g.add(arcLine, cone);

    // Orient moment arc perpendicular to the moment axis
    const normal = axisVector.clone().normalize();
    const defaultNormal = new THREE.Vector3(0, 0, 1);
    g.quaternion.setFromUnitVectors(defaultNormal, normal);
    g.position.copy(center);

    return g;
  }

  private static createLoadLabelSprite(text: string, colorHex: number, size: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 140;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      const hex = '#' + colorHex.toString(16).padStart(6, '0');
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.roundRect(4, 4, 132, 40, 6);
      ctx.fill();
      ctx.strokeStyle = hex;
      ctx.lineWidth = 2;
      ctx.roundRect(4, 4, 132, 40, 6);
      ctx.stroke();

      ctx.fillStyle = hex;
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 70, 24);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      depthTest: false,
      transparent: true,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(size * 2.2, size * 0.75, 1);
    return sprite;
  }
}
