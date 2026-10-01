import * as THREE from 'three';
import type { LoadPatternType, StructuralSystem } from '@beamlab/engineering-model';
import {
  PointLoadMeshBuilder,
  type PointLoadDefinition,
} from './PointLoadMeshBuilder';
import {
  DistributedLoadMeshBuilder,
  type DistributedLoadDefinition,
} from './DistributedLoadMeshBuilder';
import {
  SurfaceLoadMeshBuilder,
  type SurfaceLoadDefinition,
} from './SurfaceLoadMeshBuilder';
import type { PlateDefinition } from '../geometry';

export interface LoadDisplayOptions {
  visible: boolean;
  activePattern: 'All' | LoadPatternType;
  scaleMultiplier: number;
  showLabels: boolean;
}

export const DEFAULT_LOAD_OPTIONS: LoadDisplayOptions = {
  visible: true,
  activePattern: 'All',
  scaleMultiplier: 1.0,
  showLabels: true,
};

/**
 * Coordinates 3D visual rendering of structural load vectors, distributed curtains,
 * and slab surface pressures with interactive load case filtering and scaling.
 */
export class LoadVisualizationController {
  private readonly rootGroup = new THREE.Group();
  private pointLoads: PointLoadDefinition[] = [];
  private distributedLoads: DistributedLoadDefinition[] = [];
  private surfaceLoads: SurfaceLoadDefinition[] = [];
  private plates: PlateDefinition[] = [];
  private options: LoadDisplayOptions = { ...DEFAULT_LOAD_OPTIONS };

  constructor(scene: THREE.Scene) {
    this.rootGroup.name = 'LoadsVisualizationRoot';
    scene.add(this.rootGroup);
  }

  public getRootGroup(): THREE.Group {
    return this.rootGroup;
  }

  public setDisplayOptions(opts: Partial<LoadDisplayOptions>): void {
    this.options = { ...this.options, ...opts };
    this.rootGroup.visible = this.options.visible;
    this.rebuild();
  }

  public getDisplayOptions(): LoadDisplayOptions {
    return { ...this.options };
  }

  public setLoads(
    point: PointLoadDefinition[] = [],
    distributed: DistributedLoadDefinition[] = [],
    surface: SurfaceLoadDefinition[] = [],
    plates: PlateDefinition[] = [],
  ): void {
    this.pointLoads = point;
    this.distributedLoads = distributed;
    this.surfaceLoads = surface;
    this.plates = plates;
    this.rebuild();
  }

  public rebuild(): void {
    while (this.rootGroup.children.length > 0) {
      const child = this.rootGroup.children[0]!;
      this.rootGroup.remove(child);
      if (child instanceof THREE.Mesh && child.geometry) {
        child.geometry.dispose();
      }
    }

    if (!this.options.visible) return;

    const scale = this.options.scaleMultiplier;
    const showLabels = this.options.showLabels;
    const filter = this.options.activePattern;

    // 1. Point Loads
    for (const pl of this.pointLoads) {
      if (filter === 'All' || pl.pattern === filter) {
        const obj = PointLoadMeshBuilder.buildPointLoadObject(pl, scale, showLabels);
        this.rootGroup.add(obj);
      }
    }

    // 2. Distributed Loads
    for (const dl of this.distributedLoads) {
      if (filter === 'All' || dl.pattern === filter) {
        const obj = DistributedLoadMeshBuilder.buildDistributedLoadObject(dl, scale, showLabels);
        this.rootGroup.add(obj);
      }
    }

    // 3. Surface Loads
    for (const sl of this.surfaceLoads) {
      if (filter === 'All' || sl.pattern === filter) {
        const plate = this.plates.find((p) => p.id === sl.plateId);
        if (plate) {
          const obj = SurfaceLoadMeshBuilder.buildSurfaceLoadObject(sl, plate, scale, showLabels);
          this.rootGroup.add(obj);
        }
      }
    }
  }

  public dispose(): void {
    while (this.rootGroup.children.length > 0) {
      this.rootGroup.remove(this.rootGroup.children[0]!);
    }
    if (this.rootGroup.parent) {
      this.rootGroup.parent.remove(this.rootGroup);
    }
  }

  // ─── Preset Loads Generator for Demo Models ─────────────────────────────────

