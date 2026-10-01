/**
 * SafPipeline.test.ts
 *
 * Unit tests for SAF (Structural Analysis Format) Bi-Directional Exchange Engine:
 * - SAF workbook export & sheet schema validation
 * - SAF workbook import & entity reconstruction
 * - Bi-directional conversion between buildingSMART IFC4 and SAF
 */

import { describe, it, expect } from 'vitest';
import { SafModel } from './SafSchema';
import { SafExporter } from './SafExporter';
import { SafImporter } from './SafImporter';
import { IfcStructuralAnalysisModel } from '../ifc/IfcStructuralSchema';

describe('SAF (Structural Analysis Format) Exchange Engine', () => {
  const sampleSafModel: SafModel = {
    project: {
      modelName: 'Multi-Storey Steel Frame',
      description: '3D 2-Bay 2-Story Frame',
      author: 'Lead Structural Engineer',
      units: {
        length: 'm',
        force: 'kN',
        moment: 'kNm',
        angle: 'rad',
        mass: 'kg',
      },
    },
    materials: [
      {
        name: 'S355',
        materialType: 'Steel',
        E_GPa: 210,
        G_GPa: 80.77,
        nu: 0.3,
        density_kg_m3: 7850,
        yieldStrength_MPa: 355,
      },
      {
        name: 'C30_37',
        materialType: 'Concrete',
        E_GPa: 33,
        nu: 0.2,
        density_kg_m3: 2500,
        yieldStrength_MPa: 30,
      },
    ],
    crossSections: [
      {
        name: 'HEB300',
        materialName: 'S355',
        form: 'Standard',
        profileName: 'HEB300',
        height_m: 0.30,
        width_m: 0.30,
        area_m2: 0.0149,
      },
      {
        name: 'IPE400',
        materialName: 'S355',
        form: 'Standard',
        profileName: 'IPE400',
        height_m: 0.40,
        width_m: 0.18,
        area_m2: 0.00845,
      },
    ],
    nodes: [
      {
        name: 'N1',
        x_m: 0,
        y_m: 0,
        z_m: 0,
        support: {
          Ux: 'Rigid',
          Uy: 'Rigid',
          Uz: 'Rigid',
          Rx: 'Rigid',
          Ry: 'Rigid',
          Rz: 'Rigid',
        },
      },
      {
        name: 'N2',
        x_m: 6.0,
        y_m: 0,
        z_m: 0,
        support: {
          Ux: 'Rigid',
          Uy: 'Rigid',
          Uz: 'Rigid',
          Rx: 'Free',
          Ry: 'Free',
          Rz: 'Free',
        },
      },
      {
        name: 'N3',
        x_m: 0,
        y_m: 0,
        z_m: 3.5,
      },
      {
        name: 'N4',
        x_m: 6.0,
        y_m: 0,
        z_m: 3.5,
      },
    ],
    members: [
      {
        name: 'COL_1',
        memberType: 'Column',
        crossSectionName: 'HEB300',
        startNodeName: 'N1',
        endNodeName: 'N3',
      },
      {
        name: 'COL_2',
        memberType: 'Column',
        crossSectionName: 'HEB300',
        startNodeName: 'N2',
        endNodeName: 'N4',
      },
      {
        name: 'BEAM_1',
        memberType: 'Beam',
        crossSectionName: 'IPE400',
        startNodeName: 'N3',
        endNodeName: 'N4',
        startRelease: { Rx: false, Ry: true, Rz: true },
        endRelease: { Rx: false, Ry: true, Rz: true },
      },
    ],
    surfaces: [
      {
        name: 'FLOOR_1',
        surfaceType: 'Slab',
        thickness_m: 0.20,
        materialName: 'C30_37',
        boundaryNodeNames: ['N1', 'N2', 'N4', 'N3'],
      },
    ],
    loadCases: [
      {
        name: 'LC_G',
        actionType: 'Permanent',
        description: 'Dead Load Self Weight',
        selfWeightFactor: 1.0,
      },
      {
        name: 'LC_Q',
        actionType: 'Variable',
        description: 'Occupancy Live Load',
        selfWeightFactor: 0.0,
      },
    ],
    pointLoads: [
      {
        name: 'PL_N3',
        nodeName: 'N3',
        loadCaseName: 'LC_Q',
        Fx_kN: 15.0,
        Fy_kN: 0,
        Fz_kN: -50.0,
        Mx_kNm: 0,
        My_kNm: 0,
        Mz_kNm: 0,
      },
    ],
    curveLoads: [
      {
        name: 'CL_BEAM1',
        memberName: 'BEAM_1',
        loadCaseName: 'LC_G',
        coordinateSystem: 'Global',
        isUniform: true,
        qx_kN_m: 0,
        qy_kN_m: 0,
        qz_kN_m: -24.5,
      },
    ],
    combinations: [
      {
        name: 'COMB_ULS_1',
        combinationType: 'Ultimate',
        loadCaseFactors: { LC_G: 1.35, LC_Q: 1.5 },
      },
    ],
  };

  it('exports SafModel into valid SAF tabular workbook structure', () => {
    const exporter = new SafExporter();
    const workbook = exporter.exportToWorkbook(sampleSafModel);

    expect(workbook['Project']).toBeDefined();
    expect(workbook['StructuralMaterial']).toBeDefined();
    expect(workbook['StructuralCrossSection']).toBeDefined();
    expect(workbook['StructuralPointConnection']).toBeDefined();
    expect(workbook['StructuralCurveMember']).toBeDefined();
    expect(workbook['StructuralSurfaceMember']).toBeDefined();
    expect(workbook['StructuralLoadCase']).toBeDefined();
    expect(workbook['StructuralPointAction']).toBeDefined();
    expect(workbook['StructuralCurveAction']).toBeDefined();
    expect(workbook['StructuralLoadCombination']).toBeDefined();

    // Verify row counts
    expect(workbook['StructuralPointConnection']?.rows).toHaveLength(4);
    expect(workbook['StructuralCurveMember']?.rows).toHaveLength(3);
    expect(workbook['StructuralSurfaceMember']?.rows).toHaveLength(1);
    expect(workbook['StructuralLoadCase']?.rows).toHaveLength(2);
    expect(workbook['StructuralPointAction']?.rows).toHaveLength(1);
    expect(workbook['StructuralCurveAction']?.rows).toHaveLength(1);
  });

  it('imports SAF workbook back into SafModel with zero fidelity loss', () => {
    const exporter = new SafExporter();
    const workbook = exporter.exportToWorkbook(sampleSafModel);

    const importer = new SafImporter();
    const importedModel = importer.importFromWorkbook(workbook);

    expect(importedModel.project.modelName).toBe('Multi-Storey Steel Frame');
    expect(importedModel.nodes).toHaveLength(4);
    expect(importedModel.members).toHaveLength(3);
    expect(importedModel.surfaces).toHaveLength(1);
    expect(importedModel.loadCases).toHaveLength(2);
    expect(importedModel.pointLoads).toHaveLength(1);
    expect(importedModel.curveLoads).toHaveLength(1);

    // Verify node support translation
    const n1 = importedModel.nodes.find(n => n.name === 'N1');
    expect(n1?.support?.Ux).toBe('Rigid');
    expect(n1?.support?.Rx).toBe('Rigid');

    const n2 = importedModel.nodes.find(n => n.name === 'N2');
    expect(n2?.support?.Ux).toBe('Rigid');
    expect(n2?.support?.Rx).toBe('Free');

    // Verify member releases
    const beam = importedModel.members.find(m => m.name === 'BEAM_1');
    expect(beam?.startRelease?.Ry).toBe(true);
    expect(beam?.startRelease?.Rx).toBe(false);

    // Verify load values
    const pl = importedModel.pointLoads.find(p => p.name === 'PL_N3');
    expect(pl?.Fx_kN).toBeCloseTo(15.0, 3);
    expect(pl?.Fz_kN).toBeCloseTo(-50.0, 3);

    const cl = importedModel.curveLoads.find(c => c.name === 'CL_BEAM1');
    expect(cl?.qz_kN_m).toBeCloseTo(-24.5, 3);
  });

  it('bridges IFC4 Structural Analysis Model into SAF format', () => {
    const ifcModel: IfcStructuralAnalysisModel = {
      globalId: 'IFC_FRAME_MODEL',
      name: 'IFC Frame for SAF Export',
      isLoaded: true,
      connections: [
        {
          globalId: 'CN_1',
          name: 'Col Base',
          location: { coordinates: [0, 0, 0] },
          condition: {
            translationalStiffnessX: 'FIXED',
            translationalStiffnessY: 'FIXED',
            translationalStiffnessZ: 'FIXED',
            rotationalStiffnessX: 'FIXED',
            rotationalStiffnessY: 'FIXED',
            rotationalStiffnessZ: 'FIXED',
          },
        },
        {
          globalId: 'CN_2',
          name: 'Col Top',
          location: { coordinates: [0, 0, 3.2] },
        },
      ],
      curveMembers: [
        {
          globalId: 'MB_1',
          name: 'Column A',
          predefinedType: 'RIGID_JOINED_MEMBER',
          startConnectionId: 'CN_1',
          endConnectionId: 'CN_2',
          profileName: 'HEB260',
          materialName: 'S355',
        },
      ],
      surfaceMembers: [],
      loadGroups: [
        {
          globalId: 'LG_1',
          name: 'Wind Load',
          actionType: 'WIND',
          predefinedType: 'LOAD_CASE',
        },
      ],
      pointActions: [
        {
          globalId: 'PA_1',
          name: 'Top Lateral Load',
          connectionGlobalId: 'CN_2',
          loadGroupGlobalId: 'LG_1',
          forces_kN: [12.5, 0, 0],
          moments_kNm: [0, 0, 0],
        },
      ],
      curveActions: [],
    };

    const exporter = new SafExporter();
    const safModel = exporter.fromIfcModel(ifcModel);

    expect(safModel.project.modelName).toBe('IFC Frame for SAF Export');
    expect(safModel.nodes).toHaveLength(2);
    expect(safModel.nodes[0]?.support?.Ux).toBe('Rigid');
    expect(safModel.members).toHaveLength(1);
    expect(safModel.members[0]?.crossSectionName).toBe('HEB260');
    expect(safModel.loadCases).toHaveLength(1);
    expect(safModel.loadCases[0]?.actionType).toBe('Wind');
    expect(safModel.pointLoads).toHaveLength(1);
    expect(safModel.pointLoads[0]?.Fx_kN).toBeCloseTo(12.5, 2);

    // Convert back to IFC4 model via SafImporter
    const importer = new SafImporter();
    const roundTripIfc = importer.toIfcModel(safModel);

    expect(roundTripIfc.name).toBe('IFC Frame for SAF Export');
    expect(roundTripIfc.connections).toHaveLength(2);
    expect(roundTripIfc.connections[0]?.condition?.translationalStiffnessX).toBe('FIXED');
    expect(roundTripIfc.curveMembers).toHaveLength(1);
    expect(roundTripIfc.curveMembers[0]?.profileName).toBe('HEB260');
    expect(roundTripIfc.pointActions[0]?.forces_kN[0]).toBeCloseTo(12.5, 2);
  });
});
