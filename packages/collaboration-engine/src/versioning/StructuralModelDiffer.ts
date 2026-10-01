/**
 * StructuralModelDiffer.ts
 *
 * Semantic diff engine for 3D structural engineering models.
 * Calculates granular geometric, topological, sectional, and loading differences
 * between two model snapshots, quantifying physical impacts like steel mass delta.
 */

import {
  EngineeringModelSnapshot,
  StructuralNodeSnapshot,
  StructuralMemberSnapshot,
  StructuralLoadSnapshot,
  calculateMemberLengthM,
  calculateTotalMassKg,
  Vec3Snapshot,
  RestraintSnapshot,
} from './ModelSnapshot';

export type DiffChangeType = 'added' | 'removed' | 'modified' | 'unchanged';

export interface NodeDiff {
  id: string;
  changeType: DiffChangeType;
  baseCoords?: Vec3Snapshot;
  targetCoords?: Vec3Snapshot;
  deltaDistanceM?: number;
  deltaCoords?: Vec3Snapshot;
  restraintChanged?: boolean;
  baseRestraint?: RestraintSnapshot;
  targetRestraint?: RestraintSnapshot;
}

export interface MemberDiff {
  id: string;
  changeType: DiffChangeType;
  baseMember?: StructuralMemberSnapshot;
  targetMember?: StructuralMemberSnapshot;
  baseLengthM?: number;
  targetLengthM?: number;
  deltaLengthM?: number;
  connectivityChanged?: boolean;
  sectionChanged?: boolean;
  baseSectionId?: string;
  targetSectionId?: string;
  materialChanged?: boolean;
  baseMaterialId?: string;
  targetMaterialId?: string;
}

export interface LoadDiff {
  id: string;
  changeType: DiffChangeType;
  loadType: string;
  baseMagnitude?: number;
  targetMagnitude?: number;
  deltaMagnitude?: number;
  directionChanged?: boolean;
  baseDirection?: string;
  targetDirection?: string;
  associatedElementId?: string;
}

export interface StructuralDiffSummary {
  nodesAdded: number;
  nodesRemoved: number;
  nodesModified: number;
  nodesUnchanged: number;

  membersAdded: number;
  membersRemoved: number;
  membersModified: number;
  membersUnchanged: number;

  loadsAdded: number;
  loadsRemoved: number;
  loadsModified: number;
  loadsUnchanged: number;

  baseTotalSteelMassKg: number;
  targetTotalSteelMassKg: number;
  deltaSteelMassKg: number;
  deltaSteelMassPercent: number;

  hasStructuralModifications: boolean;
  changeSummaryText: string;
}

export interface StructuralDiffReport {
  baseModelId: string;
  targetModelId: string;
  baseCommitId?: string;
  targetCommitId?: string;
  timestamp: number;
  nodeDiffs: NodeDiff[];
  memberDiffs: MemberDiff[];
  loadDiffs: LoadDiff[];
  summary: StructuralDiffSummary;
}

