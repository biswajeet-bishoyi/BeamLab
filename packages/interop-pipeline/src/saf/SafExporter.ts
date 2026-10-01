/**
 * SafExporter.ts
 *
 * Structural Analysis Format (SAF v2.x) Exporter.
 * Converts internal structural models or IFC4 models into SAF standardized tables
 * compatible with MS Excel (.xlsx) workbooks and JSON representations.
 */

import {
  SafModel,
  SafSupportType,
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
} from './SafSchema';
import {
  IfcStructuralAnalysisModel,
  BoundaryStiffness,
} from '../ifc/IfcStructuralSchema';

export interface SafTableRecord {
  readonly headers: string[];
  readonly rows: (string | number | boolean)[][];
}

export type SafWorkbook = Record<string, SafTableRecord>;

export class SafExporter {
  private formatSupport(val: SafSupportType): string {
    if (val === 'Rigid') return 'Rigid';
    if (val === 'Free') return 'Free';
    return typeof val === 'number' ? val.toString() : 'Rigid';
  }

  /**
   * Converts a SafModel into a structured workbook containing standard SAF sheets.
   */
  exportToWorkbook(model: SafModel): SafWorkbook {
    const workbook: SafWorkbook = {};

    // 1. Project Sheet
    workbook['Project'] = {
      headers: ['Model Name', 'Description', 'Author', 'Created', 'Length Unit', 'Force Unit', 'Moment Unit'],
      rows: [
        [
          model.project.modelName,
          model.project.description || '',
          model.project.author || 'BeamLab User',
          model.project.dateCreated || new Date().toISOString(),
          model.project.units.length,
          model.project.units.force,
          model.project.units.moment,
        ],
      ],
    };

    // 2. StructuralMaterial Sheet
    workbook['StructuralMaterial'] = {
      headers: ['Name', 'Material Type', 'E [GPa]', 'G [GPa]', 'Poisson [-]', 'Density [kg/m3]', 'Yield [MPa]'],
      rows: model.materials.map(m => [
        m.name,
        m.materialType,
        m.E_GPa,
        m.G_GPa ?? Number((m.E_GPa / (2 * (1 + m.nu))).toFixed(2)),
        m.nu,
        m.density_kg_m3,
        m.yieldStrength_MPa ?? '',
      ]),
    };

    // 3. StructuralCrossSection Sheet
    workbook['StructuralCrossSection'] = {
      headers: ['Name', 'Material', 'Form', 'Profile Name', 'Shape', 'Height [m]', 'Width [m]', 'Area [m2]', 'Iy [m4]', 'Iz [m4]'],
      rows: model.crossSections.map(cs => [
        cs.name,
        cs.materialName,
        cs.form,
        cs.profileName || '',
        cs.shapeType || 'Standard',
        cs.height_m ?? '',
        cs.width_m ?? '',
        cs.area_m2 ?? '',
        cs.Iy_m4 ?? '',
        cs.Iz_m4 ?? '',
      ]),
    };

    // 4. StructuralPointConnection Sheet
    workbook['StructuralPointConnection'] = {
      headers: ['Name', 'Coordinate X [m]', 'Coordinate Y [m]', 'Coordinate Z [m]', 'Ux', 'Uy', 'Uz', 'Rx', 'Ry', 'Rz'],
      rows: model.nodes.map(n => [
        n.name,
        n.x_m,
        n.y_m,
        n.z_m,
        n.support ? this.formatSupport(n.support.Ux) : 'Free',
        n.support ? this.formatSupport(n.support.Uy) : 'Free',
        n.support ? this.formatSupport(n.support.Uz) : 'Free',
        n.support ? this.formatSupport(n.support.Rx) : 'Free',
        n.support ? this.formatSupport(n.support.Ry) : 'Free',
        n.support ? this.formatSupport(n.support.Rz) : 'Free',
      ]),
    };

    // 5. StructuralCurveMember Sheet
    workbook['StructuralCurveMember'] = {
      headers: ['Name', 'Type', 'CrossSection', 'Node Start', 'Node End', 'Rotation [deg]', 'Start Rx', 'Start Ry', 'Start Rz', 'End Rx', 'End Ry', 'End Rz'],
      rows: model.members.map(m => [
        m.name,
        m.memberType,
        m.crossSectionName,
        m.startNodeName,
        m.endNodeName,
        m.rotationAngle_deg ?? 0,
        m.startRelease?.Rx ?? false,
        m.startRelease?.Ry ?? false,
        m.startRelease?.Rz ?? false,
        m.endRelease?.Rx ?? false,
        m.endRelease?.Ry ?? false,
        m.endRelease?.Rz ?? false,
      ]),
    };

    // 6. StructuralSurfaceMember Sheet
    workbook['StructuralSurfaceMember'] = {
      headers: ['Name', 'Type', 'Thickness [m]', 'Material', 'Boundary Nodes'],
      rows: model.surfaces.map(s => [
        s.name,
        s.surfaceType,
        s.thickness_m,
        s.materialName,
        s.boundaryNodeNames.join(';'),
      ]),
    };

    // 7. StructuralLoadCase Sheet
    workbook['StructuralLoadCase'] = {
      headers: ['Name', 'Action Type', 'Description', 'Self-Weight Factor'],
      rows: model.loadCases.map(lc => [
        lc.name,
        lc.actionType,
        lc.description || '',
        lc.selfWeightFactor ?? 1.0,
      ]),
    };

    // 8. StructuralPointAction Sheet
    workbook['StructuralPointAction'] = {
      headers: ['Name', 'Node', 'Load Case', 'Fx [kN]', 'Fy [kN]', 'Fz [kN]', 'Mx [kNm]', 'My [kNm]', 'Mz [kNm]'],
      rows: model.pointLoads.map(pl => [
        pl.name,
        pl.nodeName,
        pl.loadCaseName,
        pl.Fx_kN,
        pl.Fy_kN,
        pl.Fz_kN,
        pl.Mx_kNm,
        pl.My_kNm,
        pl.Mz_kNm,
      ]),
    };

    // 9. StructuralCurveAction Sheet
    workbook['StructuralCurveAction'] = {
      headers: ['Name', 'Member', 'Load Case', 'CS', 'Is Uniform', 'qx [kN/m]', 'qy [kN/m]', 'qz [kN/m]', 'qx_end [kN/m]', 'qy_end [kN/m]', 'qz_end [kN/m]'],
      rows: model.curveLoads.map(cl => [
        cl.name,
        cl.memberName,
        cl.loadCaseName,
        cl.coordinateSystem,
        cl.isUniform,
        cl.qx_kN_m,
        cl.qy_kN_m,
        cl.qz_kN_m,
        cl.qx_end_kN_m ?? cl.qx_kN_m,
        cl.qy_end_kN_m ?? cl.qy_kN_m,
        cl.qz_end_kN_m ?? cl.qz_kN_m,
      ]),
    };

    // 10. StructuralLoadCombination Sheet
    workbook['StructuralLoadCombination'] = {
      headers: ['Name', 'Type', 'Composition'],
      rows: model.combinations.map(cmb => [
        cmb.name,
        cmb.combinationType,
        Object.entries(cmb.loadCaseFactors)
          .map(([lc, factor]) => `${factor}*${lc}`)
          .join(' + '),
      ]),
    };

    return workbook;
  }

