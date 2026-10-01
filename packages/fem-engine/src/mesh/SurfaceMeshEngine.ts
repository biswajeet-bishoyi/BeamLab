/**
 * 2D/3D Surface Mesh & Bandwidth Optimization Engine
 * BeamLab Sprint B19.2 — Structured Quads & Reverse Cuthill-McKee
 */

import { FEMNode3D } from '../element/types';
import { SurfaceMeshModel, SurfaceQuadElement, PlanarPolygonBoundary } from './types';

export class SurfaceMeshEngine {
  /**
   * Generates a structured quadrilateral mesh over a rectangular plate/slab domain [0, Lx] x [0, Ly].
   * Optionally optimizes node numbering via Reverse Cuthill-McKee (RCM) bandwidth minimization.
   */
  public static generateStructuredQuadMesh(
    id: string,
    widthX: number,
    lengthY: number,
    numDivX: number,
    numDivY: number,
    elevationZ: number = 0,
    applyRCM: boolean = true
  ): SurfaceMeshModel {
    if (widthX <= 0 || lengthY <= 0 || numDivX < 1 || numDivY < 1) {
      throw new Error('Dimensions and divisions must be strictly positive.');
    }

    const dx = widthX / numDivX;
    const dy = lengthY / numDivY;

    // 1. Generate Nodes
    const nodes: FEMNode3D[] = [];
    const nodeGrid: string[][] = [];

    let nodeCounter = 1;
    for (let j = 0; j <= numDivY; j++) {
      const row: string[] = [];
      const y = j * dy;
      for (let i = 0; i <= numDivX; i++) {
        const x = i * dx;
        const nodeId = `N_${String(nodeCounter++).padStart(3, '0')}`;
        nodes.push({ id: nodeId, x, y, z: elevationZ });
        row.push(nodeId);
      }
      nodeGrid.push(row);
    }

    // 2. Generate Quadrilateral Elements
    const elements: SurfaceQuadElement[] = [];
    let elemCounter = 1;

    for (let j = 0; j < numDivY; j++) {
      for (let i = 0; i < numDivX; i++) {
        const n1 = nodeGrid[j]![i]!;
        const n2 = nodeGrid[j]![i + 1]!;
        const n3 = nodeGrid[j + 1]![i + 1]!;
        const n4 = nodeGrid[j + 1]![i]!;

        const centerX = (i + 0.5) * dx;
        const centerY = (j + 0.5) * dy;

        elements.push({
          id: `EL_${String(elemCounter++).padStart(3, '0')}`,
          nodeIds: [n1, n2, n3, n4],
          center: [centerX, centerY, elevationZ],
          area: dx * dy,
        });
      }
    }

    // Compute bandwidth before RCM
    const initialIndexMap = new Map<string, number>();
    nodes.forEach((n, idx) => initialIndexMap.set(n.id, idx));
    const bwBefore = this.computeMeshBandwidth(elements, initialIndexMap);

    let finalNodes = nodes;
    let nodeMapping: Record<string, string> = {};
    let bwAfter = bwBefore;

    if (applyRCM) {
      const rcmResult = this.applyReverseCuthillMcKee(nodes, elements);
      finalNodes = rcmResult.renumberedNodes;
      nodeMapping = rcmResult.nodeMap;

      const newIndexMap = new Map<string, number>();
      finalNodes.forEach((n, idx) => newIndexMap.set(n.id, idx));

      // Remap element nodeIds to new node numbering
      elements.forEach((el) => {
        el.nodeIds = [
          nodeMapping[el.nodeIds[0]] ?? el.nodeIds[0],
          nodeMapping[el.nodeIds[1]] ?? el.nodeIds[1],
          nodeMapping[el.nodeIds[2]] ?? el.nodeIds[2],
          nodeMapping[el.nodeIds[3]] ?? el.nodeIds[3],
        ];
      });

      bwAfter = this.computeMeshBandwidth(elements, newIndexMap);
    }

    return {
      id,
      nodes: finalNodes,
      elements,
      bandwidthBeforeRCM: bwBefore,
      bandwidthAfterRCM: bwAfter,
      nodeMapping,
      totalArea: widthX * lengthY,
    };
  }

