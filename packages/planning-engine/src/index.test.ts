import { describe, it, expect } from 'vitest';
import { ToolRegistry } from '@beamlab/tool-registry';
import { PlanningEngine } from './api/PlanningEngine';

describe('PlanningEngine', () => {
  const toolRegistry = new ToolRegistry();
  toolRegistry.register({ metadata: { id: 'analyze_beam', name: 'Analyze Beam', category: 'Analysis', version: '1', description: '' }, schemas: {} as any, security: {} as any, history: {} as any, dependencies: {} as any, execute: async () => {} });
  toolRegistry.register({ metadata: { id: 'generic_tool', name: 'Generic Tool', category: 'Analysis', version: '1', description: '' }, schemas: {} as any, security: {} as any, history: {} as any, dependencies: {} as any, execute: async () => {} });

  it('should correctly classify intents', () => {
    const engine = new PlanningEngine(toolRegistry);
    expect(engine.classifyIntent('Please analyze beam B17')).toBe('Engineering Analysis');
    expect(engine.classifyIntent('Hello there')).toBe('Conversation');
  });

  it('should generate an immutable ExecutionPlan using RulePlanner', async () => {
    const engine = new PlanningEngine(toolRegistry);
    const plan = await engine.createPlan('session1', 'req1', 'Analyze beam B17', { isCriticalStructure: false });
    
    expect(plan.id).toBeDefined();
    expect(plan.raw.strategy).toBe('RulePlanner');
    expect(plan.raw.userIntent).toBe('Engineering Analysis');
    expect(plan.steps.length).toBeGreaterThan(0);
    expect(plan.raw.estimatedDurationMs).toBe(500);

    // Verify immutability
    expect(() => {
      (plan.raw as any).version = '2.0.0';
    }).toThrow();
  });

  it('should evaluate constraints and approvals properly', async () => {
    const engine = new PlanningEngine(toolRegistry);
    // Let's pretend generic_tool throws a warning if context is not fully specified.
    // In our mocked RulePlanner, any non-analysis falls to generic_tool.
    const plan = await engine.createPlan('session2', 'req2', 'execute some stuff', {});
    
    expect(plan.raw.requiredTools).toContain('generic_tool');
    const explanation = engine.explainPlan(plan);
    expect(explanation).toContain('RulePlanner');
  });
});
