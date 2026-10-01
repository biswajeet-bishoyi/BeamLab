/**
 * SafImporter.ts
 *
 * Structural Analysis Format (SAF v2.x) Importer.
 * Parses SAF workbook records into a structured SafModel and translates SafModel
 * back into an IfcStructuralAnalysisModel.
 */

import {
  SafModel,
  SafProjectInfo,
  SafMaterial,
  SafCrossSection,
  SafPointConnection,
  SafCurveMember,
  SafSurfaceMember,
  SafLoadCase,
  SafPointLoad,
  SafCurveLoad,
  SafLoadCombination,
  SafSupportType,
} from './SafSchema';
import { SafWorkbook, SafTableRecord } from './SafExporter';
import {
  IfcStructuralAnalysisModel,
  IfcStructuralPointConnection,
  IfcStructuralCurveMember,
  IfcStructuralSurfaceMember,
  IfcStructuralLoadGroup,
  IfcStructuralPointAction,
  IfcStructuralCurveAction,
  BoundaryStiffness,
} from '../ifc/IfcStructuralSchema';

export class SafImporter {
  private parseSupportVal(val: any): SafSupportType {
    if (!val) return 'Free';
    const s = String(val).trim();
    if (s.toLowerCase() === 'rigid' || s === '-1') return 'Rigid';
    if (s.toLowerCase() === 'free' || s === '0') return 'Free';
    const num = parseFloat(s);
    return isNaN(num) ? 'Free' : num;
  }

