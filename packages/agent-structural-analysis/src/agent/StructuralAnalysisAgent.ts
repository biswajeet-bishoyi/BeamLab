import { IAgent, AgentManifest, ExecutionContext } from '@beamlab/agent-framework';
import { AnalysisPipeline } from '../pipeline/AnalysisPipeline';
import { MockSolverAdapter } from '../solver/MockSolverAdapter';
import { ValidationRuleRegistry } from '../validation/ValidationRuleRegistry';
import { ReasoningRegistry } from '../reasoning/ReasoningRegistry';

export class StructuralAnalysisAgent implements IAgent {
  public manifest: AgentManifest;
  private pipeline!: AnalysisPipeline;

  constructor() {
    this.manifest = require('../../agent.manifest.json') as AgentManifest;
  }

  public async initialize(context: ExecutionContext): Promise<void> {
    const solver = new MockSolverAdapter();
    const validationRegistry = new ValidationRuleRegistry();
    const reasoningRegistry = new ReasoningRegistry();

    // In a real scenario, we'd register rules into the registries here.
    
    this.pipeline = new AnalysisPipeline(solver, validationRegistry, reasoningRegistry);
    console.log(`[StructuralAnalysisAgent] Initialized version ${this.manifest.version}`);
  }

  public async execute(request: any, context: ExecutionContext): Promise<any> {
    return this.pipeline.execute(request, context);
  }

  public async shutdown(): Promise<void> {
    console.log('[StructuralAnalysisAgent] Shutting down');
  }
}
