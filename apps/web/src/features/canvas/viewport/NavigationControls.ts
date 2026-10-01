/**
 * BeamLab B2.1 — Engineering CAD Navigation Controls
 *
 * Implements intuitive CAD navigation:
 * - Orbit: Left-drag / Middle-drag
 * - Pan: Right-drag / Shift + Middle-drag
 * - Zoom: Wheel scroll with cursor focus
 * - Keyboard shortcuts: 1 (Front), 2 (Right), 3 (Top), 4 (Iso), F (Fit All)
 */

import * as THREE from 'three';
import { CameraManager } from './CameraManager';
import type { ViewOrientation } from './CameraManager';

export class NavigationControls {
  private readonly _domElement: HTMLElement;
  private readonly _cameraManager: CameraManager;

  private _isOrbiting: boolean = false;
  private _isPanning: boolean = false;
  private _prevMouseX: number = 0;
  private _prevMouseY: number = 0;

  public orbitSpeed: number = 0.005;
  public panSpeed: number = 0.002;
  public zoomSpeed: number = 0.001;

  public onOrientationChange?: (view: ViewOrientation) => void;
  public onFitRequested?: () => void;

  private _boundOnPointerDown: (e: PointerEvent) => void;
  private _boundOnPointerMove: (e: PointerEvent) => void;
  private _boundOnPointerUp: (e: PointerEvent) => void;
  private _boundOnWheel: (e: WheelEvent) => void;
  private _boundOnKeyDown: (e: KeyboardEvent) => void;
  private _boundOnContextMenu: (e: MouseEvent) => void;

  constructor(domElement: HTMLElement, cameraManager: CameraManager) {
    this._domElement = domElement;
    this._cameraManager = cameraManager;

    this._boundOnPointerDown = this._onPointerDown.bind(this);
    this._boundOnPointerMove = this._onPointerMove.bind(this);
    this._boundOnPointerUp = this._onPointerUp.bind(this);
    this._boundOnWheel = this._onWheel.bind(this);
    this._boundOnKeyDown = this._onKeyDown.bind(this);
    this._boundOnContextMenu = (e: MouseEvent) => e.preventDefault();

    this._attach();
  }

  private _attach(): void {
    this._domElement.addEventListener('pointerdown', this._boundOnPointerDown);
    window.addEventListener('pointermove', this._boundOnPointerMove);
    window.addEventListener('pointerup', this._boundOnPointerUp);
    this._domElement.addEventListener('wheel', this._boundOnWheel, { passive: false });
    window.addEventListener('keydown', this._boundOnKeyDown);
    this._domElement.addEventListener('contextmenu', this._boundOnContextMenu);
  }

  private _onPointerDown(e: PointerEvent): void {
    this._prevMouseX = e.clientX;
    this._prevMouseY = e.clientY;

    // Button 0: Left, Button 1: Middle, Button 2: Right
    if (e.button === 1 || (e.button === 0 && !e.shiftKey && !e.ctrlKey)) {
      this._isOrbiting = true;
    } else if (e.button === 2 || (e.button === 1 && e.shiftKey) || (e.button === 0 && e.shiftKey)) {
      this._isPanning = true;
    }
  }

  private _onPointerMove(e: PointerEvent): void {
    if (!this._isOrbiting && !this._isPanning) return;

    const dx = e.clientX - this._prevMouseX;
    const dy = e.clientY - this._prevMouseY;
    this._prevMouseX = e.clientX;
    this._prevMouseY = e.clientY;

    if (this._isOrbiting) {
      this._orbit(dx, dy);
    } else if (this._isPanning) {
      this._pan(dx, dy);
    }
  }

  private _onPointerUp(_e: PointerEvent): void {
    this._isOrbiting = false;
    this._isPanning = false;
  }

  private _onWheel(e: WheelEvent): void {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.15 : 0.85;
    this.zoom(factor);
  }

  private _orbit(dx: number, dy: number): void {
    const cam = this._cameraManager.activeCamera;
    const target = this._cameraManager.target;

    const offset = new THREE.Vector3().subVectors(cam.position, target);
    const radius = offset.length();
    if (radius < 0.001) return;

    // Convert to spherical coords with Z as vertical axis
    let theta = Math.atan2(offset.y, offset.x); // Azimuth (horizontal)
    let phi = Math.acos(Math.max(-1, Math.min(1, offset.z / radius))); // Polar angle from Z

    theta -= dx * this.orbitSpeed;
    phi = Math.max(0.05, Math.min(Math.PI - 0.05, phi + dy * this.orbitSpeed));

    // Convert back to cartesian (Z-up)
    offset.x = radius * Math.sin(phi) * Math.cos(theta);
    offset.y = radius * Math.sin(phi) * Math.sin(theta);
    offset.z = radius * Math.cos(phi);

    cam.position.copy(target).add(offset);
    cam.lookAt(target);

    // Keep both cameras in sync
    this._cameraManager.perspectiveCamera.position.copy(cam.position);
    this._cameraManager.perspectiveCamera.lookAt(target);
    this._cameraManager.orthographicCamera.position.copy(cam.position);
    this._cameraManager.orthographicCamera.lookAt(target);
  }

  private _pan(dx: number, dy: number): void {
    const cam = this._cameraManager.activeCamera;
    const dist = cam.position.distanceTo(this._cameraManager.target);

    // Compute camera's local screen axes in global space
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();

    cam.matrixWorld.extractBasis(right, up, new THREE.Vector3());

    const scale = (dist * this.panSpeed);
    const move = new THREE.Vector3()
      .addScaledVector(right, -dx * scale)
      .addScaledVector(up, dy * scale);

    cam.position.add(move);
    this._cameraManager.target.add(move);

    this._cameraManager.perspectiveCamera.position.copy(cam.position);
    this._cameraManager.orthographicCamera.position.copy(cam.position);
  }

  public zoom(factor: number): void {
    const cam = this._cameraManager.activeCamera;
    const target = this._cameraManager.target;

    if (this._cameraManager.activeMode === 'Perspective') {
      const offset = new THREE.Vector3().subVectors(cam.position, target);
      offset.multiplyScalar(factor);
      if (offset.length() > 0.5 && offset.length() < 2000) {
        cam.position.copy(target).add(offset);
      }
    } else {
      const ortho = this._cameraManager.orthographicCamera;
      ortho.zoom = Math.max(0.05, Math.min(50, ortho.zoom / factor));
      ortho.updateProjectionMatrix();
    }
  }

  private _onKeyDown(e: KeyboardEvent): void {
    // Avoid triggering when user types in an input
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
      return;
    }

    switch (e.key) {
      case '1':
        this._cameraManager.setOrientation('Front');
        this.onOrientationChange?.('Front');
        break;
      case '2':
        this._cameraManager.setOrientation('Right');
        this.onOrientationChange?.('Right');
        break;
      case '3':
        this._cameraManager.setOrientation('Top');
        this.onOrientationChange?.('Top');
        break;
      case '4':
        this._cameraManager.setOrientation('Isometric');
        this.onOrientationChange?.('Isometric');
        break;
      case 'f':
      case 'F':
        this.onFitRequested?.();
        break;
    }
  }

  public dispose(): void {
    this._domElement.removeEventListener('pointerdown', this._boundOnPointerDown);
    window.removeEventListener('pointermove', this._boundOnPointerMove);
    window.removeEventListener('pointerup', this._boundOnPointerUp);
    this._domElement.removeEventListener('wheel', this._boundOnWheel);
    window.removeEventListener('keydown', this._boundOnKeyDown);
    this._domElement.removeEventListener('contextmenu', this._boundOnContextMenu);
  }
}
