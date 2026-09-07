/**
 * ModelMergeResolver.ts
 *
 * 3-way structural merge engine for structural engineering models.
 * Reconciles concurrent modifications between two branches using their common ancestor,
 * automatically resolving disjoint structural edits and detecting domain-specific
 * topological and property conflicts.
 */

import {
  EngineeringModelSnapshot,
  StructuralNodeSnapshot,
  StructuralMemberSnapshot,
  StructuralLoadSnapshot,
  StructuralSectionSnapshot,
  StructuralMaterialSnapshot,
  cloneSnapshot,
} from './ModelSnapshot';
import { ModelBranchManager, EngineeringCommit } from './ModelBranchManager';

export type MergeConflictType =
  | 'property_conflict'
  | 'geometry_conflict'
  | 'delete_modify_conflict'
  | 'topological_orphan_conflict'
  | 'load_conflict';

export type ConflictResolutionChoice = 'ours' | 'theirs' | 'manual';

export interface MergeConflict {
  conflictId: string;
  entityType: 'node' | 'member' | 'load' | 'section' | 'material';
  entityId: string;
  conflictType: MergeConflictType;
  ancestorValue: any;
  oursValue: any;
  theirsValue: any;
  description: string;
  resolution?: 'ours' | 'theirs' | 'manual';
  resolvedValue?: any;
}

export interface MergeOptions {
  strategy?: 'ours' | 'theirs' | 'manual';
  customResolutions?: Record<string, 'ours' | 'theirs' | any>;
  commitMessage?: string;
  author?: { id: string; name: string };
  autoCommit?: boolean;
}

export interface MergeResult {
  success: boolean;
  isFastForward: boolean;
  sourceBranch: string;
  targetBranch: string;
  commonAncestorCommitId: string | null;
  conflicts: MergeConflict[];
  unresolvedConflictCount: number;
  mergedSnapshot: EngineeringModelSnapshot;
  mergeCommit?: EngineeringCommit;
  summary: {
    mergedNodesCount: number;
    mergedMembersCount: number;
    mergedLoadsCount: number;
    conflictsDetected: number;
  };
}

