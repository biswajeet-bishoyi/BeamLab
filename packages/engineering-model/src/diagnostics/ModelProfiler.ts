/**
 * BeamLab B1.6 — Engineering Model Profiler & Diagnostics
 *
 * Analyzes model topology, degrees of freedom (DoFs), memory footprints,
 * matrix bandwidth, and overall model health scoring.
 */

import { EngineeringModel } from '../model/EngineeringModel';
import { EngineeringNode, EngineeringMember } from '../geometry/Geometry';
import { EngineeringSupport } from '../boundary/Boundary';

export interface DofMetrics {
  /** Total global degrees of freedom (6 per 3D node) */
  readonly totalDofs: number;
  /** Fixed / restrained degrees of freedom */
  readonly restrainedDofs: number;
  /** Free / active unconstrained degrees of freedom */
  readonly freeDofs: number;
  /** Estimated half-bandwidth of structural stiffness matrix */
  readonly estimatedBandwidth: number;
  /** Percentage of matrix sparsity (0 - 100%) */
  readonly estimatedSparsityPercent: number;
  /** Whether the model has at least 6 restrained DoFs to prevent rigid body motion */
  readonly hasSufficientRestraints: boolean;
}

export interface MemoryFootprint {
  /** Estimated memory in bytes */
  readonly estimatedBytes: number;
  /** Human-readable memory string (e.g. "4.2 KB") */
  readonly formattedSize: string;
}

export type HealthRating = 'Excellent' | 'Good' | 'Needs Review' | 'Critical';

export interface ModelHealthReport {
  /** Overall health score from 0 to 100 */
  readonly score: number;
  /** Categorical rating */
  readonly rating: HealthRating;
  /** List of detected health issues or warnings */
  readonly issues: string[];
}

export interface ModelProfile {
  readonly modelId: string;
  readonly modelName: string;
  readonly objectCounts: Record<string, number>;
  readonly totalObjects: number;
  readonly dofMetrics: DofMetrics;
  readonly memory: MemoryFootprint;
  readonly health: ModelHealthReport;
  readonly generatedAt: string;
}

