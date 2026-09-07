/**
 * ModelIntegrityAuditor.ts
 *
 * Pre-analysis structural model auditor and diagnostic inspector.
 * Evaluates geometric, topological, boundary, and section integrity
 * before finite element stiffness matrix assembly.
 */

import {
  IfcStructuralAnalysisModel,
  IfcStructuralPointConnection,
  IfcStructuralCurveMember,
} from '../ifc/IfcStructuralSchema';

export type AuditSeverity = 'ERROR' | 'WARNING' | 'INFO';

export interface AuditIssue {
  readonly id: string;
  readonly severity: AuditSeverity;
  readonly category: 'TOPOLOGY' | 'GEOMETRY' | 'BOUNDARY' | 'SECTION';
  readonly message: string;
  readonly affectedEntityIds: string[];
  readonly autoFixAvailable: boolean;
}

export interface ModelAuditReport {
  readonly status: 'PASS' | 'WARNING' | 'FAIL';
  readonly totalIssues: number;
  readonly errorCount: number;
  readonly warningCount: number;
  readonly issues: AuditIssue[];
  readonly metrics: {
    readonly nodeCount: number;
    readonly memberCount: number;
    readonly surfaceCount: number;
    readonly supportedNodeCount: number;
  };
}

export class ModelIntegrityAuditor {
  private distance(p1: [number, number, number], p2: [number, number, number]): number {
    const dx = p1[0] - p2[0];
    const dy = p1[1] - p2[1];
    const dz = p1[2] - p2[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Audits an IfcStructuralAnalysisModel for topological and analytical defects.
   */
  audit(model: IfcStructuralAnalysisModel): ModelAuditReport {
    const issues: AuditIssue[] = [];
    const nodeMap = new Map<string, IfcStructuralPointConnection>();

    for (const node of model.connections) {
      nodeMap.set(node.globalId, node);
    }

    // 1. Check for missing node references from members
    const usedNodeIds = new Set<string>();
    const zeroLengthMembers: string[] = [];
    const missingNodeRefs: string[] = [];

    for (const mem of model.curveMembers) {
      const startNode = nodeMap.get(mem.startConnectionId);
      const endNode = nodeMap.get(mem.endConnectionId);

      if (!startNode || !endNode) {
        missingNodeRefs.push(mem.globalId);
        continue;
      }

      usedNodeIds.add(startNode.globalId);
      usedNodeIds.add(endNode.globalId);

      const length = this.distance(startNode.location.coordinates, endNode.location.coordinates);
      if (length < 1e-4) {
        zeroLengthMembers.push(mem.globalId);
      }
    }

    if (missingNodeRefs.length > 0) {
      issues.push({
        id: 'ISSUE_DANGLING_MEMBER',
        severity: 'ERROR',
        category: 'TOPOLOGY',
        message: `${missingNodeRefs.length} member(s) reference non-existent node IDs.`,
        affectedEntityIds: missingNodeRefs,
        autoFixAvailable: false,
      });
    }

    if (zeroLengthMembers.length > 0) {
      issues.push({
        id: 'ISSUE_ZERO_LENGTH_MEMBER',
        severity: 'ERROR',
        category: 'GEOMETRY',
        message: `${zeroLengthMembers.length} member(s) have degenerate zero or near-zero length (< 0.1 mm).`,
        affectedEntityIds: zeroLengthMembers,
        autoFixAvailable: true,
      });
    }

    // 2. Check for surface members boundary nodes
    for (const surf of model.surfaceMembers || []) {
      for (const bId of surf.boundaryConnectionIds) {
        if (nodeMap.has(bId)) {
          usedNodeIds.add(bId);
        }
      }
    }

    // Check for point actions on nodes
    for (const pa of model.pointActions || []) {
      if (nodeMap.has(pa.connectionGlobalId)) {
        usedNodeIds.add(pa.connectionGlobalId);
      }
    }

    // 3. Check for orphaned nodes
    const orphanedNodes: string[] = [];
    for (const node of model.connections) {
      if (!usedNodeIds.has(node.globalId)) {
        orphanedNodes.push(node.globalId);
      }
    }

    if (orphanedNodes.length > 0) {
      issues.push({
        id: 'ISSUE_ORPHANED_NODES',
        severity: 'WARNING',
        category: 'TOPOLOGY',
        message: `${orphanedNodes.length} orphaned node(s) have no connected members, surfaces, or loads.`,
        affectedEntityIds: orphanedNodes,
        autoFixAvailable: true,
      });
    }

    // 4. Check Boundary Support Adequacy
    let supportedCount = 0;
    let hasVerticalRestraint = false;
    let hasHorizontalRestraint = false;

    for (const node of model.connections) {
      if (node.condition) {
        supportedCount++;
        const c = node.condition;
        if (c.translationalStiffnessZ === 'FIXED' || (typeof c.translationalStiffnessZ === 'number' && c.translationalStiffnessZ > 0)) {
          hasVerticalRestraint = true;
        }
        if (
          c.translationalStiffnessX === 'FIXED' ||
          c.translationalStiffnessY === 'FIXED' ||
          (typeof c.translationalStiffnessX === 'number' && c.translationalStiffnessX > 0) ||
          (typeof c.translationalStiffnessY === 'number' && c.translationalStiffnessY > 0)
        ) {
          hasHorizontalRestraint = true;
        }
      }
    }

    if (supportedCount === 0) {
      issues.push({
        id: 'ISSUE_NO_SUPPORTS',
        severity: 'ERROR',
        category: 'BOUNDARY',
        message: 'Model contains zero boundary support conditions (rigid body mechanism).',
        affectedEntityIds: [],
        autoFixAvailable: false,
      });
    } else if (!hasVerticalRestraint || !hasHorizontalRestraint) {
      issues.push({
        id: 'ISSUE_INCOMPLETE_RESTRAINTS',
        severity: 'WARNING',
        category: 'BOUNDARY',
        message: 'Model is partially unconstrained against global translation (missing vertical or horizontal supports).',
        affectedEntityIds: [],
        autoFixAvailable: false,
      });
    }

    // 5. Check unassigned cross sections or materials
    const unassignedSections: string[] = [];
    for (const mem of model.curveMembers) {
      if (!mem.profileName || mem.profileName.trim().length === 0) {
        unassignedSections.push(mem.globalId);
      }
    }

    if (unassignedSections.length > 0) {
      issues.push({
        id: 'ISSUE_UNASSIGNED_SECTION',
        severity: 'WARNING',
        category: 'SECTION',
        message: `${unassignedSections.length} member(s) have no cross-section profile assigned.`,
        affectedEntityIds: unassignedSections,
        autoFixAvailable: true,
      });
    }

    const errorCount = issues.filter(i => i.severity === 'ERROR').length;
    const warningCount = issues.filter(i => i.severity === 'WARNING').length;

    let status: 'PASS' | 'WARNING' | 'FAIL' = 'PASS';
    if (errorCount > 0) status = 'FAIL';
    else if (warningCount > 0) status = 'WARNING';

    return {
      status,
      totalIssues: issues.length,
      errorCount,
      warningCount,
      issues,
      metrics: {
        nodeCount: model.connections.length,
        memberCount: model.curveMembers.length,
        surfaceCount: model.surfaceMembers?.length ?? 0,
        supportedNodeCount: supportedCount,
      },
    };
  }

  /**
   * Applies automated healing fixes for recognized auto-fixable issues.
   */
  autoFix(model: IfcStructuralAnalysisModel): IfcStructuralAnalysisModel {
    const report = this.audit(model);
    const orphanedNodeIds = new Set(
      report.issues.find(i => i.id === 'ISSUE_ORPHANED_NODES')?.affectedEntityIds || []
    );
    const zeroLengthMemberIds = new Set(
      report.issues.find(i => i.id === 'ISSUE_ZERO_LENGTH_MEMBER')?.affectedEntityIds || []
    );

    // Prune orphaned nodes
    const cleanedNodes = model.connections.filter(n => !orphanedNodeIds.has(n.globalId));

    // Prune zero-length members and assign fallback section if empty
    const cleanedMembers = model.curveMembers
      .filter(m => !zeroLengthMemberIds.has(m.globalId))
      .map(m => ({
        ...m,
        profileName: m.profileName && m.profileName.trim().length > 0 ? m.profileName : 'DEFAULT_IPE300',
        materialName: m.materialName && m.materialName.trim().length > 0 ? m.materialName : 'Steel_S355',
      }));

    return {
      ...model,
      connections: cleanedNodes,
      curveMembers: cleanedMembers,
    };
  }
}
