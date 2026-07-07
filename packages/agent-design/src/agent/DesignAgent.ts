import { IAgent, AgentManifest, ExecutionContext } from '@beamlab/agent-framework';
import { DesignPipeline } from '../pipeline/DesignPipeline';

export class DesignAgent implements IAgent {
  public manifest: AgentManifest;
  private pipeline!: DesignPipeline;

  constructor() {
    this.manifest = require('../../agent.manifest.json') as AgentManifest;
  }

  public async initialize(context: ExecutionContext): Promise<void> {
    this.pipeline = new DesignPipeline();
    console.log(`[DesignAgent] Initialized version ${this.manifest.version}`);
  }

  public async execute(request: any, context: ExecutionContext): Promise<any> {
    return this.pipeline.execute(request, context);
  }

  public async shutdown(): Promise<void> {
    console.log('[DesignAgent] Shutting down');
  }
}