export class ModelProfiler {
  /**
   * Perform comprehensive profile analysis of an EngineeringModel.
   */
  public static profile(model: EngineeringModel): ModelProfile {
    const allObjects = model.objects.all();
    const objectCounts: Record<string, number> = {};

    for (const obj of allObjects) {
      objectCounts[obj.objectType] = (objectCounts[obj.objectType] ?? 0) + 1;
    }

    const nodes = model.objects.getByType<EngineeringNode>('Node');
    const members = model.objects.getByType<EngineeringMember>('Member');
    const supports = model.objects.getByType<EngineeringSupport>('Support');

    // 1. Degree of Freedom calculation
    const totalDofs = nodes.length * 6;
    let restrainedDofs = 0;

    for (const sup of supports) {
      const r = sup.restraints;
      if (r) {
        if (r.dx) restrainedDofs++;
        if (r.dy) restrainedDofs++;
        if (r.dz) restrainedDofs++;
        if (r.rx) restrainedDofs++;
        if (r.ry) restrainedDofs++;
        if (r.rz) restrainedDofs++;
      }
    }

    const freeDofs = Math.max(0, totalDofs - restrainedDofs);
    const hasSufficientRestraints = nodes.length === 0 || restrainedDofs >= 6;

    // Estimate matrix bandwidth based on node indexing in members
    let maxNodeDelta = 0;
    const nodeIndexMap = new Map<string, number>();
    nodes.forEach((n, idx) => nodeIndexMap.set(n.identity.id, idx));

    for (const m of members) {
      const idx1 = nodeIndexMap.get(m.startNodeId);
      const idx2 = nodeIndexMap.get(m.endNodeId);
      if (idx1 !== undefined && idx2 !== undefined) {
        const delta = Math.abs(idx1 - idx2);
        if (delta > maxNodeDelta) maxNodeDelta = delta;
      }
    }

    const estimatedBandwidth = nodes.length > 0 ? (maxNodeDelta + 1) * 6 : 0;
    const totalMatrixEntries = freeDofs > 0 ? freeDofs * freeDofs : 1;
    // Each member connects 2 nodes = 12x12 = 144 non-zeros max per member
    const estimatedNonZeros = Math.min(totalMatrixEntries, freeDofs + members.length * 144);
    const estimatedSparsityPercent = freeDofs > 0
      ? Math.max(0, Math.min(99.9, ((totalMatrixEntries - estimatedNonZeros) / totalMatrixEntries) * 100))
      : 0;

    // 2. Memory estimation
    let estimatedBytes = 1024; // baseline model overhead
    for (const [type, count] of Object.entries(objectCounts)) {
      switch (type) {
        case 'Node': estimatedBytes += count * 128; break;
        case 'Member': estimatedBytes += count * 256; break;
        case 'Material': estimatedBytes += count * 192; break;
        case 'Section': estimatedBytes += count * 240; break;
        case 'Support': estimatedBytes += count * 160; break;
        case 'LoadPattern':
        case 'LoadCase':
        case 'LoadCombination': estimatedBytes += count * 200; break;
        case 'NodeLoad':
        case 'MemberLoad': estimatedBytes += count * 180; break;
        case 'AnalysisResult': estimatedBytes += count * 2048; break;
        default: estimatedBytes += count * 150; break;
      }
    }

    const formattedSize = estimatedBytes >= 1024 * 1024
      ? `${(estimatedBytes / (1024 * 1024)).toFixed(2)} MB`
      : `${(estimatedBytes / 1024).toFixed(1)} KB`;

    // 3. Health score evaluation
    const issues: string[] = [];
    let score = 100;

    // Check for rigid body motion
    if (nodes.length > 0 && restrainedDofs < 6) {
      score -= 25;
      issues.push(`Model may be unstable: only ${restrainedDofs} / 6 minimum restrained DoFs found.`);
    }

    // Check for isolated nodes
    const connectedNodeIds = new Set<string>();
    for (const m of members) {
      connectedNodeIds.add(m.startNodeId);
      connectedNodeIds.add(m.endNodeId);
    }
    const isolatedNodes = nodes.filter(n => !connectedNodeIds.has(n.identity.id));
    if (isolatedNodes.length > 0) {
      score -= Math.min(20, isolatedNodes.length * 5);
      issues.push(`${isolatedNodes.length} isolated node(s) with no connected members detected.`);
    }

    // Check for unreferenced sections or materials
    const usedMatIds = new Set(members.map(m => m.materialId));
    const usedSecIds = new Set(members.map(m => m.sectionId));
    const allMats = model.objects.getByType('Material');
    const allSecs = model.objects.getByType('Section');

    const unusedMats = allMats.filter(m => !usedMatIds.has(m.identity.id));
    const unusedSecs = allSecs.filter(s => !usedSecIds.has(s.identity.id));

    if (unusedMats.length > 0) {
      score -= Math.min(10, unusedMats.length * 2);
      issues.push(`${unusedMats.length} unused material definition(s) registered in model.`);
    }
    if (unusedSecs.length > 0) {
      score -= Math.min(10, unusedSecs.length * 2);
      issues.push(`${unusedSecs.length} unused section profile(s) registered in model.`);
    }

    // Run validation rule checks
    const valResults = model.validateAll();
    const allDiagnostics = valResults.flatMap(r => r.diagnostics);
    const errors = allDiagnostics.filter(d => d.severity === 'error');
    if (errors.length > 0) {
      score -= Math.min(30, errors.length * 10);
      issues.push(`${errors.length} active model validation error(s) pending resolution.`);
    }

    score = Math.max(0, Math.min(100, Math.round(score)));

    let rating: HealthRating = 'Excellent';
    if (score < 50) rating = 'Critical';
    else if (score < 75) rating = 'Needs Review';
    else if (score < 90) rating = 'Good';

    return {
      modelId: model.id,
      modelName: model.projectInfo.name,
      objectCounts,
      totalObjects: allObjects.length,
      dofMetrics: {
        totalDofs,
        restrainedDofs,
        freeDofs,
        estimatedBandwidth,
        estimatedSparsityPercent: Math.round(estimatedSparsityPercent * 10) / 10,
        hasSufficientRestraints,
      },
      memory: {
        estimatedBytes,
        formattedSize,
      },
      health: {
        score,
        rating,
        issues,
      },
      generatedAt: new Date().toISOString(),
    };
  }
}
