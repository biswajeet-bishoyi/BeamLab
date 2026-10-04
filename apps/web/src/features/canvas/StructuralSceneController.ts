import * as THREE from 'three';
import {
  StructuralSystem,
} from '@beamstudio/engineering-model';
import {
  MemberMeshBuilder,
  SupportMeshBuilder,
  NodeMeshBuilder,
  PlateMeshBuilder,
  LCSGizmoBuilder,
  type PlateDefinition,
} from './geometry';

export interface SceneRenderOptions {
  renderMode: 'extruded' | 'centerline';
  showMembers: boolean;
  showNodes: boolean;
  showSupports: boolean;
  showPlates: boolean;
  showLCS: boolean;
  showNodeLabels: boolean;
}

export const DEFAULT_RENDER_OPTIONS: SceneRenderOptions = {
  renderMode: 'extruded',
  showMembers: true,
  showNodes: true,
  showSupports: true,
  showPlates: true,
  showLCS: false,
  showNodeLabels: true,
};

/**
 * High-performance structural scene coordinator.
 * Synchronizes @beamstudio/engineering-model entities with Three.js scene graph.
 */
export class StructuralSceneController {
  private readonly rootGroup = new THREE.Group();
  private readonly membersGroup = new THREE.Group();
  private readonly nodesGroup = new THREE.Group();
  private readonly supportsGroup = new THREE.Group();
  private readonly platesGroup = new THREE.Group();
  private readonly lcsGroup = new THREE.Group();

  private activeSystem?: StructuralSystem;
  private activePlates: PlateDefinition[] = [];
  private renderOptions: SceneRenderOptions = { ...DEFAULT_RENDER_OPTIONS };

  constructor(scene: THREE.Scene) {
    this.rootGroup.name = 'StructuralModelRoot';
    this.membersGroup.name = 'MembersGroup';
    this.nodesGroup.name = 'NodesGroup';
    this.supportsGroup.name = 'SupportsGroup';
    this.platesGroup.name = 'PlatesGroup';
    this.lcsGroup.name = 'LCSGroup';

    this.rootGroup.add(
      this.platesGroup,
      this.membersGroup,
      this.supportsGroup,
      this.nodesGroup,
      this.lcsGroup,
    );

    scene.add(this.rootGroup);
  }

  /**
   * Sets the active structural system and rebuilds the 3D meshes.
   */
  public loadSystem(system: StructuralSystem, plates: PlateDefinition[] = []): void {
    this.activeSystem = system;
    this.activePlates = plates;
    this.rebuildScene();
  }

  /**
   * Updates rendering options and triggers partial or full rebuild.
   */
  public updateOptions(options: Partial<SceneRenderOptions>): void {
    const prevMode = this.renderOptions.renderMode;
    const prevLabels = this.renderOptions.showNodeLabels;

    this.renderOptions = { ...this.renderOptions, ...options };

    // Update group visibilities directly without rebuilding geometry
    this.membersGroup.visible = this.renderOptions.showMembers;
    this.nodesGroup.visible = this.renderOptions.showNodes;
    this.supportsGroup.visible = this.renderOptions.showSupports;
    this.platesGroup.visible = this.renderOptions.showPlates;
    this.lcsGroup.visible = this.renderOptions.showLCS;

    // If renderMode or labels changed, geometry must be reconstructed
    if (
      (options.renderMode !== undefined && options.renderMode !== prevMode) ||
      (options.showNodeLabels !== undefined && options.showNodeLabels !== prevLabels)
    ) {
      this.rebuildScene();
    }
  }

  public getOptions(): SceneRenderOptions {
    return { ...this.renderOptions };
  }

  public getRootGroup(): THREE.Group {
    return this.rootGroup;
  }

  public getRaycastCandidates(): THREE.Object3D[] {
    return [this.membersGroup, this.nodesGroup, this.supportsGroup, this.platesGroup];
  }

  public getActiveSystem(): StructuralSystem | undefined {
    return this.activeSystem;
  }

  public getActivePlates(): PlateDefinition[] {
    return this.activePlates;
  }

