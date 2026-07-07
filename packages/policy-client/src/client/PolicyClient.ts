import { PolicyEngine, ActionRequest, PolicyDecision, StaticProvider, PolicyCache } from '@beamlab/policy-engine';

export class PolicyClient {
  private engine: PolicyEngine;
  private isInitialized = false;

  constructor() {
    this.engine = new PolicyEngine(new PolicyCache(60000));
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    // Register the starter pack by default
    const staticProvider = new StaticProvider();
    this.engine.registerProvider(staticProvider);
    
    this.isInitialized = true;
  }

  public async evaluate(request: ActionRequest): Promise<PolicyDecision> {
    if (!this.isInitialized) await this.initialize();
    return this.engine.evaluate(request);
  }

  public async authorize(request: ActionRequest): Promise<boolean> {
    const decision = await this.evaluate(request);
    return decision.decision === 'Allow' || decision.decision === 'AllowWithWarning';
  }

  public async approvalRequired(request: ActionRequest): Promise<boolean> {
    const decision = await this.evaluate(request);
    return decision.decision === 'RequireApproval';
  }

  // Diagnostic endpoints
  public getEngineInstance(): PolicyEngine {
    return this.engine;
  }
}
