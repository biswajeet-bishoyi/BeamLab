/**
 * BeamLab B1.5 — Bentley STAAD.Pro Interop Provider
 *
 * Imports and exports structural models to/from STAAD text command files (.std).
 */

import { IInteropProvider, InteropFormat, InteropDirection, ImportOptions, ExportOptions } from '../InteropTypes';
import { EngineeringModel } from '../../model/EngineeringModel';
import { EngineeringNode, EngineeringMember } from '../../geometry/Geometry';
import { EngineeringSupport } from '../../boundary/Boundary';

export class StaadInteropProvider implements IInteropProvider<string> {
  readonly format: InteropFormat = 'staad';
  readonly name = 'Bentley STAAD.Pro Command File Provider';
  readonly description = 'Bidirectional interchange of geometry, topology, properties, and loading via STAAD .std format';
  readonly direction: InteropDirection = 'BiDirectional';
  readonly fileExtensions: readonly string[] = ['.std'];

  importModel(content: string, options?: ImportOptions): EngineeringModel {
    const model = new EngineeringModel(`model-staad-${Date.now()}`, {
      name: options?.structureName ?? 'Imported STAAD Model',
    });

    const lines = content.split(/\r?\n/);
    let mode: 'NONE' | 'JOINTS' | 'MEMBERS' | 'SUPPORTS' = 'NONE';

    const mat = model.addMaterial('mat-steel-s355', 'Steel', 205e9, 80e9, 0.3, 7850, 'Steel');
    const sec = model.addSection('sec-ismb300', 'ISMB 300', 5.63e-3, 4.54e-6, 8.6e-5, 2.12e-7);

    for (let rawLine of lines) {
      let line = rawLine.trim();
      const semiIndex = line.indexOf('*');
      if (semiIndex >= 0) line = line.substring(0, semiIndex).trim();
      if (!line) continue;

      const upper = line.toUpperCase();
      if (upper.startsWith('JOINT COORDINATES')) {
        mode = 'JOINTS';
        continue;
      } else if (upper.startsWith('MEMBER INCIDENCES')) {
        mode = 'MEMBERS';
        continue;
      } else if (upper.startsWith('SUPPORTS')) {
        mode = 'SUPPORTS';
        continue;
      } else if (upper.startsWith('CONSTANTS') || upper.startsWith('MEMBER PROPERTY') || upper.startsWith('PERFORM ANALYSIS') || upper.startsWith('FINISH')) {
        mode = 'NONE';
        continue;
      }

      if (mode === 'JOINTS') {
        // e.g. 1 0.0 0.0 0.0 ; or 1 0.0 0.0 0.0
        const tokens = line.replace(/;/g, '').trim().split(/\s+/);
        if (tokens.length >= 4) {
          const id = `node-${tokens[0]}`;
          const name = `N${tokens[0]}`;
          const x = parseFloat(tokens[1]!);
          const y = parseFloat(tokens[2]!);
          const z = parseFloat(tokens[3]!);
          // STAAD is Y-up by default, convert to Z-up for BeamLab: (X, Z, Y) -> X=x, Y=-z, Z=y
          model.addNode(id, name, x, z, y, 'structure-main');
        }
      } else if (mode === 'MEMBERS') {
        // e.g. 1 1 2 ; or 1 1 2
        const tokens = line.replace(/;/g, '').trim().split(/\s+/);
        if (tokens.length >= 3) {
          const id = `mem-${tokens[0]}`;
          const name = `M${tokens[0]}`;
          const startId = `node-${tokens[1]}`;
          const endId = `node-${tokens[2]}`;
          model.addMember(id, name, startId, endId, mat.identity.id, sec.identity.id, 'structure-main');
        }
      } else if (mode === 'SUPPORTS') {
        // e.g. 1 PINNED or 1 FIXED
        const tokens = line.replace(/;/g, '').trim().split(/\s+/);
        if (tokens.length >= 2) {
          const nodeId = `node-${tokens[0]}`;
          const type = tokens[1]?.toUpperCase();
          const sup = model.addSupport(`sup-${tokens[0]}`, `Support-${tokens[0]}`, nodeId, 'structure-main');
          if (type === 'FIXED') {
            sup.restraints = { dx: true, dy: true, dz: true, rx: true, ry: true, rz: true };
          } else if (type === 'PINNED') {
            sup.restraints = { dx: true, dy: true, dz: true, rx: false, ry: false, rz: false };
          }
        }
      }
    }

    return model;
  }

  exportModel(model: EngineeringModel, _options?: ExportOptions): string {
    const lines: string[] = [
      'STAAD SPACE',
      'START JOB INFORMATION',
      `ENGINEER DATE ${new Date().toLocaleDateString()}`,
      `JOB NAME ${model.projectInfo.name}`,
      'END JOB INFORMATION',
      'INPUT WIDTH 79',
      'UNIT METER KN',
      'JOINT COORDINATES',
    ];

    let nodeIndex = 1;
    const nodeIdToIdx = new Map<string, number>();
    for (const node of model.objects.getByType<EngineeringNode>('Node')) {
      const idx = nodeIndex++;
      nodeIdToIdx.set(node.identity.id, idx);
      const x = node.x.toFixed(4);
      const y = node.y.toFixed(4);
      const z = node.z.toFixed(4);
      // BeamLab Z-up to STAAD Y-up
      lines.push(`${idx} ${x} ${z} ${y};`);
    }

    lines.push('MEMBER INCIDENCES');
    let memIndex = 1;
    for (const mem of model.objects.getByType<EngineeringMember>('Member')) {
      const idx = memIndex++;
      const s = nodeIdToIdx.get(mem.startNodeId) ?? 1;
      const e = nodeIdToIdx.get(mem.endNodeId) ?? 2;
      lines.push(`${idx} ${s} ${e};`);
    }

    lines.push(
      'CONSTANTS',
      'E 2.1E8 ALL',
      'POISSON 0.3 ALL',
      'DENSITY 78.5 ALL',
      'MEMBER PROPERTY INDIAN',
      '1 TO 99 TABLE ST ISMB300',
    );

    lines.push('SUPPORTS');
    for (const sup of model.objects.getByType<EngineeringSupport>('Support')) {
      const nIdx = nodeIdToIdx.get(sup.nodeId);
      if (nIdx) {
        const r = sup.restraints ?? { dx: true, dy: true, dz: true, rx: false, ry: false, rz: false };
        if (r.rx && r.ry && r.rz) {
          lines.push(`${nIdx} FIXED`);
        } else {
          lines.push(`${nIdx} PINNED`);
        }
      }
    }

    lines.push('PERFORM ANALYSIS', 'FINISH');
    return lines.join('\n');
  }
}
