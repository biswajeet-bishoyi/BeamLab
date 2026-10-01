/**
 * BeamLab B2.1 — Adaptive 3D Spatial Grid & Origin Marker
 *
 * Engineering multi-tier metric reference grid (major/minor subdivisions)
 * oriented on the canonical structural plane (XY ground, Z vertical) with colored axes.
 */

import * as THREE from 'three';

export interface GridOptions {
  size?: number;
  divisions?: number;
  majorColor?: number;
  minorColor?: number;
  xAxisColor?: number;
  yAxisColor?: number;
}

export class AdaptiveSpatialGrid {
  public readonly group: THREE.Group;
  private _gridHelper: THREE.GridHelper | null = null;
  private _axisLines: THREE.LineSegments | null = null;
  private _originMarker: THREE.Group | null = null;

  private _size: number;
  private _divisions: number;
  private _majorColor: number;
  private _minorColor: number;
  private _xAxisColor: number;
  private _yAxisColor: number;

  constructor(options: GridOptions = {}) {
    this.group = new THREE.Group();
    this._size = options.size ?? 40; // 40m total width/length
    this._divisions = options.divisions ?? 40; // 1m subdivisions
    this._majorColor = options.majorColor ?? 0x334155; // slate-700
    this._minorColor = options.minorColor ?? 0x1e293b; // slate-800
    this._xAxisColor = options.xAxisColor ?? 0xef4444; // Red
    this._yAxisColor = options.yAxisColor ?? 0x22c55e; // Green

    this._buildGrid();
  }

  public set visible(val: boolean) {
    this.group.visible = val;
  }

  public get visible(): boolean {
    return this.group.visible;
  }

  private _buildGrid(): void {
    // In Three.js, GridHelper is constructed on the XZ plane by default.
    // For BeamLab Canonical (XY is ground, Z is vertical elevation),
    // we rotate the grid helper 90 deg around X axis so it lies on XY plane!
    this._gridHelper = new THREE.GridHelper(this._size, this._divisions, this._majorColor, this._minorColor);
    this._gridHelper.rotation.x = Math.PI / 2;
    this._gridHelper.position.set(0, 0, 0);
    this.group.add(this._gridHelper);

    // Major Axis Lines through Origin
    const half = this._size / 2;
    const axisPositions: number[] = [
      // X Axis (Red)
      -half, 0, 0.001,
      half, 0, 0.001,
      // Y Axis (Green)
      0, -half, 0.001,
      0, half, 0.001,
    ];

    const xCol = new THREE.Color(this._xAxisColor);
    const yCol = new THREE.Color(this._yAxisColor);

    const axisColors: number[] = [
      // X axis color
      xCol.r, xCol.g, xCol.b,
      xCol.r, xCol.g, xCol.b,
      // Y axis color
      yCol.r, yCol.g, yCol.b,
      yCol.r, yCol.g, yCol.b,
    ];

    const axisGeo = new THREE.BufferGeometry();
    axisGeo.setAttribute('position', new THREE.Float32BufferAttribute(axisPositions, 3));
    axisGeo.setAttribute('color', new THREE.Float32BufferAttribute(axisColors, 3));

    const axisMat = new THREE.LineBasicMaterial({ vertexColors: true, linewidth: 2 });
    this._axisLines = new THREE.LineSegments(axisGeo, axisMat);
    this.group.add(this._axisLines);

    // Origin Marker (Sphere & Vertical Z Indicator)
    this._originMarker = new THREE.Group();
    const sphereGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const sphereMat = new THREE.MeshBasicMaterial({ color: 0x60a5fa });
    const originSphere = new THREE.Mesh(sphereGeo, sphereMat);
    this._originMarker.add(originSphere);

    // Vertical Z Stem (Blue)
    const zStemGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 1.5),
    ]);
    const zStemMat = new THREE.LineBasicMaterial({ color: 0x3b82f6, linewidth: 2 });
    const zStem = new THREE.Line(zStemGeo, zStemMat);
    this._originMarker.add(zStem);

    this.group.add(this._originMarker);
  }

  public dispose(): void {
    this.group.traverse(obj => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.LineSegments) {
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