export class ModelMergeResolver {
  /**
   * Merges `sourceBranch` into `targetBranch` using their common ancestor commit.
   */
  public static merge(
    branchManager: ModelBranchManager,
    sourceBranch: string,
    targetBranch: string,
    options: MergeOptions = {}
  ): MergeResult {
    const strategy = options.strategy ?? 'manual';
    const autoCommit = options.autoCommit ?? true;

    const sourceB = branchManager.getBranch(sourceBranch);
    const targetB = branchManager.getBranch(targetBranch);

    if (!sourceB || !targetB) {
      throw new Error(`Branches '${sourceBranch}' or '${targetBranch}' do not exist.`);
    }

    const sourceCommit = branchManager.getCommit(sourceB.headCommitId)!;
    const targetCommit = branchManager.getCommit(targetB.headCommitId)!;

    // ── 1. Check for fast-forward or already up-to-date ────────────────────────
    const commonAncestorId = branchManager.findCommonAncestor(sourceBranch, targetBranch);

    if (commonAncestorId === sourceCommit.commitId) {
      // Target is already ahead of or equal to Source; nothing to merge
      return {
        success: true,
        isFastForward: false,
        sourceBranch,
        targetBranch,
        commonAncestorCommitId: commonAncestorId,
        conflicts: [],
        unresolvedConflictCount: 0,
        mergedSnapshot: cloneSnapshot(targetCommit.snapshot),
        summary: {
          mergedNodesCount: Object.keys(targetCommit.snapshot.nodes).length,
          mergedMembersCount: Object.keys(targetCommit.snapshot.members).length,
          mergedLoadsCount: Object.keys(targetCommit.snapshot.loads).length,
          conflictsDetected: 0,
        },
      };
    }

    if (commonAncestorId === targetCommit.commitId) {
      // Fast-forward merge: target simply adopts source snapshot
      const mergedSnapshot = cloneSnapshot(sourceCommit.snapshot);

      let mergeCommit: EngineeringCommit | undefined;
      if (autoCommit) {
        branchManager.checkout(targetBranch);
        mergeCommit = branchManager.commit(
          options.commitMessage ?? `Fast-forward merge '${sourceBranch}' into '${targetBranch}'`,
          mergedSnapshot,
          options.author
        );
      }

      return {
        success: true,
        isFastForward: true,
        sourceBranch,
        targetBranch,
        commonAncestorCommitId: commonAncestorId,
        conflicts: [],
        unresolvedConflictCount: 0,
        mergedSnapshot,
        mergeCommit,
        summary: {
          mergedNodesCount: Object.keys(mergedSnapshot.nodes).length,
          mergedMembersCount: Object.keys(mergedSnapshot.members).length,
          mergedLoadsCount: Object.keys(mergedSnapshot.loads).length,
          conflictsDetected: 0,
        },
      };
    }

    // ── 2. Genuine 3-way merge ────────────────────────────────────────────────
    const ancestorCommit = commonAncestorId ? branchManager.getCommit(commonAncestorId) : undefined;
    const ancestorSnapshot = ancestorCommit?.snapshot;

    const conflicts: MergeConflict[] = [];
    const mergedSnapshot = cloneSnapshot(targetCommit.snapshot);

    // Merge Sections
    this._mergeSections(ancestorSnapshot, targetCommit.snapshot, sourceCommit.snapshot, mergedSnapshot, conflicts, strategy, options.customResolutions);

    // Merge Materials
    this._mergeMaterials(ancestorSnapshot, targetCommit.snapshot, sourceCommit.snapshot, mergedSnapshot, conflicts, strategy, options.customResolutions);

    // Merge Nodes
    this._mergeNodes(ancestorSnapshot, targetCommit.snapshot, sourceCommit.snapshot, mergedSnapshot, conflicts, strategy, options.customResolutions);

    // Merge Members
    this._mergeMembers(ancestorSnapshot, targetCommit.snapshot, sourceCommit.snapshot, mergedSnapshot, conflicts, strategy, options.customResolutions);

    // Merge Loads
    this._mergeLoads(ancestorSnapshot, targetCommit.snapshot, sourceCommit.snapshot, mergedSnapshot, conflicts, strategy, options.customResolutions);

    // ── 3. Topological Orphan Sanity Check ────────────────────────────────────
    this._resolveOrphanDependencies(mergedSnapshot, conflicts);

    const unresolvedConflicts = conflicts.filter(c => !c.resolution);
    const success = unresolvedConflicts.length === 0;

    let mergeCommit: EngineeringCommit | undefined;
    if (success && autoCommit) {
      branchManager.checkout(targetBranch);
      mergeCommit = branchManager.createMergeCommit(
        options.commitMessage ?? `Merge branch '${sourceBranch}' into '${targetBranch}'`,
        mergedSnapshot,
        sourceCommit.commitId,
        targetCommit.commitId,
        options.author
      );
    }

    return {
      success,
      isFastForward: false,
      sourceBranch,
      targetBranch,
      commonAncestorCommitId: commonAncestorId,
      conflicts,
      unresolvedConflictCount: unresolvedConflicts.length,
      mergedSnapshot,
      mergeCommit,
      summary: {
        mergedNodesCount: Object.keys(mergedSnapshot.nodes).length,
        mergedMembersCount: Object.keys(mergedSnapshot.members).length,
        mergedLoadsCount: Object.keys(mergedSnapshot.loads).length,
        conflictsDetected: conflicts.length,
      },
    };
  }

  // ─── Entity Merge Handlers ──────────────────────────────────────────────────

