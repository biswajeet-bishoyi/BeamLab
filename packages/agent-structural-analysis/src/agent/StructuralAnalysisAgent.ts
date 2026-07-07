import { IAgent, AgentManifest, ExecutionContext } from '@beamlab/agent-framework';
import { AnalysisPipeline } from '../pipeline/AnalysisPipeline';
import { ValidationRuleRegistry } from '../validation/ValidationRuleRegistry';
import { ReasoningRegistry } from '../reasoning/ReasoningRegistry';
import { SolverClient } from '@beamlab/solver-client';

export class StructuralAnalysisAgent implements IAgent {
  public manifest: AgentManifest;
  private pipeline!: AnalysisPipeline;

  constructor() {
    this.manifest = require('../../agent.manifest.json') as AgentManifest;
  }

  public async initialize(context: ExecutionContext): Promise<void> {
    // Ideally SolverClient would be injected. For now we instantiate.
    const solverService = new SolverClient(null);
    const validationRegistry = new ValidationRuleRegistry();
    const reasoningRegistry = new ReasoningRegistry();

    // In a real scenario, we'd register rules into the registries here.
    
    this.pipeline = new AnalysisPipeline(solverService, validationRegistry, reasoningRegistry);
    console.log(`[StructuralAnalysisAgent] Initialized version ${this.manifest.version}`);
  }

  public async execute(request: any, context: ExecutionContext): Promise<any> {
    return this.pipeline.execute(request, context);
  }

  public async shutdown(): Promise<void> {
    console.log('[StructuralAnalysisAgent] Shutting down');
  }
}
