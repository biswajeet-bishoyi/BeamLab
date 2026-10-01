/**
 * BeamLab B1.5 — Tabular CSV Interop Provider
 *
 * Implements CSV spreadsheet import and export for nodes, members,
 * supports, sections, materials, and point/distributed loads.
 */

import { IInteropProvider, InteropFormat, InteropDirection, ImportOptions, ExportOptions } from '../InteropTypes';
import { EngineeringModel } from '../../model/EngineeringModel';
import { EngineeringNode, EngineeringMember } from '../../geometry/Geometry';
import { EngineeringSupport } from '../../boundary/Boundary';

export class CsvInteropProvider implements IInteropProvider<string> {
  readonly format: InteropFormat = 'csv';
  readonly name = 'Tabular CSV Structural Exchange Provider';
  readonly description = 'Simple tabular CSV representation of structural topology, sections, and loads';
  readonly direction: InteropDirection = 'BiDirectional';
  readonly fileExtensions: readonly string[] = ['.csv', '.txt'];

  importModel(content: string, options?: ImportOptions): EngineeringModel {
    const model = new EngineeringModel(`model-csv-${Date.now()}`, {
      name: options?.structureName ?? 'Imported CSV Structural Model',
    });

    const lines = content.split(/\r?\n/);
    const scale = options?.lengthScaleFactor ?? 1.0;

    // Default Material and Section
    const mat = model.addMaterial('mat-steel-s355', 'S355 Steel', 210e9, 81e9, 0.3, 7850, 'Steel');
    const sec = model.addSection('sec-ipe300', 'IPE 300', 5.38e-3, 6.04e-6, 8.36e-5, 2.01e-7);

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || line.startsWith('//')) continue;

      const cols = line.split(',').map(c => c.trim());
      const tag = cols[0]?.toUpperCase();

      if (tag === 'NODE' && cols.length >= 5) {
        // NODE, id, name, x, y, z
        const id = cols[1]!;
        const name = cols[2]!;
        const x = parseFloat(cols[3]!) * scale;
        const y = parseFloat(cols[4]!) * scale;
        const z = cols[5] ? parseFloat(cols[5]) * scale : 0;
        model.addNode(id, name, x, y, z, 'structure-main');
      } else if (tag === 'MEMBER' && cols.length >= 5) {
        // MEMBER, id, name, startNodeId, endNodeId, [materialId], [sectionId]
        const id = cols[1]!;
        const name = cols[2]!;
        const startId = cols[3]!;
        const endId = cols[4]!;
        const mId = cols[5] || mat.identity.id;
        const sId = cols[6] || sec.identity.id;
        model.addMember(id, name, startId, endId, mId, sId, 'structure-main');
      } else if (tag === 'SUPPORT' && cols.length >= 8) {
        // SUPPORT, id, nodeId, tx, ty, tz, rx, ry, rz
        const id = cols[1]!;
        const nodeId = cols[2]!;
        const tx = cols[3] === '1' || cols[3]?.toLowerCase() === 'true';
        const ty = cols[4] === '1' || cols[4]?.toLowerCase() === 'true';
        const tz = cols[5] === '1' || cols[5]?.toLowerCase() === 'true';
        const rx = cols[6] === '1' || cols[6]?.toLowerCase() === 'true';
        const ry = cols[7] === '1' || cols[7]?.toLowerCase() === 'true';
        const rz = cols[8] ? cols[8] === '1' || cols[8].toLowerCase() === 'true' : false;
        const sup = model.addSupport(id, `Support-${nodeId}`, nodeId, 'structure-main');
        sup.restraints = { dx: tx, dy: ty, dz: tz, rx, ry, rz };
      }
    }

    return model;
  }

  exportModel(model: EngineeringModel, _options?: ExportOptions): string {
    const lines: string[] = [
      '# BeamLab Structural Model Export (CSV)',
      '# FORMAT: RecordType, ID, Name, Coordinates/Connectivity...',
      '# ----------------------------------------------------',
    ];

    // Nodes
    lines.push('# Nodes: NODE, id, name, x, y, z');
    for (const node of model.objects.getByType<EngineeringNode>('Node')) {
      lines.push(`NODE,${node.identity.id},${node.identity.name},${node.x},${node.y},${node.z}`);
    }

    // Members
    lines.push('# Members: MEMBER, id, name, startNodeId, endNodeId, materialId, sectionId');
    for (const mem of model.objects.getByType<EngineeringMember>('Member')) {
      lines.push(`MEMBER,${mem.identity.id},${mem.identity.name},${mem.startNodeId},${mem.endNodeId},${mem.materialId},${mem.sectionId}`);
    }

    // Supports
    lines.push('# Supports: SUPPORT, id, nodeId, tx, ty, tz, rx, ry, rz');
    for (const sup of model.objects.getByType<EngineeringSupport>('Support')) {
      const r = sup.restraints ?? { dx: true, dy: true, dz: true, rx: false, ry: false, rz: false };
      lines.push(`SUPPORT,${sup.identity.id},${sup.nodeId},${r.dx ? 1 : 0},${r.dy ? 1 : 0},${r.dz ? 1 : 0},${r.rx ? 1 : 0},${r.ry ? 1 : 0},${r.rz ? 1 : 0}`);
    }

    return lines.join('\n');
  }
}
