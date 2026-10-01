/**
 * Visual3DDiffMap.ts
 *
 * Translates structural model diff reports into 3D viewport rendering directives.
 * Provides color-coding, wireframe/ghosting parameters, and engineering tooltips
 * for intuitive visual comparison in Three.js canvas environments.
 */

import {
  StructuralDiffReport,
  NodeDiff,
  MemberDiff,
  LoadDiff,
} from './StructuralModelDiffer';
import {
  EngineeringModelSnapshot,
  Vec3Snapshot,
} from './ModelSnapshot';

export type VisualDiffClassification =
  | 'added'
  | 'removed'
  | 'modified_geometry'
  | 'modified_section'
  | 'modified_load'
  | 'unchanged';

export interface VisualDiffColorPalette {
  added: string;
  removed: string;
  modifiedGeometry: string;
  modifiedSection: string;
  modifiedLoad: string;
  unchanged: string;
}

export const DEFAULT_DIFF_PALETTE: VisualDiffColorPalette = {
  added: '#10b981',           // Emerald Green
  removed: '#ef4444',         // Crimson Red
  modifiedGeometry: '#f59e0b',// Amber Orange
  modifiedSection: '#8b5cf6', // Violet Purple
  modifiedLoad: '#06b6d4',    // Cyan
  unchanged: '#64748b',       // Muted Slate Gray
};

export interface GhostGeometry3D {
  type: 'node' | 'member';
  startCoords?: Vec3Snapshot;
  endCoords?: Vec3Snapshot;
  coords?: Vec3Snapshot;
}

export interface VisualEntityDiff {
  entityId: string;
  entityType: 'node' | 'member' | 'load';
  classification: VisualDiffClassification;
  colorHex: string;
  opacity: number;
  wireframe: boolean;
  dashed: boolean;
  tooltip: string;
  ghost?: GhostGeometry3D;
}

export interface DiffLegendItem {
  classification: VisualDiffClassification;
  label: string;
  colorHex: string;
  description: string;
  count: number;
}

export class Visual3DDiffMap {
  private readonly palette: VisualDiffColorPalette;

  constructor(palette: VisualDiffColorPalette = DEFAULT_DIFF_PALETTE) {
    this.palette = palette;
  }

  /**
   * Generates a 3D visual diff map from a StructuralDiffReport and optional model snapshots.
   */
  public generateMap(
    diffReport: StructuralDiffReport,
    baseSnapshot?: EngineeringModelSnapshot,
    _targetSnapshot?: EngineeringModelSnapshot
  ): Map<string, VisualEntityDiff> {
    const visualMap = new Map<string, VisualEntityDiff>();

    // ── 1. Nodes ─────────────────────────────────────────────────────────────
    for (const nDiff of diffReport.nodeDiffs) {
      const visual = this._buildNodeVisual(nDiff, baseSnapshot);
      visualMap.set(nDiff.id, visual);
    }

    // ── 2. Members ───────────────────────────────────────────────────────────
    for (const mDiff of diffReport.memberDiffs) {
      const visual = this._buildMemberVisual(mDiff, baseSnapshot);
      visualMap.set(mDiff.id, visual);
    }

    // ── 3. Loads ─────────────────────────────────────────────────────────────
    for (const lDiff of diffReport.loadDiffs) {
      const visual = this._buildLoadVisual(lDiff);
      visualMap.set(lDiff.id, visual);
    }

    return visualMap;
  }

  /**
   * Generates a categorized legend summary with counts for UI display.
   */
  public generateLegend(diffReport: StructuralDiffReport): DiffLegendItem[] {
    const summary = diffReport.summary;

    return [
      {
        classification: 'added',
        label: 'Added Entities',
        colorHex: this.palette.added,
        description: 'New structural members, nodes, or loads introduced in this version.',
        count: summary.membersAdded + summary.nodesAdded + summary.loadsAdded,
      },
      {
        classification: 'removed',
        label: 'Removed Entities (Ghosted)',
        colorHex: this.palette.removed,
        description: 'Entities deleted compared to base model; shown in dashed wireframe.',
        count: summary.membersRemoved + summary.nodesRemoved + summary.loadsRemoved,
      },
      {
        classification: 'modified_geometry',
        label: 'Modified Geometry / Nodes',
        colorHex: this.palette.modifiedGeometry,
        description: 'Nodes displaced or members with altered lengths or connectivity.',
        count: summary.nodesModified,
      },
      {
        classification: 'modified_section',
        label: 'Modified Sections / Properties',
        colorHex: this.palette.modifiedSection,
        description: 'Cross-section, material, or release changes.',
        count: summary.membersModified,
      },
      {
        classification: 'modified_load',
        label: 'Modified Loading',
        colorHex: this.palette.modifiedLoad,
        description: 'Changes in load magnitudes, directions, or load cases.',
        count: summary.loadsModified,
      },
      {
        classification: 'unchanged',
        label: 'Unchanged Context',
        colorHex: this.palette.unchanged,
        description: 'Elements identical across both revisions.',
        count: summary.membersUnchanged + summary.nodesUnchanged + summary.loadsUnchanged,
      },
    ];
  }