  private static _mergeNodes(
    ancestor: EngineeringModelSnapshot | undefined,
    ours: EngineeringModelSnapshot,
    theirs: EngineeringModelSnapshot,
    merged: EngineeringModelSnapshot,
    conflicts: MergeConflict[],
    strategy: ConflictResolutionChoice,
    customResolutions?: Record<string, any>
  ): void {
    const allIds = new Set([
      ...Object.keys(ancestor?.nodes ?? {}),
      ...Object.keys(ours.nodes),
      ...Object.keys(theirs.nodes),
    ]);

    for (const id of allIds) {
      const a = ancestor?.nodes[id];
      const o = ours.nodes[id];
      const t = theirs.nodes[id];

      // Added in theirs only
      if (!a && !o && t) {
        merged.nodes[id] = clone(t);
        continue;
      }
      // Added in ours only
      if (!a && o && !t) {
        merged.nodes[id] = clone(o);
        continue;
      }
      // Added concurrently in both
      if (!a && o && t) {
        if (this._nodesEqual(o, t)) {
          merged.nodes[id] = clone(o);
        } else {
          this._handleConflict({
            entityType: 'node',
            entityId: id,
            conflictType: 'geometry_conflict',
            ancestorValue: undefined,
            oursValue: o,
            theirsValue: t,
            description: `Node ${id} concurrently added with differing coordinates`,
          }, conflicts, strategy, customResolutions, (chosen) => {
            merged.nodes[id] = clone(chosen);
          });
        }
        continue;
      }

      // Existing in ancestor:
      if (a && o && t) {
        const oChanged = !this._nodesEqual(a, o);
        const tChanged = !this._nodesEqual(a, t);

        if (!oChanged && !tChanged) {
          // No changes
          merged.nodes[id] = clone(o);
        } else if (!oChanged && tChanged) {
          // Theirs changed, ours didn't: take theirs
          merged.nodes[id] = clone(t);
        } else if (oChanged && !tChanged) {
          // Ours changed, theirs didn't: keep ours
          merged.nodes[id] = clone(o);
        } else {
          // Both changed
          if (this._nodesEqual(o, t)) {
            merged.nodes[id] = clone(o);
          } else {
            this._handleConflict({
              entityType: 'node',
              entityId: id,
              conflictType: 'geometry_conflict',
              ancestorValue: a,
              oursValue: o,
              theirsValue: t,
              description: `Node ${id} coordinates/restraints concurrently modified`,
            }, conflicts, strategy, customResolutions, (chosen) => {
              merged.nodes[id] = clone(chosen);
            });
          }
        }
        continue;
      }

      // Deleted in one branch, modified or unchanged in the other:
      if (a && !o && t) {
        // Ours deleted it
        const tChanged = !this._nodesEqual(a, t);
        if (!tChanged) {
          // Theirs didn't touch it: delete it
          delete merged.nodes[id];
        } else {
          // Delete-modify conflict
          this._handleConflict({
            entityType: 'node',
            entityId: id,
            conflictType: 'delete_modify_conflict',
            ancestorValue: a,
            oursValue: undefined,
            theirsValue: t,
            description: `Node ${id} deleted on current branch but modified on incoming branch`,
          }, conflicts, strategy, customResolutions, (chosen) => {
            if (chosen) merged.nodes[id] = clone(chosen);
            else delete merged.nodes[id];
          });
        }
        continue;
      }

      if (a && o && !t) {
        // Theirs deleted it
        const oChanged = !this._nodesEqual(a, o);
        if (!oChanged) {
          // Ours didn't touch it: adopt deletion
          delete merged.nodes[id];
        } else {
          // Delete-modify conflict
          this._handleConflict({
            entityType: 'node',
            entityId: id,
            conflictType: 'delete_modify_conflict',
            ancestorValue: a,
            oursValue: o,
            theirsValue: undefined,
            description: `Node ${id} modified on current branch but deleted on incoming branch`,
          }, conflicts, strategy, customResolutions, (chosen) => {
            if (chosen) merged.nodes[id] = clone(chosen);
            else delete merged.nodes[id];
          });
        }
        continue;
      }

      if (a && !o && !t) {
        // Both deleted it
        delete merged.nodes[id];
      }
    }
  }

