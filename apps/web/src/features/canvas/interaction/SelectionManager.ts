import * as THREE from 'three';
import type { EntityType, RaycastHit } from './SpatialRaycaster';

export interface SelectionState {
  nodes: Set<string>;
  members: Set<string>;
  supports: Set<string>;
  plates: Set<string>;
}

/**
 * Manages active selection, hover states, and dynamic visual highlights
 * for structural engineering entities in the 3D viewport.
 */
export class SelectionManager {
  private selection: SelectionState = {
    nodes: new Set(),
    members: new Set(),
    supports: new Set(),
    plates: new Set(),
  };

  private hoveredHit: RaycastHit | null = null;
  private originalMaterials = new Map<string, THREE.Material | THREE.Material[]>();

  // High-visibility highlight materials
  private static hoverMat = new THREE.MeshStandardMaterial({
    color: 0x67e8f9, // cyan-300
    roughness: 0.2,
    metalness: 0.8,
    emissive: 0x0891b2,
    emissiveIntensity: 0.5,
  });

  private static selectedMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8, // sky-400
    roughness: 0.15,
    metalness: 0.85,
    emissive: 0x0284c7,
    emissiveIntensity: 0.65,
  });

  private onSelectionCallbacks: Array<(state: SelectionState) => void> = [];
  private onHoverCallbacks: Array<(hit: RaycastHit | null) => void> = [];

  /**
   * Updates current hover hit.
   */
  public setHovered(hit: RaycastHit | null): void {
    if (this.isSameHit(this.hoveredHit, hit)) return;

    this.hoveredHit = hit;
    this.notifyHover();
  }

  public getHovered(): RaycastHit | null {
    return this.hoveredHit;
  }

  /**
   * Selects an entity by ID. If additive is false, clears all other selections.
   */
  public select(type: EntityType, id: string, additive = false): void {
    if (!additive) {
      this.clearSelectionInternal();
    }

    const set = this.getSet(type);
    set.add(id);
    this.notifySelection();
  }

  /**
   * Toggles selection of an entity (e.g. on Shift+Click).
   */
  public toggle(type: EntityType, id: string): void {
    const set = this.getSet(type);
    if (set.has(id)) {
      set.delete(id);
    } else {
      set.add(id);
    }
    this.notifySelection();
  }

  /**
   * Deselects an entity.
   */
  public deselect(type: EntityType, id: string): void {
    const set = this.getSet(type);
    set.delete(id);
    this.notifySelection();
  }

  /**
   * Clears all selected entities.
   */
  public clearSelection(): void {
    this.clearSelectionInternal();
    this.notifySelection();
  }

  public isSelected(type: EntityType, id: string): boolean {
    return this.getSet(type).has(id);
  }

  public isHovered(type: EntityType, id: string): boolean {
    return this.hoveredHit?.entityType === type && this.hoveredHit?.entityId === id;
  }

  public getSelectionState(): SelectionState {
    return {
      nodes: new Set(this.selection.nodes),
      members: new Set(this.selection.members),
      supports: new Set(this.selection.supports),
      plates: new Set(this.selection.plates),
    };
  }

  public getTotalSelectedCount(): number {
    return (
      this.selection.nodes.size +
      this.selection.members.size +
      this.selection.supports.size +
      this.selection.plates.size
    );
  }

  /**
   * Updates visual highlight materials across the scene root based on current selection and hover state.
   */
  public applyVisualHighlights(root: THREE.Object3D): void {
    root.traverse((obj) => {
      const u = obj.userData;
      if (!u || !u.entityType || (!u.entityId && !u.memberId && !u.nodeId && !u.supportId && !u.plateId)) {
        return;
      }

      const type = u.entityType as EntityType;
      const id = (u.entityId || u.memberId || u.nodeId || u.supportId || u.plateId) as string;

      const isSel = this.isSelected(type, id);
      const isHov = this.isHovered(type, id);

      if (obj instanceof THREE.Mesh) {
        // Cache original material
        if (!this.originalMaterials.has(obj.uuid)) {
          this.originalMaterials.set(obj.uuid, obj.material);
        }

        const original = this.originalMaterials.get(obj.uuid)!;

        if (isSel) {
          obj.material = SelectionManager.selectedMat;
        } else if (isHov) {
          obj.material = SelectionManager.hoverMat;
        } else {
          obj.material = original;
        }
      }
    });
  }

  public onSelectionChange(cb: (state: SelectionState) => void): () => void {
    this.onSelectionCallbacks.push(cb);
    return () => {
      this.onSelectionCallbacks = this.onSelectionCallbacks.filter((c) => c !== cb);
    };
  }

  public onHoverChange(cb: (hit: RaycastHit | null) => void): () => void {
    this.onHoverCallbacks.push(cb);
    return () => {
      this.onHoverCallbacks = this.onHoverCallbacks.filter((c) => c !== cb);
    };
  }

  public dispose(): void {
    this.clearSelection();
    this.originalMaterials.clear();
    this.onSelectionCallbacks = [];
    this.onHoverCallbacks = [];
  }

  private getSet(type: EntityType): Set<string> {
    switch (type) {
      case 'node':
        return this.selection.nodes;
      case 'member':
        return this.selection.members;
      case 'support':
        return this.selection.supports;
      case 'plate':
        return this.selection.plates;
    }
  }

  private clearSelectionInternal(): void {
    this.selection.nodes.clear();
    this.selection.members.clear();
    this.selection.supports.clear();
    this.selection.plates.clear();
  }

  private isSameHit(a: RaycastHit | null, b: RaycastHit | null): boolean {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return a.entityType === b.entityType && a.entityId === b.entityId;
  }

  private notifySelection(): void {
    const copy = this.getSelectionState();
    this.onSelectionCallbacks.forEach((cb) => cb(copy));
  }

  private notifyHover(): void {
    this.onHoverCallbacks.forEach((cb) => cb(this.hoveredHit));
  }
}