export class StructuralModelDiffer {
  /**
   * Compares two engineering model snapshots and produces a rich semantic diff report.
   */
  public static diff(
    base: EngineeringModelSnapshot,
    target: EngineeringModelSnapshot,
    metadata?: { baseCommitId?: string; targetCommitId?: string }
  ): StructuralDiffReport {
    const nodeDiffs = this._diffNodes(base.nodes, target.nodes);
    const memberDiffs = this._diffMembers(base, target);
    const loadDiffs = this._diffLoads(base.loads, target.loads);

    const baseMass = calculateTotalMassKg(base);
    const targetMass = calculateTotalMassKg(target);
    const deltaMass = Math.round((targetMass - baseMass) * 100) / 100;
    const deltaMassPct = baseMass > 0 ? Math.round((deltaMass / baseMass) * 1000) / 10 : 0;

    const nodesAdded = nodeDiffs.filter(d => d.changeType === 'added').length;
    const nodesRemoved = nodeDiffs.filter(d => d.changeType === 'removed').length;
    const nodesModified = nodeDiffs.filter(d => d.changeType === 'modified').length;
    const nodesUnchanged = nodeDiffs.filter(d => d.changeType === 'unchanged').length;

    const membersAdded = memberDiffs.filter(d => d.changeType === 'added').length;
    const membersRemoved = memberDiffs.filter(d => d.changeType === 'removed').length;
    const membersModified = memberDiffs.filter(d => d.changeType === 'modified').length;
    const membersUnchanged = memberDiffs.filter(d => d.changeType === 'unchanged').length;

    const loadsAdded = loadDiffs.filter(d => d.changeType === 'added').length;
    const loadsRemoved = loadDiffs.filter(d => d.changeType === 'removed').length;
    const loadsModified = loadDiffs.filter(d => d.changeType === 'modified').length;
    const loadsUnchanged = loadDiffs.filter(d => d.changeType === 'unchanged').length;

    const hasStructuralModifications =
      nodesAdded > 0 ||
      nodesRemoved > 0 ||
      nodesModified > 0 ||
      membersAdded > 0 ||
      membersRemoved > 0 ||
      membersModified > 0 ||
      loadsAdded > 0 ||
      loadsRemoved > 0 ||
      loadsModified > 0;

    const summaryItems: string[] = [];
    if (membersAdded > 0) summaryItems.push(`+${membersAdded} members`);
    if (membersRemoved > 0) summaryItems.push(`-${membersRemoved} members`);
    if (membersModified > 0) summaryItems.push(`${membersModified} members modified`);
    if (nodesAdded > 0) summaryItems.push(`+${nodesAdded} nodes`);
    if (nodesRemoved > 0) summaryItems.push(`-${nodesRemoved} nodes`);
    if (nodesModified > 0) summaryItems.push(`${nodesModified} nodes moved`);
    if (deltaMass !== 0) {
      summaryItems.push(`Steel mass: ${deltaMass > 0 ? '+' : ''}${deltaMass} kg (${deltaMassPct > 0 ? '+' : ''}${deltaMassPct}%)`);
    }

    const changeSummaryText = hasStructuralModifications
      ? summaryItems.join(', ')
      : 'Identical structural models (no changes detected)';

    return {
      baseModelId: base.modelId,
      targetModelId: target.modelId,
      baseCommitId: metadata?.baseCommitId,
      targetCommitId: metadata?.targetCommitId,
      timestamp: Date.now(),
      nodeDiffs,
      memberDiffs,
      loadDiffs,
      summary: {
        nodesAdded,
        nodesRemoved,
        nodesModified,
        nodesUnchanged,
        membersAdded,
        membersRemoved,
        membersModified,
        membersUnchanged,
        loadsAdded,
        loadsRemoved,
        loadsModified,
        loadsUnchanged,
        baseTotalSteelMassKg: baseMass,
        targetTotalSteelMassKg: targetMass,
        deltaSteelMassKg: deltaMass,
        deltaSteelMassPercent: deltaMassPct,
        hasStructuralModifications,
        changeSummaryText,
      },
    };
  }

  // ─── Private diff helpers ───────────────────────────────────────────────────

  private static _diffNodes(
    baseNodes: Record<string, StructuralNodeSnapshot>,
    targetNodes: Record<string, StructuralNodeSnapshot>
  ): NodeDiff[] {
    const allNodeIds = Array.from(new Set([...Object.keys(baseNodes), ...Object.keys(targetNodes)]));
    const diffs: NodeDiff[] = [];

    for (const id of allNodeIds) {
      const baseNode = baseNodes[id];
      const targetNode = targetNodes[id];

      if (!baseNode && targetNode) {
        diffs.push({
          id,
          changeType: 'added',
          targetCoords: { ...targetNode.coords },
          targetRestraint: targetNode.restraint ? { ...targetNode.restraint } : undefined,
        });
      } else if (baseNode && !targetNode) {
        diffs.push({
          id,
          changeType: 'removed',
          baseCoords: { ...baseNode.coords },
          baseRestraint: baseNode.restraint ? { ...baseNode.restraint } : undefined,
        });
      } else if (baseNode && targetNode) {
        const dx = targetNode.coords.x - baseNode.coords.x;
        const dy = targetNode.coords.y - baseNode.coords.y;
        const dz = targetNode.coords.z - baseNode.coords.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        const restraintChanged = !this._areRestraintsEqual(baseNode.restraint, targetNode.restraint);
        const coordsChanged = dist > 1e-5;

        if (coordsChanged || restraintChanged) {
          diffs.push({
            id,
            changeType: 'modified',
            baseCoords: { ...baseNode.coords },
            targetCoords: { ...targetNode.coords },
            deltaCoords: { x: dx, y: dy, z: dz },
            deltaDistanceM: Math.round(dist * 1000) / 1000,
            restraintChanged,
            baseRestraint: baseNode.restraint ? { ...baseNode.restraint } : undefined,
            targetRestraint: targetNode.restraint ? { ...targetNode.restraint } : undefined,
          });
        } else {
          diffs.push({
            id,
            changeType: 'unchanged',
            baseCoords: { ...baseNode.coords },
            targetCoords: { ...targetNode.coords },
          });
        }
      }
    }

    return diffs;
  }

