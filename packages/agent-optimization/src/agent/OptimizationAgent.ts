import { IAgent, AgentManifest, ExecutionContext } from '@beamlab/agent-framework';
import { OptimizationPipeline } from '../pipeline/OptimizationPipeline';

export class OptimizationAgent implements IAgent {
  public manifest: AgentManifest;
  private pipeline!: OptimizationPipeline;

  constructor() {
    this.manifest = require('../../agent.manifest.json') as AgentManifest;
  }

  public async initialize(context: ExecutionContext): Promise<void> {
    this.pipeline = new OptimizationPipeline();
    console.log(`[OptimizationAgent] Initialized version ${this.manifest.version}`);
  }

  public async execute(request: any, context: ExecutionContext): Promise<any> {
    return this.pipeline.execute(request, context);
  }

  public async shutdown(): Promise<void> {
    console.log('[OptimizationAgent] Shutting down');
  }
}
