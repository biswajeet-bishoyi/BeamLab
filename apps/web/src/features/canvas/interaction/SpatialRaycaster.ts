import * as THREE from 'three';
import type { StructuralSystem } from '@beamstudio/engineering-model';
import type { PlateDefinition } from '../geometry';

export type EntityType = 'node' | 'member' | 'support' | 'plate';

export interface EntityDetails {
  id: string;
  name: string;
  entityType: EntityType;
  // Node details
  coordinates?: { x: number; y: number; z: number };
  connectedMembersCount?: number;
  supportPreset?: string;
  // Member details
  memberType?: string;
  designation?: string;
  length?: number;
  material?: string;
  rollAngle?: number;
  // Support details
  hostNodeId?: string;
  preset?: string;
  // Plate details
  thickness?: number;
  area?: number;
}

export interface RaycastHit {
  entityType: EntityType;
  entityId: string;
  object: THREE.Object3D;
  point: THREE.Vector3;
  distance: number;
  details: EntityDetails;
}

/**
 * High-performance 3D spatial raycaster for structural engineering entities.
 * Intersects WebGL scene objects and resolves them to canonical engineering data.
 */
export class SpatialRaycaster {
  private readonly raycaster = new THREE.Raycaster();

  constructor() {
    // Generous line precision for selecting centerlines easily
    this.raycaster.params.Line = { threshold: 0.12 };
    // Node point threshold
    this.raycaster.params.Points = { threshold: 0.15 };
  }

  /**
   * Casts a ray from normalized screen coordinates (-1 to +1) against candidate scene groups.
   */
  public castRay(
    ndcCoords: { x: number; y: number },
    camera: THREE.Camera,
    candidateGroups: THREE.Object3D[],
    system?: StructuralSystem,
    plates: PlateDefinition[] = [],
  ): RaycastHit | null {
    const v2 = ndcCoords instanceof THREE.Vector2 ? ndcCoords : new THREE.Vector2(ndcCoords.x, ndcCoords.y);
    this.raycaster.setFromCamera(v2, camera);

    const intersects = this.raycaster.intersectObjects(candidateGroups, true);
    if (intersects.length === 0) return null;

    // Find first valid structural entity hit
    for (const hit of intersects) {
      const entity = this.resolveEntity(hit.object, hit.point, hit.distance, system, plates);
      if (entity) return entity;
    }

    return null;
  }

  /**
   * Traverses up object parent hierarchy to extract entity type and ID from userData.
   */
  private resolveEntity(
    obj: THREE.Object3D,
    point: THREE.Vector3,
    distance: number,
    system?: StructuralSystem,
    plates: PlateDefinition[] = [],
  ): RaycastHit | null {
    let curr: THREE.Object3D | null = obj;

    while (curr) {
      const u = curr.userData;
      if (u && u.entityType && (u.entityId || u.memberId || u.nodeId || u.supportId || u.plateId)) {
        const type = u.entityType as EntityType;
        const id = (u.entityId || u.memberId || u.nodeId || u.supportId || u.plateId) as string;
        const details = this.buildEntityDetails(type, id, system, plates);

        return {
          entityType: type,
          entityId: id,
          object: curr,
          point,
          distance,
          details,
        };
      }
      curr = curr.parent;
    }

    return null;
  }

  private buildEntityDetails(
    type: EntityType,
    id: string,
    system?: StructuralSystem,
    plates: PlateDefinition[] = [],
  ): EntityDetails {
    const details: EntityDetails = {
      id,
      name: id,
      entityType: type,
    };

    if (!system) return details;

    switch (type) {
      case 'node': {
        const node = system.getNode(id);
        if (node) {
          details.name = node.identity.name;
          details.coordinates = { x: node.x, y: node.y, z: node.z };
          details.connectedMembersCount = node.connectedMembers.length;
          // Check if supported
          for (const sup of system.supports.values()) {
            if (sup.nodeId === id) {
              details.supportPreset = sup.preset;
              break;
            }
          }
        }
        break;
      }

      case 'member': {
        const member = system.getMember(id);
        if (member) {
          details.name = member.identity.name;
          details.memberType = member.memberType;
          details.rollAngle = member.orientation?.rollAngleDeg ?? 0;
          details.length = system.memberLength(id);

          const sec = system.getSection(member.sectionId);
          if (sec && sec.profile) {
            details.designation = sec.profile.designation;
          }

          const mat = system.getMaterial(member.materialId);
          if (mat) {
            details.material = mat.definition.grade;
          }
        }
        break;
      }

      case 'support': {
        const sup = system.getSupport(id);
        if (sup) {
          details.name = sup.identity.name;
          details.preset = sup.preset;
          details.hostNodeId = sup.nodeId;
        }
        break;
      }

      case 'plate': {
        const plate = plates.find((p) => p.id === id);
        if (plate) {
          details.name = plate.name;
          details.thickness = plate.thickness * 1000; // convert to mm
          // Simple polygon area calculation
          if (plate.cornerPoints.length >= 4) {
            const p0 = plate.cornerPoints[0]!;
            const p1 = plate.cornerPoints[1]!;
            const p2 = plate.cornerPoints[2]!;
            const w = p0.distanceTo(p1);
            const h = p1.distanceTo(p2);
            details.area = Math.round(w * h * 100) / 100;
          }
        }
        break;
      }
    }

    return details;
  }
}
