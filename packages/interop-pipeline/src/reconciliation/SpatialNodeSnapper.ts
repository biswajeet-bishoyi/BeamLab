/**
 * SpatialNodeSnapper.ts
 *
 * Geometric healing and spatial clustering engine for structural analysis models.
 * Resolves small gaps, eccentricities, and near-miss node connections between
 * analytical centerlines and BIM physical entities (e.g. Revit/Tekla imports).
 */

import {
  IfcStructuralAnalysisModel,
  IfcStructuralPointConnection,
  IfcStructuralCurveMember,
} from '../ifc/IfcStructuralSchema';

export interface SnappingOptions {
  readonly tolerance_m: number; // e.g. 0.025 (25 mm)
  readonly preferSupportedNodes?: boolean; // If true, cluster collapses to node with boundary conditions
}

export interface SnappingResult {
  readonly healedModel: IfcStructuralAnalysisModel;
  readonly nodesMergedCount: number;
  readonly modifiedMembersCount: number;
  readonly clusterMap: Record<string, string>; // originalNodeId -> targetNodeId
}

export class SpatialNodeSnapper {
  private distance(p1: [number, number, number], p2: [number, number, number]): number {
    const dx = p1[0] - p2[0];
    const dy = p1[1] - p2[1];
    const dz = p1[2] - p2[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Snaps near-coincident nodes within tolerance_m into unified nodes and updates
   * all connected curve members and actions.
   */
  healModel(
    model: IfcStructuralAnalysisModel,
    options: SnappingOptions = { tolerance_m: 0.025, preferSupportedNodes: true }
  ): SnappingResult {
    const tolerance = options.tolerance_m;
    const preferSupported = options.preferSupportedNodes ?? true;

    const originalConnections = [...model.connections];
    const clusterMap: Record<string, string> = {};
    const mergedNodes: IfcStructuralPointConnection[] = [];
    const visited = new Set<string>();

    for (let i = 0; i < originalConnections.length; i++) {
      const connA = originalConnections[i]!;
      if (visited.has(connA.globalId)) continue;

      // Find all nodes within tolerance to connA
      const cluster: IfcStructuralPointConnection[] = [connA];
      visited.add(connA.globalId);

      for (let j = i + 1; j < originalConnections.length; j++) {
        const connB = originalConnections[j]!;
        if (visited.has(connB.globalId)) continue;

        const dist = this.distance(connA.location.coordinates, connB.location.coordinates);
        if (dist <= tolerance) {
          cluster.push(connB);
          visited.add(connB.globalId);
        }
      }

      if (cluster.length === 1) {
        mergedNodes.push(connA);
        clusterMap[connA.globalId] = connA.globalId;
      } else {
        // Multi-node cluster: determine primary target node
        let targetNode = cluster[0]!;

        if (preferSupported) {
          const supported = cluster.find(c => c.condition !== undefined);
          if (supported) {
            targetNode = supported;
          }
        }

        // If target node doesn't have support condition, but others in cluster do, inherit it
        if (!targetNode.condition) {
          const condDonor = cluster.find(c => c.condition !== undefined);
          if (condDonor) {
            targetNode = {
              ...targetNode,
              condition: condDonor.condition,
            };
          }
        }

        mergedNodes.push(targetNode);

        for (const memberNode of cluster) {
          clusterMap[memberNode.globalId] = targetNode.globalId;
        }
      }
    }

    // Update curve members connectivity
    let modifiedMembersCount = 0;
    const healedMembers: IfcStructuralCurveMember[] = model.curveMembers.map(mem => {
      const targetStart = clusterMap[mem.startConnectionId] || mem.startConnectionId;
      const targetEnd = clusterMap[mem.endConnectionId] || mem.endConnectionId;

      if (targetStart !== mem.startConnectionId || targetEnd !== mem.endConnectionId) {
        modifiedMembersCount++;
        return {
          ...mem,
          startConnectionId: targetStart,
          endConnectionId: targetEnd,
        };
      }
      return mem;
    });

    // Update point actions connectivity
    const healedPointActions = model.pointActions.map(pa => ({
      ...pa,
      connectionGlobalId: clusterMap[pa.connectionGlobalId] || pa.connectionGlobalId,
    }));

    // Update surface members boundary connections
    const healedSurfaces = (model.surfaceMembers || []).map(surf => ({
      ...surf,
      boundaryConnectionIds: surf.boundaryConnectionIds.map(id => clusterMap[id] || id),
    }));

    const nodesMergedCount = originalConnections.length - mergedNodes.length;

    const healedModel: IfcStructuralAnalysisModel = {
      ...model,
      connections: mergedNodes,
      curveMembers: healedMembers,
      pointActions: healedPointActions,
      surfaceMembers: healedSurfaces,
    };

    return {
      healedModel,
      nodesMergedCount,
      modifiedMembersCount,
      clusterMap,
    };
  }
}