  // ─── Private entity visual builders ────────────────────────────────────────

  private _buildNodeVisual(
    diff: NodeDiff,
    baseSnapshot?: EngineeringModelSnapshot
  ): VisualEntityDiff {
    if (diff.changeType === 'added') {
      return {
        entityId: diff.id,
        entityType: 'node',
        classification: 'added',
        colorHex: this.palette.added,
        opacity: 1.0,
        wireframe: false,
        dashed: false,
        tooltip: `Node ${diff.id}: Newly created at (${diff.targetCoords?.x.toFixed(2)}, ${diff.targetCoords?.y.toFixed(2)}, ${diff.targetCoords?.z.toFixed(2)})`,
      };
    }

    if (diff.changeType === 'removed') {
      return {
        entityId: diff.id,
        entityType: 'node',
        classification: 'removed',
        colorHex: this.palette.removed,
        opacity: 0.45,
        wireframe: true,
        dashed: true,
        tooltip: `Node ${diff.id}: Removed from model`,
        ghost: diff.baseCoords ? { type: 'node', coords: diff.baseCoords } : undefined,
      };
    }

    if (diff.changeType === 'modified') {
      const dist = diff.deltaDistanceM ?? 0;
      let note = `Node ${diff.id}: `;
      if (dist > 0) {
        note += `Displaced by ${dist.toFixed(3)} m (Δx: ${diff.deltaCoords?.x.toFixed(2)}, Δy: ${diff.deltaCoords?.y.toFixed(2)}, Δz: ${diff.deltaCoords?.z.toFixed(2)})`;
      }
      if (diff.restraintChanged) {
        note += dist > 0 ? ' | Restraint boundary condition changed' : 'Restraint boundary condition changed';
      }

      return {
        entityId: diff.id,
        entityType: 'node',
        classification: 'modified_geometry',
        colorHex: this.palette.modifiedGeometry,
        opacity: 0.95,
        wireframe: false,
        dashed: false,
        tooltip: note,
        ghost: diff.baseCoords ? { type: 'node', coords: diff.baseCoords } : undefined,
      };
    }

    // unchanged
    return {
      entityId: diff.id,
      entityType: 'node',
      classification: 'unchanged',
      colorHex: this.palette.unchanged,
      opacity: 0.35,
      wireframe: false,
      dashed: false,
      tooltip: `Node ${diff.id} (Unchanged)`,
    };
  }