  private static _mergeMembers(
    ancestor: EngineeringModelSnapshot | undefined,
    ours: EngineeringModelSnapshot,
    theirs: EngineeringModelSnapshot,
    merged: EngineeringModelSnapshot,
    conflicts: MergeConflict[],
    strategy: ConflictResolutionChoice,
    customResolutions?: Record<string, any>
  ): void {
    const allIds = new Set([
      ...Object.keys(ancestor?.members ?? {}),
      ...Object.keys(ours.members),
      ...Object.keys(theirs.members),
    ]);

    for (const id of allIds) {
      const a = ancestor?.members[id];
      const o = ours.members[id];
      const t = theirs.members[id];

      if (!a && !o && t) {
        merged.members[id] = clone(t);
        continue;
      }
      if (!a && o && !t) {
        merged.members[id] = clone(o);
        continue;
      }
      if (!a && o && t) {
        if (this._membersEqual(o, t)) {
          merged.members[id] = clone(o);
        } else {
          this._handleConflict({
            entityType: 'member',
            entityId: id,
            conflictType: 'property_conflict',
            ancestorValue: undefined,
            oursValue: o,
            theirsValue: t,
            description: `Member ${id} concurrently added with differing properties`,
          }, conflicts, strategy, customResolutions, (chosen) => {
            merged.members[id] = clone(chosen);
          });
        }
        continue;
      }

      if (a && o && t) {
        const oChanged = !this._membersEqual(a, o);
        const tChanged = !this._membersEqual(a, t);

        if (!oChanged && !tChanged) {
          merged.members[id] = clone(o);
        } else if (!oChanged && tChanged) {
          merged.members[id] = clone(t);
        } else if (oChanged && !tChanged) {
          merged.members[id] = clone(o);
        } else {
          if (this._membersEqual(o, t)) {
            merged.members[id] = clone(o);
          } else {
            this._handleConflict({
              entityType: 'member',
              entityId: id,
              conflictType: 'property_conflict',
              ancestorValue: a,
              oursValue: o,
              theirsValue: t,
              description: `Member ${id} section/connectivity concurrently modified`,
            }, conflicts, strategy, customResolutions, (chosen) => {
              merged.members[id] = clone(chosen);
            });
          }
        }
        continue;
      }

      if (a && !o && t) {
        const tChanged = !this._membersEqual(a, t);
        if (!tChanged) {
          delete merged.members[id];
        } else {
          this._handleConflict({
            entityType: 'member',
            entityId: id,
            conflictType: 'delete_modify_conflict',
            ancestorValue: a,
            oursValue: undefined,
            theirsValue: t,
            description: `Member ${id} deleted on current branch but modified on incoming branch`,
          }, conflicts, strategy, customResolutions, (chosen) => {
            if (chosen) merged.members[id] = clone(chosen);
            else delete merged.members[id];
          });
        }
        continue;
      }

      if (a && o && !t) {
        const oChanged = !this._membersEqual(a, o);
        if (!oChanged) {
          delete merged.members[id];
        } else {
          this._handleConflict({
            entityType: 'member',
            entityId: id,
            conflictType: 'delete_modify_conflict',
            ancestorValue: a,
            oursValue: o,
            theirsValue: undefined,
            description: `Member ${id} modified on current branch but deleted on incoming branch`,
          }, conflicts, strategy, customResolutions, (chosen) => {
            if (chosen) merged.members[id] = clone(chosen);
            else delete merged.members[id];
          });
        }
        continue;
      }

      if (a && !o && !t) {
        delete merged.members[id];
      }
    }
  }

  private static _mergeLoads(
    ancestor: EngineeringModelSnapshot | undefined,
    ours: EngineeringModelSnapshot,
    theirs: EngineeringModelSnapshot,
    merged: EngineeringModelSnapshot,
    conflicts: MergeConflict[],
    strategy: ConflictResolutionChoice,
    customResolutions?: Record<string, any>
  ): void {
    const allIds = new Set([
      ...Object.keys(ancestor?.loads ?? {}),
      ...Object.keys(ours.loads),
      ...Object.keys(theirs.loads),
    ]);

    for (const id of allIds) {
      const a = ancestor?.loads[id];
      const o = ours.loads[id];
      const t = theirs.loads[id];

      if (!a && !o && t) {
        merged.loads[id] = clone(t);
        continue;
      }
      if (!a && o && !t) {
        merged.loads[id] = clone(o);
        continue;
      }
      if (!a && o && t) {
        if (this._loadsEqual(o, t)) {
          merged.loads[id] = clone(o);
        } else {
          this._handleConflict({
            entityType: 'load',
            entityId: id,
            conflictType: 'load_conflict',
            ancestorValue: undefined,
            oursValue: o,
            theirsValue: t,
            description: `Load ${id} concurrently added with differing values`,
          }, conflicts, strategy, customResolutions, (chosen) => {
            merged.loads[id] = clone(chosen);
          });
        }
        continue;
      }

      if (a && o && t) {
        const oChanged = !this._loadsEqual(a, o);
        const tChanged = !this._loadsEqual(a, t);

        if (!oChanged && !tChanged) merged.loads[id] = clone(o);
        else if (!oChanged && tChanged) merged.loads[id] = clone(t);
        else if (oChanged && !tChanged) merged.loads[id] = clone(o);
        else {
          if (this._loadsEqual(o, t)) merged.loads[id] = clone(o);
          else {
            this._handleConflict({
              entityType: 'load',
              entityId: id,
              conflictType: 'load_conflict',
              ancestorValue: a,
              oursValue: o,
              theirsValue: t,
              description: `Load ${id} magnitude or assignment concurrently modified`,
            }, conflicts, strategy, customResolutions, (chosen) => {
              merged.loads[id] = clone(chosen);
            });
          }
        }
        continue;
      }

      if (a && !o && t) {
        if (this._loadsEqual(a, t)) delete merged.loads[id];
        else {
          this._handleConflict({
            entityType: 'load',
            entityId: id,
            conflictType: 'delete_modify_conflict',
            ancestorValue: a,
            oursValue: undefined,
            theirsValue: t,
            description: `Load ${id} deleted locally but modified remotely`,
          }, conflicts, strategy, customResolutions, (chosen) => {
            if (chosen) merged.loads[id] = clone(chosen);
            else delete merged.loads[id];
          });
        }
        continue;
      }

      if (a && o && !t) {
        if (this._loadsEqual(a, o)) delete merged.loads[id];
        else {
          this._handleConflict({
            entityType: 'load',
            entityId: id,
            conflictType: 'delete_modify_conflict',
            ancestorValue: a,
            oursValue: o,
            theirsValue: undefined,
            description: `Load ${id} modified locally but deleted remotely`,
          }, conflicts, strategy, customResolutions, (chosen) => {
            if (chosen) merged.loads[id] = clone(chosen);
            else delete merged.loads[id];
          });
        }
        continue;
      }

      if (a && !o && !t) delete merged.loads[id];
    }
  }

