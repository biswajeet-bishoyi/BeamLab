/**
 * IfcPipeline.test.ts
 *
 * Unit tests for buildingSMART IFC4 Structural Analysis Domain:
 * - Schema validation
 * - STEP ISO 10303-21 serialization
 * - STEP physical file parsing
 * - Round-trip serialization/parsing fidelity
 */

import { describe, it, expect } from 'vitest';
import {
  IfcStructuralAnalysisModel,
  IfcStructuralPointConnection,
  IfcStructuralCurveMember,
  IfcStructuralSurfaceMember,
  IfcStructuralLoadGroup,
  IfcStructuralPointAction,
  IfcStructuralCurveAction,
} from './IfcStructuralSchema';
import { StepSerializer } from './StepSerializer';
import { StepParser } from './StepParser';

describe('IFC4 Structural Analysis Domain Pipeline', () => {
  const sampleModel: IfcStructuralAnalysisModel = {
    globalId: 'MODEL_PORTAL_FRAME_01',
    name: 'Portal Frame Analysis Model',
    description: '2D Portal Frame under Gravity and Wind Loads',
    isLoaded: true,
    connections: [
      {
        globalId: 'NODE_001',
        name: 'Base Column Left',
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
        globalId: 'NODE_002',
        name: 'Top Column Left',
        location: { coordinates: [0, 0, 4.0] },
      },
      {
        globalId: 'NODE_003',
        name: 'Top Column Right',
        location: { coordinates: [6.0, 0, 4.0] },
      },
      {
        globalId: 'NODE_004',
        name: 'Base Column Right',
        location: { coordinates: [6.0, 0, 0] },
        condition: {
          translationalStiffnessX: 'FIXED',
          translationalStiffnessY: 'FIXED',
          translationalStiffnessZ: 'FIXED',
          rotationalStiffnessX: 'FREE',
          rotationalStiffnessY: 'FREE',
          rotationalStiffnessZ: 'FREE',
        },
      },
    ],
    curveMembers: [
      {
        globalId: 'MEM_COL_LEFT',
        name: 'Column Left',
        predefinedType: 'RIGID_JOINED_MEMBER',
        startConnectionId: 'NODE_001',
        endConnectionId: 'NODE_002',
        profileName: 'HEB240',
        materialName: 'S355',
      },
      {
        globalId: 'MEM_BEAM_01',
        name: 'Roof Beam',
        predefinedType: 'RIGID_JOINED_MEMBER',
        startConnectionId: 'NODE_002',
        endConnectionId: 'NODE_003',
        profileName: 'IPE360',
        materialName: 'S355',
      },
      {
        globalId: 'MEM_COL_RIGHT',
        name: 'Column Right',
        predefinedType: 'RIGID_JOINED_MEMBER',
        startConnectionId: 'NODE_004',
        endConnectionId: 'NODE_003',
        profileName: 'HEB240',
        materialName: 'S355',
      },
    ],
    surfaceMembers: [
      {
        globalId: 'SURF_WALL_01',
        name: 'Shear Wall Panel',
        predefinedType: 'SHELL',
        thickness_m: 0.20,
        boundaryConnectionIds: ['NODE_001', 'NODE_002', 'NODE_003', 'NODE_004'],
        materialName: 'C30/37',
      },
    ],
    loadGroups: [
      {
        globalId: 'LG_DEAD',
        name: 'Permanent Dead Load',
        actionType: 'PERMANENT_G',
        predefinedType: 'LOAD_CASE',
        coefficient: 1.35,
      },
      {
        globalId: 'LG_WIND',
        name: 'Lateral Wind Load',
        actionType: 'WIND',
        predefinedType: 'LOAD_CASE',
        coefficient: 1.5,
      },
    ],
    pointActions: [
      {
        globalId: 'ACT_P_001',
        name: 'Eaves Lateral Wind Load',
        connectionGlobalId: 'NODE_002',
        loadGroupGlobalId: 'LG_WIND',
        forces_kN: [25.0, 0, 0],
        moments_kNm: [0, 0, 0],
      },
    ],
    curveActions: [
      {
        globalId: 'ACT_C_001',
        name: 'Beam Uniform Dead Load',
        memberGlobalId: 'MEM_BEAM_01',
        loadGroupGlobalId: 'LG_DEAD',
        distributionType: 'UNIFORM',
        startForce_kN_m: [0, 0, -18.5],
      },
    ],
  };

  it('serializes model into valid ISO 10303-21 STEP physical format', () => {
    const serializer = new StepSerializer();
    const stepContent = serializer.serialize(sampleModel);

    expect(stepContent).toContain('ISO-10303-21;');
    expect(stepContent).toContain("FILE_SCHEMA(('IFC4'));");
    expect(stepContent).toContain('IFCSTRUCTURALANALYSISMODEL');
    expect(stepContent).toContain('IFCSTRUCTURALPOINTCONNECTION');
    expect(stepContent).toContain('IFCSTRUCTURALCURVEMEMBER');
    expect(stepContent).toContain('IFCSTRUCTURALSURFACEMEMBER');
    expect(stepContent).toContain('IFCBOUNDARYNODECONDITION');
    expect(stepContent).toContain('IFCSTRUCTURALLOADGROUP');
    expect(stepContent).toContain('IFCSTRUCTURALPOINTACTION');
    expect(stepContent).toContain('IFCSTRUCTURALCURVEACTION');
    expect(stepContent).toContain('END-ISO-10303-21;');
  });

  it('correctly handles boundary conditions in STEP export', () => {
    const serializer = new StepSerializer();
    const stepContent = serializer.serialize(sampleModel);

    // Verify FIXED boundary condition
    expect(stepContent).toMatch(/IFCBOUNDARYNODECONDITION\('Base Column Left',\.FIXED\.,\.FIXED\.,\.FIXED\.,\.FIXED\.,\.FIXED\.,\.FIXED\.\)/);
    // Verify FREE rotational boundary condition
    expect(stepContent).toMatch(/IFCBOUNDARYNODECONDITION\('Base Column Right',\.FIXED\.,\.FIXED\.,\.FIXED\.,\.FREE\.,\.FREE\.,\.FREE\.\)/);
  });

  it('parses STEP physical file back into an IfcStructuralAnalysisModel', () => {
    const serializer = new StepSerializer();
    const stepContent = serializer.serialize(sampleModel);

    const parser = new StepParser();
    const parsedModel = parser.parse(stepContent);

    expect(parsedModel.name).toBe('Portal Frame Analysis Model');
    expect(parsedModel.connections).toHaveLength(4);
    expect(parsedModel.curveMembers).toHaveLength(3);
    expect(parsedModel.surfaceMembers).toHaveLength(1);
    expect(parsedModel.loadGroups).toHaveLength(2);
    expect(parsedModel.pointActions).toHaveLength(1);
    expect(parsedModel.curveActions).toHaveLength(1);
  });

  it('retains structural connection coordinates and conditions on round-trip', () => {
    const serializer = new StepSerializer();
    const stepContent = serializer.serialize(sampleModel);

    const parser = new StepParser();
    const parsedModel = parser.parse(stepContent);

    const baseLeft = parsedModel.connections.find(c => c.globalId === 'NODE_001');
    expect(baseLeft).toBeDefined();
    expect(baseLeft?.location.coordinates).toEqual([0, 0, 0]);
    expect(baseLeft?.condition?.translationalStiffnessX).toBe('FIXED');
    expect(baseLeft?.condition?.translationalStiffnessZ).toBe('FIXED');

    const topColumn = parsedModel.connections.find(c => c.globalId === 'NODE_002');
    expect(topColumn).toBeDefined();
    expect(topColumn?.location.coordinates).toEqual([0, 0, 4.0]);

    const baseRight = parsedModel.connections.find(c => c.globalId === 'NODE_004');
    expect(baseRight?.condition?.rotationalStiffnessZ).toBe('FREE');
  });

  it('retains member profiles and connectivity on round-trip', () => {
    const serializer = new StepSerializer();
    const stepContent = serializer.serialize(sampleModel);

    const parser = new StepParser();
    const parsedModel = parser.parse(stepContent);

    const beam = parsedModel.curveMembers.find(m => m.globalId === 'MEM_BEAM_01');
    expect(beam).toBeDefined();
    expect(beam?.profileName).toBe('IPE360');
    expect(beam?.startConnectionId).toBe('NODE_002');
    expect(beam?.endConnectionId).toBe('NODE_003');
  });

  it('retains load magnitudes and load groups on round-trip', () => {
    const serializer = new StepSerializer();
    const stepContent = serializer.serialize(sampleModel);

    const parser = new StepParser();
    const parsedModel = parser.parse(stepContent);

    const windGroup = parsedModel.loadGroups.find(lg => lg.globalId === 'LG_WIND');
    expect(windGroup).toBeDefined();
    expect(windGroup?.actionType).toBe('WIND');

    const pointAct = parsedModel.pointActions.find(pa => pa.globalId === 'ACT_P_001');
    expect(pointAct).toBeDefined();
    expect(pointAct?.forces_kN[0]).toBeCloseTo(25.0, 2);
    expect(pointAct?.connectionGlobalId).toBe('NODE_002');

    const curveAct = parsedModel.curveActions.find(ca => ca.globalId === 'ACT_C_001');
    expect(curveAct).toBeDefined();
    expect(curveAct?.startForce_kN_m[2]).toBeCloseTo(-18.5, 2);
    expect(curveAct?.memberGlobalId).toBe('MEM_BEAM_01');
  });

  it('resiliently handles empty or malformed STEP content', () => {
    const parser = new StepParser();
    const emptyResult = parser.parse('');
    expect(emptyResult.connections).toEqual([]);
    expect(emptyResult.curveMembers).toEqual([]);

    const garbageResult = parser.parse('FOOBAR BAZ NOT A STEP FILE');
    expect(garbageResult.connections).toEqual([]);
    expect(garbageResult.curveMembers).toEqual([]);
  });
});
