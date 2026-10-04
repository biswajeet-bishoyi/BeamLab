import * as THREE from 'three';
import type { LoadPatternType } from '@beamstudio/engineering-model';
import { PointLoadMeshBuilder } from './PointLoadMeshBuilder';
import type { PlateDefinition } from '../geometry';

export interface SurfaceLoadDefinition {
  id: string;
  plateId: string;
  pressure: number; // N/m² (e.g. 3500 for 3.5 kN/m²)
  pattern: LoadPatternType;
  direction?: THREE.Vector3; // Default (0, 0, -1) downward
  label?: string;
}

/**
 * 3D procedural visual builder for surface area/pressure loads on slabs and plates.
 */
export class SurfaceLoadMeshBuilder {
  /**
   * Builds the 3D Object3D representing a surface pressure load distributed across a plate.
   */
  public static buildSurfaceLoadObject(
    load: SurfaceLoadDefinition,
    plate: PlateDefinition,
    scale = 1.0,
    showLabel = true,
  ): THREE.Object3D {
    const group = new THREE.Group();
    group.name = `SurfaceLoad-${load.id}`;
    group.userData = { loadId: load.id, plateId: plate.id, pattern: load.pattern, entityType: 'load' };

    const color = PointLoadMeshBuilder.PATTERN_COLORS[load.pattern] ?? 0xf59e0b;
    const pts = plate.cornerPoints;
    if (pts.length < 3) return group;

    const dir = (load.direction ?? new THREE.Vector3(0, 0, -1)).clone().normalize();
    const arrowLength = Math.max(0.4, Math.min(1.2, Math.log10(load.pressure + 1) * 0.3)) * scale;

    // Centroid of the plate
    const center = new THREE.Vector3();
    pts.forEach((p) => center.add(p));
    center.divideScalar(pts.length);

    // Compute polygon normal
    const v01 = new THREE.Vector3().subVectors(pts[1]!, pts[0]!);
    const v02 = new THREE.Vector3().subVectors(pts[2]!, pts[0]!);
    const normal = new THREE.Vector3().crossVectors(v01, v02).normalize();

    // Elevation offset above plate surface
    const surfaceOffset = normal.clone().multiplyScalar(plate.thickness / 2 + 0.02);

    // Grid of small arrows across the slab
    if (pts.length === 4) {
      const p00 = pts[0]!.clone().add(surfaceOffset);
      const p10 = pts[1]!.clone().add(surfaceOffset);
      const p11 = pts[2]!.clone().add(surfaceOffset);
      const p01 = pts[3]!.clone().add(surfaceOffset);

      for (let u = 0.2; u <= 0.8; u += 0.3) {
        for (let v = 0.2; v <= 0.8; v += 0.3) {
          const pt = new THREE.Vector3()
            .addScaledVector(p00, (1 - u) * (1 - v))
            .addScaledVector(p10, u * (1 - v))
            .addScaledVector(p11, u * v)
            .addScaledVector(p01, (1 - u) * v);

          const tail = pt.clone().sub(dir.clone().multiplyScalar(arrowLength));
          const arrow = new THREE.ArrowHelper(
            dir,
            tail,
            arrowLength,
            color,
            arrowLength * 0.25,
            arrowLength * 0.12,
          );
          group.add(arrow);
        }
      }
    } else {
      // Fallback single center arrow for non-quad plates
      const pt = center.clone().add(surfaceOffset);
      const tail = pt.clone().sub(dir.clone().multiplyScalar(arrowLength));
      const arrow = new THREE.ArrowHelper(
        dir,
        tail,
        arrowLength,
        color,
        arrowLength * 0.25,
        arrowLength * 0.12,
      );
      group.add(arrow);
    }

    // Centered label callout
    if (showLabel) {
      const text = load.label ?? `${(load.pressure / 1000).toFixed(1)} kN/m²`;
      const sprite = this.createLoadLabelSprite(text, color, 0.45 * scale);
      sprite.position.copy(center).add(surfaceOffset).add(new THREE.Vector3(0, 0, arrowLength + 0.15 * scale));
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
