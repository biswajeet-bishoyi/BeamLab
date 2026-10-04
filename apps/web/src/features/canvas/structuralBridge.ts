/**
 * BeamLab Structural Bridge
 * Provides a synchronized, bidirectional bridge between 3D/2D engineering models,
 * Three.js scene controllers, and the Live Property Inspector.
 */

import {
  StructuralSystem,
  StructuralNode,
  StructuralMember,
  StructuralSupport,
  type SupportPreset,
  type MemberType,
  SECTION_PRESETS,
} from '@beamstudio/engineering-model';
import type { PlateDefinition } from './geometry';

type ChangeListener = () => void;
type RebuildCallback = () => void;

class StructuralBridge {
  private system: StructuralSystem | null = null;
  private plates: PlateDefinition[] = [];
  private rebuildCallback: RebuildCallback | null = null;
  private listeners = new Set<ChangeListener>();

  public setSystem(system: StructuralSystem, plates: PlateDefinition[] = []): void {
    this.system = system;
    this.plates = plates;
    this.notifyChange();
  }

  public getSystem(): StructuralSystem | null {
    return this.system;
  }

  public getPlates(): PlateDefinition[] {
    return this.plates;
  }

  public setRebuildCallback(cb: RebuildCallback | null): void {
    this.rebuildCallback = cb;
  }