  public static createPortalFrameLoads(
    system: StructuralSystem,
  ): { point: PointLoadDefinition[]; dist: DistributedLoadDefinition[]; surf: SurfaceLoadDefinition[] } {
    const dist: DistributedLoadDefinition[] = [];
    const point: PointLoadDefinition[] = [];

    // Dead & Live Loads on Rafters
    for (const member of system.members.values()) {
      if (member.memberType === 'Rafter') {
        const n1 = system.getNode(member.startNodeId);
        const n2 = system.getNode(member.endNodeId);
        if (n1 && n2) {
          const p1 = new THREE.Vector3(n1.x, n1.y, n1.z);
          const p2 = new THREE.Vector3(n2.x, n2.y, n2.z);

          // Dead Load: 12 kN/m
          dist.push({
            id: `dl-${member.identity.id}`,
            memberId: member.identity.id,
            startPoint: p1,
            endPoint: p2,
            wStart: 12000,
            pattern: 'Dead',
            label: '12 kN/m (DL)',
          });

          // Live Load: 8 kN/m
          dist.push({
            id: `ll-${member.identity.id}`,
            memberId: member.identity.id,
            startPoint: p1,
            endPoint: p2,
            wStart: 8000,
            pattern: 'Live',
            label: '8 kN/m (LL)',
          });
        }
      } else if (member.memberType === 'Column') {
        // Wind Load on Column 1 (windward column, Y=0, X=0)
        const n1 = system.getNode(member.startNodeId);
        const n2 = system.getNode(member.endNodeId);
        if (n1 && n2 && n1.x === 0 && n2.x === 0) {
          const p1 = new THREE.Vector3(n1.x, n1.y, n1.z);
          const p2 = new THREE.Vector3(n2.x, n2.y, n2.z);
          dist.push({
            id: `wl-${member.identity.id}`,
            memberId: member.identity.id,
            startPoint: p1,
            endPoint: p2,
            direction: new THREE.Vector3(1, 0, 0), // Lateral wind +X
            wStart: 6000,
            pattern: 'Wind',
            label: '6 kN/m (Windward)',
          });
        }
      }
    }

    // Crane Point Load at Eaves
    const eavesNode = system.getNode('n_e1_b1');
    if (eavesNode) {
      point.push({
        id: 'crane-load-1',
        nodeId: 'n_e1_b1',
        position: new THREE.Vector3(eavesNode.x, eavesNode.y, eavesNode.z),
        force: { fz: -45000 },
        pattern: 'Live',
        label: '45 kN (Crane)',
      });
    }

    return { point, dist, surf: [] };
  }

  public static createSpaceTrussLoads(
    system: StructuralSystem,
  ): { point: PointLoadDefinition[]; dist: DistributedLoadDefinition[]; surf: SurfaceLoadDefinition[] } {
    const point: PointLoadDefinition[] = [];

    // Nodal Deck Loads across bottom chord nodes
    for (const node of system.nodes.values()) {
      if (node.identity.id.startsWith('nb_')) {
        point.push({
          id: `deck-${node.identity.id}`,
          nodeId: node.identity.id,
          position: new THREE.Vector3(node.x, node.y, node.z),
          force: { fz: -35000 },
          pattern: 'Live',
          label: '35 kN',
        });
      } else if (node.identity.id.startsWith('nt_')) {
        // Wind suction on top chord
        point.push({
          id: `wind-${node.identity.id}`,
          nodeId: node.identity.id,
          position: new THREE.Vector3(node.x, node.y, node.z),
          force: { fy: 15000, fz: 8000 },
          pattern: 'Wind',
          label: '15 kN (Wind)',
        });
      }
    }

    return { point, dist: [], surf: [] };
  }

  public static createBuildingLoads(
    system: StructuralSystem,
    plates: PlateDefinition[],
  ): { point: PointLoadDefinition[]; dist: DistributedLoadDefinition[]; surf: SurfaceLoadDefinition[] } {
    const dist: DistributedLoadDefinition[] = [];
    const surf: SurfaceLoadDefinition[] = [];

    // Floor beam dead loads
    for (const member of system.members.values()) {
      if (member.memberType === 'Beam') {
        const n1 = system.getNode(member.startNodeId);
        const n2 = system.getNode(member.endNodeId);
        if (n1 && n2) {
          dist.push({
            id: `wall-load-${member.identity.id}`,
            memberId: member.identity.id,
            startPoint: new THREE.Vector3(n1.x, n1.y, n1.z),
            endPoint: new THREE.Vector3(n2.x, n2.y, n2.z),
            wStart: 15000,
            pattern: 'Dead',
            label: '15 kN/m (Wall)',
          });
        }
      }
    }

    // Slab surface live load on L1
    const l1Slab = plates.find((p) => p.id === 'slab-l1');
    if (l1Slab) {
      surf.push({
        id: 'slab-live-l1',
        plateId: l1Slab.id,
        pressure: 4000, // 4 kN/m²
        pattern: 'Live',
        label: '4.0 kN/m² (Office Live)',
      });
    }

    // Slab roof snow load
    const roofSlab = plates.find((p) => p.id === 'slab-roof');
    if (roofSlab) {
      surf.push({
        id: 'slab-snow-roof',
        plateId: roofSlab.id,
        pressure: 2000, // 2 kN/m²
        pattern: 'Snow',
        label: '2.0 kN/m² (Snow)',
      });
    }

    return { point: [], dist, surf };
  }
}
