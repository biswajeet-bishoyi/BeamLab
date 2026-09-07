import * as THREE from 'three';
import type { StructuralSystem, NodeDisplacement } from '@beamlab/engineering-model';
import { DeformationEngine } from './DeformationEngine';
import { UndeformedGhostBuilder } from './UndeformedGhostBuilder';

export type DeformationViewMode = 'undeformed' | 'static' | 'modal';

export interface ModalModeDefinition {
  modeNumber: number;
  frequencyHz: number;
  periodSec: number;
  description: string;
  eigenvectors: Record<string, { dx: number; dy: number; dz: number }>;
}

export interface DeformationDisplayOptions {
  viewMode: DeformationViewMode;
  scaleMultiplier: number;
  activeModalMode: number;
  isPlaying: boolean;
  animationSpeed: number;
  showGhost: boolean;
}

export const DEFAULT_DEFORMATION_OPTIONS: DeformationDisplayOptions = {
  viewMode: 'undeformed',
  scaleMultiplier: 50.0,
  activeModalMode: 1,
  isPlaying: true,
  animationSpeed: 1.0,
  showGhost: true,
};

/**
 * High-performance 3D structural deformation and modal dynamic vibration animation coordinator.
 * Updates vertex geometries and heatmap colors at 60–120 FPS without memory reallocation.
 */
export class ModalAnimationController {
  private readonly rootGroup = new THREE.Group();
  private readonly deformedGroup = new THREE.Group();
  private readonly ghostGroup = new THREE.Group();

  private activeSystem?: StructuralSystem;
  private staticDisplacements: Map<string, NodeDisplacement> = new Map();
  private modalModes: ModalModeDefinition[] = [];
  private options: DeformationDisplayOptions = { ...DEFAULT_DEFORMATION_OPTIONS };

  // Cached geometry and buffer references for fast animation updates
  private animatedLineMeshes: Array<{
    line: THREE.Line;
    n1Id: string;
    n2Id: string;
    p1: THREE.Vector3;
    p2: THREE.Vector3;
    positionsAttr: THREE.BufferAttribute;
    colorsAttr: THREE.BufferAttribute;
  }> = [];

  private maxStaticDisplacement = 0.025; // 25mm default max

  constructor(scene: THREE.Scene) {
    this.rootGroup.name = 'DeformationRoot';
    this.deformedGroup.name = 'DeformedMeshesGroup';
    this.ghostGroup.name = 'GhostWireframeGroup';

    this.rootGroup.add(this.ghostGroup, this.deformedGroup);
    scene.add(this.rootGroup);
  }

  public getRootGroup(): THREE.Group {
    return this.rootGroup;
  }

  public setOptions(opts: Partial<DeformationDisplayOptions>): void {
    const prevMode = this.options.viewMode;
    const prevScale = this.options.scaleMultiplier;
    const prevModeNum = this.options.activeModalMode;
    const prevGhost = this.options.showGhost;

    this.options = { ...this.options, ...opts };
    this.rootGroup.visible = this.options.viewMode !== 'undeformed';
    this.ghostGroup.visible = this.options.showGhost;

    if (
      opts.viewMode !== undefined && opts.viewMode !== prevMode ||
      opts.scaleMultiplier !== undefined && opts.scaleMultiplier !== prevScale ||
      opts.activeModalMode !== undefined && opts.activeModalMode !== prevModeNum ||
      opts.showGhost !== undefined && opts.showGhost !== prevGhost
    ) {
      this.rebuildMeshes();
    }
  }

  public getOptions(): DeformationDisplayOptions {
    return { ...this.options };
  }

  public getMaxDisplacement(): number {
    return this.maxStaticDisplacement;
  }

  public getModalModes(): ModalModeDefinition[] {
    return [...this.modalModes];
  }

  public loadModelData(
    system: StructuralSystem,
    displacements: NodeDisplacement[] = [],
    modes: ModalModeDefinition[] = [],
  ): void {
    this.activeSystem = system;
    this.staticDisplacements.clear();
    displacements.forEach((d) => this.staticDisplacements.set(d.nodeId, d));
    this.maxStaticDisplacement = DeformationEngine.computeMaxDisplacement(displacements) || 0.025;
    this.modalModes = modes;

    this.rebuildMeshes();
  }