  /**
   * Generates a planar quad-dominant mesh over an arbitrary 2D polygon with optional interior voids.
   */
  public static generatePlanarPolygonMesh(
    boundary: PlanarPolygonBoundary,
    elevationZ: number = 0
  ): SurfaceMeshModel {
    const pts = boundary.outline;
    if (pts.length < 3) {
      throw new Error('Polygon outline must contain at least 3 vertices.');
    }

    // Compute Bounding Box
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    pts.forEach(([x, y]) => {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    });

    const size = Math.max(0.1, boundary.targetElementSize);
    const numDivX = Math.max(1, Math.round((maxX - minX) / size));
    const numDivY = Math.max(1, Math.round((maxY - minY) / size));
    const dx = (maxX - minX) / numDivX;
    const dy = (maxY - minY) / numDivY;

    // Filter grid points inside polygon and outside openings
    const activeNodesMap = new Map<string, FEMNode3D>();
    const elements: SurfaceQuadElement[] = [];
    let elemCounter = 1;

    for (let j = 0; j < numDivY; j++) {
      for (let i = 0; i < numDivX; i++) {
        const cx = minX + (i + 0.5) * dx;
        const cy = minY + (j + 0.5) * dy;

        // Check if element center is inside outer polygon and outside all openings
        if (!this.isPointInsidePolygon([cx, cy], boundary.outline)) continue;

        let inOpening = false;
        if (boundary.openings) {
          for (const op of boundary.openings) {
            if (this.isPointInsidePolygon([cx, cy], op)) {
              inOpening = true;
              break;
            }
          }
        }
        if (inOpening) continue;

        // Add 4 corner nodes
        const corners: [number, number][] = [
          [minX + i * dx, minY + j * dy],
          [minX + (i + 1) * dx, minY + j * dy],
          [minX + (i + 1) * dx, minY + (j + 1) * dy],
          [minX + i * dx, minY + (j + 1) * dy],
        ];

        const elNodeIds: [string, string, string, string] = ['', '', '', ''];
        corners.forEach(([px, py], cIdx) => {
          const key = `${px.toFixed(4)}_${py.toFixed(4)}`;
          let node = activeNodesMap.get(key);
          if (!node) {
            const nodeId = `N_${String(activeNodesMap.size + 1).padStart(3, '0')}`;
            node = { id: nodeId, x: px, y: py, z: elevationZ };
            activeNodesMap.set(key, node);
          }
          elNodeIds[cIdx] = node.id;
        });

        elements.push({
          id: `EL_${String(elemCounter++).padStart(3, '0')}`,
          nodeIds: elNodeIds,
          center: [cx, cy, elevationZ],
          area: dx * dy,
        });
      }
    }

    const nodes = Array.from(activeNodesMap.values());
    const initialIndexMap = new Map<string, number>();
    nodes.forEach((n, idx) => initialIndexMap.set(n.id, idx));
    const bwBefore = this.computeMeshBandwidth(elements, initialIndexMap);

    const rcmResult = this.applyReverseCuthillMcKee(nodes, elements);
    const finalNodes = rcmResult.renumberedNodes;
    const nodeMapping = rcmResult.nodeMap;

    elements.forEach((el) => {
      el.nodeIds = [
        nodeMapping[el.nodeIds[0]] ?? el.nodeIds[0],
        nodeMapping[el.nodeIds[1]] ?? el.nodeIds[1],
        nodeMapping[el.nodeIds[2]] ?? el.nodeIds[2],
        nodeMapping[el.nodeIds[3]] ?? el.nodeIds[3],
      ];
    });

    const newIndexMap = new Map<string, number>();
    finalNodes.forEach((n, idx) => newIndexMap.set(n.id, idx));
    const bwAfter = this.computeMeshBandwidth(elements, newIndexMap);

    const totalArea = elements.reduce((acc, el) => acc + el.area, 0);

    return {
      id: boundary.id,
      nodes: finalNodes,
      elements,
      bandwidthBeforeRCM: bwBefore,
      bandwidthAfterRCM: bwAfter,
      nodeMapping,
      totalArea,
    };
  }

