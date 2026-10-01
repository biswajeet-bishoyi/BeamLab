/**
 * StepParser.ts
 *
 * Resilient ISO 10303-21 STEP physical file parser for buildingSMART IFC4
 * Structural Analysis Domain models.
 * Parses point connections, boundary conditions, curve members, surface members,
 * load groups, and structural actions.
 */

import {
  IfcStructuralAnalysisModel,
  IfcStructuralPointConnection,
  IfcBoundaryNodeCondition,
  BoundaryStiffness,
  IfcStructuralCurveMember,
  IfcStructuralSurfaceMember,
  IfcStructuralLoadGroup,
  IfcStructuralPointAction,
  IfcStructuralCurveAction,
  IfcStructuralCurveMemberTypeEnum,
  IfcActionTypeEnum,
  IfcLoadGroupTypeEnum,
} from './IfcStructuralSchema';

interface RawStepEntity {
  readonly id: number;
  readonly type: string;
  readonly params: string;
}

export class StepParser {
  private parseStiffness(str: string): BoundaryStiffness {
    const trimmed = str.trim().toUpperCase();
    if (trimmed.includes('FIXED')) return 'FIXED';
    if (trimmed.includes('FREE') || trimmed === '$') return 'FREE';
    const num = parseFloat(trimmed);
    return isNaN(num) ? 'FREE' : num;
  }

  /**
   * Parses an ISO 10303-21 STEP physical file string into an IfcStructuralAnalysisModel.
   */
  parse(content: string): IfcStructuralAnalysisModel {
    const lines = content.split(/\r?\n/);
    const entities = new Map<number, RawStepEntity>();

    // Pass 1: Parse entities
    let accumulated = '';
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('/*') || line.startsWith('//')) continue;

      accumulated += line;
      if (accumulated.endsWith(';')) {
        const stmt = accumulated.slice(0, -1).trim();
        accumulated = '';

        if (stmt.startsWith('#')) {
          const match = stmt.match(/^#(\d+)\s*=\s*([A-Z0-9_]+)\s*\((.*)\)$/i);
          if (match && match[1] && match[2] && match[3] !== undefined) {
            const id = parseInt(match[1], 10);
            const type = match[2].toUpperCase();
            const params = match[3];
            entities.set(id, { id, type, params });
          }
        }
      }
    }

    // Pass 2: Extract Cartesian Points
    const cartesianPoints = new Map<number, [number, number, number]>();
    for (const [id, ent] of entities) {
      if (ent.type === 'IFCCARTESIANPOINT') {
        // e.g. ((0.0000,0.0000,3.5000))
        const coordsMatch = ent.params.match(/\(\s*([-\d.eE]+)\s*,\s*([-\d.eE]+)(?:\s*,\s*([-\d.eE]+))?\s*\)/);
        if (coordsMatch && coordsMatch[1] && coordsMatch[2]) {
          const x = parseFloat(coordsMatch[1]);
          const y = parseFloat(coordsMatch[2]);
          const z = coordsMatch[3] ? parseFloat(coordsMatch[3]) : 0;
          cartesianPoints.set(id, [x, y, z]);
        }
      }
    }

