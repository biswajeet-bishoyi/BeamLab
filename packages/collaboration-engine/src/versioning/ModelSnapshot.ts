/**
 * ModelSnapshot.ts
 *
 * Immutable, serializable representation of an engineering model state at a given commit.
 * Encompasses 3D topological nodes, structural members, cross-sections, materials,
 * boundary supports, and applied loads.
 */

export interface Vec3Snapshot {
  x: number;
  y: number;
  z: number;
}

export interface RestraintSnapshot {
  fx: boolean;
  fy: boolean;
  fz: boolean;
  mx: boolean;
  my: boolean;
  mz: boolean;
}

export interface StructuralNodeSnapshot {
  id: string;
  coords: Vec3Snapshot;
  restraint?: RestraintSnapshot;
  floorLevelM?: number;
  metadata?: Record<string, any>;
}

export interface MemberReleasesSnapshot {
  start?: { fx?: boolean; fy?: boolean; fz?: boolean; mx?: boolean; my?: boolean; mz?: boolean };
  end?: { fx?: boolean; fy?: boolean; fz?: boolean; mx?: boolean; my?: boolean; mz?: boolean };
}

export interface StructuralMemberSnapshot {
  id: string;
  startNodeId: string;
  endNodeId: string;
  sectionId?: string;
  materialId?: string;
  releases?: MemberReleasesSnapshot;
  betaAngleDeg?: number;
  type?: 'beam' | 'column' | 'brace' | 'truss' | 'cable';
  metadata?: Record<string, any>;
}

export interface StructuralSectionSnapshot {
  id: string;
  name: string;
  areaM2?: number;
  IzzM4?: number;
  IyyM4?: number;
  JTorM4?: number;
  depthM?: number;
  widthM?: number;
  flangeThickM?: number;
  webThickM?: number;
  weightPerM?: number; // kg/m
  materialId?: string;
  metadata?: Record<string, any>;
}

export interface StructuralMaterialSnapshot {
  id: string;
  name: string;
  elasticModulusN_M2?: number; // E in Pa
  poissonRatio?: number;
  shearModulusN_M2?: number;
  densityKg_M3?: number; // e.g. 7850 for steel, 2400 for concrete
  yieldStrengthN_M2?: number; // fy in Pa
  type?: 'steel' | 'concrete' | 'timber' | 'aluminum' | 'composite';
  metadata?: Record<string, any>;
}

export type LoadType = 'nodal_force' | 'member_point' | 'member_udl' | 'member_trapezoidal' | 'thermal';

export interface StructuralLoadSnapshot {
  id: string;
  loadCaseId?: string;
  type: LoadType;
  nodeId?: string;
  memberId?: string;
  magnitude?: number; // N or N/m
  direction?: 'X' | 'Y' | 'Z' | 'local_x' | 'local_y' | 'local_z';
  distanceM?: number; // along member
  values?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface StructuralLoadCaseSnapshot {
  id: string;
  name: string;
  category?: 'dead' | 'live' | 'wind' | 'seismic' | 'snow' | 'temperature';
  selfWeightMultiplier?: number;
  metadata?: Record<string, any>;
}

export interface EngineeringModelSnapshot {
  schemaVersion: string;
  modelId: string;
  title?: string;
  nodes: Record<string, StructuralNodeSnapshot>;
  members: Record<string, StructuralMemberSnapshot>;
  sections: Record<string, StructuralSectionSnapshot>;
  materials: Record<string, StructuralMaterialSnapshot>;
  loads: Record<string, StructuralLoadSnapshot>;
  loadCases?: Record<string, StructuralLoadCaseSnapshot>;
  metadata?: Record<string, any>;
}

/**
 * Creates an empty, valid EngineeringModelSnapshot.
 */
export function createEmptySnapshot(modelId: string = 'model_root', title?: string): EngineeringModelSnapshot {
  return {
    schemaVersion: '1.0',
    modelId,
    title: title ?? 'BeamLab Structural Model',
    nodes: {},
    members: {},
    sections: {},
    materials: {},
    loads: {},
    loadCases: {
      DL: { id: 'DL', name: 'Dead Load', category: 'dead', selfWeightMultiplier: 1.0 },
      LL: { id: 'LL', name: 'Live Load', category: 'live' },
    },
    metadata: {
      createdAt: Date.now(),
    },
  };
}

/**
 * Creates a deep clone of a structural model snapshot.
 */
export function cloneSnapshot(snapshot: EngineeringModelSnapshot): EngineeringModelSnapshot {
  return JSON.parse(JSON.stringify(snapshot));
}

/**
 * Calculates Euclidean length of a member in meters based on connected node coordinates.
 */
export function calculateMemberLengthM(
  member: StructuralMemberSnapshot,
  nodes: Record<string, StructuralNodeSnapshot>
): number {
  const n1 = nodes[member.startNodeId];
  const n2 = nodes[member.endNodeId];
  if (!n1 || !n2) return 0;

  const dx = n2.coords.x - n1.coords.x;
  const dy = n2.coords.y - n1.coords.y;
  const dz = n2.coords.z - n1.coords.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculates total structural steel/material self-mass in kilograms across all members in the snapshot.
 */
export function calculateTotalMassKg(snapshot: EngineeringModelSnapshot): number {
  let totalMassKg = 0;
  const DEFAULT_STEEL_DENSITY = 7850; // kg/m^3

  for (const member of Object.values(snapshot.members)) {
    const len = calculateMemberLengthM(member, snapshot.nodes);
    if (len <= 0) continue;

    const section = member.sectionId ? snapshot.sections[member.sectionId] : undefined;
    if (section) {
      if (section.weightPerM && section.weightPerM > 0) {
        totalMassKg += section.weightPerM * len;
      } else if (section.areaM2 && section.areaM2 > 0) {
        const material = section.materialId
          ? snapshot.materials[section.materialId]
          : member.materialId
            ? snapshot.materials[member.materialId]
            : undefined;
        const density = material?.densityKg_M3 ?? DEFAULT_STEEL_DENSITY;
        totalMassKg += section.areaM2 * len * density;
      }
    }
  }

  return Math.round(totalMassKg * 100) / 100;
}

/**
 * Computes a deterministic pseudo-hash of a snapshot for verification.
 */
export function computeSnapshotHash(snapshot: EngineeringModelSnapshot): string {
  const nodeKeys = Object.keys(snapshot.nodes).sort();
  const memberKeys = Object.keys(snapshot.members).sort();
  const loadKeys = Object.keys(snapshot.loads).sort();

  const signature = `${snapshot.modelId}_N:${nodeKeys.length}_M:${memberKeys.length}_L:${loadKeys.length}_W:${calculateTotalMassKg(snapshot)}`;
  let hash = 0;
  for (let i = 0; i < signature.length; i++) {
    hash = (hash << 5) - hash + signature.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}
