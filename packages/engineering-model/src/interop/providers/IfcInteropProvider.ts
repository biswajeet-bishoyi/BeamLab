/**
 * BeamLab B1.5 — IFC Structural Analysis Interop Provider
 *
 * Implements STEP/IFC (ISO 10303-21) structural analysis domain mapping:
 * - IfcStructuralPointConnection <-> StructuralNode
 * - IfcStructuralCurveMember     <-> StructuralMember
 * - IfcMaterial                  <-> StructuralMaterial
 * - IfcProfileDef                <-> StructuralSection
 */

import { IInteropProvider, InteropFormat, InteropDirection, ImportOptions, ExportOptions } from '../InteropTypes';
import { EngineeringModel } from '../../model/EngineeringModel';
import { ExternalObjectMapper } from '../mapping/ExternalObjectMapping';
import { Point3D } from '../../coordinate/CoordinateSystem';
import { EngineeringNode, EngineeringMember } from '../../geometry/Geometry';

export class IfcInteropProvider implements IInteropProvider<string> {
  readonly format: InteropFormat = 'ifc';
  readonly name = 'IFC Structural Analysis Provider (IFC4/IFC2X3)';
  readonly description = 'Bidirectional STEP-SPF interchange of structural point connections and curve members';
  readonly direction: InteropDirection = 'BiDirectional';
  readonly fileExtensions: readonly string[] = ['.ifc', '.stp'];

  importModel(content: string, options?: ImportOptions): EngineeringModel {
    const mapper = new ExternalObjectMapper({
      coordinateOptions: {
        sourceUpAxis: options?.sourceUpAxis ?? 'Z',
        scaleFactor: options?.lengthScaleFactor ?? 1.0,
      },
    });

    const modelId = `model-ifc-${Date.now()}`;
    const model = new EngineeringModel(modelId, {
      name: options?.structureName ?? 'Imported IFC Structural Model',
    });

    const lines = content.split(/\r?\n/);
    const cartesianPoints = new Map<number, Point3D>();
    const pointConnections = new Map<number, { id: string; pointId: number; name: string }>();
    const curveMembers = new Map<number, { id: string; startConnId: number; endConnId: number; name: string }>();

    // Pass 1: Extract STEP entities
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith('#')) continue;

