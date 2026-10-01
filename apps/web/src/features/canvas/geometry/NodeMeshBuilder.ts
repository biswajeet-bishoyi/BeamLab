import * as THREE from 'three';
import type { StructuralNode } from '@beamlab/engineering-model';

export interface NodeVisualOptions {
  isSupported?: boolean;
  isSelected?: boolean;
  showLabels?: boolean;
  nodeRadius?: number;
}

/**
 * 3D visual builder for structural joints/nodes and billboarding ID labels.
 */
export class NodeMeshBuilder {
  private static normalMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7, // sky-600
    roughness: 0.3,
    metalness: 0.6,
  });

  private static supportedMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b, // amber-500
    roughness: 0.3,
    metalness: 0.7,
  });

  private static selectedMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8, // sky-400
    roughness: 0.2,
    metalness: 0.8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.5,
  });

  private static sphereGeom = new THREE.SphereGeometry(1, 16, 16);

  /**
   * Builds the 3D spherical node mesh and optional text billboard.
   */
  public static buildNodeObject(
    node: StructuralNode,
    options: NodeVisualOptions = {},
  ): THREE.Object3D {
    const radius = options.nodeRadius ?? 0.045;
    const group = new THREE.Group();
    group.name = `Node-${node.identity.id}`;
    group.position.set(node.x, node.y, node.z);
    group.userData = {
      nodeId: node.identity.id,
      name: node.identity.name,
      entityType: 'node',
    };

    let mat = this.normalMat;
    if (options.isSelected) mat = this.selectedMat;
    else if (options.isSupported) mat = this.supportedMat;

    const sphere = new THREE.Mesh(this.sphereGeom, mat);
    sphere.scale.setScalar(radius);
    sphere.userData = { entityType: 'node', entityId: node.identity.id };
    group.add(sphere);

    if (options.showLabels) {
      const labelText = node.nodeNumber !== undefined ? `N${node.nodeNumber}` : node.identity.name;
      const sprite = this.createLabelSprite(labelText, radius * 1.5);
      sprite.position.set(0, 0, radius * 2.2);
      group.add(sprite);
    }

    return group;
  }

  /**
   * Generates a billboard sprite from an in-memory 2D canvas texture.
   */
  private static createLabelSprite(text: string, size: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.roundRect(4, 4, 120, 56, 8);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.roundRect(4, 4, 120, 56, 8);
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 64, 32);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      depthTest: false,
      transparent: true,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(size * 2, size, 1);
    return sprite;
  }
}