  /**
   * Called on every animation frame in the ViewportKernel loop.
   */
  public update(timeSec: number): void {
    if (this.options.viewMode !== 'modal' || !this.options.isPlaying) return;

    const currentMode = this.modalModes.find((m) => m.modeNumber === this.options.activeModalMode);
    if (!currentMode) return;

    // Harmonic factor: sin(omega * t)
    const omega = 2 * Math.PI * currentMode.frequencyHz * this.options.animationSpeed;
    const factor = Math.sin(omega * timeSec) * this.options.scaleMultiplier;

    // Update positions and colors directly in buffer attributes
    for (const item of this.animatedLineMeshes) {
      const e1 = currentMode.eigenvectors[item.n1Id] ?? { dx: 0, dy: 0, dz: 0 };
      const e2 = currentMode.eigenvectors[item.n2Id] ?? { dx: 0, dy: 0, dz: 0 };

      const u1 = { dx: e1.dx * factor, dy: e1.dy * factor, dz: e1.dz * factor };
      const u2 = { dx: e2.dx * factor, dy: e2.dy * factor, dz: e2.dz * factor };

      const posArray = item.positionsAttr.array as Float32Array;
      const colArray = item.colorsAttr.array as Float32Array;
      const segments = (posArray.length / 3) - 1;

      for (let i = 0; i <= segments; i++) {
        const s = i / segments;
        const interp = DeformationEngine.interpolateHermite(
          item.p1,
          item.p2,
          u1,
          u2,
          s,
          1.0,
        );

        posArray[i * 3] = interp.position.x;
        posArray[i * 3 + 1] = interp.position.y;
        posArray[i * 3 + 2] = interp.position.z;

        const normalizedMag = Math.min(1.0, Math.abs(interp.magnitude) / (this.maxStaticDisplacement * this.options.scaleMultiplier || 1));
        const color = DeformationEngine.getHeatmapColor(normalizedMag);
        colArray[i * 3] = color.r;
        colArray[i * 3 + 1] = color.g;
        colArray[i * 3 + 2] = color.b;
      }

      item.positionsAttr.needsUpdate = true;
      item.colorsAttr.needsUpdate = true;
    }
  }

  public dispose(): void {
    this.clearGroup(this.deformedGroup);
    this.clearGroup(this.ghostGroup);
    this.animatedLineMeshes = [];
    if (this.rootGroup.parent) {
      this.rootGroup.parent.remove(this.rootGroup);
    }
  }

  // ─── Private Mesh Construction ─────────────────────────────────────────────

  private rebuildMeshes(): void {
    this.clearGroup(this.deformedGroup);
    this.clearGroup(this.ghostGroup);
    this.animatedLineMeshes = [];

    if (!this.activeSystem || this.options.viewMode === 'undeformed') {
      this.rootGroup.visible = false;
      return;
    }

    this.rootGroup.visible = true;

    // 1. Build Ghost Mesh
    if (this.options.showGhost) {
      const ghost = UndeformedGhostBuilder.buildGhostMesh(this.activeSystem);
      this.ghostGroup.add(ghost);
    }

    const scale = this.options.scaleMultiplier;
    const sys = this.activeSystem;

    // 2. Build Deformed Curved Members
    for (const member of sys.members.values()) {
      const n1 = sys.getNode(member.startNodeId);
      const n2 = sys.getNode(member.endNodeId);
      if (!n1 || !n2) continue;

      const p1 = new THREE.Vector3(n1.x, n1.y, n1.z);
      const p2 = new THREE.Vector3(n2.x, n2.y, n2.z);

      const d1 = this.staticDisplacements.get(n1.identity.id) ?? { nodeId: n1.identity.id, dx: 0, dy: 0, dz: 0, rx: 0, ry: 0, rz: 0 };
      const d2 = this.staticDisplacements.get(n2.identity.id) ?? { nodeId: n2.identity.id, dx: 0, dy: 0, dz: 0, rx: 0, ry: 0, rz: 0 };

      // Number of subdivisions along member length for smooth cubic curvature
      const numSubdivs = 16;
      const positions = new Float32Array((numSubdivs + 1) * 3);
      const colors = new Float32Array((numSubdivs + 1) * 3);

      for (let i = 0; i <= numSubdivs; i++) {
        const s = i / numSubdivs;
        const interp = DeformationEngine.interpolateHermite(p1, p2, d1, d2, s, scale);

        positions[i * 3] = interp.position.x;
        positions[i * 3 + 1] = interp.position.y;
        positions[i * 3 + 2] = interp.position.z;

        const normalizedMag = Math.min(1.0, interp.magnitude / (this.maxStaticDisplacement || 0.001));
        const color = DeformationEngine.getHeatmapColor(normalizedMag);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }

      const geom = new THREE.BufferGeometry();
      const posAttr = new THREE.BufferAttribute(positions, 3);
      const colAttr = new THREE.BufferAttribute(colors, 3);
      geom.setAttribute('position', posAttr);
      geom.setAttribute('color', colAttr);

      const mat = new THREE.LineBasicMaterial({
        vertexColors: true,
        linewidth: 3,
      });

      const line = new THREE.Line(geom, mat);
      line.name = `DeformedMember-${member.identity.id}`;
      this.deformedGroup.add(line);

      this.animatedLineMeshes.push({
        line,
        n1Id: n1.identity.id,
        n2Id: n2.identity.id,
        p1,
        p2,
        positionsAttr: posAttr,
        colorsAttr: colAttr,
      });
    }
  }

