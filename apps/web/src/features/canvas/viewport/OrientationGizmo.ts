/**
 * BeamLab B2.1 — 3D Viewport Orientation Gizmo
 *
 * Renders a synchronized 3D coordinate axis indicator in the corner of the viewport
 * with clickable axis terminals for instant orthographic snapping.
 */

import * as THREE from 'three';
import type { ViewOrientation } from './CameraManager';

export class OrientationGizmo {
  private readonly _scene: THREE.Scene;
  private readonly _camera: THREE.OrthographicCamera;
  private readonly _size: number = 100; // pixels
  private readonly _axesGroup: THREE.Group;
  private readonly _raycaster: THREE.Raycaster = new THREE.Raycaster();
  private readonly _axisSpheres: Array<{ mesh: THREE.Mesh; view: ViewOrientation }> = [];

  public onSnapOrientation?: (view: ViewOrientation) => void;

  constructor() {
    this._scene = new THREE.Scene();

    // Orthographic camera looking down
    this._camera = new THREE.OrthographicCamera(-1.8, 1.8, 1.8, -1.8, 0.1, 50);
    this._camera.position.set(0, 0, 10);

    this._axesGroup = new THREE.Group();
    this._scene.add(this._axesGroup);

    this._createGizmoGeometry();
  }

  private _createGizmoGeometry(): void {
    const axisLen = 1.0;
    const sphereRadius = 0.15;

    // +X (Red)
    this._addAxis(new THREE.Vector3(axisLen, 0, 0), 0xef4444, 'Right', sphereRadius);
    // -X
    this._addAxis(new THREE.Vector3(-axisLen, 0, 0), 0x7f1d1d, 'Right', sphereRadius * 0.7);

    // +Y (Green)
    this._addAxis(new THREE.Vector3(0, axisLen, 0), 0x22c55e, 'Front', sphereRadius);
    // -Y
    this._addAxis(new THREE.Vector3(0, -axisLen, 0), 0x14532d, 'Front', sphereRadius * 0.7);

    // +Z (Blue - Vertical)
    this._addAxis(new THREE.Vector3(0, 0, axisLen), 0x3b82f6, 'Top', sphereRadius);
    // -Z
    this._addAxis(new THREE.Vector3(0, 0, -axisLen), 0x1e3a8a, 'Top', sphereRadius * 0.7);

    // Central origin sphere
    const centerGeo = new THREE.SphereGeometry(sphereRadius * 0.9, 16, 16);
    const centerMat = new THREE.MeshBasicMaterial({ color: 0x64748b });
    const centerMesh = new THREE.Mesh(centerGeo, centerMat);
    this._axesGroup.add(centerMesh);
  }

  private _addAxis(dir: THREE.Vector3, color: number, view: ViewOrientation, radius: number): void {
    // Line stem
    const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), dir]);
    const lineMat = new THREE.LineBasicMaterial({ color, linewidth: 2 });
    const line = new THREE.Line(lineGeo, lineMat);
    this._axesGroup.add(line);

    // Terminal terminal sphere
    const sphereGeo = new THREE.SphereGeometry(radius, 16, 16);
    const sphereMat = new THREE.MeshBasicMaterial({ color });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.position.copy(dir);
    this._axesGroup.add(sphere);

    this._axisSpheres.push({ mesh: sphere, view });
  }

  /**
   * Render the gizmo in the bottom-right or top-right corner of the canvas.
   */
  public render(renderer: THREE.WebGLRenderer, mainCamera: THREE.Camera): void {
    // Synchronize rotation with main camera
    this._axesGroup.quaternion.copy(mainCamera.quaternion).invert();

    const canvasWidth = renderer.domElement.clientWidth;
    const canvasHeight = renderer.domElement.clientHeight;

    const x = canvasWidth - this._size - 16;
    const y = 16; // bottom margin

    renderer.clearDepth();
    renderer.setScissorTest(true);
    renderer.setScissor(x, y, this._size, this._size);
    renderer.setViewport(x, y, this._size, this._size);

    renderer.render(this._scene, this._camera);

    // Restore full viewport
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, canvasWidth, canvasHeight);
  }

  /**
   * Test if user clicked within the gizmo corner and trigger snapping.
   */
  public handleClick(clientX: number, clientY: number, containerRect: DOMRect): boolean {
    const xInCanvas = clientX - containerRect.left;
    const yInCanvas = containerRect.bottom - clientY; // WebGL Y is bottom-up

    const gizmoX = containerRect.width - this._size - 16;
    const gizmoY = 16;

    if (
      xInCanvas >= gizmoX &&
      xInCanvas <= gizmoX + this._size &&
      yInCanvas >= gizmoY &&
      yInCanvas <= gizmoY + this._size
    ) {
      // Normalized device coords inside the gizmo viewport
      const ndcX = ((xInCanvas - gizmoX) / this._size) * 2 - 1;
      const ndcY = ((yInCanvas - gizmoY) / this._size) * 2 - 1;

      this._raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this._camera);
      const meshes = this._axisSpheres.map(a => a.mesh);
      const hits = this._raycaster.intersectObjects(meshes);

      if (hits.length > 0) {
        const hit = hits[0]!;
        const matched = this._axisSpheres.find(a => a.mesh === hit.object);
        if (matched) {
          this.onSnapOrientation?.(matched.view);
          return true;
        }
      }
      return true;
    }
    return false;
  }

  public dispose(): void {
    this._scene.traverse(obj => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else if (obj.material) {
          obj.material.dispose();
        }
      }
    });
  }
}
