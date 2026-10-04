import * as THREE from 'three';
import type { LoadPatternType } from '@beamstudio/engineering-model';
import { PointLoadMeshBuilder } from './PointLoadMeshBuilder';

export interface DistributedLoadDefinition {
  id: string;
  memberId: string;
  startPoint: THREE.Vector3;
  endPoint: THREE.Vector3;
  direction?: THREE.Vector3; // Default (0, 0, -1) for gravity
  wStart: number; // N/m (e.g. 15000 for 15 kN/m)
  wEnd?: number; // N/m (if omitted, uniform UDL wEnd = wStart)
  pattern: LoadPatternType;
  label?: string;
}

/**
 * 3D procedural visual builder for distributed member loads (UDL and trapezoidal loads).
 * Generates an array of load arrows, connecting envelope top line, and translucent load curtain.
 */
export class DistributedLoadMeshBuilder {
  /**
   * Builds the complete 3D Object3D for a distributed line load.
   */
  public static buildDistributedLoadObject(
    load: DistributedLoadDefinition,
    scale = 1.0,
    showLabel = true,
  ): THREE.Object3D {
    const group = new THREE.Group();
    group.name = `DistLoad-${load.id}`;
    group.userData = { loadId: load.id, pattern: load.pattern, entityType: 'load' };

    const color = PointLoadMeshBuilder.PATTERN_COLORS[load.pattern] ?? 0xf59e0b;
    const w1 = load.wStart;
    const w2 = load.wEnd ?? w1;
    const maxW = Math.max(Math.abs(w1), Math.abs(w2));

    if (maxW < 1e-4) return group;

    // Load direction vector (default downward along -Z)
    const dir = (load.direction ?? new THREE.Vector3(0, 0, -1)).clone().normalize();

    // Height of the load envelope in 3D meters
    const maxEnvelopeHeight = Math.max(0.4, Math.min(1.8, Math.log10(maxW + 1) * 0.4 + 0.2)) * scale;
    const h1 = (Math.abs(w1) / maxW) * maxEnvelopeHeight;
    const h2 = (Math.abs(w2) / maxW) * maxEnvelopeHeight;

    const p1 = load.startPoint;
    const p2 = load.endPoint;
    const memberVec = new THREE.Vector3().subVectors(p2, p1);
    const spanLength = memberVec.length();
    if (spanLength < 0.01) return group;

    // Opposite vector pointing from beam surface upward to load envelope top
    const upVec = dir.clone().negate();

    // Calculate number of arrow subdivisions along span (~1 arrow every 0.6m to 1.0m)
    const numArrows = Math.max(3, Math.min(15, Math.round(spanLength / 0.75)));
    const tailPoints: THREE.Vector3[] = [];
    const basePoints: THREE.Vector3[] = [];

    for (let i = 0; i < numArrows; i++) {
      const t = i / (numArrows - 1);
      const basePos = new THREE.Vector3().lerpVectors(p1, p2, t);
      const curH = THREE.MathUtils.lerp(h1, h2, t);
      const tailPos = basePos.clone().add(upVec.clone().multiplyScalar(curH));

      basePoints.push(basePos);
      tailPoints.push(tailPos);

      if (curH > 0.05) {
        // Create downward pointing arrow from tail to base
        const arrow = new THREE.ArrowHelper(
          dir,
          tailPos,
          curH,
          color,
          Math.min(0.25 * curH, 0.22 * scale),
          Math.min(0.15 * curH, 0.12 * scale),
        );
        group.add(arrow);
      }
    }

    // Top boundary line connecting the arrow tails
    const topLineGeom = new THREE.BufferGeometry().setFromPoints(tailPoints);
    const lineMat = new THREE.LineBasicMaterial({ color, linewidth: 2.5 });
    const topLine = new THREE.Line(topLineGeom, lineMat);
    group.add(topLine);

    // Translucent filled polygon curtain beneath the top line
    const curtainGeom = new THREE.BufferGeometry();
    const positions: number[] = [];

    for (let i = 0; i < numArrows - 1; i++) {
      const b0 = basePoints[i]!;
      const b1 = basePoints[i + 1]!;
      const t0 = tailPoints[i]!;
      const t1 = tailPoints[i + 1]!;

      // Quad triangle 1: b0, t0, t1
      positions.push(b0.x, b0.y, b0.z, t0.x, t0.y, t0.z, t1.x, t1.y, t1.z);
      // Quad triangle 2: b0, t1, b1
      positions.push(b0.x, b0.y, b0.z, t1.x, t1.y, t1.z, b1.x, b1.y, b1.z);
    }

    curtainGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    curtainGeom.computeVertexNormals();

    const curtainMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const curtainMesh = new THREE.Mesh(curtainGeom, curtainMat);
    group.add(curtainMesh);

    // Magnitude billboard callout at midspan
    if (showLabel) {
      const midTail = new THREE.Vector3()
        .lerpVectors(tailPoints[0]!, tailPoints[tailPoints.length - 1]!, 0.5)
        .add(upVec.clone().multiplyScalar(0.2 * scale));

      const text = load.label ?? (w1 === w2
        ? `${(w1 / 1000).toFixed(1)} kN/m`
        : `${(w1 / 1000).toFixed(1)} → ${(w2 / 1000).toFixed(1)} kN/m`);

      const sprite = this.createLoadLabelSprite(text, color, 0.45 * scale);
      sprite.position.copy(midTail);
      group.add(sprite);
    }

    return group;
  }

  private static createLoadLabelSprite(text: string, colorHex: number, size: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      const hex = '#' + colorHex.toString(16).padStart(6, '0');
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.roundRect(4, 4, 152, 40, 6);
      ctx.fill();
      ctx.strokeStyle = hex;
      ctx.lineWidth = 2;
      ctx.roundRect(4, 4, 152, 40, 6);
      ctx.stroke();

      ctx.fillStyle = hex;
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 80, 24);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      depthTest: false,
      transparent: true,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(size * 2.4, size * 0.75, 1);
    return sprite;
  }
}