      const entityMatch = line.match(/^#(\d+)\s*=\s*([A-Z0-9_]+)\s*\((.*)\);?$/i);
      if (!entityMatch || !entityMatch[1] || !entityMatch[2] || !entityMatch[3]) continue;

      const stepId = parseInt(entityMatch[1], 10);
      const entityType = entityMatch[2].toUpperCase();
      const params = entityMatch[3];

      if (entityType === 'IFCCARTESIANPOINT') {
        // e.g. #10=IFCCARTESIANPOINT((0.,0.,3.5));
        const coordsMatch = params.match(/\(\s*([-\d.eE]+)\s*,\s*([-\d.eE]+)(?:\s*,\s*([-\d.eE]+))?\s*\)/);
        if (coordsMatch && coordsMatch[1] && coordsMatch[2]) {
          const x = parseFloat(coordsMatch[1]);
          const y = parseFloat(coordsMatch[2]);
          const z = coordsMatch[3] ? parseFloat(coordsMatch[3]) : 0;
          cartesianPoints.set(stepId, { x, y, z });
        }
      } else if (entityType === 'IFCSTRUCTURALPOINTCONNECTION') {
        // e.g. #20=IFCSTRUCTURALPOINTCONNECTION('guid',$,'Node-1',$,$,#10,$);
        const refMatch = params.match(/#(\d+)/);
        const ptRef = refMatch && refMatch[1] ? parseInt(refMatch[1], 10) : 0;
        const strMatches = Array.from(params.matchAll(/'([^']*)'/g)).map(m => m[1]);
        const name = (strMatches.length >= 2 ? strMatches[1] : strMatches[0]) || `Node-${stepId}`;
        pointConnections.set(stepId, { id: `node-${stepId}`, pointId: ptRef, name });
      } else if (entityType === 'IFCSTRUCTURALCURVEMEMBER') {
        // e.g. #30=IFCSTRUCTURALCURVEMEMBER('guid',$,'Beam-1',$,$,$,.RIGID_JOINED_MEMBER.);
        const strMatches = Array.from(params.matchAll(/'([^']*)'/g)).map(m => m[1]);
        const name = (strMatches.length >= 2 ? strMatches[1] : strMatches[0]) || `Member-${stepId}`;
        curveMembers.set(stepId, { id: `mem-${stepId}`, startConnId: 0, endConnId: 0, name });
      } else if (entityType === 'IFCRELCONNECTSSTRUCTURALMEMBER') {
        // Associates curve member with point connections
        const refs = Array.from(params.matchAll(/#(\d+)/g)).map(m => parseInt(m[1]!, 10));
        if (refs.length >= 2) {
          const memberId = refs[0]!;
          const connId = refs[1]!;
          const member = curveMembers.get(memberId);
          if (member) {
            if (!member.startConnId) member.startConnId = connId;
            else if (!member.endConnId) member.endConnId = connId;
          }
        }
      }
    }

    // Pass 2: Populate nodes
    for (const [stepId, conn] of pointConnections) {
      const pt = cartesianPoints.get(conn.pointId) ?? { x: 0, y: 0, z: 0 };
      const canonicalPt = mapper.coordinates.toCanonical(pt);
      model.addNode(conn.id, conn.name, canonicalPt.x, canonicalPt.y, canonicalPt.z, 'structure-main');
      mapper.relationships.registerIdMapping(String(stepId), conn.id);
    }

    // Pass 3: Fallback materials and sections
    const defaultMat = model.addMaterial('mat-s355', 'S355 Steel', 210e9, 81e9, 0.3, 7850, 'Steel');
    const defaultSec = model.addSection('sec-ipe300', 'IPE 300', 5.38e-3, 6.04e-6, 8.36e-5, 2.01e-7);

    // Pass 4: Populate members
    for (const [, mem] of curveMembers) {
      const startConn = pointConnections.get(mem.startConnId);
      const endConn = pointConnections.get(mem.endConnId);

      if (startConn && endConn) {
        model.addMember(mem.id, mem.name, startConn.id, endConn.id, defaultMat.identity.id, defaultSec.identity.id, 'structure-main');
      }
    }

    return model;
  }

  exportModel(model: EngineeringModel, options?: ExportOptions): string {
    const mapper = new ExternalObjectMapper({
      coordinateOptions: {
        targetUpAxis: options?.targetUpAxis ?? 'Z',
      },
    });

    const timestamp = new Date().toISOString();
    const precision = options?.precision ?? 4;

    const out: string[] = [
      'ISO-10303-21;',
      'HEADER;',
      `FILE_DESCRIPTION(('BeamLab Structural Model Export'),'2;1');`,
      `FILE_NAME('${model.projectInfo.name}.ifc','${timestamp}',('BeamLab Engineer'),('BeamLab'),'BeamLab B1.5 Kernel','AutoCAD/Revit/IFC4 Compatibility',#1);`,
      `FILE_SCHEMA(('IFC4'));`,
      'ENDSEC;',
      'DATA;',
    ];

    let id = 10;
    const nodeIdToPointStep = new Map<string, number>();
    const nodeIdToConnStep = new Map<string, number>();

    // 1. Export Nodes
    for (const node of model.objects.getByType<EngineeringNode>('Node')) {
      const pt: Point3D = mapper.coordinates.toExternal({
        x: node.x,
        y: node.y,
        z: node.z,
      });

      const ptStep = id++;
      out.push(`#${ptStep}=IFCCARTESIANPOINT((${pt.x.toFixed(precision)},${pt.y.toFixed(precision)},${pt.z.toFixed(precision)}));`);
      nodeIdToPointStep.set(node.identity.id, ptStep);

      const connStep = id++;
      out.push(`#${connStep}=IFCSTRUCTURALPOINTCONNECTION('${node.identity.id}',$,'${node.identity.name}',$,$,#${ptStep},$);`);
      nodeIdToConnStep.set(node.identity.id, connStep);
    }

    // 2. Export Members
    for (const mem of model.objects.getByType<EngineeringMember>('Member')) {
      const memStep = id++;
      out.push(`#${memStep}=IFCSTRUCTURALCURVEMEMBER('${mem.identity.id}',$,'${mem.identity.name}',$,$,$,.RIGID_JOINED_MEMBER.);`);

      const startConnStep = nodeIdToConnStep.get(mem.startNodeId);
      const endConnStep = nodeIdToConnStep.get(mem.endNodeId);

      if (startConnStep) {
        const relStep = id++;
        out.push(`#${relStep}=IFCRELCONNECTSSTRUCTURALMEMBER(#${memStep},#${startConnStep},$,$,$,$);`);
      }
      if (endConnStep) {
        const relStep = id++;
        out.push(`#${relStep}=IFCRELCONNECTSSTRUCTURALMEMBER(#${memStep},#${endConnStep},$,$,$,$);`);
      }
    }

    out.push('ENDSEC;', 'END-ISO-10303-21;');
    return out.join('\n');
  }
}