  private static _mergeSections(
    ancestor: EngineeringModelSnapshot | undefined,
    ours: EngineeringModelSnapshot,
    theirs: EngineeringModelSnapshot,
    merged: EngineeringModelSnapshot,
    conflicts: MergeConflict[],
    strategy: ConflictResolutionChoice,
    customResolutions?: Record<string, any>
  ): void {
    const allIds = new Set([
      ...Object.keys(ancestor?.sections ?? {}),
      ...Object.keys(ours.sections),
      ...Object.keys(theirs.sections),
    ]);

    for (const id of allIds) {
      const a = ancestor?.sections[id];
      const o = ours.sections[id];
      const t = theirs.sections[id];

      if (!a && !o && t) { merged.sections[id] = clone(t); continue; }
      if (!a && o && !t) { merged.sections[id] = clone(o); continue; }
      if (a && !o && !t) { delete merged.sections[id]; continue; }

      if (o && t) {
        if (JSON.stringify(o) === JSON.stringify(t)) {
          merged.sections[id] = clone(o);
        } else {
          this._handleConflict({
            entityType: 'section',
            entityId: id,
            conflictType: 'property_conflict',
            ancestorValue: a,
            oursValue: o,
            theirsValue: t,
            description: `Section ${id} properties concurrently modified`,
          }, conflicts, strategy, customResolutions, (chosen) => {
            merged.sections[id] = clone(chosen);
          });
        }
      }
    }
  }

  private static _mergeMaterials(
    ancestor: EngineeringModelSnapshot | undefined,
    ours: EngineeringModelSnapshot,
    theirs: EngineeringModelSnapshot,
    merged: EngineeringModelSnapshot,
    conflicts: MergeConflict[],
    strategy: ConflictResolutionChoice,
    customResolutions?: Record<string, any>
  ): void {
    const allIds = new Set([
      ...Object.keys(ancestor?.materials ?? {}),
      ...Object.keys(ours.materials),
      ...Object.keys(theirs.materials),
    ]);

    for (const id of allIds) {
      const a = ancestor?.materials[id];
      const o = ours.materials[id];
      const t = theirs.materials[id];

      if (!a && !o && t) { merged.materials[id] = clone(t); continue; }
      if (!a && o && !t) { merged.materials[id] = clone(o); continue; }
      if (a && !o && !t) { delete merged.materials[id]; continue; }

      if (o && t) {
        if (JSON.stringify(o) === JSON.stringify(t)) {
          merged.materials[id] = clone(o);
        } else {
          this._handleConflict({
            entityType: 'material',
            entityId: id,
            conflictType: 'property_conflict',
            ancestorValue: a,
            oursValue: o,
            theirsValue: t,
            description: `Material ${id} properties concurrently modified`,
          }, conflicts, strategy, customResolutions, (chosen) => {
            merged.materials[id] = clone(chosen);
          });
        }
      }
    }
  }

  // ─── Topological Dependency Resolution ─────────────────────────────────────

