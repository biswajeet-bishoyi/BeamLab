import { describe, it, expect } from 'vitest';
import { NegotiationPipeline } from './negotiation/NegotiationPipeline';
import { AgentManifest } from './manifest/AgentManifest';
import { LocalSandboxProvider } from './sandbox/LocalSandboxProvider';
import { AgentHealthMonitor } from './diagnostics/AgentHealthMonitor';
import { AgentCommunicationBus, AgentMessage } from './communication/AgentCommunicationBus';

describe('Agent Framework', () => {
  it('should negotiate and match an agent capability', () => {
    const pipeline = new NegotiationPipeline();
    
    const mockAgent: AgentManifest = {
      id: 'structural-analyzer-1',
      name: 'Structural Analyzer',
      version: '1.0.0',
      author: 'BeamLab',
      capabilities: {
        domains: ['structural'],
        tasks: ['analysis'],
        objectTypes: ['beam', 'column'],
        requiredInputs: ['geometry', 'loads'],
        producedOutputs: ['deflection', 'forces'],
        requiredKnowledge: [],
        requiredResources: [],
        requiredPolicies: [],
        estimatedRuntimeMs: 500,
        confidence: 0.95,
        priority: 'high'
      },
      permissions: ['workspace:read'],
      dependencies: [],
      supportedBeamLabVersion: '^1.0.0',
      requiredRuntimeVersion: '^1.0.0'
    };

    pipeline.registerAgent(mockAgent);

    const plan = pipeline.negotiate({
      taskId: 'task-1',
      domain: 'structural',
      task: 'analysis',
      objectType: 'beam',
      inputs: {},
      expectedOutputs: []
    });

    expect(plan).not.toBeNull();
    expect(plan?.selectedAgentId).toBe('structural-analyzer-1');
  });

  it('should simulate sandbox execution', async () => {
    const sandbox = new LocalSandboxProvider();
    
    sandbox.prepare('exec-1', {
      executionTimeoutMs: 100,
      memoryBudgetMB: 50,
      cpuBudgetPercentage: 50,
      networkAccess: false,
      filesystemAccess: false,
      toolAccess: []
    });

    const result = await sandbox.execute(async (ctx) => {
      ctx.metrics.recordToolInvocation('test-tool');
      return 'success';
    });

    expect(result).toBe('success');
    expect(sandbox.getMetrics().toolInvocations).toBe(1);
  });

  it('should route messages via communication bus', () => {
    const bus = new AgentCommunicationBus();
    let receivedMessage: AgentMessage | null = null;
    
    bus.subscribe('agent-a', (msg) => {
      receivedMessage = msg;
    });

    bus.publish({
      messageId: 'msg-1',
      sender: 'agent-b',
      recipient: 'agent-a',
      conversationId: 'conv-1',
      executionId: 'exec-1',
      timestamp: Date.now(),
      messageType: 'status_update',
      payload: { status: 'running' },
      priority: 'normal'
    });

    expect(receivedMessage).not.toBeNull();
    expect(receivedMessage!.sender).toBe('agent-b');
  });

  it('should track agent health', () => {
    const monitor = new AgentHealthMonitor();
    monitor.registerAgent('agent-1');
    monitor.recordExecution('agent-1', 50, 10, true);
    monitor.recordExecution('agent-1', 45, 12, false);

    const health = monitor.getHealth('agent-1');
    expect(health?.executionCount).toBe(2);
    expect(health?.failureCount).toBe(1);
    expect(health?.failureRate).toBe(0.5);
    expect(health?.healthScore).toBeLessThan(100);
  });
});