  private clearGroup(group: THREE.Group): void {
    while (group.children.length > 0) {
      const child = group.children[0]!;
      group.remove(child);
      if (child instanceof THREE.Line && child.geometry) {
        child.geometry.dispose();
      }
    }
  }

  // ─── Preset Analysis Results Generator for Demo Models ──────────────────────

  public static createPortalFrameAnalysisData(system: StructuralSystem): {
    displacements: NodeDisplacement[];
    modes: ModalModeDefinition[];
  } {
    const displacements: NodeDisplacement[] = [];

    // Realistic static deformation: gravity sag at apex + lateral wind drift
    for (const node of system.nodes.values()) {
      let dx = 0;
      let dz = 0;

      // Columns sway to +X from wind
      if (node.z > 0.1) {
        dx = 0.018 * (node.z / 6.5); // 18mm sway at top
      }
      // Roof sag down -Z
      if (node.identity.id.includes('ridge')) {
        dz = -0.024; // 24mm sag at ridge
      } else if (node.identity.id.includes('e')) {
        dz = -0.006;
      }

      displacements.push({
        nodeId: node.identity.id,
        dx,
        dy: 0,
        dz,
        rx: 0,
        ry: -0.003,
        rz: 0,
      });
    }

    // Modal Shapes
    const modes: ModalModeDefinition[] = [
      {
        modeNumber: 1,
        frequencyHz: 1.28,
        periodSec: 0.78,
        description: 'Mode 1: Lateral Frame Sway (X-Dir)',
        eigenvectors: this.buildSwayEigenvectors(system, 0.025, 0),
      },
      {
        modeNumber: 2,
        frequencyHz: 2.35,
        periodSec: 0.43,
        description: 'Mode 2: Torsional Frame Twist (Y-Dir)',
        eigenvectors: this.buildTwistEigenvectors(system, 0.020),
      },
      {
        modeNumber: 3,
        frequencyHz: 4.12,
        periodSec: 0.24,
        description: 'Mode 3: Vertical Roof Bounce (Z-Dir)',
        eigenvectors: this.buildRoofBounceEigenvectors(system, 0.028),
      },
    ];

    return { displacements, modes };
  }

  public static createSpaceTrussAnalysisData(system: StructuralSystem): {
    displacements: NodeDisplacement[];
    modes: ModalModeDefinition[];
  } {
    const displacements: NodeDisplacement[] = [];

    // Midspan vertical bending sag
    for (const node of system.nodes.values()) {
      const midDist = 1 - Math.abs(node.x - 6.0) / 6.0;
      const sag = -0.016 * Math.max(0, Math.sin((node.x / 12.0) * Math.PI));

      displacements.push({
        nodeId: node.identity.id,
        dx: 0,
        dy: 0,
        dz: sag,
        rx: 0,
        ry: midDist * 0.002,
        rz: 0,
      });
    }

    const modes: ModalModeDefinition[] = [
      {
        modeNumber: 1,
        frequencyHz: 1.85,
        periodSec: 0.54,
        description: 'Mode 1: Vertical Bridge Bending',
        eigenvectors: this.buildTrussVerticalEigenvectors(system, 0.025),
      },
      {
        modeNumber: 2,
        frequencyHz: 3.10,
        periodSec: 0.32,
        description: 'Mode 2: Lateral Sway Vibration',
        eigenvectors: this.buildTrussLateralEigenvectors(system, 0.020),
      },
      {
        modeNumber: 3,
        frequencyHz: 5.40,
        periodSec: 0.19,
        description: 'Mode 3: 2nd Harmonic S-Bending',
        eigenvectors: this.buildTrussSHarmonicEigenvectors(system, 0.022),
      },
    ];

    return { displacements, modes };
  }

