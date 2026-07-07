import { WorkflowPlanner } from '../planning/WorkflowPlanner';
import { WorkflowScheduler } from '../execution/WorkflowScheduler';
import { WorkflowContext, EngineeringBlackboard } from '../context';
import { DecisionPolicyEngine, ConsensusEngine, EngineeringNegotiationEngine } from '../coordination';

export class EngineeringWorkflowRuntime {
  private planner: WorkflowPlanner;
  private policyEngine: DecisionPolicyEngine;

  constructor() {
    this.planner = new WorkflowPlanner();
    this.policyEngine = new DecisionPolicyEngine();
  }

  public async startWorkflow(request: any): Promise<void> {
    const blackboard = new EngineeringBlackboard();
    const context = new WorkflowContext(`wf-${Date.now()}`, blackboard, request.intent || 'Default Workflow', request.workspaceId);
    
    // 1. Planning
    const graph = this.planner.generatePlan(request);
    
    // 2. Setup Coordination
    const negotiationEngine = new EngineeringNegotiationEngine(blackboard);
    const consensusEngine = new ConsensusEngine(this.policyEngine);
    
    // 3. Execution
    const scheduler = new WorkflowScheduler(context, negotiationEngine, consensusEngine);
    await scheduler.execute(graph);

    console.log('[EngineeringWorkflowRuntime] Workflow completed. Final Decision:', blackboard.read('FinalDecision'));
  }
}