  /**
   * Computes the 3D world bounding box of all structural entities.
   */
  public computeBoundingBox(): THREE.Box3 {
    const box = new THREE.Box3();
    if (!this.activeSystem || this.activeSystem.nodes.size === 0) {
      box.set(new THREE.Vector3(-5, -5, 0), new THREE.Vector3(5, 5, 4));
      return box;
    }

    for (const node of this.activeSystem.nodes.values()) {
      box.expandByPoint(new THREE.Vector3(node.x, node.y, node.z));
    }

    // Include plates in bounding box
    for (const pl of this.activePlates) {
      for (const pt of pl.cornerPoints) {
        box.expandByPoint(pt);
      }
    }

    return box;
  }

  /**
   * Cleans up and clears all scene groups.
   */
  public dispose(): void {
    this.clearGroup(this.membersGroup);
    this.clearGroup(this.nodesGroup);
    this.clearGroup(this.supportsGroup);
    this.clearGroup(this.platesGroup);
    this.clearGroup(this.lcsGroup);
    if (this.rootGroup.parent) {
      this.rootGroup.parent.remove(this.rootGroup);
    }
  }

  // ─── Scene Construction ───────────────────────────────────────────────────

  public rebuildScene(): void {
    this.clearGroup(this.membersGroup);
    this.clearGroup(this.nodesGroup);
    this.clearGroup(this.supportsGroup);
    this.clearGroup(this.platesGroup);
    this.clearGroup(this.lcsGroup);

    if (!this.activeSystem) return;

    const sys = this.activeSystem;

    // Map of nodes for fast lookup
    const nodeMap = sys.nodes;
    const supportedNodeIds = new Set<string>();
    for (const sup of sys.supports.values()) {
      supportedNodeIds.add(sup.nodeId);
    }

    // 1. Build Nodes
    for (const node of nodeMap.values()) {
      const isSupported = supportedNodeIds.has(node.identity.id);
      const nodeObj = NodeMeshBuilder.buildNodeObject(node, {
        isSupported,
        showLabels: this.renderOptions.showNodeLabels,
        nodeRadius: 0.05,
      });
      this.nodesGroup.add(nodeObj);
    }

    // 2. Build Supports
    for (const sup of sys.supports.values()) {
      const node = nodeMap.get(sup.nodeId);
      if (node) {
        const supObj = SupportMeshBuilder.buildSupportGlyph(sup, node, 1.0);
        this.supportsGroup.add(supObj);
      }
    }

    // 3. Build Members & LCS Triads
    for (const member of sys.members.values()) {
      const n1 = nodeMap.get(member.startNodeId);
      const n2 = nodeMap.get(member.endNodeId);
      if (!n1 || !n2) continue;

      const profile = sys.getSection(member.sectionId)?.profile;
      const material = sys.getMaterial(member.materialId);

      // Build member (extruded solid or centerline)
      const memberObj = MemberMeshBuilder.buildMemberObject(
        member,
        n1,
        n2,
        profile,
        material,
        {
          renderMode: this.renderOptions.renderMode,
          showReleases: true,
        },
      );
      this.membersGroup.add(memberObj);

      // Build LCS Triad at member midpoint
      const p1 = new THREE.Vector3(n1.x, n1.y, n1.z);
      const p2 = new THREE.Vector3(n2.x, n2.y, n2.z);
      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      const { xAxis, yAxis, zAxis } = MemberMeshBuilder.computeLocalFrame(
        p1,
        p2,
        member.orientation?.rollAngleDeg ?? 0,
      );
      const lcsGizmo = LCSGizmoBuilder.buildLCSGizmo(mid, xAxis, yAxis, zAxis, 0.45);
      this.lcsGroup.add(lcsGizmo);
    }

    // 4. Build Plates / Shells
    for (const plate of this.activePlates) {
      const plateObj = PlateMeshBuilder.buildPlateObject(plate);
      this.platesGroup.add(plateObj);
    }

    // Apply visibility states
    this.membersGroup.visible = this.renderOptions.showMembers;
    this.nodesGroup.visible = this.renderOptions.showNodes;
    this.supportsGroup.visible = this.renderOptions.showSupports;
    this.platesGroup.visible = this.renderOptions.showPlates;
    this.lcsGroup.visible = this.renderOptions.showLCS;
  }

