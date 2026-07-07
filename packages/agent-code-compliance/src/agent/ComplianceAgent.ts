import { IAgent, AgentManifest, ExecutionContext } from '@beamlab/agent-framework';
import { CompliancePipeline } from '../pipeline/CompliancePipeline';

export class ComplianceAgent implements IAgent {
  public manifest: AgentManifest;
  private pipeline!: CompliancePipeline;

  constructor() {
    this.manifest = require('../../agent.manifest.json') as AgentManifest;
  }

  public async initialize(context: ExecutionContext): Promise<void> {
    this.pipeline = new CompliancePipeline();
    console.log(`[ComplianceAgent] Initialized version ${this.manifest.version}`);
  }

  public async execute(request: any, context: ExecutionContext): Promise<any> {
    return this.pipeline.execute(request, context);
  }

  public async shutdown(): Promise<void> {
    console.log('[ComplianceAgent] Shutting down');
  }
}