  /**
   * Imports a SafModel from a standard SAF workbook table collection.
   */
  importFromWorkbook(workbook: SafWorkbook): SafModel {
    // 1. Project
    const projSheet = workbook['Project'];
    const projRow = projSheet?.rows[0] || [];
    const project: SafProjectInfo = {
      modelName: String(projRow[0] || 'Imported SAF Model'),
      description: String(projRow[1] || ''),
      author: String(projRow[2] || ''),
      dateCreated: String(projRow[3] || new Date().toISOString()),
      units: {
        length: (projRow[4] as any) || 'm',
        force: (projRow[5] as any) || 'kN',
        moment: (projRow[6] as any) || 'kNm',
        angle: 'rad',
        mass: 'kg',
      },
    };

    // 2. Materials
    const matSheet = workbook['StructuralMaterial'];
    const materials: SafMaterial[] = (matSheet?.rows || []).map(r => ({
      name: String(r[0]),
      materialType: (r[1] as any) || 'Steel',
      E_GPa: parseFloat(String(r[2])) || 210,
      G_GPa: r[3] ? parseFloat(String(r[3])) : undefined,
      nu: parseFloat(String(r[4])) || 0.3,
      density_kg_m3: parseFloat(String(r[5])) || 7850,
      yieldStrength_MPa: r[6] ? parseFloat(String(r[6])) : undefined,
    }));

    // 3. Cross-Sections
    const csSheet = workbook['StructuralCrossSection'];
    const crossSections: SafCrossSection[] = (csSheet?.rows || []).map(r => ({
      name: String(r[0]),
      materialName: String(r[1]),
      form: (r[2] as any) || 'Standard',
      profileName: r[3] ? String(r[3]) : undefined,
      shapeType: (r[4] as any) || 'Standard',
      height_m: r[5] ? parseFloat(String(r[5])) : undefined,
      width_m: r[6] ? parseFloat(String(r[6])) : undefined,
      area_m2: r[7] ? parseFloat(String(r[7])) : undefined,
      Iy_m4: r[8] ? parseFloat(String(r[8])) : undefined,
      Iz_m4: r[9] ? parseFloat(String(r[9])) : undefined,
    }));

    // 4. Nodes
    const nodeSheet = workbook['StructuralPointConnection'];
    const nodes: SafPointConnection[] = (nodeSheet?.rows || []).map(r => {
      const ux = this.parseSupportVal(r[4]);
      const uy = this.parseSupportVal(r[5]);
      const uz = this.parseSupportVal(r[6]);
      const rx = this.parseSupportVal(r[7]);
      const ry = this.parseSupportVal(r[8]);
      const rz = this.parseSupportVal(r[9]);

      const isSupported = [ux, uy, uz, rx, ry, rz].some(v => v !== 'Free');

      return {
        name: String(r[0]),
        x_m: parseFloat(String(r[1])) || 0,
        y_m: parseFloat(String(r[2])) || 0,
        z_m: parseFloat(String(r[3])) || 0,
        support: isSupported ? { Ux: ux, Uy: uy, Uz: uz, Rx: rx, Ry: ry, Rz: rz } : undefined,
      };
    });

    // 5. Members
    const memSheet = workbook['StructuralCurveMember'];
    const members: SafCurveMember[] = (memSheet?.rows || []).map(r => ({
      name: String(r[0]),
      memberType: (r[1] as any) || 'Beam',
      crossSectionName: String(r[2]),
      startNodeName: String(r[3]),
      endNodeName: String(r[4]),
      rotationAngle_deg: r[5] ? parseFloat(String(r[5])) : 0,
      startRelease: {
        Rx: Boolean(r[6]),
        Ry: Boolean(r[7]),
        Rz: Boolean(r[8]),
      },
      endRelease: {
        Rx: Boolean(r[9]),
        Ry: Boolean(r[10]),
        Rz: Boolean(r[11]),
      },
    }));

    // 6. Surfaces
    const surfSheet = workbook['StructuralSurfaceMember'];
    const surfaces: SafSurfaceMember[] = (surfSheet?.rows || []).map(r => ({
      name: String(r[0]),
      surfaceType: (r[1] as any) || 'Plate',
      thickness_m: parseFloat(String(r[2])) || 0.2,
      materialName: String(r[3]),
      boundaryNodeNames: r[4] ? String(r[4]).split(';').map(s => s.trim()) : [],
    }));

    // 7. Load Cases
    const lcSheet = workbook['StructuralLoadCase'];
    const loadCases: SafLoadCase[] = (lcSheet?.rows || []).map(r => ({
      name: String(r[0]),
      actionType: (r[1] as any) || 'Permanent',
      description: r[2] ? String(r[2]) : undefined,
      selfWeightFactor: r[3] ? parseFloat(String(r[3])) : 1.0,
    }));

    // 8. Point Loads
    const plSheet = workbook['StructuralPointAction'];
    const pointLoads: SafPointLoad[] = (plSheet?.rows || []).map(r => ({
      name: String(r[0]),
      nodeName: String(r[1]),
      loadCaseName: String(r[2]),
      Fx_kN: parseFloat(String(r[3])) || 0,
      Fy_kN: parseFloat(String(r[4])) || 0,
      Fz_kN: parseFloat(String(r[5])) || 0,
      Mx_kNm: parseFloat(String(r[6])) || 0,
      My_kNm: parseFloat(String(r[7])) || 0,
      Mz_kNm: parseFloat(String(r[8])) || 0,
    }));

    // 9. Curve Loads
    const clSheet = workbook['StructuralCurveAction'];
    const curveLoads: SafCurveLoad[] = (clSheet?.rows || []).map(r => ({
      name: String(r[0]),
      memberName: String(r[1]),
      loadCaseName: String(r[2]),
      coordinateSystem: (r[3] as any) || 'Global',
      isUniform: Boolean(r[4]),
      qx_kN_m: parseFloat(String(r[5])) || 0,
      qy_kN_m: parseFloat(String(r[6])) || 0,
      qz_kN_m: parseFloat(String(r[7])) || 0,
      qx_end_kN_m: r[8] ? parseFloat(String(r[8])) : undefined,
      qy_end_kN_m: r[9] ? parseFloat(String(r[9])) : undefined,
      qz_end_kN_m: r[10] ? parseFloat(String(r[10])) : undefined,
    }));

    return {
      project,
      materials,
      crossSections,
      nodes,
      members,
      surfaces,
      loadCases,
      pointLoads,
      curveLoads,
      combinations: [],
    };
  }