    // Pass 3: Extract Boundary Node Conditions
    const boundaryConditions = new Map<number, IfcBoundaryNodeCondition>();
    for (const [id, ent] of entities) {
      if (ent.type === 'IFCBOUNDARYNODECONDITION') {
        // e.g. ('Support',.FIXED.,.FIXED.,.FIXED.,.FREE.,.FREE.,.FREE.)
        const parts = ent.params.split(',').map(s => s.trim());
        const nameMatch = parts[0]?.match(/'([^']*)'/);
        const name = nameMatch ? nameMatch[1] : 'Condition';

        const cond: IfcBoundaryNodeCondition = {
          id,
          name,
          translationalStiffnessX: this.parseStiffness(parts[1] || 'FREE'),
          translationalStiffnessY: this.parseStiffness(parts[2] || 'FREE'),
          translationalStiffnessZ: this.parseStiffness(parts[3] || 'FREE'),
          rotationalStiffnessX: this.parseStiffness(parts[4] || 'FREE'),
          rotationalStiffnessY: this.parseStiffness(parts[5] || 'FREE'),
          rotationalStiffnessZ: this.parseStiffness(parts[6] || 'FREE'),
        };
        boundaryConditions.set(id, cond);
      }
    }

    // Pass 4: Extract Point Connections
    const connections: IfcStructuralPointConnection[] = [];
    const connectionStepToGlobalMap = new Map<number, string>();

    for (const [id, ent] of entities) {
      if (ent.type === 'IFCSTRUCTURALPOINTCONNECTION') {
        // e.g. ('guid',#5,'N1',$,$,#20,#21)
        const strings = Array.from(ent.params.matchAll(/'([^']*)'/g)).map(m => m[1]);
        const globalId = strings[0] || `conn-${id}`;
        const name = strings[1] || `Node-${id}`;

        const refs = Array.from(ent.params.matchAll(/#(\d+)/g)).map(m => parseInt(m[1]!, 10));
        // Point is typically the first or second entity reference
        let ptCoords: [number, number, number] = [0, 0, 0];
        let cond: IfcBoundaryNodeCondition | undefined;

        for (const ref of refs) {
          if (cartesianPoints.has(ref)) {
            ptCoords = cartesianPoints.get(ref)!;
          }
          if (boundaryConditions.has(ref)) {
            cond = boundaryConditions.get(ref);
          }
        }

        const conn: IfcStructuralPointConnection = {
          id,
          globalId,
          name,
          location: { coordinates: ptCoords },
          condition: cond,
        };
        connections.push(conn);
        connectionStepToGlobalMap.set(id, globalId);
      }
    }

    // Pass 5: Extract Curve Members & Connectivities
    const curveMembersRaw = new Map<
      number,
      { globalId: string; name: string; predType: string; profileName?: string; materialName?: string }
    >();
    const memberConnMap = new Map<number, { start?: string; end?: string }>();

    for (const [id, ent] of entities) {
      if (ent.type === 'IFCSTRUCTURALCURVEMEMBER') {
        const strings = Array.from(ent.params.matchAll(/'([^']*)'/g)).map(m => m[1]);
        const globalId = strings[0] || `mem-${id}`;
        const name = strings[1] || `Member-${id}`;
        const profileName = strings[2] && strings[2].trim().length > 0 ? strings[2] : undefined;
        const materialName = strings[3] && strings[3].trim().length > 0 ? strings[3] : undefined;

        const enumMatch = ent.params.match(/\.([A-Z0-9_]+)\./i);
        const predType = enumMatch ? enumMatch[1]!.toUpperCase() : 'RIGID_JOINED_MEMBER';

        curveMembersRaw.set(id, { globalId, name, predType, profileName, materialName });
      } else if (ent.type === 'IFCRELCONNECTSSTRUCTURALMEMBER') {
        // e.g. ('guid',#5,$,$,#memStepId,#connStepId,$,$,$,$)
        const refs = Array.from(ent.params.matchAll(/#(\d+)/g)).map(m => parseInt(m[1]!, 10));
        // Filter refs that point to curve members and connections
        const memRef = refs.find(r => curveMembersRaw.has(r));
        const connRef = refs.find(r => connectionStepToGlobalMap.has(r));

        if (memRef && connRef) {
          const connGlobalId = connectionStepToGlobalMap.get(connRef)!;
          const current = memberConnMap.get(memRef) || {};
          if (!current.start) {
            current.start = connGlobalId;
          } else if (!current.end) {
            current.end = connGlobalId;
          }
          memberConnMap.set(memRef, current);
        }
      }
    }

    const curveMembers: IfcStructuralCurveMember[] = [];
    const memberStepToGlobalMap = new Map<number, string>();

    for (const [id, raw] of curveMembersRaw) {
      const conns = memberConnMap.get(id) || {};
      const mem: IfcStructuralCurveMember = {
        id,
        globalId: raw.globalId,
        name: raw.name,
        predefinedType: (raw.predType as IfcStructuralCurveMemberTypeEnum) || 'RIGID_JOINED_MEMBER',
        startConnectionId: conns.start || '',
        endConnectionId: conns.end || '',
        profileName: raw.profileName,
        materialName: raw.materialName,
      };
      curveMembers.push(mem);
      memberStepToGlobalMap.set(id, raw.globalId);
    }

    // Pass 5b: Extract Surface Members
    const surfaceMembers: IfcStructuralSurfaceMember[] = [];
    for (const [id, ent] of entities) {
      if (ent.type === 'IFCSTRUCTURALSURFACEMEMBER') {
        const strings = Array.from(ent.params.matchAll(/'([^']*)'/g)).map(m => m[1]);
        const globalId = strings[0] || `surf-${id}`;
        const name = strings[1] || `Surface-${id}`;
        const materialName = strings[2] && strings[2].trim().length > 0 ? strings[2] : undefined;

        const enumMatch = ent.params.match(/\.([A-Z0-9_]+)\./i);
        const predType = (enumMatch ? enumMatch[1]!.toUpperCase() : 'SHELL') as any;

        const numMatch = ent.params.match(/,\s*([-\d.]+)\s*\)$/);
        const thickness_m = numMatch && numMatch[1] ? parseFloat(numMatch[1]) : 0.2;

        surfaceMembers.push({
          id,
          globalId,
          name,
          predefinedType: predType,
          thickness_m,
          boundaryConnectionIds: [],
          materialName,
        });
      }
    }

    // Pass 6: Extract Load Groups
    const loadGroups: IfcStructuralLoadGroup[] = [];
    const loadGroupStepToGlobalMap = new Map<number, string>();

    for (const [id, ent] of entities) {
      if (ent.type === 'IFCSTRUCTURALLOADGROUP' || ent.type === 'IFCSTRUCTURALLOADCASE') {
        const strings = Array.from(ent.params.matchAll(/'([^']*)'/g)).map(m => m[1]);
        const globalId = strings[0] || `lg-${id}`;
        const name = strings[1] || `LoadGroup-${id}`;

        const enums = Array.from(ent.params.matchAll(/\.([A-Z0-9_]+)\./g)).map(m => m[1]!.toUpperCase());
        const lgType = (enums[0] as IfcLoadGroupTypeEnum) || 'LOAD_CASE';
        const actionType = (enums[1] as IfcActionTypeEnum) || 'PERMANENT_G';

        const coeffMatch = ent.params.match(/,\s*([-\d.]+)\s*\)$/);
        const coeff = coeffMatch && coeffMatch[1] ? parseFloat(coeffMatch[1]) : 1.0;

        const lg: IfcStructuralLoadGroup = {
          id,
          globalId,
          name,
          predefinedType: lgType,
          actionType,
          coefficient: coeff,
        };
        loadGroups.push(lg);
        loadGroupStepToGlobalMap.set(id, globalId);
      }
    }

    // Pass 7: Extract Single Forces & Point Actions
    const singleForces = new Map<number, { forces: [number, number, number]; moments: [number, number, number] }>();
    for (const [id, ent] of entities) {
      if (ent.type === 'IFCSTRUCTURALLOADSINGLEFORCE') {
        const parts = ent.params.split(',').map(s => s.trim());
        const fx = parseFloat(parts[1] || '0') || 0;
        const fy = parseFloat(parts[2] || '0') || 0;
        const fz = parseFloat(parts[3] || '0') || 0;
        const mx = parseFloat(parts[4] || '0') || 0;
        const my = parseFloat(parts[5] || '0') || 0;
        const mz = parseFloat(parts[6] || '0') || 0;
        singleForces.set(id, { forces: [fx, fy, fz], moments: [mx, my, mz] });
      }
    }

    const pointActions: IfcStructuralPointAction[] = [];
    for (const [id, ent] of entities) {
      if (ent.type === 'IFCSTRUCTURALPOINTACTION') {
        const strings = Array.from(ent.params.matchAll(/'([^']*)'/g)).map(m => m[1]);
        const globalId = strings[0] || `pa-${id}`;
        const name = strings[1] || `PointAction-${id}`;

        const refs = Array.from(ent.params.matchAll(/#(\d+)/g)).map(m => parseInt(m[1]!, 10));
        const connRef = refs.find(r => connectionStepToGlobalMap.has(r));
        const lgRef = refs.find(r => loadGroupStepToGlobalMap.has(r));
        const forceRef = refs.find(r => singleForces.has(r));

        const sf = forceRef ? singleForces.get(forceRef)! : { forces: [0, 0, 0] as [number, number, number], moments: [0, 0, 0] as [number, number, number] };

        if (connRef && lgRef) {
          pointActions.push({
            id,
            globalId,
            name,
            connectionGlobalId: connectionStepToGlobalMap.get(connRef)!,
            loadGroupGlobalId: loadGroupStepToGlobalMap.get(lgRef)!,
            forces_kN: sf.forces,
            moments_kNm: sf.moments,
          });
        }
      }
    }

    // Pass 8: Extract Linear Forces & Curve Actions
    const linearForces = new Map<number, [number, number, number]>();
    for (const [id, ent] of entities) {
      if (ent.type === 'IFCSTRUCTURALLOADLINEARFORCE') {
        const parts = ent.params.split(',').map(s => s.trim());
        const wx = parseFloat(parts[1] || '0') || 0;
        const wy = parseFloat(parts[2] || '0') || 0;
        const wz = parseFloat(parts[3] || '0') || 0;
        linearForces.set(id, [wx, wy, wz]);
      }
    }

    const curveActions: IfcStructuralCurveAction[] = [];
    for (const [id, ent] of entities) {
      if (ent.type === 'IFCSTRUCTURALCURVEACTION') {
        const strings = Array.from(ent.params.matchAll(/'([^']*)'/g)).map(m => m[1]);
        const globalId = strings[0] || `ca-${id}`;
        const name = strings[1] || `CurveAction-${id}`;

        const refs = Array.from(ent.params.matchAll(/#(\d+)/g)).map(m => parseInt(m[1]!, 10));
        const memRef = refs.find(r => memberStepToGlobalMap.has(r));
        const lgRef = refs.find(r => loadGroupStepToGlobalMap.has(r));
        const forceRef = refs.find(r => linearForces.has(r));

        const lf = forceRef ? linearForces.get(forceRef)! : [0, 0, 0] as [number, number, number];

        if (memRef && lgRef) {
          curveActions.push({
            id,
            globalId,
            name,
            memberGlobalId: memberStepToGlobalMap.get(memRef)!,
            loadGroupGlobalId: loadGroupStepToGlobalMap.get(lgRef)!,
            distributionType: 'UNIFORM',
            startForce_kN_m: lf,
          });
        }
      }
    }

    let modelGlobalId = 'AnalysisModel-Imported';
    let modelName = 'Imported IFC4 Structural Analysis Model';

    for (const [, ent] of entities) {
      if (ent.type === 'IFCSTRUCTURALANALYSISMODEL') {
        const strings = Array.from(ent.params.matchAll(/'([^']*)'/g)).map(m => m[1]);
        if (strings[0]) modelGlobalId = strings[0];
        if (strings[1]) modelName = strings[1];
        break;
      }
    }

    return {
      globalId: modelGlobalId,
      name: modelName,
      isLoaded: pointActions.length > 0 || curveActions.length > 0,
      connections,
      curveMembers,
      surfaceMembers,
      loadGroups,
      pointActions,
      curveActions,
    };
  }
}
