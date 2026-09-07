/**
 * BeamLab B2.1 — Multi-Camera Manager
 *
 * Coordinates Perspective and Orthographic projection modes, standard engineering
 * view orientations (Top, Front, Side, Isometric), smooth transitions, and zoom-to-fit.
 */

import * as THREE from 'three';

export type ProjectionMode = 'Perspective' | 'Orthographic';
export type ViewOrientation = 'Isometric' | 'Top' | 'Front' | 'Right';

export class CameraManager {
  public readonly perspectiveCamera: THREE.PerspectiveCamera;
  public readonly orthographicCamera: THREE.OrthographicCamera;
  public activeMode: ProjectionMode = 'Perspective';

  public target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private _orthoFrustumSize: number = 20;

  constructor(aspect: number = 1.6) {
    // 1. Perspective Camera (45 deg FOV, Z-up)
    this.perspectiveCamera = new THREE.PerspectiveCamera(45, aspect, 0.1, 5000);
    this.perspectiveCamera.up.set(0, 0, 1); // BeamLab Canonical Z-up
    this.perspectiveCamera.position.set(16, -20, 14);
    this.perspectiveCamera.lookAt(this.target);

    // 2. Orthographic Camera (Z-up)
    const halfH = this._orthoFrustumSize / 2;
    const halfW = halfH * aspect;
    this.orthographicCamera = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, -5000, 5000);
    this.orthographicCamera.up.set(0, 0, 1);
    this.orthographicCamera.position.copy(this.perspectiveCamera.position);
    this.orthographicCamera.lookAt(this.target);
  }

  public get activeCamera(): THREE.Camera {
    return this.activeMode === 'Perspective' ? this.perspectiveCamera : this.orthographicCamera;
  }

  public setProjectionMode(mode: ProjectionMode, aspect: number): void {
    if (this.activeMode === mode) return;

    if (mode === 'Orthographic') {
      // Synchronize Orthographic camera from Perspective
      const dist = this.perspectiveCamera.position.distanceTo(this.target);
      const vFOV = (this.perspectiveCamera.fov * Math.PI) / 180;
      this._orthoFrustumSize = 2 * Math.tan(vFOV / 2) * dist;

      this.updateAspect(aspect);
      this.orthographicCamera.position.copy(this.perspectiveCamera.position);
      this.orthographicCamera.up.copy(this.perspectiveCamera.up);
      this.orthographicCamera.lookAt(this.target);
      this.orthographicCamera.updateProjectionMatrix();
    } else {
      // Synchronize Perspective camera from Orthographic
      this.perspectiveCamera.position.copy(this.orthographicCamera.position);
      this.perspectiveCamera.up.copy(this.orthographicCamera.up);
      this.perspectiveCamera.lookAt(this.target);
      this.perspectiveCamera.updateProjectionMatrix();
    }

    this.activeMode = mode;
  }

  public setOrientation(view: ViewOrientation, dist: number = 25): void {
    const cam = this.activeCamera;

    switch (view) {
      case 'Isometric':
        cam.up.set(0, 0, 1);
        cam.position.set(dist * 0.7, -dist * 0.9, dist * 0.6).add(this.target);
        break;
      case 'Top':
        // Looking down from +Z (XY plane). Up is +Y so X is horizontally right
        cam.up.set(0, 1, 0);
        cam.position.set(this.target.x, this.target.y, this.target.z + dist);
        break;
      case 'Front':
        // Looking from -Y toward +Y (XZ plane). Up is +Z
        cam.up.set(0, 0, 1);
        cam.position.set(this.target.x, this.target.y - dist, this.target.z);
        break;
      case 'Right':
        // Looking from +X toward -X (YZ plane). Up is +Z
        cam.up.set(0, 0, 1);
        cam.position.set(this.target.x + dist, this.target.y, this.target.z);
        break;
    }

    cam.lookAt(this.target);
    this.perspectiveCamera.position.copy(cam.position);
    this.perspectiveCamera.up.copy(cam.up);
    this.perspectiveCamera.lookAt(this.target);

    this.orthographicCamera.position.copy(cam.position);
    this.orthographicCamera.up.copy(cam.up);
    this.orthographicCamera.lookAt(this.target);
  }

  public updateAspect(aspect: number): void {
    this.perspectiveCamera.aspect = aspect;
    this.perspectiveCamera.updateProjectionMatrix();

    const halfH = this._orthoFrustumSize / 2;
    const halfW = halfH * aspect;
    this.orthographicCamera.left = -halfW;
    this.orthographicCamera.right = halfW;
    this.orthographicCamera.top = halfH;
    this.orthographicCamera.bottom = -halfH;
    this.orthographicCamera.updateProjectionMatrix();
  }

  public zoomToFit(box: THREE.Box3, aspect: number, margin: number = 1.3): void {
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();

    if (box.isEmpty()) {
      center.set(0, 0, 0);
      size.set(10, 6, 4);
    } else {
      box.getCenter(center);
      box.getSize(size);
    }

    this.target.copy(center);
    const maxDim = Math.max(size.x, size.y, size.z, 2.0);

    // Fit Orthographic
    this._orthoFrustumSize = maxDim * margin;
    this.updateAspect(aspect);

    // Fit Perspective
    const fov = (this.perspectiveCamera.fov * Math.PI) / 180;
    const dist = (maxDim / (2 * Math.tan(fov / 2))) * margin;

    // Keep current camera direction vector
    const dir = new THREE.Vector3().subVectors(this.perspectiveCamera.position, this.target).normalize();
    if (dir.lengthSq() < 0.1) dir.set(1, -1.2, 0.9).normalize();

    this.perspectiveCamera.position.copy(center).addScaledVector(dir, dist);
    this.perspectiveCamera.lookAt(center);

    this.orthographicCamera.position.copy(center).addScaledVector(dir, dist);
    this.orthographicCamera.lookAt(center);
  }
}