  public subscribe(listener: ChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public notifyChange(): void {
    if (this.rebuildCallback) {
      try {
        this.rebuildCallback();
      } catch (err) {
        console.error('Error rebuilding 3D scene from structural bridge:', err);
      }
    }
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('Error in structural bridge listener:', err);
      }
    });
  }

  // ─── Query Helpers ─────────────────────────────────────────────────────────

  public getNode(id: string): StructuralNode | undefined {
    return this.system?.nodes.get(id);
  }

  public getMember(id: string): StructuralMember | undefined {
    return this.system?.members.get(id);
  }

  public getSupport(id: string): StructuralSupport | undefined {
    return this.system?.supports.get(id);
  }

  public getSupportForNode(nodeId: string): StructuralSupport | undefined {
    if (!this.system) return undefined;
    for (const sup of this.system.supports.values()) {
      if (sup.nodeId === nodeId) return sup;
    }
    return undefined;
  }

  public getAllNodes(): StructuralNode[] {
    return this.system ? Array.from(this.system.nodes.values()) : [];
  }

  public getAllMembers(): StructuralMember[] {
    return this.system ? Array.from(this.system.members.values()) : [];
  }

  // ─── Node Mutation ──────────────────────────────────────────────────────────

  public addNode(x: number, y: number, z: number, customId?: string, name?: string): string {
    if (!this.system) return '';
    const id = customId || `n_${Date.now().toString(36)}_${Math.floor(Math.random() * 100)}`;
    const nodeName = name || `Node-${this.system.nodes.size + 1}`;
    this.system.addNode(id, nodeName, x, y, z);
    this.notifyChange();
    return id;
  }

  public updateNode(id: string, x: number, y: number, z: number): void {
    const node = this.system?.nodes.get(id);
    if (!node) return;
    (node as any).coordinates.x = x;
    (node as any).coordinates.y = y;
    (node as any).coordinates.z = z;
    this.notifyChange();
  }

  public deleteNode(id: string): void {
    if (!this.system) return;
    // Remove any connected members first
    const membersToDelete: string[] = [];
    for (const [mId, member] of this.system.members.entries()) {
      if (member.startNodeId === id || member.endNodeId === id) {
        membersToDelete.push(mId);
      }
    }
    for (const mId of membersToDelete) {
      this.system.members.delete(mId);
    }

    // Remove any support at this node
    const supportsToDelete: string[] = [];
    for (const [sId, sup] of this.system.supports.entries()) {
      if (sup.nodeId === id) {
        supportsToDelete.push(sId);
      }
    }
    for (const sId of supportsToDelete) {
      this.system.supports.delete(sId);
    }

    this.system.nodes.delete(id);
    this.notifyChange();
  }

  // ─── Member Mutation ───────────────────────────────────────────────────────

  public addMember(
    startNodeId: string,
    endNodeId: string,
    sectionDesignation: string = 'W12x26',
    materialGrade: string = 'A992',
    memberType: MemberType = 'Beam',
    customId?: string,
  ): string {
    if (!this.system) return '';
    if (!this.system.nodes.has(startNodeId) || !this.system.nodes.has(endNodeId)) {
      return '';
    }

    const id = customId || `m_${Date.now().toString(36)}_${Math.floor(Math.random() * 100)}`;
    const name = `Member-${this.system.members.size + 1}`;

    // Ensure material exists
    let matId = 'mat-steel';
    if (!this.system.materials.has(matId)) {
      this.system.addMaterial(matId, {
        grade: materialGrade,
        category: 'Steel',
        elasticModulus: 200e9,
        shearModulus: 77e9,
        poissonRatio: 0.3,
        yieldStrength: 345e6,
        density: 7850,
      });
    }

    // Ensure section exists
    let secId = `sec-${sectionDesignation.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    if (!this.system.sections.has(secId)) {
      const presetProfile = SECTION_PRESETS[sectionDesignation];
      if (presetProfile) {
        this.system.addSection(secId, presetProfile);
      } else {
        this.system.addSection(secId, {
          designation: sectionDesignation,
          type: 'I',
          properties: { area: 0.00494, momentOfInertiaY: 8.49e-5, momentOfInertiaZ: 7.2e-6, torsionalConstant: 1.25e-7 },
          dimensions: { depth: 0.31, flangeWidth: 0.165, webThickness: 0.0058, flangeThickness: 0.0097 },
        });
      }
    }

    this.system.addMember(id, name, startNodeId, endNodeId, matId, secId, memberType);
    this.notifyChange();
    return id;
  }

  public updateMember(
    id: string,
    updates: {
      sectionDesignation?: string;
      materialGrade?: string;
      memberType?: MemberType;
    },
  ): void {
    if (!this.system) return;
    const member = this.system.members.get(id);
    if (!member) return;

    if (updates.memberType) {
      (member as any).memberType = updates.memberType;
    }

    if (updates.sectionDesignation) {
      let secId = `sec-${updates.sectionDesignation.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      if (!this.system.sections.has(secId)) {
        const presetProfile = SECTION_PRESETS[updates.sectionDesignation];
        if (presetProfile) {
          this.system.addSection(secId, presetProfile);
        } else {
          this.system.addSection(secId, {
            designation: updates.sectionDesignation,
            type: 'I',
            properties: { area: 0.00494, momentOfInertiaY: 8.49e-5, momentOfInertiaZ: 7.2e-6, torsionalConstant: 1.25e-7 },
            dimensions: { depth: 0.31, flangeWidth: 0.165, webThickness: 0.0058, flangeThickness: 0.0097 },
          });
        }
      }
      (member as any).sectionId = secId;
    }

    this.notifyChange();
  }

  public deleteMember(id: string): void {
    if (!this.system) return;
    this.system.members.delete(id);
    this.notifyChange();
  }

  // ─── Support Mutation ───────────────────────────────────────────────────────

  public setNodeSupport(nodeId: string, preset: SupportPreset | 'None'): void {
    if (!this.system) return;
    const existing = this.getSupportForNode(nodeId);

    if (preset === 'None') {
      if (existing) {
        this.system.supports.delete(existing.identity.id);
        this.notifyChange();
      }
      return;
    }

    if (existing) {
      (existing as any).preset = preset;
    } else {
      const supId = `sup_${nodeId}_${preset.toLowerCase()}`;
      this.system.addSupport(supId, `${preset}-${nodeId}`, nodeId, preset);
    }
    this.notifyChange();
  }

  public deleteSupport(id: string): void {
    if (!this.system) return;
    this.system.supports.delete(id);
    this.notifyChange();
  }

  // ─── Procedural Builders ───────────────────────────────────────────────────

  public quickAddBeamSpan(spanLength = 6): { n1: string; n2: string; member: string } {
    if (!this.system) return { n1: '', n2: '', member: '' };
    const n1 = this.addNode(0, 0, 0, undefined, 'Span-Start');
    const n2 = this.addNode(spanLength, 0, 0, undefined, 'Span-End');
    this.setNodeSupport(n1, 'Pinned');
    this.setNodeSupport(n2, 'RollerX');
    const member = this.addMember(n1, n2, 'W12x26', 'A992', 'Beam');
    return { n1, n2, member };
  }

  public quickAddPortalBay(width = 6, height = 3.5): void {
    if (!this.system) return;
    const n1 = this.addNode(0, 0, 0, undefined, 'Base-Left');
    const n2 = this.addNode(width, 0, 0, undefined, 'Base-Right');
    const n3 = this.addNode(0, 0, height, undefined, 'Top-Left');
    const n4 = this.addNode(width, 0, height, undefined, 'Top-Right');

    this.setNodeSupport(n1, 'Fixed');
    this.setNodeSupport(n2, 'Fixed');

    this.addMember(n1, n3, 'W12x26', 'A992', 'Column');
    this.addMember(n2, n4, 'W12x26', 'A992', 'Column');
    this.addMember(n3, n4, 'W12x26', 'A992', 'Beam');
  }

  public clearAll(): void {
    if (!this.system) return;
    this.system.members.clear();
    this.system.supports.clear();
    this.system.nodes.clear();
    this.plates = [];
    this.notifyChange();
  }
}

export const structuralBridge = new StructuralBridge();