  private static _resolveOrphanDependencies(
    merged: EngineeringModelSnapshot,
    conflicts: MergeConflict[]
  ): void {
    // Check members: both startNode and endNode must exist in merged.nodes
    for (const [memberId, member] of Object.entries(merged.members)) {
      const startExists = !!merged.nodes[member.startNodeId];
      const endExists = !!merged.nodes[member.endNodeId];

      if (!startExists || !endExists) {
        const missing = !startExists && !endExists
          ? `${member.startNodeId}, ${member.endNodeId}`
          : !startExists
            ? member.startNodeId
            : member.endNodeId;

        conflicts.push({
          conflictId: `orphan_${memberId}`,
          entityType: 'member',
          entityId: memberId,
          conflictType: 'topological_orphan_conflict',
          ancestorValue: undefined,
          oursValue: member,
          theirsValue: undefined,
          description: `Member ${memberId} references deleted node(s): [${missing}]. Removed orphan member.`,
          resolution: 'manual',
        });

        // Drop the orphan member to preserve model integrity
        delete merged.members[memberId];
      }
    }

    // Check loads: if associated member or node was deleted, prune load
    for (const [loadId, load] of Object.entries(merged.loads)) {
      if (load.memberId && !merged.members[load.memberId]) {
        delete merged.loads[loadId];
      }
      if (load.nodeId && !merged.nodes[load.nodeId]) {
        delete merged.loads[loadId];
      }
    }
  }

  // ─── Conflict Resolution Dispatcher ───────────────────────────────────────

  private static _handleConflict(
    conflictBase: Omit<MergeConflict, 'conflictId'>,
    conflicts: MergeConflict[],
    strategy: ConflictResolutionChoice,
    customResolutions: Record<string, any> | undefined,
    applyChoice: (chosen: any) => void
  ): void {
    const conflictId = `conflict_${conflictBase.entityType}_${conflictBase.entityId}_${Date.now()}`;
    const custom = customResolutions?.[conflictBase.entityId];

    if (custom !== undefined) {
      const chosen = custom === 'ours'
        ? conflictBase.oursValue
        : custom === 'theirs'
          ? conflictBase.theirsValue
          : custom;

      conflicts.push({
        ...conflictBase,
        conflictId,
        resolution: custom === 'ours' ? 'ours' : custom === 'theirs' ? 'theirs' : 'manual',
        resolvedValue: chosen,
      });
      applyChoice(chosen);
      return;
    }

    if (strategy === 'ours') {
      conflicts.push({
        ...conflictBase,
        conflictId,
        resolution: 'ours',
        resolvedValue: conflictBase.oursValue,
      });
      applyChoice(conflictBase.oursValue);
      return;
    }

    if (strategy === 'theirs') {
      conflicts.push({
        ...conflictBase,
        conflictId,
        resolution: 'theirs',
        resolvedValue: conflictBase.theirsValue,
      });
      applyChoice(conflictBase.theirsValue);
      return;
    }

    // Manual strategy: record unresolved conflict, default keep ours temporarily
    conflicts.push({
      ...conflictBase,
      conflictId,
    });
    applyChoice(conflictBase.oursValue);
  }

  // ─── Equality Helpers ──────────────────────────────────────────────────────

  private static _nodesEqual(a?: StructuralNodeSnapshot, b?: StructuralNodeSnapshot): boolean {
    if (!a && !b) return true;
    if (!a || !b) return false;
    const dx = Math.abs(a.coords.x - b.coords.x);
    const dy = Math.abs(a.coords.y - b.coords.y);
    const dz = Math.abs(a.coords.z - b.coords.z);
    if (dx > 1e-5 || dy > 1e-5 || dz > 1e-5) return false;

    return JSON.stringify(a.restraint ?? {}) === JSON.stringify(b.restraint ?? {});
  }

  private static _membersEqual(a?: StructuralMemberSnapshot, b?: StructuralMemberSnapshot): boolean {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return (
      a.startNodeId === b.startNodeId &&
      a.endNodeId === b.endNodeId &&
      a.sectionId === b.sectionId &&
      a.materialId === b.materialId &&
      a.betaAngleDeg === b.betaAngleDeg &&
      JSON.stringify(a.releases ?? {}) === JSON.stringify(b.releases ?? {})
    );
  }

  private static _loadsEqual(a?: StructuralLoadSnapshot, b?: StructuralLoadSnapshot): boolean {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return (
      a.type === b.type &&
      a.magnitude === b.magnitude &&
      a.direction === b.direction &&
      a.memberId === b.memberId &&
      a.nodeId === b.nodeId &&
      a.loadCaseId === b.loadCaseId
    );
  }
}

function clone<T>(val: T): T {
  return val ? JSON.parse(JSON.stringify(val)) : val;
}