  /**
   * Converts an IFC4 Structural Analysis Model into a standard SafModel.
   */
  fromIfcModel(ifcModel: IfcStructuralAnalysisModel): SafModel {
    const mapStiffness = (stiff: BoundaryStiffness): SafSupportType => {
      if (stiff === 'FIXED') return 'Rigid';
      if (stiff === 'FREE') return 'Free';
      return typeof stiff === 'number' ? stiff : 'Rigid';
    };

    // Nodes
    const nodes: SafPointConnection[] = ifcModel.connections.map(c => {
      const [x, y, z] = c.location.coordinates;
      return {
        name: c.globalId || c.name,
        x_m: x,
        y_m: y,
        z_m: z,
        support: c.condition
          ? {
              Ux: mapStiffness(c.condition.translationalStiffnessX),
              Uy: mapStiffness(c.condition.translationalStiffnessY),
              Uz: mapStiffness(c.condition.translationalStiffnessZ),
              Rx: mapStiffness(c.condition.rotationalStiffnessX),
              Ry: mapStiffness(c.condition.rotationalStiffnessY),
              Rz: mapStiffness(c.condition.rotationalStiffnessZ),
            }
          : undefined,
      };
    });

    // Materials and Cross-Sections discovered from members
    const materialsMap = new Map<string, SafMaterial>();
    const crossSectionsMap = new Map<string, SafCrossSection>();

    const defaultMaterial: SafMaterial = {
      name: 'Steel_S355',
      materialType: 'Steel',
      E_GPa: 210,
      nu: 0.3,
      density_kg_m3: 7850,
      yieldStrength_MPa: 355,
    };
    materialsMap.set(defaultMaterial.name, defaultMaterial);

    // Members
    const members: SafCurveMember[] = ifcModel.curveMembers.map(m => {
      const matName = m.materialName || defaultMaterial.name;
      if (!materialsMap.has(matName)) {
        materialsMap.set(matName, {
          name: matName,
          materialType: matName.toLowerCase().includes('conc') ? 'Concrete' : 'Steel',
          E_GPa: matName.toLowerCase().includes('conc') ? 33 : 210,
          nu: matName.toLowerCase().includes('conc') ? 0.2 : 0.3,
          density_kg_m3: matName.toLowerCase().includes('conc') ? 2450 : 7850,
        });
      }

      const secName = m.profileName || `SEC_${m.name}`;
      if (!crossSectionsMap.has(secName)) {
        crossSectionsMap.set(secName, {
          name: secName,
          materialName: matName,
          form: 'Standard',
          profileName: m.profileName,
        });
      }

      return {
        name: m.globalId || m.name,
        memberType: m.predefinedType === 'PIN_JOINED_MEMBER' ? 'Truss' : 'Beam',
        crossSectionName: secName,
        startNodeName: m.startConnectionId,
        endNodeName: m.endConnectionId,
        startRelease: m.startRelease
          ? {
              Rx: m.startRelease.rx,
              Ry: m.startRelease.ry,
              Rz: m.startRelease.rz,
            }
          : undefined,
        endRelease: m.endRelease
          ? {
              Rx: m.endRelease.rx,
              Ry: m.endRelease.ry,
              Rz: m.endRelease.rz,
            }
          : undefined,
      };
    });

    // Surfaces
    const surfaces: SafSurfaceMember[] = (ifcModel.surfaceMembers || []).map(s => ({
      name: s.globalId || s.name,
      surfaceType: s.predefinedType === 'SHELL' ? 'Shell' : 'Plate',
      thickness_m: s.thickness_m,
      materialName: s.materialName || defaultMaterial.name,
      boundaryNodeNames: s.boundaryConnectionIds,
    }));

    // Load cases
    const loadCases: SafLoadCase[] = ifcModel.loadGroups.map(lg => {
      let actType: 'Permanent' | 'Variable' | 'Wind' | 'Seismic' = 'Permanent';
      if (lg.actionType === 'VARIABLE_Q') actType = 'Variable';
      else if (lg.actionType === 'WIND') actType = 'Wind';
      else if (lg.actionType === 'SEISMIC') actType = 'Seismic';

      return {
        name: lg.globalId || lg.name,
        actionType: actType,
        description: lg.name,
      };
    });

    // Point Loads
    const pointLoads: SafPointLoad[] = ifcModel.pointActions.map(pa => ({
      name: pa.globalId || pa.name,
      nodeName: pa.connectionGlobalId,
      loadCaseName: pa.loadGroupGlobalId,
      Fx_kN: pa.forces_kN[0],
      Fy_kN: pa.forces_kN[1],
      Fz_kN: pa.forces_kN[2],
      Mx_kNm: pa.moments_kNm[0],
      My_kNm: pa.moments_kNm[1],
      Mz_kNm: pa.moments_kNm[2],
    }));

    // Curve Loads
    const curveLoads: SafCurveLoad[] = ifcModel.curveActions.map(ca => ({
      name: ca.globalId || ca.name,
      memberName: ca.memberGlobalId,
      loadCaseName: ca.loadGroupGlobalId,
      coordinateSystem: 'Global',
      isUniform: ca.distributionType === 'UNIFORM',
      qx_kN_m: ca.startForce_kN_m[0],
      qy_kN_m: ca.startForce_kN_m[1],
      qz_kN_m: ca.startForce_kN_m[2],
      qx_end_kN_m: ca.endForce_kN_m ? ca.endForce_kN_m[0] : ca.startForce_kN_m[0],
      qy_end_kN_m: ca.endForce_kN_m ? ca.endForce_kN_m[1] : ca.startForce_kN_m[1],
      qz_end_kN_m: ca.endForce_kN_m ? ca.endForce_kN_m[2] : ca.startForce_kN_m[2],
    }));

    return {
      project: {
        modelName: ifcModel.name,
        description: ifcModel.description,
        units: {
          length: 'm',
          force: 'kN',
          moment: 'kNm',
          angle: 'rad',
          mass: 'kg',
        },
      },
      materials: Array.from(materialsMap.values()),
      crossSections: Array.from(crossSectionsMap.values()),
      nodes,
      members,
      surfaces,
      loadCases,
      pointLoads,
      curveLoads,
      combinations: [],
    };
  }
}