  // --- Bandwidth Evaluation & Reverse Cuthill-McKee (RCM) ---

  public static computeMeshBandwidth(
    elements: SurfaceQuadElement[],
    nodeIndexMap: Map<string, number>
  ): number {
    let maxDiff = 0;
    for (const el of elements) {
      const idxs = el.nodeIds.map((id) => nodeIndexMap.get(id) ?? 0);
      const minIdx = Math.min(...idxs);
      const maxIdx = Math.max(...idxs);
      const diff = maxIdx - minIdx;
      if (diff > maxDiff) maxDiff = diff;
    }
    return maxDiff;
  }

  public static applyReverseCuthillMcKee(
    nodes: FEMNode3D[],
    elements: SurfaceQuadElement[]
  ): { renumberedNodes: FEMNode3D[]; nodeMap: Record<string, string> } {
    if (nodes.length <= 1) {
      return { renumberedNodes: nodes, nodeMap: {} };
    }

    // 1. Build adjacency graph
    const adj = new Map<string, Set<string>>();
    nodes.forEach((n) => adj.set(n.id, new Set()));

    elements.forEach((el) => {
      const n = el.nodeIds;
      for (let i = 0; i < 4; i++) {
        for (let j = i + 1; j < 4; j++) {
          adj.get(n[i]!)?.add(n[j]!);
          adj.get(n[j]!)?.add(n[i]!);
        }
      }
    });

    // 2. Find node with minimum degree as starting root
    let minDeg = Infinity;
    let rootNode = nodes[0]!.id;

    for (const [id, neighbors] of adj.entries()) {
      if (neighbors.size < minDeg) {
        minDeg = neighbors.size;
        rootNode = id;
      }
    }

    // 3. Cuthill-McKee Breadth-First Traversal
    const visited = new Set<string>();
    const cmOrder: string[] = [];
    const queue: string[] = [rootNode];
    visited.add(rootNode);

    while (queue.length > 0) {
      const current = queue.shift()!;
      cmOrder.push(current);

      // Get unvisited neighbors and sort by degree ascending
      const neighbors = Array.from(adj.get(current) ?? []).filter((id) => !visited.has(id));
      neighbors.sort((a, b) => (adj.get(a)?.size ?? 0) - (adj.get(b)?.size ?? 0));

      neighbors.forEach((nbr) => {
        visited.add(nbr);
        queue.push(nbr);
      });

      // Handle disconnected components if any
      if (queue.length === 0 && visited.size < nodes.length) {
        for (const n of nodes) {
          if (!visited.has(n.id)) {
            visited.add(n.id);
            queue.push(n.id);
            break;
          }
        }
      }
    }

    // 4. Reverse the order: RCM = reverse(CM)
    const rcmOrder = cmOrder.slice().reverse();

    // 5. Build renumbered nodes and mapping
    const nodeLookup = new Map<string, FEMNode3D>();
    nodes.forEach((n) => nodeLookup.set(n.id, n));

    const renumberedNodes: FEMNode3D[] = [];
    const nodeMap: Record<string, string> = {};

    rcmOrder.forEach((oldId, newIdx) => {
      const originalNode = nodeLookup.get(oldId)!;
      const newId = `N_${String(newIdx + 1).padStart(3, '0')}`;
      nodeMap[oldId] = newId;
      renumberedNodes.push({
        ...originalNode,
        id: newId,
      });
    });

    return { renumberedNodes, nodeMap };
  }

  // --- Point In Polygon Helper (Ray Casting Algorithm) ---

  private static isPointInsidePolygon(point: [number, number], polygon: [number, number][]): boolean {
    const [x, y] = point;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i]!;
      const [xj, yj] = polygon[j]!;

      const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-12) + xi;
      if (intersect) inside = !inside;
    }

    return inside;
  }
}
