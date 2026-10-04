/**
 * BeamLab Sprint B3.2 — 3D Internal Force & Multi-Case Envelope Diagram Controller
 * Manages procedural 3D diagram groups, envelope bands, scaling, and member synchronization.
 */

import * as THREE from 'three';
import { StructuralSystem } from '@beamstudio/engineering-model';
import {
  DiagramMeshBuilder,
  type DiagramOptions,
  type DiagramType,
  DEFAULT_DIAGRAM_OPTIONS,
} from './DiagramMeshBuilder';
import {
  MemberForceEvaluator,
  type MemberEvaluationResult,
} from '../../results/MemberForceEvaluator';
import {
  EnvelopeEngine,
  type MemberEnvelopeResult,
} from '../../results/EnvelopeEngine';
import { MemberMeshBuilder } from '../geometry/MemberMeshBuilder';

export class DiagramController {
  private readonly rootGroup = new THREE.Group();
  private options: DiagramOptions = { ...DEFAULT_DIAGRAM_OPTIONS };
  private activeSystem?: StructuralSystem;
  private evaluations = new Map<string, MemberEvaluationResult>();
  private envelopes = new Map<string, MemberEnvelopeResult>();
  private selectedMemberId: string | null = null;
  private currentPreset: 'blank' | 'portal_frame' | 'space_truss' | 'building_slabs' = 'portal_frame';

  constructor(scene: THREE.Scene) {
    this.rootGroup.name = 'DiagramsVisualizationRoot';
    scene.add(this.rootGroup);
  }

  public getRootGroup(): THREE.Group {
    return this.rootGroup;
  }

  public setSystem(
    system: StructuralSystem,
    preset: 'blank' | 'portal_frame' | 'space_truss' | 'building_slabs' = 'portal_frame',
  ): void {
    this.activeSystem = system;
    this.currentPreset = preset;
    this.evaluations = MemberForceEvaluator.getDemoModelEvaluations(preset);
    this.envelopes = EnvelopeEngine.getDemoModelEnvelopes(preset);
    this.rebuild();
  }

  public setDiagramType(type: DiagramType): void {
    this.options.type = type;
    this.rebuild();
  }

  public setOptions(opts: Partial<DiagramOptions>): void {
    this.options = { ...this.options, ...opts };
    this.rebuild();
  }

  public getOptions(): DiagramOptions {
    return { ...this.options };
  }

  public setSelectedMember(memberId: string | null): void {
    this.selectedMemberId = memberId;
  }

  public getSelectedMember(): string | null {
    return this.selectedMemberId;
  }

  public getPreset(): 'blank' | 'portal_frame' | 'space_truss' | 'building_slabs' {
    return this.currentPreset;
  }

  public getEvaluation(memberId: string): MemberEvaluationResult | undefined {
    return this.evaluations.get(memberId);
  }

  public getAllEvaluations(): Map<string, MemberEvaluationResult> {
    return this.evaluations;
  }

  public getEnvelope(memberId: string): MemberEnvelopeResult | undefined {
    return this.envelopes.get(memberId);
  }

  public getAllEnvelopes(): Map<string, MemberEnvelopeResult> {
    return this.envelopes;
  }

  public rebuild(): void {
    while (this.rootGroup.children.length > 0) {
      const child = this.rootGroup.children[0]!;
      this.rootGroup.remove(child);
      if (child instanceof THREE.Group) {
        child.traverse((obj) => {
          if (obj instanceof THREE.Mesh && obj.geometry) {
            obj.geometry.dispose();
          }
          if (obj instanceof THREE.Line && obj.geometry) {
            obj.geometry.dispose();
          }
          if (obj instanceof THREE.Sprite && obj.material.map) {
            obj.material.map.dispose();
            obj.material.dispose();
          }
        });
      }
    }

    if (this.options.type === 'none' || !this.activeSystem) {
      this.rootGroup.visible = false;
      return;
    }

    this.rootGroup.visible = true;

    for (const member of this.activeSystem.members.values()) {
      const startNode = this.activeSystem.nodes.get(member.startNodeId);
      const endNode = this.activeSystem.nodes.get(member.endNodeId);
      if (!startNode || !endNode) continue;

      const p1 = new THREE.Vector3(startNode.x, startNode.y, startNode.z);
      const p2 = new THREE.Vector3(endNode.x, endNode.y, endNode.z);
      const rollAngle = member.orientation?.rollAngleDeg ?? 0;

      const { xAxis, yAxis, zAxis, length } = MemberMeshBuilder.computeLocalFrame(p1, p2, rollAngle);

      let evalResult = this.evaluations.get(member.identity.id);
      if (!evalResult) {
        evalResult = MemberForceEvaluator.evaluateMember(
          member.identity.id,
          member.identity.name,
          member.memberType as any,
          length,
          member.sectionId,
          member.materialId,
          {
            length,
            axialStart: -25.0,
            udlY: 12.0,
            startMoments: { Mz: -35.0 },
            endMoments: { Mz: -35.0 },
          },
        );
        this.evaluations.set(member.identity.id, evalResult);
      }

      const envelopeResult = this.envelopes.get(member.identity.id);

      const memberDiagram = DiagramMeshBuilder.buildMemberDiagram(
        p1,
        p2,
        xAxis,
        yAxis,
        zAxis,
        evalResult,
        this.options,
        envelopeResult,
      );

      this.rootGroup.add(memberDiagram);
    }
  }

  public dispose(): void {
    this.rebuild();
    if (this.rootGroup.parent) {
      this.rootGroup.parent.remove(this.rootGroup);
    }
  }
}
