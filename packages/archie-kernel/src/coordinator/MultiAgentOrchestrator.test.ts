import { describe, it, expect } from 'vitest';
import { EngineeringBlackboard } from './EngineeringBlackboard';
import { GoalDecompositionEngine } from './GoalDecompositionEngine';
import { MultiAgentOrchestrator } from './MultiAgentOrchestrator';

describe('Sprint B5.1 — Archie Kernel Multi-Agent Coordinator & Goal Decomposition Engine', () => {
  const sampleModel = {
    nodes: [
      { id: 'N1', x: 0, y: 0, z: 0, restraints: { Tx: true, Ty: true, Tz: true, Rx: true, Ry: true, Rz: true } },
      { id: 'N2', x: 4, y: 0, z: 0, restraints: { Tx: true, Ty: true, Tz: true, Rx: true, Ry: true, Rz: true } },
      { id: 'N3', x: 0, y: 0, z: 3 },
      { id: 'N4', x: 4, y: 0, z: 3 },
    ],
    elements: [
      { id: 'C1', startNodeId: 'N1', endNodeId: 'N3', section: { name: 'HEB 260', area: 0.0118 } },
      { id: 'C2', startNodeId: 'N2', endNodeId: 'N4', section: { name: 'HEB 260', area: 0.0118 } },
      { id: 'B1', startNodeId: 'N3', endNodeId: 'N4', section: { name: 'IPE 360', area: 0.00727 } },
    ],
  };

  it('correctly parses engineering prompts into decomposed DAG execution plans', () => {
    // 1. Weight optimization prompt
    const prompt1 = 'Optimize this portal frame to minimize steel weight adhering to Eurocode 3';
    const spec1 = GoalDecompositionEngine.parseIntent(prompt1);
    expect(spec1.intentType).toBe('WEIGHT_OPTIMIZATION');
    expect(spec1.designCode).toBe('EUROCODE_3');
    expect(spec1.requiresApproval).toBe(true);

    const plan1 = GoalDecompositionEngine.decompose(spec1, 'session-101');
    expect(plan1.steps.length).toBeGreaterThanOrEqual(6);
    expect(plan1.steps.some((s) => s.action === 'EXTRACT_CANONICAL_MODEL')).toBe(true);
    expect(plan1.steps.some((s) => s.action === 'OPTIMIZE_CROSS_SECTIONS')).toBe(true);
    expect(plan1.steps.some((s) => s.action === 'REQUEST_APPROVAL_GATE')).toBe(true);
    expect(plan1.steps.some((s) => s.action === 'GENERATE_CALCULATION_NOTE')).toBe(true);

    // 2. Pushover seismic prompt
    const prompt2 = 'Evaluate seismic pushover capacity curve under ASCE 41-17';
    const spec2 = GoalDecompositionEngine.parseIntent(prompt2);
    expect(spec2.intentType).toBe('PUSHOVER_ASSESSMENT');
    const plan2 = GoalDecompositionEngine.decompose(spec2, 'session-102');
    expect(plan2.steps.some((s) => s.action === 'SOLVE_PUSHOVER_3D')).toBe(true);

    // 3. Second order P-Delta prompt
    const prompt3 = 'Perform second order P-Delta stability analysis with AISC 360 Direct Analysis Method';
    const spec3 = GoalDecompositionEngine.parseIntent(prompt3);
    expect(spec3.intentType).toBe('SECOND_ORDER_ANALYSIS');
    expect(spec3.designCode).toBe('AISC_360_16');
    const plan3 = GoalDecompositionEngine.decompose(spec3, 'session-103');
    expect(plan3.steps.some((s) => s.action === 'SOLVE_PDELTA_3D')).toBe(true);
  });

  it('executes automated compliance verification and synchronizes the engineering blackboard', async () => {
    const blackboard = new EngineeringBlackboard('session-201', 'Code check frame to Eurocode 3', sampleModel, 'EUROCODE_3');
    const orchestrator = new MultiAgentOrchestrator(blackboard);

    const events: string[] = [];
    orchestrator.onEvent((e) => events.push(e.type));

    const finalState = await orchestrator.executeGoal('Check compliance of frame to Eurocode 3');

    expect(orchestrator.getStatus()).toBe('COMPLETED');
    expect(events).toContain('ORCHESTRATION_STARTED');
    expect(events).toContain('STEP_COMPLETED');
    expect(events).toContain('ORCHESTRATION_COMPLETED');

    // Blackboard state verification
    expect(finalState.loadCombinations.length).toBeGreaterThan(0);
    expect(finalState.complianceAudits.length).toBe(3);
    expect(finalState.maxUtilizationRatio).toBeGreaterThan(0);
    expect(finalState.calculationNote.length).toBeGreaterThan(0);
    expect(finalState.auditTrail.length).toBeGreaterThanOrEqual(4);
  });

  it('handles human-in-the-loop approval gate by pausing and resuming execution upon engineer approval', async () => {
    const blackboard = new EngineeringBlackboard('session-301', 'Optimize frame weight', sampleModel, 'EUROCODE_3');
    const orchestrator = new MultiAgentOrchestrator(blackboard);

    let approvalGateId: string | null = null;
    orchestrator.onEvent((e) => {
      if (e.type === 'APPROVAL_REQUESTED') {
        approvalGateId = e.data.gateId;
      }
    });

    // Start execution — should pause at approval gate
    const executionPromise = orchestrator.executeGoal('Optimize frame sections to reduce weight');
    await executionPromise;

    expect(orchestrator.getStatus()).toBe('PAUSED_FOR_APPROVAL');
    expect(approvalGateId).toBeDefined();

    // Verify proposals exist before approval
    const midState = blackboard.getState();
    expect(midState.optimizationProposals.length).toBe(3);
    expect(midState.approvals.get(approvalGateId!)?.status).toBe('PENDING');

    // Engineer approves proposed section reductions
    const finalState = await orchestrator.resolveApproval(
      approvalGateId!,
      'APPROVED',
      'Er. Biswajeet Bishoyi, PE',
      'Approved for fabrication sizing',
    );

    expect(orchestrator.getStatus()).toBe('COMPLETED');
    expect(finalState.approvals.get(approvalGateId!)?.status).toBe('APPROVED');
    expect(finalState.calculationNote.length).toBeGreaterThan(0);
  });

  it('aborts orchestration cleanly if human engineer rejects proposed changes', async () => {
    const blackboard = new EngineeringBlackboard('session-302', 'Optimize frame weight', sampleModel, 'EUROCODE_3');
    const orchestrator = new MultiAgentOrchestrator(blackboard);

    let approvalGateId: string | null = null;
    orchestrator.onEvent((e) => {
      if (e.type === 'APPROVAL_REQUESTED') {
        approvalGateId = e.data.gateId;
      }
    });

    await orchestrator.executeGoal('Optimize frame sections');
    expect(orchestrator.getStatus()).toBe('PAUSED_FOR_APPROVAL');

    const finalState = await orchestrator.resolveApproval(
      approvalGateId!,
      'REJECTED',
      'Lead Engineer',
      'Rejected due to architectural depth limits',
    );

    expect(orchestrator.getStatus()).toBe('ABORTED');
    expect(finalState.approvals.get(approvalGateId!)?.status).toBe('REJECTED');
  });
});
