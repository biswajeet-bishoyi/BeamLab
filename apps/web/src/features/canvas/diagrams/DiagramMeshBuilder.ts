/**
 * BeamLab Sprint B3.2 — 3D Internal Force & Multi-Case Envelope Mesh Builder
 * Procedurally generates 3D extruded ribbons, contour boundary lines, transverse hatch lines,
 * and peak callout sprites for Single Case and Multi-Case Envelopes in Three.js.
 */

import * as THREE from 'three';
import type { MemberEvaluationResult, StationResult } from '../../results/MemberForceEvaluator';
import type { MemberEnvelopeResult } from '../../results/EnvelopeEngine';

export type DiagramType =
  | 'none'
  | 'Mz'
  | 'My'
  | 'Vy'
  | 'Vz'
  | 'N'
  | 'deflection'
  | 'envelope_Mz'
  | 'envelope_Vy';

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
   * Builds a 3D diagram group for a single member (single case or multi-case envelope).
   */
  public static buildMemberDiagram(
    startPos: THREE.Vector3,
    endPos: THREE.Vector3,
    _localX: THREE.Vector3,
    localY: THREE.Vector3,
    localZ: THREE.Vector3,
    evaluation: MemberEvaluationResult,
    options: DiagramOptions,
    envelope?: MemberEnvelopeResult,
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = `Diagram_${options.type}_${evaluation.memberId}`;

    if (options.type === 'none') {
      return group;
    }

    const L = startPos.distanceTo(endPos);
    if (L <= 0.001) return group;

    const isEnvelope =
      (options.type === 'envelope_Mz' || options.type === 'envelope_Vy') &&
      envelope !== undefined &&
      envelope.stations.length >= 2;

    // Normal offset vector direction in member LCS
    let offsetDir: THREE.Vector3;
    switch (options.type) {
      case 'Mz':
      case 'Vy':
      case 'envelope_Mz':
      case 'envelope_Vy':
        offsetDir = localY.clone().normalize();
        break;
      case 'My':
      case 'Vz':
        offsetDir = localZ.clone().normalize();
        break;
      case 'N':
      case 'deflection':
      default:
        offsetDir = localY.clone().normalize();
    }

    // Colors
    const posColor = new THREE.Color('#0ea5e9'); // Sky blue for positive
    const negColor = new THREE.Color('#f43f5e'); // Rose/crimson for negative
    const zeroColor = new THREE.Color('#64748b'); // Slate
    const envColor = new THREE.Color('#a855f7'); // Purple for envelope

    // ─── 1. ENVELOPE MODE ──────────────────────────────────────────────────
    if (isEnvelope && envelope) {
      const envStations = envelope.stations;
      let maxAbs = 0;

      for (const st of envStations) {
        const vUp = options.type === 'envelope_Mz' ? Math.max(Math.abs(st.maxMz), Math.abs(st.minMz)) : Math.max(Math.abs(st.maxVy), Math.abs(st.minVy));
        if (vUp > maxAbs) maxAbs = vUp;
      }
      if (maxAbs === 0) maxAbs = 1.0;

      const baseHeight = 0.8;
      const scaleFactor = (baseHeight / maxAbs) * options.scaleMultiplier;

      const ribbonPositions: number[] = [];
      const ribbonColors: number[] = [];
      const upperLinePositions: number[] = [];
      const lowerLinePositions: number[] = [];

      for (let i = 0; i < envStations.length; i++) {
        const st = envStations[i]!;
        let topVal: number;
        let botVal: number;

        if (options.type === 'envelope_Mz') {
          topVal = options.signConvention === 'tension_face' ? -st.minMz : st.maxMz;
          botVal = options.signConvention === 'tension_face' ? -st.maxMz : st.minMz;
        } else {
          topVal = st.maxVy;
          botVal = st.minVy;
        }

        const t = st.x / L;
        const basePt = new THREE.Vector3().lerpVectors(startPos, endPos, Math.min(1.0, t));
        const topPt = basePt.clone().addScaledVector(offsetDir, topVal * scaleFactor);
        const botPt = basePt.clone().addScaledVector(offsetDir, botVal * scaleFactor);

        upperLinePositions.push(topPt.x, topPt.y, topPt.z);
        lowerLinePositions.push(botPt.x, botPt.y, botPt.z);

        ribbonPositions.push(botPt.x, botPt.y, botPt.z);
        ribbonPositions.push(topPt.x, topPt.y, topPt.z);

        ribbonColors.push(envColor.r, envColor.g, envColor.b);
        ribbonColors.push(envColor.r, envColor.g, envColor.b);
      }

      // Ribbon Mesh
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(ribbonPositions, 3));
      geom.setAttribute('color', new THREE.Float32BufferAttribute(ribbonColors, 3));

      const indices: number[] = [];
      for (let i = 0; i < envStations.length - 1; i++) {
        const b0 = i * 2;
        const p0 = i * 2 + 1;
        const b1 = (i + 1) * 2;
        const p1 = (i + 1) * 2 + 1;
        indices.push(b0, p0, b1);
        indices.push(b1, p0, p1);
      }
      geom.setIndex(indices);
      geom.computeVertexNormals();

      const mat = new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      group.add(new THREE.Mesh(geom, mat));

      // Upper boundary cable
      const upGeom = new THREE.BufferGeometry();
      upGeom.setAttribute('position', new THREE.Float32BufferAttribute(upperLinePositions, 3));
      group.add(new THREE.Line(upGeom, new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 })));

      // Lower boundary cable
      const lowGeom = new THREE.BufferGeometry();
      lowGeom.setAttribute('position', new THREE.Float32BufferAttribute(lowerLinePositions, 3));
      group.add(new THREE.Line(lowGeom, new THREE.LineBasicMaterial({ color: 0xf43f5e, linewidth: 2 })));

      // Callouts for envelope extremes
      if (options.showPeakLabels) {
        const peakSag = envelope.governingSummary.peakSaggingMz;
        const peakHog = envelope.governingSummary.peakHoggingMz;

        if (Math.abs(peakSag.value) > 0.05) {
          const pt = new THREE.Vector3()
            .lerpVectors(startPos, endPos, peakSag.x / L)
            .addScaledVector(offsetDir, peakSag.value * scaleFactor + 0.2);
          const sprite = this.createCalloutSprite(`+${peakSag.value} kNm (${peakSag.combo})`, '#38bdf8');
          sprite.position.copy(pt);
          group.add(sprite);
        }

        if (Math.abs(peakHog.value) > 0.05) {
          const pt = new THREE.Vector3()
            .lerpVectors(startPos, endPos, peakHog.x / L)
            .addScaledVector(offsetDir, peakHog.value * scaleFactor - 0.2);
          const sprite = this.createCalloutSprite(`${peakHog.value} kNm (${peakHog.combo})`, '#f43f5e');
          sprite.position.copy(pt);
          group.add(sprite);
        }
      }

      return group;
    }

    // ─── 2. SINGLE CASE MODE ───────────────────────────────────────────────
    const stations = evaluation.stations;
    if (stations.length < 2) return group;

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
          return -st.deflection;
        default:
          return 0;
      }
    };

    let maxAbs = 0;
    for (const st of stations) {
      const v = Math.abs(getValue(st));
      if (v > maxAbs) maxAbs = v;
    }
    if (maxAbs === 0) maxAbs = 1.0;

    const baseHeight = 0.8;
    const scaleFactor = (baseHeight / maxAbs) * options.scaleMultiplier;

    const ribbonPositions: number[] = [];
    const ribbonColors: number[] = [];
    const boundaryPositions: number[] = [];
    const hatchPositions: number[] = [];

    for (let i = 0; i < stations.length; i++) {
      const st = stations[i]!;
      const val = getValue(st);
      const height = val * scaleFactor;

      const t = st.x / L;
      const basePt = new THREE.Vector3().lerpVectors(startPos, endPos, Math.min(1.0, t));
      const peakPt = basePt.clone().addScaledVector(offsetDir, height);

      boundaryPositions.push(peakPt.x, peakPt.y, peakPt.z);

      if (options.showHatches && i % 4 === 0 && Math.abs(height) > 0.02) {
        hatchPositions.push(basePt.x, basePt.y, basePt.z);
        hatchPositions.push(peakPt.x, peakPt.y, peakPt.z);
      }

      ribbonPositions.push(basePt.x, basePt.y, basePt.z);
      ribbonPositions.push(peakPt.x, peakPt.y, peakPt.z);

      const vertColor = val > 0.001 ? posColor : val < -0.001 ? negColor : zeroColor;
      ribbonColors.push(vertColor.r, vertColor.g, vertColor.b);
      ribbonColors.push(vertColor.r, vertColor.g, vertColor.b);
    }

    const ribbonGeometry = new THREE.BufferGeometry();
    ribbonGeometry.setAttribute('position', new THREE.Float32BufferAttribute(ribbonPositions, 3));
    ribbonGeometry.setAttribute('color', new THREE.Float32BufferAttribute(ribbonColors, 3));

    const indices: number[] = [];
    for (let i = 0; i < stations.length - 1; i++) {
      const b0 = i * 2;
      const p0 = i * 2 + 1;
      const b1 = (i + 1) * 2;
      const p1 = (i + 1) * 2 + 1;
      indices.push(b0, p0, b1);
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
    group.add(new THREE.Mesh(ribbonGeometry, ribbonMaterial));

    const boundaryGeometry = new THREE.BufferGeometry();
    boundaryGeometry.setAttribute('position', new THREE.Float32BufferAttribute(boundaryPositions, 3));
    group.add(
      new THREE.Line(
        boundaryGeometry,
        new THREE.LineBasicMaterial({
          color: 0xffffff,
          linewidth: 2,
          transparent: true,
          opacity: 0.9,
        }),
      ),
    );

    if (hatchPositions.length > 0) {
      const hatchGeometry = new THREE.BufferGeometry();
      hatchGeometry.setAttribute('position', new THREE.Float32BufferAttribute(hatchPositions, 3));
      group.add(
        new THREE.LineSegments(
          hatchGeometry,
          new THREE.LineBasicMaterial({
            color: 0x94a3b8,
            transparent: true,
            opacity: 0.5,
          }),
        ),
      );
    }

    if (options.showPeakLabels) {
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

  private static createCalloutSprite(text: string, colorHex: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
      ctx.beginPath();
      ctx.roundRect(8, 8, 304, 48, 24);
      ctx.fill();

      ctx.strokeStyle = colorHex;
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.font = 'bold 18px "Fira Code", monospace, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 160, 32);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(1.1, 0.22, 1.0);
    return sprite;
  }
}
