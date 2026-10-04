import * as THREE from 'three';
import type { StructuralSystem } from '@beamstudio/engineering-model';

export type SnapType = 'node' | 'midpoint' | 'grid' | 'perpendicular' | 'intersection';

export interface SnapOptions {
  enabled: boolean;
  snapToNodes: boolean;
  snapToMidpoints: boolean;
  snapToGrid: boolean;
  snapToPerpendicular: boolean;
  pixelThreshold: number; // screen-space radius in pixels (default 18)
  gridIncrement: number; // metric grid step (e.g. 0.5m or 1.0m)
}

export const DEFAULT_SNAP_OPTIONS: SnapOptions = {
  enabled: true,
  snapToNodes: true,
  snapToMidpoints: true,
  snapToGrid: true,
  snapToPerpendicular: true,
  pixelThreshold: 18,
  gridIncrement: 0.5,
};

export interface SnapResult {
  type: SnapType;
  worldPoint: THREE.Vector3;
  screenPoint: { x: number; y: number };
  label: string;
  targetId?: string;
  distancePx: number;
}

/**
 * High-performance 3D CAD spatial snapping engine.
 * Evaluates candidate structural points, member spans, and metric grid planes
 * in screen space for pixel-precise CAD snapping.
 */
export class SpatialSnappingEngine {
  private readonly raycaster = new THREE.Raycaster();
  private readonly groundPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

  /**
   * Evaluates the active scene for the closest snap point to the mouse cursor.
   */
  public findSnap(
    screenPos: { x: number; y: number },
    containerRect: DOMRect,
    camera: THREE.Camera,
    system?: StructuralSystem,
    options: SnapOptions = DEFAULT_SNAP_OPTIONS,
  ): SnapResult | null {
    if (!options.enabled) return null;

    const width = containerRect.width;
    const height = containerRect.height;
    const mouseX = screenPos.x - containerRect.left;
    const mouseY = screenPos.y - containerRect.top;

    let bestSnap: SnapResult | null = null;
    let minDistance = options.pixelThreshold;

    // Helper: Project 3D world vector to 2D container screen coordinates
    const projectToScreen = (worldPos: THREE.Vector3): { x: number; y: number; inFront: boolean } => {
      const p = worldPos.clone().project(camera);
      return {
        x: ((p.x + 1) / 2) * width,
        y: ((-p.y + 1) / 2) * height,
        inFront: p.z < 1.0,
      };
    };

    // 1. Check Structural Nodes (Highest priority)
    if (options.snapToNodes && system) {
      for (const node of system.nodes.values()) {
        const worldPos = new THREE.Vector3(node.x, node.y, node.z);
        const screen = projectToScreen(worldPos);

        if (screen.inFront) {
          const dist = Math.hypot(screen.x - mouseX, screen.y - mouseY);
          if (dist < minDistance) {
            minDistance = dist;
            bestSnap = {
              type: 'node',
              worldPoint: worldPos,
              screenPoint: { x: screen.x, y: screen.y },
              label: `Node: ${node.identity.name} (${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)}, ${worldPos.z.toFixed(2)})`,
              targetId: node.identity.id,
              distancePx: dist,
            };
          }
        }
      }
    }

    // 2. Check Member Midpoints
    if (options.snapToMidpoints && system) {
      for (const member of system.members.values()) {
        const n1 = system.getNode(member.startNodeId);
        const n2 = system.getNode(member.endNodeId);
        if (!n1 || !n2) continue;

        const p1 = new THREE.Vector3(n1.x, n1.y, n1.z);
        const p2 = new THREE.Vector3(n2.x, n2.y, n2.z);
        const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);

        const screen = projectToScreen(mid);
        if (screen.inFront) {
          const dist = Math.hypot(screen.x - mouseX, screen.y - mouseY);
          if (dist < minDistance) {
            minDistance = dist;
            bestSnap = {
              type: 'midpoint',
              worldPoint: mid,
              screenPoint: { x: screen.x, y: screen.y },
              label: `Midpoint: ${member.identity.name} (${mid.x.toFixed(2)}, ${mid.y.toFixed(2)}, ${mid.z.toFixed(2)})`,
              targetId: member.identity.id,
              distancePx: dist,
            };
          }
        }
      }
    }

    // 3. Check Perpendicular / Closest Point along Member axes
    if (options.snapToPerpendicular && system && minDistance > 8) {
      const mouseNDC = new THREE.Vector2(
        (mouseX / width) * 2 - 1,
        -(mouseY / height) * 2 + 1,
      );
      this.raycaster.setFromCamera(mouseNDC, camera);

      for (const member of system.members.values()) {
        const n1 = system.getNode(member.startNodeId);
        const n2 = system.getNode(member.endNodeId);
        if (!n1 || !n2) continue;

        const p1 = new THREE.Vector3(n1.x, n1.y, n1.z);
        const p2 = new THREE.Vector3(n2.x, n2.y, n2.z);
        const seg = new THREE.Line3(p1, p2);

        // Find closest point between camera ray and member line segment
        const closestPointOnSegment = new THREE.Vector3();
        const closestPointOnRay = new THREE.Vector3();
        this.raycaster.ray.distanceSqToSegment(
          p1,
          p2,
          closestPointOnRay,
          closestPointOnSegment,
        );

        const screen = projectToScreen(closestPointOnSegment);
        if (screen.inFront) {
          const dist = Math.hypot(screen.x - mouseX, screen.y - mouseY);
          // Only snap if sufficiently far from endpoints (>10% and <90% span)
          const param = seg.closestPointToPointParameter(closestPointOnSegment, true);
          if (param > 0.1 && param < 0.9 && dist < minDistance) {
            minDistance = dist;
            bestSnap = {
              type: 'perpendicular',
              worldPoint: closestPointOnSegment,
              screenPoint: { x: screen.x, y: screen.y },
              label: `On Member: ${member.identity.name} (${closestPointOnSegment.x.toFixed(2)}, ${closestPointOnSegment.y.toFixed(2)}, ${closestPointOnSegment.z.toFixed(2)})`,
              targetId: member.identity.id,
              distancePx: dist,
            };
          }
        }
      }
    }

    // 4. Check Ground Grid Snap (Fallback if no entity snapped)
    if (options.snapToGrid && !bestSnap) {
      const mouseNDC = new THREE.Vector2(
        (mouseX / width) * 2 - 1,
        -(mouseY / height) * 2 + 1,
      );
      this.raycaster.setFromCamera(mouseNDC, camera);

      const intersection = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.groundPlane, intersection)) {
        const step = Math.max(0.1, options.gridIncrement);
        const snappedX = Math.round(intersection.x / step) * step;
        const snappedY = Math.round(intersection.y / step) * step;
        const gridPoint = new THREE.Vector3(snappedX, snappedY, 0);

        const screen = projectToScreen(gridPoint);
        if (screen.inFront) {
          const dist = Math.hypot(screen.x - mouseX, screen.y - mouseY);
          if (dist < options.pixelThreshold) {
            bestSnap = {
              type: 'grid',
              worldPoint: gridPoint,
              screenPoint: { x: screen.x, y: screen.y },
              label: `Grid: (${snappedX.toFixed(2)}, ${snappedY.toFixed(2)}, 0.00)`,
              distancePx: dist,
            };
          }
        }
      }
    }

    return bestSnap;
  }
}
