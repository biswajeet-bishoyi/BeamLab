/**
 * BeamLab B2.1 — 3D Viewport Kernel
 *
 * Core WebGL/Three.js rendering engine managing the canvas lifecycle,
 * animation loop, scene graph, lighting, and GPU resource disposal.
 */

import * as THREE from 'three';

export interface ViewportKernelOptions {
  antialias?: boolean;
  alpha?: boolean;
  powerPreference?: 'high-performance' | 'default' | 'low-power';
  backgroundColor?: number;
}

export class ViewportKernel {
  public readonly container: HTMLElement;
  public readonly canvas: HTMLCanvasElement;
  public readonly renderer: THREE.WebGLRenderer;
  public readonly scene: THREE.Scene;

  private _animationFrameId: number | null = null;
  private _resizeObserver: ResizeObserver | null = null;
  private _renderCallbacks: Array<(delta: number) => void> = [];
  private _clock: THREE.Clock = new THREE.Clock();
  private _isDestroyed: boolean = false;

  constructor(container: HTMLElement, options: ViewportKernelOptions = {}) {
    this.container = container;

    // Create or locate canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    this.canvas.style.outline = 'none';
    this.container.appendChild(this.canvas);

    // Initialize WebGL renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: options.antialias ?? true,
      alpha: options.alpha ?? true,
      powerPreference: options.powerPreference ?? 'high-performance',
      logarithmicDepthBuffer: true,
    });

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(container.clientWidth || 800, container.clientHeight || 600, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Initialize Scene
    this.scene = new THREE.Scene();
    const bgColor = options.backgroundColor ?? 0x0a0e17; // Dark engineering slate
    this.scene.background = new THREE.Color(bgColor);

    // Setup ambient and directional lighting
    this._setupDefaultLighting();

    // Setup resize observer
    this._setupResizeObserver();

    // Start render loop
    this._startLoop();
  }

  public onRender(callback: (delta: number) => void): () => void {
    this._renderCallbacks.push(callback);
    return () => {
      this._renderCallbacks = this._renderCallbacks.filter(cb => cb !== callback);
    };
  }

  public render(camera: THREE.Camera): void {
    if (this._isDestroyed) return;
    this.renderer.render(this.scene, camera);
  }

  public setBackgroundColor(color: number | string): void {
    this.scene.background = new THREE.Color(color as any);
  }

  public getWidth(): number {
    return this.container.clientWidth || 800;
  }

  public getHeight(): number {
    return this.container.clientHeight || 600;
  }

  public getAspect(): number {
    const w = this.getWidth();
    const h = this.getHeight();
    return h > 0 ? w / h : 1;
  }

  private _setupDefaultLighting(): void {
    // Subtle ambient light
    const ambient = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(ambient);

    // Key light (elevation angle)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(30, -50, 60);
    keyLight.castShadow = true;
    this.scene.add(keyLight);

    // Fill light
    const fillLight = new THREE.DirectionalLight(0x90b0e0, 0.6);
    fillLight.position.set(-40, 30, 40);
    this.scene.add(fillLight);

    // Rim / underside light for bottom beam flanges
    const rimLight = new THREE.DirectionalLight(0x304060, 0.4);
    rimLight.position.set(0, 0, -30);
    this.scene.add(rimLight);
  }

  private _setupResizeObserver(): void {
    this._resizeObserver = new ResizeObserver(() => {
      if (this._isDestroyed) return;
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      if (width > 0 && height > 0) {
        this.renderer.setSize(width, height, false);
      }
    });
    this._resizeObserver.observe(this.container);
  }

  private _startLoop(): void {
    const loop = () => {
      if (this._isDestroyed) return;
      const delta = this._clock.getDelta();

      for (const callback of this._renderCallbacks) {
        callback(delta);
      }

      this._animationFrameId = requestAnimationFrame(loop);
    };
    this._animationFrameId = requestAnimationFrame(loop);
  }

  public dispose(): void {
    this._isDestroyed = true;
    if (this._animationFrameId !== null) {
      cancelAnimationFrame(this._animationFrameId);
      this._animationFrameId = null;
    }

    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }

    this._renderCallbacks = [];

    // Traverse and dispose geometries and materials
    this.scene.traverse(obj => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else if (obj.material) {
          obj.material.dispose();
        }
      }
    });

    this.renderer.dispose();
    if (this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
  }
}