  public static createBuildingAnalysisData(system: StructuralSystem): {
    displacements: NodeDisplacement[];
    modes: ModalModeDefinition[];
  } {
    const displacements: NodeDisplacement[] = [];

    for (const node of system.nodes.values()) {
      const lvl = node.z > 5 ? 2 : node.z > 2 ? 1 : 0;
      const dx = lvl * 0.012; // 12mm inter-story drift
      const dy = lvl * 0.004;
      const dz = -lvl * 0.003;

      displacements.push({
        nodeId: node.identity.id,
        dx,
        dy,
        dz,
        rx: 0,
        ry: 0,
        rz: 0,
      });
    }

    const modes: ModalModeDefinition[] = [
      {
        modeNumber: 1,
        frequencyHz: 0.95,
        periodSec: 1.05,
        description: 'Mode 1: Fundamental Building Sway (X)',
        eigenvectors: this.buildBuildingSwayEigenvectors(system, 0.024),
      },
      {
        modeNumber: 2,
        frequencyHz: 1.40,
        periodSec: 0.71,
        description: 'Mode 2: Transverse Building Sway (Y)',
        eigenvectors: this.buildBuildingTransverseEigenvectors(system, 0.020),
      },
      {
        modeNumber: 3,
        frequencyHz: 2.80,
        periodSec: 0.36,
        description: 'Mode 3: Torsional Floor Twist',
        eigenvectors: this.buildBuildingTorsionalEigenvectors(system, 0.018),
      },
    ];

    return { displacements, modes };
  }

  // ─── Modal Eigenvector Builders ─────────────────────────────────────────────

  private static buildSwayEigenvectors(sys: StructuralSystem, ampX: number, _ampY: number) {
    const ev: Record<string, { dx: number; dy: number; dz: number }> = {};
    for (const n of sys.nodes.values()) {
      const hRatio = Math.min(1, n.z / 6.5);
      ev[n.identity.id] = { dx: ampX * hRatio, dy: 0, dz: 0 };
    }
    return ev;
  }

  private static buildTwistEigenvectors(sys: StructuralSystem, amp: number) {
    const ev: Record<string, { dx: number; dy: number; dz: number }> = {};
    for (const n of sys.nodes.values()) {
      const hRatio = Math.min(1, n.z / 6.5);
      const signY = n.y > 3 ? 1 : -1;
      ev[n.identity.id] = { dx: amp * hRatio * signY, dy: amp * 0.5 * hRatio, dz: 0 };
    }
    return ev;
  }

  private static buildRoofBounceEigenvectors(sys: StructuralSystem, amp: number) {
    const ev: Record<string, { dx: number; dy: number; dz: number }> = {};
    for (const n of sys.nodes.values()) {
      const isRoof = n.z > 4.5;
      const apexFactor = n.identity.id.includes('ridge') ? 1.0 : 0.4;
      ev[n.identity.id] = { dx: 0, dy: 0, dz: isRoof ? -amp * apexFactor : 0 };
    }
    return ev;
  }

  private static buildTrussVerticalEigenvectors(sys: StructuralSystem, amp: number) {
    const ev: Record<string, { dx: number; dy: number; dz: number }> = {};
    for (const n of sys.nodes.values()) {
      const wave = Math.sin((n.x / 12.0) * Math.PI);
      ev[n.identity.id] = { dx: 0, dy: 0, dz: -amp * wave };
    }
    return ev;
  }

  private static buildTrussLateralEigenvectors(sys: StructuralSystem, amp: number) {
    const ev: Record<string, { dx: number; dy: number; dz: number }> = {};
    for (const n of sys.nodes.values()) {
      const wave = Math.sin((n.x / 12.0) * Math.PI);
      ev[n.identity.id] = { dx: 0, dy: amp * wave, dz: 0 };
    }
    return ev;
  }

  private static buildTrussSHarmonicEigenvectors(sys: StructuralSystem, amp: number) {
    const ev: Record<string, { dx: number; dy: number; dz: number }> = {};
    for (const n of sys.nodes.values()) {
      const wave = Math.sin((n.x / 12.0) * Math.PI * 2);
      ev[n.identity.id] = { dx: 0, dy: 0, dz: amp * wave };
    }
    return ev;
  }

  private static buildBuildingSwayEigenvectors(sys: StructuralSystem, amp: number) {
    const ev: Record<string, { dx: number; dy: number; dz: number }> = {};
    for (const n of sys.nodes.values()) {
      const h = n.z / 7.0;
      ev[n.identity.id] = { dx: amp * h * h, dy: 0, dz: 0 };
    }
    return ev;
  }

  private static buildBuildingTransverseEigenvectors(sys: StructuralSystem, amp: number) {
    const ev: Record<string, { dx: number; dy: number; dz: number }> = {};
    for (const n of sys.nodes.values()) {
      const h = n.z / 7.0;
      ev[n.identity.id] = { dx: 0, dy: amp * h * h, dz: 0 };
    }
    return ev;
  }

  private static buildBuildingTorsionalEigenvectors(sys: StructuralSystem, amp: number) {
    const ev: Record<string, { dx: number; dy: number; dz: number }> = {};
    for (const n of sys.nodes.values()) {
      const h = n.z / 7.0;
      const cx = n.x - 3.0;
      const cy = n.y - 3.0;
      ev[n.identity.id] = { dx: -cy * amp * 0.3 * h, dy: cx * amp * 0.3 * h, dz: 0 };
    }
    return ev;
  }
}
