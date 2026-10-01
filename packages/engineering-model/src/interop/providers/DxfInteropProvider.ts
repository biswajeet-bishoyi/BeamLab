/**
 * BeamLab B1.5 — AutoCAD DXF Interop Provider
 *
 * Imports and exports structural geometry via standard AutoCAD ASCII DXF format.
 * Maps DXF LINE entities to Members and vertices/POINT entities to Nodes.
 */

import { IInteropProvider, InteropFormat, InteropDirection, ImportOptions, ExportOptions } from '../InteropTypes';
import { EngineeringModel } from '../../model/EngineeringModel';
import { ExternalObjectMapper } from '../mapping/ExternalObjectMapping';
import { Point3D } from '../../coordinate/CoordinateSystem';
import { EngineeringNode, EngineeringMember } from '../../geometry/Geometry';

export class DxfInteropProvider implements IInteropProvider<string> {
  readonly format: InteropFormat = 'dxf';
  readonly name = 'AutoCAD DXF Provider';
  readonly description = 'Bidirectional CAD wireframe interchange using standard AutoCAD DXF entities';
  readonly direction: InteropDirection = 'BiDirectional';
  readonly fileExtensions: readonly string[] = ['.dxf'];

  importModel(content: string, options?: ImportOptions): EngineeringModel {
    const mapper = new ExternalObjectMapper({
      coordinateOptions: {
        sourceUpAxis: options?.sourceUpAxis ?? 'Y', // AutoCAD defaults to Y-up in 2D or Z-up in 3D
        scaleFactor: options?.lengthScaleFactor ?? 0.001, // Usually CAD is in mm
      },
    });

    const modelId = `model-dxf-${Date.now()}`;
    const model = new EngineeringModel(modelId, {
      name: options?.structureName ?? 'Imported DXF Structural Wireframe',
    });

    const lines = content
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const pairs: Array<{ code: string; value: string }> = [];
    for (let i = 0; i < lines.length - 1; i += 2) {
      pairs.push({ code: lines[i]!, value: lines[i + 1]! });
    }

    const rawMembers: Array<{ start: Point3D; end: Point3D; layer?: string }> = [];
    let p = 0;

    while (p < pairs.length) {
      const current = pairs[p]!;
      if (current.code === '0' && current.value === 'LINE') {
        p++;
        let x1 = 0, y1 = 0, z1 = 0;
        let x2 = 0, y2 = 0, z2 = 0;
        let layer = '0';

        while (p < pairs.length && pairs[p]!.code !== '0') {
          const field = pairs[p]!;
          if (field.code === '8') layer = field.value;
          else if (field.code === '10') x1 = parseFloat(field.value);
          else if (field.code === '20') y1 = parseFloat(field.value);
          else if (field.code === '30') z1 = parseFloat(field.value);
          else if (field.code === '11') x2 = parseFloat(field.value);
          else if (field.code === '21') y2 = parseFloat(field.value);
          else if (field.code === '31') z2 = parseFloat(field.value);
          p++;
        }

        rawMembers.push({
          start: mapper.coordinates.toCanonical({ x: x1, y: y1, z: z1 }),
          end: mapper.coordinates.toCanonical({ x: x2, y: y2, z: z2 }),
          layer,
        });
      } else {
        p++;
      }
    }

    // Default material & section
    const mat = model.addMaterial('mat-steel-s355', 'S355 Steel', 210e9, 81e9, 0.3, 7850, 'Steel');
    const sec = model.addSection('sec-ipe300', 'IPE 300', 5.38e-3, 6.04e-6, 8.36e-5, 2.01e-7);

    // Merge points into nodes
    const nodeMap: Array<{ id: string; pt: Point3D }> = [];
    const tol = options?.nodeMergeTolerance ?? 1e-4;

    const getOrCreateNode = (pt: Point3D): string => {
      for (const n of nodeMap) {
        const dist = Math.hypot(n.pt.x - pt.x, n.pt.y - pt.y, n.pt.z - pt.z);
        if (dist <= tol) return n.id;
      }
      const newId = `node-${nodeMap.length + 1}`;
      nodeMap.push({ id: newId, pt });
      model.addNode(newId, `N${nodeMap.length}`, pt.x, pt.y, pt.z, 'structure-main');
      return newId;
    };

    let memCount = 0;
    for (const raw of rawMembers) {
      const sId = getOrCreateNode(raw.start);
      const eId = getOrCreateNode(raw.end);
      if (sId !== eId) {
        memCount++;
        model.addMember(`mem-${memCount}`, `M${memCount}`, sId, eId, mat.identity.id, sec.identity.id, 'structure-main');
      }
    }

    return model;
  }

  exportModel(model: EngineeringModel, options?: ExportOptions): string {
    const mapper = new ExternalObjectMapper({
      coordinateOptions: {
        targetUpAxis: options?.targetUpAxis ?? 'Z',
        scaleFactor: options?.lengthUnit === 'mm' ? 1000 : 1.0,
      },
    });

    const precision = options?.precision ?? 4;
    const out: string[] = [
      '0', 'SECTION',
      '2', 'ENTITIES',
    ];

    const nodeCoords = new Map<string, Point3D>();
    for (const node of model.objects.getByType<EngineeringNode>('Node')) {
      const pt: Point3D = mapper.coordinates.toExternal({
        x: node.x,
        y: node.y,
        z: node.z,
      });
      nodeCoords.set(node.identity.id, pt);

      // Export POINT entity
      out.push(
        '0', 'POINT',
        '8', 'BEAMLAB_NODES',
        '10', pt.x.toFixed(precision),
        '20', pt.y.toFixed(precision),
        '30', pt.z.toFixed(precision),
      );
    }

    for (const mem of model.objects.getByType<EngineeringMember>('Member')) {
      const sPt = nodeCoords.get(mem.startNodeId);
      const ePt = nodeCoords.get(mem.endNodeId);

      if (sPt && ePt) {
        out.push(
          '0', 'LINE',
          '8', 'BEAMLAB_MEMBERS',
          '10', sPt.x.toFixed(precision),
          '20', sPt.y.toFixed(precision),
          '30', sPt.z.toFixed(precision),
          '11', ePt.x.toFixed(precision),
          '21', ePt.y.toFixed(precision),
          '31', ePt.z.toFixed(precision),
        );
      }
    }

    out.push('0', 'ENDSEC', '0', 'EOF');
    return out.join('\n');
  }
}