  /**
   * Converts a SafModel into an IfcStructuralAnalysisModel.
   */
  toIfcModel(saf: SafModel): IfcStructuralAnalysisModel {
    const toStiffness = (st: SafSupportType): BoundaryStiffness => {
      if (st === 'Rigid') return 'FIXED';
      if (st === 'Free') return 'FREE';
      return typeof st === 'number' ? st : 'FREE';
    };

    // Connections
    const connections: IfcStructuralPointConnection[] = saf.nodes.map(n => ({
      globalId: n.name,
      name: n.name,
      location: { coordinates: [n.x_m, n.y_m, n.z_m] },
      condition: n.support
        ? {
            name: `${n.name}_Support`,
            translationalStiffnessX: toStiffness(n.support.Ux),
            translationalStiffnessY: toStiffness(n.support.Uy),
            translationalStiffnessZ: toStiffness(n.support.Uz),
            rotationalStiffnessX: toStiffness(n.support.Rx),
            rotationalStiffnessY: toStiffness(n.support.Ry),
            rotationalStiffnessZ: toStiffness(n.support.Rz),
          }
        : undefined,
    }));

    // Cross-section lookup
    const secMap = new Map<string, SafCrossSection>();
    for (const cs of saf.crossSections) {
      secMap.set(cs.name, cs);
    }

    // Curve members
    const curveMembers: IfcStructuralCurveMember[] = saf.members.map(m => {
      const sec = secMap.get(m.crossSectionName);
      return {
        globalId: m.name,
        name: m.name,
        predefinedType: m.memberType === 'Truss' ? 'PIN_JOINED_MEMBER' : 'RIGID_JOINED_MEMBER',
        startConnectionId: m.startNodeName,
        endConnectionId: m.endNodeName,
        profileName: sec?.profileName || m.crossSectionName,
        startRelease: m.startRelease
          ? {
              rx: m.startRelease.Rx,
              ry: m.startRelease.Ry,
              rz: m.startRelease.Rz,
            }
          : undefined,
        endRelease: m.endRelease
          ? {
              rx: m.endRelease.Rx,
              ry: m.endRelease.Ry,
              rz: m.endRelease.Rz,
            }
          : undefined,
      };
    });

    // Surface members
    const surfaceMembers: IfcStructuralSurfaceMember[] = saf.surfaces.map(s => ({
      globalId: s.name,
      name: s.name,
      predefinedType: s.surfaceType === 'Shell' ? 'SHELL' : 'BENDING_ELEMENT',
      thickness_m: s.thickness_m,
      boundaryConnectionIds: s.boundaryNodeNames,
      materialName: s.materialName,
    }));

    // Load groups
    const loadGroups: IfcStructuralLoadGroup[] = saf.loadCases.map(lc => {
      let actionType: any = 'PERMANENT_G';
      if (lc.actionType === 'Variable') actionType = 'VARIABLE_Q';
      else if (lc.actionType === 'Wind') actionType = 'WIND';
      else if (lc.actionType === 'Seismic') actionType = 'SEISMIC';

      return {
        globalId: lc.name,
        name: lc.name,
        actionType,
        predefinedType: 'LOAD_CASE',
        coefficient: 1.0,
      };
    });

    // Point actions
    const pointActions: IfcStructuralPointAction[] = saf.pointLoads.map(pl => ({
      globalId: pl.name,
      name: pl.name,
      connectionGlobalId: pl.nodeName,
      loadGroupGlobalId: pl.loadCaseName,
      forces_kN: [pl.Fx_kN, pl.Fy_kN, pl.Fz_kN],
      moments_kNm: [pl.Mx_kNm, pl.My_kNm, pl.Mz_kNm],
    }));

    // Curve actions
    const curveActions: IfcStructuralCurveAction[] = saf.curveLoads.map(cl => ({
      globalId: cl.name,
      name: cl.name,
      memberGlobalId: cl.memberName,
      loadGroupGlobalId: cl.loadCaseName,
      distributionType: cl.isUniform ? 'UNIFORM' : 'LINEAR',
      startForce_kN_m: [cl.qx_kN_m, cl.qy_kN_m, cl.qz_kN_m],
      endForce_kN_m: [
        cl.qx_end_kN_m ?? cl.qx_kN_m,
        cl.qy_end_kN_m ?? cl.qy_kN_m,
        cl.qz_end_kN_m ?? cl.qz_kN_m,
      ],
    }));

    return {
      globalId: saf.project.modelName.replace(/\s+/g, '_'),
      name: saf.project.modelName,
      description: saf.project.description,
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