  private clearGroup(group: THREE.Group): void {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
      }
    }
  }

  // ─── Preset Engineering Models ──────────────────────────────────────────────

  /**
   * Generates a genuine Blank Canvas model (0 nodes, 0 members, 0 supports, 0 plates)
   * with standard structural steel and wide-flange section presets registered.
   */
  public static createBlankModel(): { system: StructuralSystem; plates: PlateDefinition[] } {
    const sys = new StructuralSystem('sys-blank', 'Blank Canvas Model', 'proj-default');

    sys.addMaterial('mat-steel', {
      grade: 'A992',
      category: 'Steel',
      elasticModulus: 200e9,
      shearModulus: 77e9,
      poissonRatio: 0.3,
      yieldStrength: 345e6,
      density: 7850,
    });

    sys.addSection('sec-w12x26', {
      designation: 'W12x26',
      type: 'I',
      properties: { area: 0.00494, momentOfInertiaY: 8.49e-5, momentOfInertiaZ: 7.2e-6, torsionalConstant: 1.25e-7 },
      dimensions: { depth: 0.31, flangeWidth: 0.165, webThickness: 0.0058, flangeThickness: 0.0097 },
    });

    return { system: sys, plates: [] };
  }

  /**
   * Generates a 3D Multi-Bay Industrial Portal Frame.
   */
  public static createPortalFrameModel(): { system: StructuralSystem; plates: PlateDefinition[] } {
    const sys = new StructuralSystem('sys-portal', 'Industrial 3D Portal Frame', 'proj-default');

    // Materials
    sys.addMaterial('mat-s355', {
      grade: 'S355',
      category: 'Steel',
      elasticModulus: 210e9,
      shearModulus: 81e9,
      poissonRatio: 0.3,
      yieldStrength: 355e6,
      density: 7850,
    });

    // Sections
    sys.addSection('sec-col', {
      designation: 'W12x26',
      type: 'I',
      properties: { area: 0.004903, momentOfInertiaY: 8.37e-5, momentOfInertiaZ: 2.04e-5, torsionalConstant: 1.17e-7 },
      dimensions: { d: 0.310, bf: 0.165, tf: 0.0094, tw: 0.0061 },
    });

    sys.addSection('sec-rafter', {
      designation: 'IPE 300',
      type: 'I',
      properties: { area: 0.005381, momentOfInertiaY: 8.356e-5, momentOfInertiaZ: 6.04e-6, torsionalConstant: 2.01e-7 },
      dimensions: { d: 0.300, bf: 0.150, tf: 0.0107, tw: 0.0071 },
    });

    sys.addSection('sec-brace', {
      designation: 'L80x80x8',
      type: 'L',
      properties: { area: 0.00122, momentOfInertiaY: 7.22e-7, momentOfInertiaZ: 7.22e-7, torsionalConstant: 2.5e-8 },
      dimensions: { d: 0.080, b: 0.080, t: 0.008 },
    });

    sys.addSection('sec-purlin', {
      designation: 'RHS 100x50x4',
      type: 'Box',
      properties: { area: 0.0011, momentOfInertiaY: 1.5e-6, momentOfInertiaZ: 0.5e-6, torsionalConstant: 1.0e-7 },
      dimensions: { d: 0.100, b: 0.050, t: 0.004 },
    });

    // Nodes: 2 bays in Y (Y=0, Y=6), span 12m in X (X=0, X=6, X=12), height 5m at eaves, 6.5m at ridge
    const baysY = [0, 6];

    baysY.forEach((y, bayIdx) => {
      const b = bayIdx + 1;
      // Footings
      sys.addNode(`n_f1_b${b}`, `Base L (B${b})`, 0, y, 0);
      sys.addNode(`n_f2_b${b}`, `Base R (B${b})`, 12, y, 0);

      // Eaves
      sys.addNode(`n_e1_b${b}`, `Eaves L (B${b})`, 0, y, 5.0);
      sys.addNode(`n_e2_b${b}`, `Eaves R (B${b})`, 12, y, 5.0);

      // Ridge
      sys.addNode(`n_ridge_b${b}`, `Apex (B${b})`, 6, y, 6.5);

      // Supports
      sys.addSupport(`sup_f1_b${b}`, `Fix-Base-L${b}`, `n_f1_b${b}`, 'Fixed');
      sys.addSupport(`sup_f2_b${b}`, `Pin-Base-R${b}`, `n_f2_b${b}`, 'Pinned');

      // Columns
      sys.addMember(`m_col1_b${b}`, `Col-L (B${b})`, `n_f1_b${b}`, `n_e1_b${b}`, 'mat-s355', 'sec-col', 'Column');
      sys.addMember(`m_col2_b${b}`, `Col-R (B${b})`, `n_f2_b${b}`, `n_e2_b${b}`, 'mat-s355', 'sec-col', 'Column');

      // Rafters
      sys.addMember(`m_raf1_b${b}`, `Rafter-L (B${b})`, `n_e1_b${b}`, `n_ridge_b${b}`, 'mat-s355', 'sec-rafter', 'Rafter');
      sys.addMember(`m_raf2_b${b}`, `Rafter-R (B${b})`, `n_ridge_b${b}`, `n_e2_b${b}`, 'mat-s355', 'sec-rafter', 'Rafter');
    });

    // Longitudinal connecting members between Frame 1 (Y=0) and Frame 2 (Y=6)
    sys.addMember('m_eaves_tie1', 'Eaves Tie L', 'n_e1_b1', 'n_e1_b2', 'mat-s355', 'sec-purlin', 'Strut');
    sys.addMember('m_eaves_tie2', 'Eaves Tie R', 'n_e2_b1', 'n_e2_b2', 'mat-s355', 'sec-purlin', 'Strut');
    sys.addMember('m_ridge_purlin', 'Ridge Purlin', 'n_ridge_b1', 'n_ridge_b2', 'mat-s355', 'sec-purlin', 'Purlin');

    // Diagonal roof and wall cross-bracing
    sys.addMember('m_wall_brace1', 'Wall Cross Brace 1', 'n_f1_b1', 'n_e1_b2', 'mat-s355', 'sec-brace', 'Brace');
    sys.addMember('m_wall_brace2', 'Wall Cross Brace 2', 'n_f1_b2', 'n_e1_b1', 'mat-s355', 'sec-brace', 'Brace');

    return { system: sys, plates: [] };
  }

  /**
   * Generates a 3D Space Truss Bridge Model with CHS pipe sections.
   */
  public static createSpaceTrussModel(): { system: StructuralSystem; plates: PlateDefinition[] } {
    const sys = new StructuralSystem('sys-truss', '3D Space Truss Girder', 'proj-default');

    sys.addMaterial('mat-steel', {
      grade: 'S355',
      category: 'Steel',
      elasticModulus: 200e9,
      shearModulus: 77e9,
      poissonRatio: 0.3,
      yieldStrength: 355e6,
      density: 7850,
    });

    // Chords (Large CHS)
    sys.addSection('sec-chord', {
      designation: 'CHS 168.3x8',
      type: 'CHS',
      properties: { area: 0.00403, momentOfInertiaY: 1.34e-5, momentOfInertiaZ: 1.34e-5, torsionalConstant: 2.68e-5 },
      dimensions: { od: 0.168, t: 0.008 },
    });

    // Diagonals (Medium CHS)
    sys.addSection('sec-diag', {
      designation: 'CHS 114.3x5',
      type: 'CHS',
      properties: { area: 0.00172, momentOfInertiaY: 2.58e-6, momentOfInertiaZ: 2.58e-6, torsionalConstant: 5.16e-6 },
      dimensions: { od: 0.114, t: 0.005 },
    });

    // 4 bays of 3m each along X = 12m span
    // Width in Y = 3m, Height in Z = 2.5m
    const bays = 4;
    const bayLen = 3.0;
    const width = 3.0;
    const height = 2.5;

    // Bottom chord nodes (Z=0)
    for (let i = 0; i <= bays; i++) {
      const x = i * bayLen;
      sys.addNode(`nb_L_${i}`, `Bot-L-${i}`, x, 0, 0);
      sys.addNode(`nb_R_${i}`, `Bot-R-${i}`, x, width, 0);
    }

    // Top chord nodes (Z=height, shifted by half bay)
    for (let i = 0; i < bays; i++) {
      const x = (i + 0.5) * bayLen;
      sys.addNode(`nt_L_${i}`, `Top-L-${i}`, x, 0, height);
      sys.addNode(`nt_R_${i}`, `Top-R-${i}`, x, width, height);
    }

    // Supports at ends
    sys.addSupport('sup_bot_L0', 'Pinned-L0', 'nb_L_0', 'Pinned');
    sys.addSupport('sup_bot_R0', 'Pinned-R0', 'nb_R_0', 'Pinned');
    sys.addSupport('sup_bot_L4', 'Roller-L4', `nb_L_${bays}`, 'RollerX');
    sys.addSupport('sup_bot_R4', 'Roller-R4', `nb_R_${bays}`, 'RollerX');

    // Bottom longitudinal chords & transverse ties
    for (let i = 0; i < bays; i++) {
      sys.addMember(`m_bchord_L_${i}`, `BotChord-L${i}`, `nb_L_${i}`, `nb_L_${i + 1}`, 'mat-steel', 'sec-chord', 'Truss');
      sys.addMember(`m_bchord_R_${i}`, `BotChord-R${i}`, `nb_R_${i}`, `nb_R_${i + 1}`, 'mat-steel', 'sec-chord', 'Truss');
    }
    for (let i = 0; i <= bays; i++) {
      sys.addMember(`m_btie_${i}`, `BotTie-${i}`, `nb_L_${i}`, `nb_R_${i}`, 'mat-steel', 'sec-chord', 'Truss');
    }

    // Top longitudinal chords & transverse ties
    for (let i = 0; i < bays - 1; i++) {
      sys.addMember(`m_tchord_L_${i}`, `TopChord-L${i}`, `nt_L_${i}`, `nt_L_${i + 1}`, 'mat-steel', 'sec-chord', 'Truss');
      sys.addMember(`m_tchord_R_${i}`, `TopChord-R${i}`, `nt_R_${i}`, `nt_R_${i + 1}`, 'mat-steel', 'sec-chord', 'Truss');
    }
    for (let i = 0; i < bays; i++) {
      sys.addMember(`m_ttie_${i}`, `TopTie-${i}`, `nt_L_${i}`, `nt_R_${i}`, 'mat-steel', 'sec-chord', 'Truss');
    }

    // Diagonals (Warren configuration)
    for (let i = 0; i < bays; i++) {
      // Left side web
      sys.addMember(`m_diag_L1_${i}`, `Diag-L1-${i}`, `nb_L_${i}`, `nt_L_${i}`, 'mat-steel', 'sec-diag', 'Truss');
      sys.addMember(`m_diag_L2_${i}`, `Diag-L2-${i}`, `nt_L_${i}`, `nb_L_${i + 1}`, 'mat-steel', 'sec-diag', 'Truss');

      // Right side web
      sys.addMember(`m_diag_R1_${i}`, `Diag-R1-${i}`, `nb_R_${i}`, `nt_R_${i}`, 'mat-steel', 'sec-diag', 'Truss');
      sys.addMember(`m_diag_R2_${i}`, `Diag-R2-${i}`, `nt_R_${i}`, `nb_R_${i + 1}`, 'mat-steel', 'sec-diag', 'Truss');

      // Transverse diagonals
      sys.addMember(`m_tdiag_1_${i}`, `CrossDiag-1-${i}`, `nb_L_${i}`, `nt_R_${i}`, 'mat-steel', 'sec-diag', 'Truss');
      sys.addMember(`m_tdiag_2_${i}`, `CrossDiag-2-${i}`, `nb_R_${i}`, `nt_L_${i}`, 'mat-steel', 'sec-diag', 'Truss');
    }

    return { system: sys, plates: [] };
  }

  /**
   * Generates a 2-Story Reinforced Concrete Building with 3D solid floor slabs.
   */
  public static createBuildingWithSlabsModel(): { system: StructuralSystem; plates: PlateDefinition[] } {
    const sys = new StructuralSystem('sys-bldg', '2-Story Framed Building with Floor Slabs', 'proj-default');

    sys.addMaterial('mat-c30', {
      grade: 'C30/37',
      category: 'Concrete',
      elasticModulus: 33e9,
      shearModulus: 13.75e9,
      poissonRatio: 0.2,
      yieldStrength: 30e6,
      density: 2400,
    });

    // Column Section (0.4m x 0.4m)
    sys.addSection('sec-col-rc', {
      designation: 'RC 400x400',
      type: 'SolidRect',
      properties: { area: 0.16, momentOfInertiaY: 0.00213, momentOfInertiaZ: 0.00213, torsionalConstant: 0.0036 },
      dimensions: { b: 0.40, h: 0.40 },
    });

    // Beam Section (0.3m x 0.5m)
    sys.addSection('sec-beam-rc', {
      designation: 'RC 300x500',
      type: 'SolidRect',
      properties: { area: 0.15, momentOfInertiaY: 0.003125, momentOfInertiaZ: 0.001125, torsionalConstant: 0.0024 },
      dimensions: { b: 0.30, h: 0.50 },
    });

    // 4 Columns layout: 6m x 6m
    const xs = [0, 6];
    const ys = [0, 6];
    const levels = [0, 3.5, 7.0]; // Ground, L1, Roof

    // Create nodes
    levels.forEach((z, lvlIdx) => {
      xs.forEach((x, xi) => {
        ys.forEach((y, yi) => {
          const id = `n_${lvlIdx}_${xi}_${yi}`;
          sys.addNode(id, `N-L${lvlIdx}-${xi}${yi}`, x, y, z);

          // Fixed base supports at ground
          if (lvlIdx === 0) {
            sys.addSupport(`sup_${xi}_${yi}`, `Footing-${xi}${yi}`, id, 'Fixed');
          }
        });
      });
    });

    // Vertical Columns
    for (let lvl = 0; lvl < 2; lvl++) {
      xs.forEach((_, xi) => {
        ys.forEach((_, yi) => {
          const botId = `n_${lvl}_${xi}_${yi}`;
          const topId = `n_${lvl + 1}_${xi}_${yi}`;
          sys.addMember(`col_${lvl}_${xi}_${yi}`, `Col-L${lvl}-${xi}${yi}`, botId, topId, 'mat-c30', 'sec-col-rc', 'Column');
        });
      });
    }

    // Floor Beams at L1 (z=3.5) and Roof (z=7.0)
    for (let lvl = 1; lvl <= 2; lvl++) {
      // X-direction beams
      sys.addMember(`bm_x0_${lvl}`, `Beam-X0-L${lvl}`, `n_${lvl}_0_0`, `n_${lvl}_1_0`, 'mat-c30', 'sec-beam-rc', 'Beam');
      sys.addMember(`bm_x1_${lvl}`, `Beam-X1-L${lvl}`, `n_${lvl}_0_1`, `n_${lvl}_1_1`, 'mat-c30', 'sec-beam-rc', 'Beam');

      // Y-direction beams
      sys.addMember(`bm_y0_${lvl}`, `Beam-Y0-L${lvl}`, `n_${lvl}_0_0`, `n_${lvl}_0_1`, 'mat-c30', 'sec-beam-rc', 'Beam');
      sys.addMember(`bm_y1_${lvl}`, `Beam-Y1-L${lvl}`, `n_${lvl}_1_0`, `n_${lvl}_1_1`, 'mat-c30', 'sec-beam-rc', 'Beam');
    }

    // 3D Slabs at Level 1 and Roof
    const plates: PlateDefinition[] = [
      {
        id: 'slab-l1',
        name: 'Floor Slab L1 (200mm)',
        thickness: 0.20,
        materialCategory: 'Concrete',
        cornerPoints: [
          new THREE.Vector3(0, 0, 3.5),
          new THREE.Vector3(6, 0, 3.5),
          new THREE.Vector3(6, 6, 3.5),
          new THREE.Vector3(0, 6, 3.5),
        ],
      },
      {
        id: 'slab-roof',
        name: 'Roof Slab (180mm)',
        thickness: 0.18,
        materialCategory: 'Concrete',
        cornerPoints: [
          new THREE.Vector3(0, 0, 7.0),
          new THREE.Vector3(6, 0, 7.0),
          new THREE.Vector3(6, 6, 7.0),
          new THREE.Vector3(0, 6, 7.0),
        ],
      },
    ];

    return { system: sys, plates };
  }
}