  private static _diffMembers(
    base: EngineeringModelSnapshot,
    target: EngineeringModelSnapshot
  ): MemberDiff[] {
    const allMemberIds = Array.from(new Set([...Object.keys(base.members), ...Object.keys(target.members)]));
    const diffs: MemberDiff[] = [];

    for (const id of allMemberIds) {
      const baseMem = base.members[id];
      const targetMem = target.members[id];

      if (!baseMem && targetMem) {
        const len = calculateMemberLengthM(targetMem, target.nodes);
        diffs.push({
          id,
          changeType: 'added',
          targetMember: { ...targetMem },
          targetLengthM: Math.round(len * 1000) / 1000,
          targetSectionId: targetMem.sectionId,
          targetMaterialId: targetMem.materialId,
        });
      } else if (baseMem && !targetMem) {
        const len = calculateMemberLengthM(baseMem, base.nodes);
        diffs.push({
          id,
          changeType: 'removed',
          baseMember: { ...baseMem },
          baseLengthM: Math.round(len * 1000) / 1000,
          baseSectionId: baseMem.sectionId,
          baseMaterialId: baseMem.materialId,
        });
      } else if (baseMem && targetMem) {
        const baseLen = calculateMemberLengthM(baseMem, base.nodes);
        const targetLen = calculateMemberLengthM(targetMem, target.nodes);
        const deltaLen = Math.round((targetLen - baseLen) * 1000) / 1000;

        const connectivityChanged =
          baseMem.startNodeId !== targetMem.startNodeId || baseMem.endNodeId !== targetMem.endNodeId;
        const sectionChanged = baseMem.sectionId !== targetMem.sectionId;
        const materialChanged = baseMem.materialId !== targetMem.materialId;
        const lengthChanged = Math.abs(deltaLen) > 1e-4;

        if (connectivityChanged || sectionChanged || materialChanged || lengthChanged) {
          diffs.push({
            id,
            changeType: 'modified',
            baseMember: { ...baseMem },
            targetMember: { ...targetMem },
            baseLengthM: Math.round(baseLen * 1000) / 1000,
            targetLengthM: Math.round(targetLen * 1000) / 1000,
            deltaLengthM: deltaLen,
            connectivityChanged,
            sectionChanged,
            baseSectionId: baseMem.sectionId,
            targetSectionId: targetMem.sectionId,
            materialChanged,
            baseMaterialId: baseMem.materialId,
            targetMaterialId: targetMem.materialId,
          });
        } else {
          diffs.push({
            id,
            changeType: 'unchanged',
            baseMember: { ...baseMem },
            targetMember: { ...targetMem },
            baseLengthM: Math.round(baseLen * 1000) / 1000,
            targetLengthM: Math.round(targetLen * 1000) / 1000,
          });
        }
      }
    }

    return diffs;
  }

  private static _diffLoads(
    baseLoads: Record<string, StructuralLoadSnapshot>,
    targetLoads: Record<string, StructuralLoadSnapshot>
  ): LoadDiff[] {
    const allLoadIds = Array.from(new Set([...Object.keys(baseLoads), ...Object.keys(targetLoads)]));
    const diffs: LoadDiff[] = [];

    for (const id of allLoadIds) {
      const baseLoad = baseLoads[id];
      const targetLoad = targetLoads[id];

      if (!baseLoad && targetLoad) {
        diffs.push({
          id,
          changeType: 'added',
          loadType: targetLoad.type,
          targetMagnitude: targetLoad.magnitude,
          targetDirection: targetLoad.direction,
          associatedElementId: targetLoad.memberId ?? targetLoad.nodeId,
        });
      } else if (baseLoad && !targetLoad) {
        diffs.push({
          id,
          changeType: 'removed',
          loadType: baseLoad.type,
          baseMagnitude: baseLoad.magnitude,
          baseDirection: baseLoad.direction,
          associatedElementId: baseLoad.memberId ?? baseLoad.nodeId,
        });
      } else if (baseLoad && targetLoad) {
        const deltaMag = (targetLoad.magnitude ?? 0) - (baseLoad.magnitude ?? 0);
        const magChanged = Math.abs(deltaMag) > 1e-5;
        const dirChanged = baseLoad.direction !== targetLoad.direction;
        const elemChanged =
          (baseLoad.memberId ?? baseLoad.nodeId) !== (targetLoad.memberId ?? targetLoad.nodeId);

        if (magChanged || dirChanged || elemChanged) {
          diffs.push({
            id,
            changeType: 'modified',
            loadType: targetLoad.type,
            baseMagnitude: baseLoad.magnitude,
            targetMagnitude: targetLoad.magnitude,
            deltaMagnitude: Math.round(deltaMag * 100) / 100,
            directionChanged: dirChanged,
            baseDirection: baseLoad.direction,
            targetDirection: targetLoad.direction,
            associatedElementId: targetLoad.memberId ?? targetLoad.nodeId,
          });
        } else {
          diffs.push({
            id,
            changeType: 'unchanged',
            loadType: targetLoad.type,
            baseMagnitude: baseLoad.magnitude,
            targetMagnitude: targetLoad.magnitude,
            associatedElementId: targetLoad.memberId ?? targetLoad.nodeId,
          });
        }
      }
    }

    return diffs;
  }

  private static _areRestraintsEqual(a?: RestraintSnapshot, b?: RestraintSnapshot): boolean {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return (
      a.fx === b.fx &&
      a.fy === b.fy &&
      a.fz === b.fz &&
      a.mx === b.mx &&
      a.my === b.my &&
      a.mz === b.mz
    );
  }
}
