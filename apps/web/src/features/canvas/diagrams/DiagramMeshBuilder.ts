/**
 * BeamLab Sprint B3.1 — 3D Internal Force Diagram Mesh Builder
 * Procedurally generates 3D extruded ribbons, contour boundary lines, transverse hatch lines,
 * and peak callout sprites for BMD, SFD, Axial Force, and Deflection along structural members.
 */

import * as THREE from 'three';
import type { MemberEvaluationResult, StationResult } from '../../results/MemberForceEvaluator';

export type DiagramType = 'none' | 'Mz' | 'My' | 'Vy' | 'Vz' | 'N' | 'deflection';

export interface DiagramOptions {
  type: DiagramType;
  scaleMultiplier: number;
  showPeakLabels: boolean;
  showHatches: boolean;
  signConvention: 'tension_face' | 'cartesian';
}

export const DEFAULT_DIAGRAM_OPTIONS: DiagramOptions = {
  type: 'none',
  scaleMultiplier: 1.0,
  showPeakLabels: true,
  showHatches: true,
  signConvention: 'tension_face',
};

export class DiagramMeshBuilder {
  /**
   * Builds a 3D diagram group for a single member.
   */
  public static buildMemberDiagram(
    startPos: THREE.Vector3,
    endPos: THREE.Vector3,
    _localX: THREE.Vector3,
    localY: THREE.Vector3,
    localZ: THREE.Vector3,
    evaluation: MemberEvaluationResult,
    options: DiagramOptions,
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = `Diagram_${options.type}_${evaluation.memberId}`;

    if (options.type === 'none' || evaluation.stations.length < 2) {
      return group;
    }

    const stations = evaluation.stations;
    const L = startPos.distanceTo(endPos);
    if (L <= 0.001) return group;

    // Determine value selector and unit scale
    const getValue = (st: StationResult): number => {
      switch (options.type) {
        case 'Mz':
          return options.signConvention === 'tension_face' ? -st.Mz : st.Mz;
        case 'My':
          return options.signConvention === 'tension_face' ? -st.My : st.My;
        case 'Vy':
          return st.Vy;
        case 'Vz':
          return st.Vz;
        case 'N':
          return st.N;
        case 'deflection':
          return -st.deflection; // downward deflection displayed downwards
        default:
          return 0;
      }
    };

    // Determine normal offset vector direction in member LCS
    let offsetDir: THREE.Vector3;
    switch (options.type) {
      case 'Mz':
      case 'Vy':
        offsetDir = localY.clone().normalize();
        break;
      case 'My':
      case 'Vz':
        offsetDir = localZ.clone().normalize();
        break;
      case 'N':
      case 'deflection':
        offsetDir = localY.clone().normalize();
        break;
      default:
        offsetDir = localY.clone().normalize();
    }

    // Auto-normalize diagram height so typical peak is around 0.6m - 1.0m height
    let maxAbs = 0;
    for (const st of stations) {
      const v = Math.abs(getValue(st));
      if (v > maxAbs) maxAbs = v;
    }
    if (maxAbs === 0) maxAbs = 1.0;

    // Target max extrusion ~ 0.8 meters in 3D scene
    const baseHeight = 0.8;
    const scaleFactor = (baseHeight / maxAbs) * options.scaleMultiplier;

    // Ribbon vertices, colors, and line coordinates
    const ribbonPositions: number[] = [];
    const ribbonColors: number[] = [];
    const boundaryPositions: number[] = [];
    const hatchPositions: number[] = [];

    // Colors: Positive = Sky Blue/Emerald, Negative = Crimson/Amber
    const posColor = new THREE.Color('#0ea5e9'); // Sky blue for positive
    const negColor = new THREE.Color('#f43f5e'); // Rose/crimson for negative
    const zeroColor = new THREE.Color('#64748b'); // Slate

    for (let i = 0; i < stations.length; i++) {
      const st = stations[i]!;
      const val = getValue(st);
      const height = val * scaleFactor;

      // Base point on member axis
      const t = st.x / L;
      const basePt = new THREE.Vector3().lerpVectors(startPos, endPos, Math.min(1.0, t));
      const peakPt = basePt.clone().addScaledVector(offsetDir, height);

      // Boundary line along peak
      boundaryPositions.push(peakPt.x, peakPt.y, peakPt.z);

      // Periodic hatch lines (every 4th station)
      if (options.showHatches && i % 4 === 0 && Math.abs(height) > 0.02) {
        hatchPositions.push(basePt.x, basePt.y, basePt.z);
        hatchPositions.push(peakPt.x, peakPt.y, peakPt.z);
      }

      // Build triangle strip vertices: (basePt, peakPt)
      ribbonPositions.push(basePt.x, basePt.y, basePt.z);
      ribbonPositions.push(peakPt.x, peakPt.y, peakPt.z);

      // Assign vertex colors
      const vertColor = val > 0.001 ? posColor : val < -0.001 ? negColor : zeroColor;
      ribbonColors.push(vertColor.r, vertColor.g, vertColor.b);
      ribbonColors.push(vertColor.r, vertColor.g, vertColor.b);
    }

    // 1. Triangle Ribbon Mesh
    const ribbonGeometry = new THREE.BufferGeometry();
    ribbonGeometry.setAttribute('position', new THREE.Float32BufferAttribute(ribbonPositions, 3));
    ribbonGeometry.setAttribute('color', new THREE.Float32BufferAttribute(ribbonColors, 3));

    // Construct index pairs for triangle strip (i0, i1, i2), (i2, i1, i3)...
    const indices: number[] = [];
    for (let i = 0; i < stations.length - 1; i++) {
      const b0 = i * 2;
      const p0 = i * 2 + 1;
      const b1 = (i + 1) * 2;
      const p1 = (i + 1) * 2 + 1;
      // Triangle 1
      indices.push(b0, p0, b1);
      // Triangle 2
      indices.push(b1, p0, p1);
    }
    ribbonGeometry.setIndex(indices);
    ribbonGeometry.computeVertexNormals();

    const ribbonMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ribbonMesh = new THREE.Mesh(ribbonGeometry, ribbonMaterial);
    group.add(ribbonMesh);

    // 2. Continuous Peak Boundary Line
    const boundaryGeometry = new THREE.BufferGeometry();
    boundaryGeometry.setAttribute('position', new THREE.Float32BufferAttribute(boundaryPositions, 3));
    const boundaryMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      linewidth: 2,
      transparent: true,
      opacity: 0.9,
    });
    const boundaryLine = new THREE.Line(boundaryGeometry, boundaryMaterial);
    group.add(boundaryLine);

    // 3. Transverse Hatch Lines
    if (hatchPositions.length > 0) {
      const hatchGeometry = new THREE.BufferGeometry();
      hatchGeometry.setAttribute('position', new THREE.Float32BufferAttribute(hatchPositions, 3));
      const hatchMaterial = new THREE.LineSegments(
        hatchGeometry,
        new THREE.LineBasicMaterial({
          color: 0x94a3b8,
          transparent: true,
          opacity: 0.5,
        }),
      );
      group.add(hatchMaterial);
    }

    // 4. 3D Peak Callout Sprites
    if (options.showPeakLabels) {
      // Find peak positive and peak negative station
      let peakPosSt = stations[0]!;
      let peakNegSt = stations[0]!;
      for (const st of stations) {
        const v = getValue(st);
        if (v > getValue(peakPosSt)) peakPosSt = st;
        if (v < getValue(peakNegSt)) peakNegSt = st;
      }

      const unit =
        options.type === 'Mz' || options.type === 'My'
          ? 'kNm'
          : options.type === 'Vy' || options.type === 'Vz' || options.type === 'N'
          ? 'kN'
          : 'mm';

      if (Math.abs(getValue(peakPosSt)) > 0.05) {
        const peakVal = getValue(peakPosSt);
        const t = peakPosSt.x / L;
        const pt = new THREE.Vector3()
          .lerpVectors(startPos, endPos, t)
          .addScaledVector(offsetDir, peakVal * scaleFactor + 0.15);
        const sprite = this.createCalloutSprite(
          `${peakVal > 0 ? '+' : ''}${peakVal.toFixed(1)} ${unit}`,
          '#0ea5e9',
        );
        sprite.position.copy(pt);
        group.add(sprite);
      }

      if (Math.abs(getValue(peakNegSt)) > 0.05 && peakNegSt !== peakPosSt) {
        const negVal = getValue(peakNegSt);
        const t = peakNegSt.x / L;
        const pt = new THREE.Vector3()
          .lerpVectors(startPos, endPos, t)
          .addScaledVector(offsetDir, negVal * scaleFactor - 0.15);
        const sprite = this.createCalloutSprite(
          `${negVal.toFixed(1)} ${unit}`,
          '#f43f5e',
        );
        sprite.position.copy(pt);
        group.add(sprite);
      }
    }

    return group;
  }

  /**
   * Creates a sharp billboard sprite badge for 3D diagram values.
   */
  private static createCalloutSprite(text: string, colorHex: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Dark rounded pill background with glowing border
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.beginPath();
      ctx.roundRect(10, 8, 236, 48, 24);
      ctx.fill();

      ctx.strokeStyle = colorHex;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Sharp engineering monospace text
      ctx.font = 'bold 22px "Fira Code", monospace, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 128, 32);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(0.9, 0.22, 1.0);
    return sprite;
  }
}