  private _buildMemberVisual(
    diff: MemberDiff,
    baseSnapshot?: EngineeringModelSnapshot
  ): VisualEntityDiff {
    if (diff.changeType === 'added') {
      return {
        entityId: diff.id,
        entityType: 'member',
        classification: 'added',
        colorHex: this.palette.added,
        opacity: 1.0,
        wireframe: false,
        dashed: false,
        tooltip: `Member ${diff.id}: Added (Section: ${diff.targetSectionId ?? 'default'}, Length: ${diff.targetLengthM?.toFixed(2)} m)`,
      };
    }

    if (diff.changeType === 'removed') {
      let ghost: GhostGeometry3D | undefined;
      if (baseSnapshot && diff.baseMember) {
        const n1 = baseSnapshot.nodes[diff.baseMember.startNodeId];
        const n2 = baseSnapshot.nodes[diff.baseMember.endNodeId];
        if (n1 && n2) {
          ghost = { type: 'member', startCoords: n1.coords, endCoords: n2.coords };
        }
      }

      return {
        entityId: diff.id,
        entityType: 'member',
        classification: 'removed',
        colorHex: this.palette.removed,
        opacity: 0.4,
        wireframe: true,
        dashed: true,
        tooltip: `Member ${diff.id}: Removed (Previous Section: ${diff.baseSectionId ?? 'default'})`,
        ghost,
      };
    }

    if (diff.changeType === 'modified') {
      const isGeomChange = diff.connectivityChanged || (diff.deltaLengthM && Math.abs(diff.deltaLengthM) > 1e-4);
      const isSectionChange = diff.sectionChanged || diff.materialChanged;

      const classification: VisualDiffClassification = isSectionChange
        ? 'modified_section'
        : 'modified_geometry';

      const colorHex = isSectionChange
        ? this.palette.modifiedSection
        : this.palette.modifiedGeometry;

      const notes: string[] = [];
      if (diff.sectionChanged) {
        notes.push(`Section: ${diff.baseSectionId ?? 'none'} ➔ ${diff.targetSectionId ?? 'none'}`);
      }
      if (diff.materialChanged) {
        notes.push(`Material: ${diff.baseMaterialId ?? 'none'} ➔ ${diff.targetMaterialId ?? 'none'}`);
      }
      if (diff.deltaLengthM && Math.abs(diff.deltaLengthM) > 1e-4) {
        notes.push(`Length Δ: ${diff.deltaLengthM > 0 ? '+' : ''}${diff.deltaLengthM.toFixed(3)} m`);
      }
      if (diff.connectivityChanged) {
        notes.push('Node connectivity shifted');
      }

      let ghost: GhostGeometry3D | undefined;
      if (baseSnapshot && diff.baseMember) {
        const n1 = baseSnapshot.nodes[diff.baseMember.startNodeId];
        const n2 = baseSnapshot.nodes[diff.baseMember.endNodeId];
        if (n1 && n2) {
          ghost = { type: 'member', startCoords: n1.coords, endCoords: n2.coords };
        }
      }

      return {
        entityId: diff.id,
        entityType: 'member',
        classification,
        colorHex,
        opacity: 0.95,
        wireframe: false,
        dashed: false,
        tooltip: `Member ${diff.id}: ${notes.join(' | ')}`,
        ghost,
      };
    }

    // unchanged
    return {
      entityId: diff.id,
      entityType: 'member',
      classification: 'unchanged',
      colorHex: this.palette.unchanged,
      opacity: 0.25,
      wireframe: false,
      dashed: false,
      tooltip: `Member ${diff.id} (Unchanged)`,
    };
  }

  private _buildLoadVisual(diff: LoadDiff): VisualEntityDiff {
    if (diff.changeType === 'added') {
      return {
        entityId: diff.id,
        entityType: 'load',
        classification: 'added',
        colorHex: this.palette.added,
        opacity: 1.0,
        wireframe: false,
        dashed: false,
        tooltip: `Load ${diff.id}: Added (${diff.loadType}, Mag: ${diff.targetMagnitude ?? 0}, Dir: ${diff.targetDirection ?? 'Z'})`,
      };
    }

    if (diff.changeType === 'removed') {
      return {
        entityId: diff.id,
        entityType: 'load',
        classification: 'removed',
        colorHex: this.palette.removed,
        opacity: 0.4,
        wireframe: true,
        dashed: true,
        tooltip: `Load ${diff.id}: Removed`,
      };
    }

    if (diff.changeType === 'modified') {
      const notes: string[] = [];
      if (diff.deltaMagnitude) {
        notes.push(`ΔMag: ${diff.deltaMagnitude > 0 ? '+' : ''}${diff.deltaMagnitude}`);
      }
      if (diff.directionChanged) {
        notes.push(`Dir: ${diff.baseDirection} ➔ ${diff.targetDirection}`);
      }

      return {
        entityId: diff.id,
        entityType: 'load',
        classification: 'modified_load',
        colorHex: this.palette.modifiedLoad,
        opacity: 0.95,
        wireframe: false,
        dashed: false,
        tooltip: `Load ${diff.id}: Modified (${notes.join(', ')})`,
      };
    }

    return {
      entityId: diff.id,
      entityType: 'load',
      classification: 'unchanged',
      colorHex: this.palette.unchanged,
      opacity: 0.25,
      wireframe: false,
      dashed: false,
      tooltip: `Load ${diff.id} (Unchanged)`,
    };
  }
}
