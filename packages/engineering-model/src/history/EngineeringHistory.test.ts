import { describe, it, expect, vi } from 'vitest';
import {
  createProvenance,
  createHistoryEntry,
  EngineeringHistoryRegistry,
  EngineeringModel,
  CanonicalAnalysisResult,
  createNodeDisplacement,
  createNodeResult,
} from '../index';

describe('B1.4 Engineering History & Provenance — Unit Tests', () => {
  it('should establish complete traceability via EngineeringProvenance', () => {
    const prov = createProvenance({
      resultId: 'res-101',
      analysisId: 'analysis-run-42',
      modelRevisionNumber: 3,
      inputSnapshotHash: 'sha256-a89c09bf',
      solver: {
        solverId: 'direct-stiffness-solver',
        solverName: 'BeamLab Direct Stiffness',
        solverVersion: '1.4.0',
        environment: 'web-worker',
      },
      agent: {
        agentId: 'agent-structural-analysis',
        agentName: 'Structural Analysis Agent',
        workflowId: 'wf-opt-01',
        taskId: 'task-linear-solve',
      },
      userAuthor: 'eng-lead',
      evidence: {
        evidenceId: 'ev-991',
        citationText: 'IS 800:2007 Clause 5.3.1',
      },
    });

    expect(prov.resultId).toBe('res-101');
    expect(prov.analysisId).toBe('analysis-run-42');
    expect(prov.modelRevisionNumber).toBe(3);
    expect(prov.solver.solverId).toBe('direct-stiffness-solver');
    expect(prov.agent?.agentName).toBe('Structural Analysis Agent');
    expect(prov.evidence?.citationText).toBe('IS 800:2007 Clause 5.3.1');
    expect(prov.timestamp).toBeDefined();
  });

  it('should record and query entries in EngineeringHistoryRegistry', () => {
    const registry = new EngineeringHistoryRegistry();

    const entry1 = createHistoryEntry({
      id: 'hist-1',
      type: 'ModelChange',
      revisionNumber: 1,
      author: { type: 'User', id: 'u-1', name: 'Alice' },
      description: 'Added node N-1 and N-2',
      affectedObjectIds: ['n-1', 'n-2'],
    });

    const entry2 = createHistoryEntry({
      id: 'hist-2',
      type: 'LoadChange',
      revisionNumber: 2,
      author: { type: 'User', id: 'u-1', name: 'Alice' },
      description: 'Applied 15 kN/m distributed dead load',
      affectedObjectIds: ['m-1', 'load-dl-1'],
    });

    const entry3 = createHistoryEntry({
      id: 'hist-3',
      type: 'AnalysisRun',
      revisionNumber: 2,
      author: { type: 'Agent', id: 'agent-analysis', name: 'Analysis Agent' },
      description: 'Linear static solver run completed',
      affectedObjectIds: ['res-1'],
    });

    registry.record(entry1);
    registry.record(entry2);
    registry.record(entry3);

    expect(registry.count).toBe(3);
    expect(registry.getLatest()?.id).toBe('hist-3');

    // Query by object
    const m1Entries = registry.getByObject('m-1');
    expect(m1Entries).toHaveLength(1);
    expect(m1Entries[0]?.id).toBe('hist-2');

    // Query by type
    const analysisEntries = registry.getByType('AnalysisRun');
    expect(analysisEntries).toHaveLength(1);
    expect(analysisEntries[0]?.id).toBe('hist-3');

    // Query by revision
    const rev2Entries = registry.getByRevision(2);
    expect(rev2Entries).toHaveLength(2);
  });

  it('should integrate CanonicalAnalysisResult and history tracking in EngineeringModel', () => {
    const model = new EngineeringModel('model-b14', {
      name: 'Bridge Pier Test',
    });

    const onResultCreated = vi.fn();
    const onResultInvalidated = vi.fn();
    model.events.on('AnalysisResultCreated', onResultCreated);
    model.events.on('AnalysisResultInvalidated', onResultInvalidated);

    const result = new CanonicalAnalysisResult({
      id: 'res-canon-1',
      name: 'Case DL+LL Solution',
      solverId: 'stiffness-matrix-v1',
      solverVersion: '1.2.0',
      modelRevisionNumber: model.currentVersion.number,
      executionTimeMs: 45,
      status: 'Completed',
    });

    // Publish canonical result
    model.publishCanonicalResult(result);

    expect(model.results.count).toBe(1);
    expect(model.getResult('res-canon-1')).toBe(result);
    expect(onResultCreated).toHaveBeenCalledTimes(1);

    // Check history was recorded
    const historyEntries = model.history.getByType('AnalysisRun');
    expect(historyEntries).toHaveLength(1);
    expect(historyEntries[0]?.description).toContain('stiffness-matrix-v1');

    // Invalidate results due to model modification
    model.invalidateResults('Support boundary conditions modified at N-1', ['n-1']);

    expect(result.status).toBe('Invalidated');
    expect(result.invalidationReason).toContain('N-1');
    expect(onResultInvalidated).toHaveBeenCalledTimes(1);

    // Verify invalidation history entry
    const modelChanges = model.history.getByType('ModelChange');
    expect(modelChanges.length).toBeGreaterThanOrEqual(2); // init + invalidation
    const latestChange = modelChanges[modelChanges.length - 1];
    expect(latestChange?.description).toContain('invalidated');
  });
});
