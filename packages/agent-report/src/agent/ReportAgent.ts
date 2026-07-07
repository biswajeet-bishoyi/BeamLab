import { IAgent, AgentManifest } from '@beamlab/agent-framework';
import { ReportPipeline } from '../pipeline/ReportPipeline';

export class ReportAgent implements IAgent {
  public readonly id = 'agent-report';
  public readonly version = '1.0.0';
  public readonly manifest: AgentManifest;
  
  constructor(private pipeline: ReportPipeline) {
    console.log(`[ReportAgent] Initialized version ${this.version}`);
    this.manifest = {
      id: this.id,
      name: 'Engineering Report Agent',
      version: this.version,
      capabilities: []
    } as unknown as AgentManifest;
  }

  public async initialize(): Promise<void> {}
  
  public async shutdown(): Promise<void> {}

  public async execute(request: any): Promise<any> {
    return this.pipeline.execute(request, {});
  }
}
